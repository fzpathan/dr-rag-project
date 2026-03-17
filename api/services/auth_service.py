"""
Authentication service for user management.
"""
from typing import Optional, Dict, Any

import httpx
from sqlalchemy.orm import Session

from api.config import api_config
from api.database import User
from api.models.auth import UserCreate
from api.utils.security import verify_password, get_password_hash


class AuthService:
    """Service for user authentication operations."""

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get a user by email address."""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """
        Create a new user.

        Args:
            db: Database session
            user_data: User registration data

        Returns:
            Created user object
        """
        hashed_password = get_password_hash(user_data.password)

        user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def create_google_user(
        db: Session,
        email: str,
        full_name: Optional[str] = None,
    ) -> User:
        """Create a new Google-authenticated user."""
        user = User(
            email=email,
            full_name=full_name or email.split("@")[0],
            hashed_password=None,
            oauth_provider="google",
        )

        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user with email and password.

        Args:
            db: Database session
            email: User email
            password: Plain text password

        Returns:
            User object if authentication successful, None otherwise
        """
        user = AuthService.get_user_by_email(db, email)

        if not user:
            return None

        if not user.hashed_password:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        if not user.is_active:
            return None

        return user

    @staticmethod
    def verify_google_id_token(id_token: str) -> Dict[str, Any]:
        """
        Validate a Google ID token using Google's tokeninfo endpoint.

        Returns token claims if valid, raises ValueError if invalid.
        """
        try:
            response = httpx.get(
                api_config.GOOGLE_TOKENINFO_URL,
                params={"id_token": id_token},
                timeout=10.0,
            )
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPError as exc:
            raise ValueError("Invalid Google ID token") from exc

        if payload.get("email_verified") not in ("true", True):
            raise ValueError("Google account email is not verified")

        email = payload.get("email")
        if not email:
            raise ValueError("Google token does not include an email")

        configured_client_id = api_config.GOOGLE_CLIENT_ID
        token_audience = payload.get("aud")
        if configured_client_id and token_audience != configured_client_id:
            raise ValueError("Google token audience mismatch")

        return payload
