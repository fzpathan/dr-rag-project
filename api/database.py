"""
Database setup with SQLAlchemy.
"""
from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Text, text
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
    is_admin = Column(Boolean, default=False, server_default='0')
    settings_json = Column(Text, nullable=True)   # JSON ACL flags; NULL = use global defaults
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QueryHistory(Base):
    """Query history per user — server-side persistent storage."""
    __tablename__ = "query_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    citations_json = Column(Text, nullable=True)   # JSON array of Citation objects
    sources_used = Column(Text, nullable=True)      # JSON array of source names
    cached = Column(Boolean, default=False)
    processing_time_ms = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SavedRubric(Base):
    """Saved rubrics (bookmarked responses) per user."""
    __tablename__ = "saved_rubrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    citations_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Patient(Base):
    """Patient records — visible only to the creating doctor."""
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)  # owning doctor
    name = Column(String, nullable=False)
    date_of_birth = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    contact = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PatientQuery(Base):
    """Links a query history entry to a patient."""
    __tablename__ = "patient_queries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, index=True, nullable=False)
    query_history_id = Column(String, nullable=False)
    user_id = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def create_tables():
    """Create all database tables, run migrations for existing DBs."""
    Base.metadata.create_all(bind=engine)
    # Migrations for existing databases — safe to re-run, errors are swallowed
    migrations = [
        "ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0",
        "ALTER TABLE users ADD COLUMN settings_json TEXT DEFAULT NULL",
        "ALTER TABLE query_history ADD COLUMN citations_json TEXT DEFAULT NULL",
    ]
    with engine.connect() as conn:
        for stmt in migrations:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # Column already exists


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
