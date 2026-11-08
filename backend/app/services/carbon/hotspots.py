from sqlalchemy.orm import Session
from app.models import EmissionRecord, Activity, ActionCatalog
from typing import List, Dict, Any, Optional
from collections import defaultdict
from datetime import date, timedelta
import calendar

class HotspotService:
    @staticmethod
    def calculate_hotspots(
        db: Session,
        user_id: str,
        period: str = "month",
        top_n: int = 3,
        ref_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Ranks top emission activities for the user, computes vs_previous_pct,
        builds a deterministic why sentence (no LLM), and includes CP-2 top_opportunity.
        """
        today = ref_date or date.today()

        if period == "week":
            start_cur = today - timedelta(days=today.weekday())
            end_cur = start_cur + timedelta(days=6)
            start_prev = start_cur - timedelta(days=7)
            end_prev = start_cur - timedelta(days=1)
        else:
            start_cur = date(today.year, today.month, 1)
            _, last_day = calendar.monthrange(today.year, today.month)
            end_cur = date(today.year, today.month, last_day)

            # Previous month
            first_prev_month = (start_cur - timedelta(days=1)).replace(day=1)
            _, last_day_prev = calendar.monthrange(first_prev_month.year, first_prev_month.month)
            start_prev = first_prev_month
            end_prev = date(first_prev_month.year, first_prev_month.month, last_day_prev)

        # Query current period
        records_cur = (
            db.query(EmissionRecord, Activity)
            .join(Activity, EmissionRecord.activity_id == Activity.id)
            .filter(
                EmissionRecord.user_id == user_id,
                Activity.occurred_on >= start_cur,
                Activity.occurred_on <= end_cur,
            )
            .all()
        )

        # Query previous period
        records_prev = (
            db.query(EmissionRecord, Activity)
            .join(Activity, EmissionRecord.activity_id == Activity.id)
            .filter(
                EmissionRecord.user_id == user_id,
                Activity.occurred_on >= start_prev,
                Activity.occurred_on <= end_prev,
            )
            .all()
        )

        if not records_cur:
            # Fallback to all records if current month is empty (e.g. fresh demo setup)
            records_cur = (
                db.query(EmissionRecord, Activity)
                .join(Activity, EmissionRecord.activity_id == Activity.id)
                .filter(EmissionRecord.user_id == user_id)
                .all()
            )

        if not records_cur:
            return []

        totals_cur = defaultdict(float)
        category_by_key = {}
        total_footprint = 0.0

        for rec, act in records_cur:
            totals_cur[act.activity_key] += rec.kg_co2e
            category_by_key[act.activity_key] = act.category
            total_footprint += rec.kg_co2e

        totals_prev = defaultdict(float)
        for rec, act in records_prev:
            totals_prev[act.activity_key] += rec.kg_co2e

        sorted_items = sorted(totals_cur.items(), key=lambda x: x[1], reverse=True)[:top_n]

        # Query catalog for top opportunities per category
        catalog_actions = db.query(ActionCatalog).filter(ActionCatalog.is_active == True).all()
        actions_by_cat = defaultdict(list)
        for a in catalog_actions:
            actions_by_cat[a.category].append(a)

        hotspots = []
        for rank, (act_key, kg) in enumerate(sorted_items, start=1):
            cat = category_by_key.get(act_key, "general")
            share = round((kg / max(0.001, total_footprint)) * 100, 1)

            prev_kg = totals_prev.get(act_key, 0.0)
            if prev_kg > 0:
                vs_prev = round(((kg - prev_kg) / prev_kg) * 100, 1)
                trend_str = f" ({'+' if vs_prev > 0 else ''}{vs_prev}% vs previous period)"
            else:
                vs_prev = 0.0
                trend_str = ""

            why_sentence = f"Top #{rank} emission driver representing {share}% ({round(kg, 1)} kg CO2e) of your logged footprint{trend_str}."

            # Find best opportunity action in this category
            top_opp = None
            cat_actions = actions_by_cat.get(cat, [])
            if cat_actions:
                best_act = min(cat_actions, key=lambda x: x.difficulty)  # easiest or best
                top_opp = {
                    "action_key": best_act.action_key,
                    "title": best_act.title,
                    "estimated_saving_kg_month": 12.0,  # default estimated saving
                    "difficulty": best_act.difficulty,
                }

            hotspots.append({
                "rank": rank,
                "category": cat,
                "activity_key": act_key,
                "kg_co2e": round(kg, 1),
                "share_pct": share,
                "vs_previous_pct": vs_prev,
                "why": why_sentence,
                "top_opportunity": top_opp,
            })

        return hotspots
