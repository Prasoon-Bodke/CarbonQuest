-- CarbonQuest Canonical Database Schema (PostgreSQL / Supabase)
-- contracts/DATABASE.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles (one row per user, id = Supabase auth uid)
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    display_name VARCHAR(255),
    age_band VARCHAR(50),
    region_code VARCHAR(10) NOT NULL DEFAULT 'IN',
    household_size INT NOT NULL DEFAULT 2,
    monthly_target_kg DOUBLE PRECISION DEFAULT 100.0,
    preferences JSONB NOT NULL DEFAULT '{"ok_modes": ["bus", "metro", "bicycle", "two_wheeler"], "diet": "vegetarian", "budget_level": "medium", "effort_level": "medium"}'::jsonb,
    consent_tracking BOOLEAN NOT NULL DEFAULT TRUE,
    consent_leaderboard BOOLEAN NOT NULL DEFAULT TRUE,
    onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. User Preference Profile (T3 learned state)
CREATE TABLE user_preference_profile (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    action_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    category_weights JSONB NOT NULL DEFAULT '{"transport": 1.0, "electricity": 1.0, "food": 1.0, "shopping": 1.0, "waste": 1.0}'::jsonb,
    difficulty_tolerance DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    cost_sensitivity DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    feedback_count INT NOT NULL DEFAULT 0,
    model_version VARCHAR(50) NOT NULL DEFAULT '1.0',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Emission Factors (immutable versions, never updated in place)
CREATE TABLE emission_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    activity_key VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    kg_co2e_per_unit DOUBLE PRECISION NOT NULL,
    region_code VARCHAR(10) NOT NULL DEFAULT 'IN',
    source_name VARCHAR(255) NOT NULL,
    source_url VARCHAR(500),
    source_year INT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    valid_from DATE,
    valid_to DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_emission_factors_key_region_ver UNIQUE (activity_key, region_code, version)
);
CREATE INDEX idx_emission_factors_key ON emission_factors(activity_key);

-- 4. Activities (logged user consumption / transit)
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    activity_key VARCHAR(100) NOT NULL,
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    occurred_on DATE NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'accepted',
    validation_score DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    validation_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    dedupe_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_activity_user_hash UNIQUE (user_id, dedupe_hash)
);
CREATE INDEX idx_activities_user_date ON activities(user_id, occurred_on);

-- 5. Emission Records (calculated output from accepted/flagged activities)
CREATE TABLE emission_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL UNIQUE REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emission_factor_id UUID NOT NULL REFERENCES emission_factors(id),
    kg_co2e DOUBLE PRECISION NOT NULL,
    calc_inputs JSONB NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    confidence_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX idx_emission_records_user ON emission_records(user_id);

-- 6. Footprint Snapshots (cache for summary rollups)
CREATE TABLE footprint_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    total_kg DOUBLE PRECISION NOT NULL,
    by_category JSONB NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX idx_footprint_user_period ON footprint_snapshots(user_id, period, period_start);

-- 7. Action Catalog (seed data, T2)
CREATE TABLE action_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_key VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    activity_key VARCHAR(100) NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    default_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    difficulty INT NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
    cost_level INT NOT NULL DEFAULT 1 CHECK (cost_level BETWEEN 1 AND 3),
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. Recommendations (T3)
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES action_catalog(id),
    cycle INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'proposed',
    estimated_saving_kg_month DOUBLE PRECISION NOT NULL,
    basis VARCHAR(20) NOT NULL DEFAULT 'estimated',
    saving_assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority_rank INT NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    score_breakdown JSONB NOT NULL,
    explanation TEXT NOT NULL,
    explanation_source VARCHAR(50) NOT NULL DEFAULT 'template',
    model_version VARCHAR(50) NOT NULL DEFAULT '1.0',
    params JSONB,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX idx_recommendations_user_cycle ON recommendations(user_id, cycle, priority_rank);

-- 9. Recommendation Feedback (T3, append-only)
CREATE TABLE recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    response VARCHAR(50) NOT NULL,
    reason_code VARCHAR(50),
    modified_params JSONB,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 10. Action Logs (T3, the 'Act' step)
CREATE TABLE action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recommendation_id UUID REFERENCES recommendations(id) ON DELETE SET NULL,
    action_id UUID NOT NULL REFERENCES action_catalog(id),
    performed_on DATE NOT NULL,
    quantity DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    unit VARCHAR(50) NOT NULL DEFAULT 'trips',
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX idx_action_logs_user_date ON action_logs(user_id, performed_on);

-- 11. Simulations
CREATE TABLE simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    scenario JSONB NOT NULL,
    baseline_kg_month DOUBLE PRECISION NOT NULL,
    projected_kg_month DOUBLE PRECISION NOT NULL,
    saving_kg_month DOUBLE PRECISION NOT NULL,
    basis VARCHAR(20) NOT NULL DEFAULT 'estimated',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 12. Goals
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL,
    target_value DOUBLE PRECISION NOT NULL,
    category VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 13. Eco Scores
CREATE TABLE eco_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    components JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 14. Badges & User Badges
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    criteria JSONB NOT NULL,
    icon VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id)
);

-- 15. Streaks & Points
CREATE TABLE streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    kind VARCHAR(50) NOT NULL DEFAULT 'logging',
    current INT NOT NULL DEFAULT 1,
    longest INT NOT NULL DEFAULT 1,
    last_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    delta INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    ref_type VARCHAR(50),
    ref_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 16. Chat Sessions & Messages (T3)
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Climate Advisory Session',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    context_refs JSONB,
    degraded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 17. Integration Connections (Stretch)
CREATE TABLE integration_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    external_id VARCHAR(255),
    token_ciphertext TEXT,
    scopes VARCHAR(255),
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_user_provider UNIQUE (user_id, provider)
);
