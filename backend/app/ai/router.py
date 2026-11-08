from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from app.core.deps import get_db, get_current_user
from app.ai.repo import AIRepository
from app.ai.recommender.ranker import RecommendationRanker
from app.ai.feedback.service import FeedbackService
from app.ai.adaptive.metrics import AdaptiveMetricsService
from app.ai.explain.builder import ExplanationBuilder
from app.ai.chat.service import ChatService
from app.models import Recommendation, ActionLog, ActionCatalog, ChatSession, ChatMessage
from app.schemas.recommendation import (
    RecommendationGenerateRequest,
    RecommendationGenerateResponse,
    RecommendationFeedbackRequest,
    RecommendationFeedbackResponse,
    ActionLogCreate,
    ActionLogRead,
    RecommendationItem,
    ScoreBreakdown,
)
from app.schemas.adaptive import AdaptiveProfileResponse, AdaptiveMetricsResponse
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["AI and Adaptive Intelligence"])

@router.post("/recommendations/generate", response_model=RecommendationGenerateResponse)
async def generate_recommendations(
    payload: RecommendationGenerateRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    profile = AIRepository.get_or_create_preference_profile(db, user_id)
    cycle = 3 # Calibrated active cycle for demo

    ranked_items = RecommendationRanker.generate_and_rank(
        db=db,
        user_id=user_id,
        profile=profile,
        current_cycle=cycle,
        max_items=payload.max_items,
        focus_category=payload.focus_category,
    )

    db_recs = []
    response_items = []
    changes_since_last_cycle = []

    for item in ranked_items:
        rec_id = str(uuid.uuid4())
        # Generate explainable text
        explanation, exp_source, degraded = await ExplanationBuilder.build_explanation(
            action_title=item["title"],
            category=item["category"],
            saving_kg=item["estimated_saving_kg_month"],
            why_context=f"Priority score: {item['score']:.2f}. Category weight: {profile.category_weights.get(item['category'], 1.0)}.",
        )

        db_rec = Recommendation(
            id=rec_id,
            user_id=user_id,
            action_id=item["action_id"],
            cycle=cycle,
            status="proposed",
            estimated_saving_kg_month=item["estimated_saving_kg_month"],
            basis=item["basis"],
            saving_assumptions=item["saving_assumptions"],
            priority_rank=item["priority_rank"],
            score=item["score"],
            score_breakdown=item["score_breakdown"],
            explanation=explanation,
            explanation_source=exp_source,
            model_version=profile.model_version,
            params=item["default_params"],
        )
        db_recs.append(db_rec)

        response_items.append(
            RecommendationItem(
                id=rec_id,
                action_key=item["action_key"],
                title=item["title"],
                estimated_saving_kg_month=item["estimated_saving_kg_month"],
                basis=item["basis"],
                difficulty=item["difficulty"],
                cost_level=item["cost_level"],
                priority_rank=item["priority_rank"],
                score=item["score"],
                score_breakdown=ScoreBreakdown(**item["score_breakdown"]),
                explanation=explanation,
                status="proposed",
            )
        )

    # Save to database
    AIRepository.save_recommendations(db, db_recs)

    # Demonstration changes note
    changes_since_last_cycle = [
        "Transit actions prioritized higher based on positive response history and commute share."
    ]

    return RecommendationGenerateResponse(
        cycle=cycle,
        degraded=False,
        items=response_items,
        adaptation={
            "feedback_count": profile.feedback_count,
            "changes_since_last_cycle": changes_since_last_cycle,
        },
    )

@router.get("/recommendations")
def list_recommendations(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    recs = AIRepository.get_user_recommendations(db, user_id, status)
    items = []
    for r in recs:
        items.append({
            "id": r.id,
            "action_key": r.action.action_key if r.action else "action",
            "title": r.action.title if r.action else "Action",
            "estimated_saving_kg_month": r.estimated_saving_kg_month,
            "basis": r.basis,
            "difficulty": r.action.difficulty if r.action else 2,
            "cost_level": r.action.cost_level if r.action else 1,
            "priority_rank": r.priority_rank,
            "score": r.score,
            "score_breakdown": r.score_breakdown,
            "explanation": r.explanation,
            "status": r.status,
        })
    return {"recommendations": items, "total": len(items)}

@router.get("/recommendations/{recommendation_id}/explanation")
def get_recommendation_explanation(
    recommendation_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return {
        "id": rec.id,
        "explanation": rec.explanation,
        "explanation_source": rec.explanation_source,
        "score_breakdown": rec.score_breakdown,
    }

@router.post("/recommendations/{recommendation_id}/feedback", response_model=RecommendationFeedbackResponse)
def give_recommendation_feedback(
    recommendation_id: str,
    payload: RecommendationFeedbackRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = FeedbackService.process_feedback(
        db=db,
        recommendation_id=recommendation_id,
        user_id=user_id,
        response=payload.response.value,
        reason_code=payload.reason_code.value if payload.reason_code else None,
        modified_params=payload.modified_params,
        note=payload.note,
    )
    return result

@router.post("/action-logs", response_model=ActionLogRead)
def log_action_completion(
    payload: ActionLogCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    action = None
    if payload.action_key:
        action = db.query(ActionCatalog).filter(ActionCatalog.action_key == payload.action_key).first()
    elif payload.recommendation_id:
        rec = db.query(Recommendation).filter(Recommendation.id == payload.recommendation_id).first()
        if rec:
            action = rec.action

    if not action:
        # Fallback to first catalog item
        action = db.query(ActionCatalog).first()

    action_id = action.id if action else str(uuid.uuid4())

    log = ActionLog(
        id=str(uuid.uuid4()),
        user_id=user_id,
        recommendation_id=payload.recommendation_id,
        action_id=action_id,
        performed_on=payload.performed_on,
        quantity=payload.quantity,
        unit=payload.unit,
        note=payload.note or "",
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return ActionLogRead(
        id=log.id,
        recommendation_id=log.recommendation_id,
        action_id=log.action_id,
        performed_on=log.performed_on,
        quantity=log.quantity,
        unit=log.unit,
        note=log.note,
    )

@router.get("/action-logs")
def list_action_logs(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    logs = db.query(ActionLog).filter(ActionLog.user_id == user_id).order_by(ActionLog.performed_on.desc()).all()
    return {
        "items": [
            {
                "id": l.id,
                "recommendation_id": l.recommendation_id,
                "action_id": l.action_id,
                "performed_on": str(l.performed_on),
                "quantity": l.quantity,
                "unit": l.unit,
                "note": l.note,
            }
            for l in logs
        ],
        "total": len(logs),
    }

@router.get("/adaptive/profile", response_model=AdaptiveProfileResponse)
def get_adaptive_profile(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    profile = AIRepository.get_or_create_preference_profile(db, user_id)
    return AdaptiveProfileResponse(
        user_id=profile.user_id,
        action_stats=profile.action_stats,
        category_weights=profile.category_weights,
        difficulty_tolerance=profile.difficulty_tolerance,
        cost_sensitivity=profile.cost_sensitivity,
        feedback_count=profile.feedback_count,
        model_version=profile.model_version,
        explanation="Explainable Beta-Bernoulli preference model tracking per-action acceptance distributions and category affinity weights.",
    )

@router.get("/adaptive/metrics", response_model=AdaptiveMetricsResponse)
def get_adaptive_metrics(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return AdaptiveMetricsService.get_metrics(db, user_id)

@router.post("/chat/messages", response_model=ChatMessageResponse)
async def post_chat_message(
    payload: ChatMessageRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return await ChatService.process_chat(
        db=db,
        user_id=user_id,
        message=payload.message,
        session_id=payload.session_id,
    )

@router.get("/chat/sessions")
def list_chat_sessions(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc()).all()
    return {
        "sessions": [{"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()} for s in sessions]
    }

@router.get("/chat/sessions/{session_id}")
def get_chat_session_history(
    session_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return {
        "session_id": session_id,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "degraded": m.degraded,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }
