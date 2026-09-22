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

    # Database URL defaults to local db, can be overridden by env variable (e.g. Postgres in Docker)
    _backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    _default_db = os.path.join(_backend_dir, "equipfixai.db")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{_default_db}"
    )

    GOOGLE_CLIENT_ID: Union[str, None] = os.getenv("GOOGLE_CLIENT_ID", None)
    GOOGLE_CLIENT_SECRET: Union[str, None] = os.getenv("GOOGLE_CLIENT_SECRET", None)



    # Allowed CORS Origins for frontend
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
