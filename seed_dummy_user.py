"""
Seed script to create a dummy user for testing.
Run with: python seed_dummy_user.py
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bcrypt
from api.database import create_tables, SessionLocal, User

# Dummy credentials
DUMMY_EMAIL = "test@example.com"
DUMMY_PASSWORD = "password123"
DUMMY_NAME = "Test User"


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def seed_dummy_user():
    """Create dummy user if not exists."""
    # Ensure tables exist
    create_tables()

    db = SessionLocal()
    try:
        # Check if user already exists
        existing = db.query(User).filter(User.email == DUMMY_EMAIL).first()
        if existing:
            print(f"User '{DUMMY_EMAIL}' already exists!")
            return

        # Create dummy user
        user = User(
            email=DUMMY_EMAIL,
            full_name=DUMMY_NAME,
            hashed_password=hash_password(DUMMY_PASSWORD),
            is_active=True,
        )
        db.add(user)
        db.commit()

        print("=" * 50)
        print("Dummy user created successfully!")
        print("=" * 50)
        print(f"Email:    {DUMMY_EMAIL}")
        print(f"Password: {DUMMY_PASSWORD}")
        print("=" * 50)

    finally:
        db.close()


if __name__ == "__main__":
    seed_dummy_user()
