"""
API configuration extending the base RAG config.
"""
import os
from dataclasses import dataclass, field
from typing import Optional

from src.config import Config as BaseConfig


@dataclass
class APIConfig(BaseConfig):
    """Extended configuration for API server."""

    # JWT Settings
    @property
    def JWT_SECRET_KEY(self) -> str:
        key = os.getenv("JWT_SECRET_KEY")
        if not key:
            raise ValueError("JWT_SECRET_KEY must be set in environment")
        return key

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    @property
    def DATABASE_URL(self) -> str:
        return os.getenv("DATABASE_URL", "sqlite:///./api_users.db")

    # CORS
    CORS_ORIGINS: list = field(default_factory=lambda: [
        "http://localhost:8081",  # Expo dev
        "http://localhost:19006",  # Expo web
        "exp://localhost:8081",
        "*",  # Allow all for development
    ])

    # Cache Settings
    CACHE_MAX_SIZE: int = 1000
    CACHE_TTL_HOURS: int = 24

    # Speech-to-Text
    @property
    def WHISPER_ENABLED(self) -> bool:
        return bool(self.OPENAI_API_KEY)


# Global API config instance
api_config = APIConfig()
