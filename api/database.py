"""
Database setup with SQLAlchemy.
"""
from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import uuid

from api.config import api_config

# Create engine
engine = create_engine(
    api_config.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in api_config.DATABASE_URL else {}
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


class User(Base):
    """User model for authentication."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QueryHistory(Base):
    """Query history for users."""
    __tablename__ = "query_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    sources_used = Column(String)  # JSON string
    cached = Column(Boolean, default=False)
    processing_time_ms = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


def create_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
