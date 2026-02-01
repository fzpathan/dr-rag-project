"""
Authentication service for user management.
"""
from typing import Optional
from sqlalchemy.orm import Session

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

        if not verify_password(password, user.hashed_password):
            return None

        if not user.is_active:
            return None

        return user
