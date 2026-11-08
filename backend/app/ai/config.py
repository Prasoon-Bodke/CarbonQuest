from pydantic_settings import BaseSettings

class AIConfig(BaseSettings):
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    TEMPERATURE: float = 0.2
    MAX_TOKENS: int = 600
    FALLBACK_ENABLED: bool = True

ai_config = AIConfig()
