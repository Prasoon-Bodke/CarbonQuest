from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.ai.recommender.candidates import CandidateBuilder
from app.ai.recommender.scoring import score_candidate
from app.ai.recommender.cooldown import CooldownManager
from app.services.carbon.impact import estimate_saving
from app.models import UserPreferenceProfile, ActionCatalog

class RecommendationRanker:
    @staticmethod
    def generate_and_rank(
        db: Session,
        user_id: str,
        profile: UserPreferenceProfile,
        current_cycle: int,
        max_items: int = 5,
        focus_category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        candidates = CandidateBuilder.get_candidates(db, focus_category)
        scored_items = []

        for cand in candidates:
            # Call T2's estimate_saving
            saving_est = estimate_saving(db, user_id, cand.action_key, cand.default_params)
            saving_kg = saving_est.saving_kg_month

            # Cooldown check
            penalty = CooldownManager.get_penalty(cand.action_key, profile.action_stats, current_cycle)

            score, breakdown = score_candidate(
                candidate=cand,
                saving_kg=saving_kg,
                profile=profile,
                current_cycle=current_cycle,
                cooldown_penalty=penalty,
            )

            scored_items.append({
                "candidate": cand,
                "saving_estimate": saving_est,
                "score": score,
                "score_breakdown": breakdown,
            })

        # Sort descending by score
        scored_items.sort(key=lambda x: x["score"], reverse=True)

        ranked_results = []
        for rank, item in enumerate(scored_items[:max_items], start=1):
            cand = item["candidate"]
            est = item["saving_estimate"]
            ranked_results.append({
                "action_id": cand.id,
                "action_key": cand.action_key,
                "title": cand.title,
                "category": cand.category,
                "estimated_saving_kg_month": est.saving_kg_month,
                "basis": est.basis,
                "difficulty": cand.difficulty,
                "cost_level": cand.cost_level,
                "priority_rank": rank,
                "score": item["score"],
                "score_breakdown": item["score_breakdown"],
                "saving_assumptions": est.assumptions,
                "default_params": cand.default_params,
            })

        return ranked_results
