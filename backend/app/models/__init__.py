from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    Text,
    Date,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.db.base import Base

def gen_uuid_str() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    display_name = Column(String(255), nullable=True)
    age_band = Column(String(50), nullable=True)
    region_code = Column(String(10), default="IN", nullable=False)
    household_size = Column(Integer, default=2, nullable=False)
    monthly_target_kg = Column(Float, default=100.0, nullable=True)
    preferences = Column(JSON, default=dict, nullable=False) # {ok_modes[], diet, budget_level, effort_level}
    consent_tracking = Column(Boolean, default=True, nullable=False)
    consent_leaderboard = Column(Boolean, default=True, nullable=False)
    onboarding_done = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    preference_profile = relationship("UserPreferenceProfile", back_populates="profile", uselist=False, cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="profile", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="profile", cascade="all, delete-orphan")
    action_logs = relationship("ActionLog", back_populates="profile", cascade="all, delete-orphan")
    simulations = relationship("Simulation", back_populates="profile", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="profile", cascade="all, delete-orphan")
    eco_scores = relationship("EcoScore", back_populates="profile", cascade="all, delete-orphan")
    streaks = relationship("Streak", back_populates="profile", cascade="all, delete-orphan")
    points_ledgers = relationship("PointsLedger", back_populates="profile", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="profile", cascade="all, delete-orphan")
    user_badges = relationship("UserBadge", back_populates="profile", cascade="all, delete-orphan")

class UserPreferenceProfile(Base):
    __tablename__ = "user_preference_profile"

    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    action_stats = Column(JSON, default=dict, nullable=False) # {action_key: {alpha, beta, last_shown_cycle, last_response}}
    category_weights = Column(JSON, default=dict, nullable=False) # {transport: 1.0, electricity: 1.0, ...}
    difficulty_tolerance = Column(Float, default=0.5, nullable=False)
    cost_sensitivity = Column(Float, default=0.5, nullable=False)
    feedback_count = Column(Integer, default=0, nullable=False)
    model_version = Column(String(50), default="1.0", nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="preference_profile")

class EmissionFactor(Base):
    __tablename__ = "emission_factors"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    category = Column(String(50), nullable=False)
    activity_key = Column(String(100), nullable=False)
    unit = Column(String(50), nullable=False)
    kg_co2e_per_unit = Column(Float, nullable=False)
    region_code = Column(String(10), default="IN", nullable=False)
    source_name = Column(String(255), nullable=False)
    source_url = Column(String(500), nullable=True)
    source_year = Column(Integer, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("activity_key", "region_code", "version", name="uq_factor_key_region_version"),
        Index("idx_emission_factors_key", "activity_key"),
    )

class Activity(Base):
    __tablename__ = "activities"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(50), nullable=False)
    activity_key = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    occurred_on = Column(Date, nullable=False)
    source = Column(String(50), default="manual", nullable=False)
    metadata_json = Column("metadata", JSON, default=dict, nullable=False)
    validation_status = Column(String(50), default="accepted", nullable=False)
    validation_score = Column(Float, default=1.0, nullable=False)
    validation_reasons = Column(JSON, default=list, nullable=False)
    dedupe_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="activities")
    emission_record = relationship("EmissionRecord", back_populates="activity", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_activities_user_date", "user_id", "occurred_on"),
        UniqueConstraint("user_id", "dedupe_hash", name="uq_activity_user_hash"),
    )

class EmissionRecord(Base):
    __tablename__ = "emission_records"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    activity_id = Column(String(36), ForeignKey("activities.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    emission_factor_id = Column(String(36), ForeignKey("emission_factors.id"), nullable=False)
    kg_co2e = Column(Float, nullable=False)
    calc_inputs = Column(JSON, default=dict, nullable=False)
    confidence = Column(Float, default=0.8, nullable=False)
    confidence_reasons = Column(JSON, default=list, nullable=False)
    calculated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    activity = relationship("Activity", back_populates="emission_record")
    factor = relationship("EmissionFactor")

class FootprintSnapshot(Base):
    __tablename__ = "footprint_snapshots"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    period = Column(String(20), nullable=False) # day, week, month
    period_start = Column(Date, nullable=False)
    total_kg = Column(Float, nullable=False)
    by_category = Column(JSON, default=dict, nullable=False)
    confidence = Column(Float, default=0.8, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_footprint_user_period", "user_id", "period", "period_start"),
    )

class ActionCatalog(Base):
    __tablename__ = "action_catalog"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    action_key = Column(String(100), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    activity_key = Column(String(100), nullable=False)
    change_type = Column(String(50), nullable=False)
    default_params = Column(JSON, default=dict, nullable=False)
    difficulty = Column(Integer, default=2, nullable=False)
    cost_level = Column(Integer, default=1, nullable=False)
    tags = Column(JSON, default=list, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    action_id = Column(String(36), ForeignKey("action_catalog.id"), nullable=False)
    cycle = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default="proposed", nullable=False)
    estimated_saving_kg_month = Column(Float, nullable=False)
    basis = Column(String(20), default="estimated", nullable=False)
    saving_assumptions = Column(JSON, default=list, nullable=False)
    priority_rank = Column(Integer, nullable=False)
    score = Column(Float, nullable=False)
    score_breakdown = Column(JSON, default=dict, nullable=False)
    explanation = Column(Text, nullable=False)
    explanation_source = Column(String(50), default="template", nullable=False)
    model_version = Column(String(50), default="1.0", nullable=False)
    params = Column(JSON, default=dict, nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="recommendations")
    action = relationship("ActionCatalog")
    feedbacks = relationship("RecommendationFeedback", back_populates="recommendation", cascade="all, delete-orphan")
    action_logs = relationship("ActionLog", back_populates="recommendation")

class RecommendationFeedback(Base):
    __tablename__ = "recommendation_feedback"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    recommendation_id = Column(String(36), ForeignKey("recommendations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    response = Column(String(50), nullable=False)
    reason_code = Column(String(50), nullable=True)
    modified_params = Column(JSON, nullable=True)
    note = Column(Text, default="", nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    recommendation = relationship("Recommendation", back_populates="feedbacks")

class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    recommendation_id = Column(String(36), ForeignKey("recommendations.id"), nullable=True)
    action_id = Column(String(36), ForeignKey("action_catalog.id"), nullable=False)
    performed_on = Column(Date, nullable=False)
    quantity = Column(Float, default=1.0, nullable=False)
    unit = Column(String(50), default="trips", nullable=False)
    note = Column(Text, default="", nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="action_logs")
    recommendation = relationship("Recommendation", back_populates="action_logs")
    action = relationship("ActionCatalog")

class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    scenario = Column(JSON, nullable=False)
    baseline_kg_month = Column(Float, nullable=False)
    projected_kg_month = Column(Float, nullable=False)
    saving_kg_month = Column(Float, nullable=False)
    basis = Column(String(20), default="estimated", nullable=False)
    confidence = Column(Float, default=0.8, nullable=False)
    assumptions = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="simulations")

class Goal(Base):
    __tablename__ = "goals"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    goal_type = Column(String(50), nullable=False)
    target_value = Column(Float, nullable=False)
    category = Column(String(50), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="goals")

class EcoScore(Base):
    __tablename__ = "eco_scores"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    period_start = Column(Date, nullable=False)
    score = Column(Integer, nullable=False)
    components = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="eco_scores")

class Badge(Base):
    __tablename__ = "badges"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    key = Column(String(100), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    criteria = Column(JSON, default=dict, nullable=False)
    icon = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    badge_id = Column(String(36), ForeignKey("badges.id", ondelete="CASCADE"), nullable=False)
    awarded_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="user_badges")
    badge = relationship("Badge")

    __table_args__ = (
        UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),
    )

class Streak(Base):
    __tablename__ = "streaks"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(50), default="logging", nullable=False)
    current = Column(Integer, default=1, nullable=False)
    longest = Column(Integer, default=1, nullable=False)
    last_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="streaks")

class PointsLedger(Base):
    __tablename__ = "points_ledger"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    delta = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    ref_type = Column(String(50), nullable=True)
    ref_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="points_ledgers")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="Climate Advisory Session", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False) # user, assistant, system
    content = Column(Text, nullable=False)
    context_refs = Column(JSON, default=dict, nullable=True)
    degraded = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    session = relationship("ChatSession", back_populates="messages")

class IntegrationConnection(Base):
    __tablename__ = "integration_connections"

    id = Column(String(36), primary_key=True, default=gen_uuid_str)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)
    external_id = Column(String(255), nullable=True)
    token_ciphertext = Column(Text, nullable=True)
    scopes = Column(String(255), nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_provider"),
    )
