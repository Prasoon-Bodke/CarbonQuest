from pydantic_settings import BaseSettings

class AIConfig(BaseSettings):
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    TEMPERATURE: float = 0.2
    MAX_TOKENS: int = 600
    FALLBACK_ENABLED: bool = True

    # Scoring weights
    WEIGHT_IMPACT: float = 0.35
    WEIGHT_PREFERENCE: float = 0.30
    WEIGHT_FEASIBILITY: float = 0.20
    WEIGHT_GOAL: float = 0.15

    # Prior parameters
    ALPHA_PRIOR: float = 1.0
    BETA_PRIOR: float = 1.0

    # Cooldown parameters
    PENALTY_REJECTED: float = 0.35
    PENALTY_SKIPPED: float = 0.20
    PENALTY_RECEDED: float = 0.10

    # Hyperparameters for adaptive steps
    CATEGORY_BOOST_STEP: float = 0.05
    CATEGORY_DAMPEN_STEP: float = 0.10
    DIFF_TOLERANCE_STEP: float = 0.05
    COST_SENSITIVITY_STEP: float = 0.05

ai_config = AIConfig()
