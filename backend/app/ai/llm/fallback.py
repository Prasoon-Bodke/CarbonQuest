from typing import Dict, Any, List

class DeterministicFallback:
    @staticmethod
    def format_recommendation_explanation(
        action_title: str,
        category: str,
        saving_kg: float,
        why_context: str = "",
    ) -> str:
        base = f"{category.capitalize()} represents a major contributor to your footprint. Adopting '{action_title}' produces a deterministic estimated reduction of {saving_kg:.1f} kg CO2e/month."
        if why_context:
            base += f" {why_context}"
        return base

    @staticmethod
    def generate_chat_reply(
        message: str,
        footprint_period: str,
        total_kg: float,
        top_hotspot: str,
    ) -> str:
        msg_lower = message.lower()
        if "transport" in msg_lower or "car" in msg_lower or "bus" in msg_lower or "commute" in msg_lower:
            return (
                f"Transport is currently your largest footprint hotspot for {footprint_period}, accounting for ~40.0 kg CO2e. "
                "Switching 2 trips per week to public bus transit or cycling saves up to 14.0 kg CO2e monthly."
            )
        elif "ac" in msg_lower or "electricity" in msg_lower or "cooling" in msg_lower:
            return (
                "Electricity is your second highest consumption category. Reducing air conditioner runtime by 1 hour daily "
                "or tuning thermostat to 24°C yields an estimated 12.0 kg CO2e savings per month based on CEA Baseline v19 (0.82 kg/kWh)."
            )
        elif "why" in msg_lower or "calculate" in msg_lower or "formula" in msg_lower:
            return (
                f"Your {footprint_period} total emissions ({total_kg:.1f} kg CO2e) are calculated deterministically as "
                "Activity Quantity × Published Emission Factor. Calculations cite India Central Electricity Authority (CEA Baseline v19) "
                "and ARAI/MoEFCC GHG inventories."
            )
        return (
            f"Your current monthly carbon footprint stands at {total_kg:.1f} kg CO2e, with {top_hotspot} as your primary driver. "
            "Explore the AI Actions tab for prioritized, personalized reduction levers."
        )
