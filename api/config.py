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

    # CORS — set CORS_ORIGINS env var as comma-separated list in production
    # e.g. CORS_ORIGINS=https://myapp.example.com,https://admin.example.com
    CORS_ORIGINS: list = field(default_factory=lambda: [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:8081,http://localhost:19006,exp://localhost:8081",
        ).split(",")
        if origin.strip()
    ])

    # Cache Settings
    CACHE_MAX_SIZE: int = 1000
    CACHE_TTL_HOURS: int = 24

    # Google OAuth settings
    @property
    def GOOGLE_CLIENT_ID(self) -> Optional[str]:
        return os.getenv("GOOGLE_CLIENT_ID")

    GOOGLE_TOKENINFO_URL: str = field(
        default_factory=lambda: os.getenv(
            "GOOGLE_TOKENINFO_URL",
            "https://oauth2.googleapis.com/tokeninfo",
        )
    )

    # Payment provider configuration
    PAYMENT_PROVIDER: str = field(default_factory=lambda: os.getenv("PAYMENT_PROVIDER", "razorpay"))
    RAZORPAY_BASE_URL: str = field(default_factory=lambda: os.getenv("RAZORPAY_BASE_URL", "https://api.razorpay.com/v1"))

    @property
    def RAZORPAY_KEY_ID(self) -> Optional[str]:
        return os.getenv("RAZORPAY_KEY_ID")

    @property
    def RAZORPAY_KEY_SECRET(self) -> Optional[str]:
        return os.getenv("RAZORPAY_KEY_SECRET")

    @property
    def PAYMENT_WEBHOOK_SECRET(self) -> Optional[str]:
        return os.getenv("PAYMENT_WEBHOOK_SECRET")

    @property
    def PAYMENT_UPI_VPA(self) -> Optional[str]:
        return os.getenv("PAYMENT_UPI_VPA")

    def payment_provider_ready(self) -> bool:
        if self.PAYMENT_PROVIDER.lower() != "razorpay":
            return False
        return bool(self.RAZORPAY_KEY_ID and self.RAZORPAY_KEY_SECRET)


# Global API config instance
api_config = APIConfig()
