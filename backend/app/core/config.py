import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Intelligent Border Video Analytics Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "border-security-secret-key-super-secure-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ------------------------------------------------------------------
    # Database
    #   Supabase (production): postgresql://postgres.<ref>.<user>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres
    #   Local (easy run):       sqlite:///./border_analytics.db
    # ------------------------------------------------------------------
    DATABASE_URL: str = "sqlite:///./border_analytics.db"

    # ------------------------------------------------------------------
    # Supabase platform settings (optional; app degrades gracefully)
    #   - SUPABASE_URL:            https://<project-ref>.supabase.co
    #   - SUPABASE_SERVICE_ROLE_KEY: service-role key (server-only / seeding)
    #   - SUPABASE_JWT_SECRET:     used to verify Supabase-minted JWTs
    # ------------------------------------------------------------------
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    USE_SUPABASE_AUTH: bool = False

    # Dataset ingestion defaults
    DATA_CACHE_DIR: str = "./data_cache"
    DATASET_VIRAT_MAX_CLIPS: int = 3
    DATASET_MOT17_SEQUENCES: int = 3
    DATASET_FRAME_SAMPLE: int = 15

    DEMO_MODE: bool = True
    SIMULATION_INTERVAL_SEC: float = 1.5

    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*",
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()