"""
Authentication Pydantic models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Request model for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=100)


class UserLogin(BaseModel):
    """Request model for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Response model for user data."""
    id: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Response model for authentication tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenRefreshRequest(BaseModel):
    """Request model for token refresh."""
    refresh_token: str


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str  # user_id
    type: str  # "access" or "refresh"
    exp: Optional[datetime] = None
