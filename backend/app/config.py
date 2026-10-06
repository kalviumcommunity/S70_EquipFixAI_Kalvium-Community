import os
from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "EquipFixAI"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "equipfixai-industrial-jwt-secret-key-2024-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database URL defaults to local db, can be overridden by env variable (e.g. Postgres in Docker or Render)
    _backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    _default_db = os.path.join(_backend_dir, "equipfixai.db")
    _raw_db = os.getenv("DATABASE_URL", f"sqlite:///{_default_db}")
    DATABASE_URL: str = _raw_db.replace("postgres://", "postgresql://", 1) if _raw_db.startswith("postgres://") else _raw_db

    GOOGLE_CLIENT_ID: Union[str, None] = os.getenv("GOOGLE_CLIENT_ID", None)
    GOOGLE_CLIENT_SECRET: Union[str, None] = os.getenv("GOOGLE_CLIENT_SECRET", None)

    # External LLM API Keys
    GEMINI_API_KEY: Union[str, None] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
    GOOGLE_API_KEY: Union[str, None] = os.getenv("GOOGLE_API_KEY", None)
    OPENAI_API_KEY: Union[str, None] = os.getenv("OPENAI_API_KEY", None)
    LLM_API_KEY: Union[str, None] = os.getenv("LLM_API_KEY", None)

    # Allowed CORS Origins for frontend
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    class Config:
        case_sensitive = True
        env_file = [".env", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")]


settings = Settings()
