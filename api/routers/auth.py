"""
Authentication endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.database import get_db
from api.models.auth import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    TokenRefreshRequest,
)
from api.services.auth_service import AuthService
from api.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from api.dependencies import get_current_user
from api.config import api_config

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Register a new user.

    - **email**: Valid email address (unique)
    - **password**: Minimum 8 characters
    - **full_name**: User's full name
    """
    # Check if user already exists
    existing_user = AuthService.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user = AuthService.create_user(db, user_data)

    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: Session = Depends(get_db),
):
    """
    Authenticate user and return tokens.

    - **email**: Registered email address
    - **password**: User's password

    Returns access token (15 min) and refresh token (7 days).
    """
    user = AuthService.authenticate_user(db, credentials.email, credentials.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create tokens
    token_data = {"sub": user.id}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=api_config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: TokenRefreshRequest,
    db: Session = Depends(get_db),
):
    """
    Refresh access token using refresh token.

    - **refresh_token**: Valid refresh token
    """
    payload = decode_token(request.refresh_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    # Verify user still exists and is active
    user_id = payload.get("sub")
    user = AuthService.get_user_by_id(db, user_id)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Create new tokens
    token_data = {"sub": user.id}
    access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=api_config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user=Depends(get_current_user),
):
    """
    Get current authenticated user's information.

    Requires valid access token in Authorization header.
    """
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_user=Depends(get_current_user),
):
    """
    Logout user (client should discard tokens).

    Note: JWT tokens are stateless, so server-side invalidation
    would require a token blacklist (not implemented).
    """
    # In a production system, you might add the token to a blacklist
    # For now, the client is responsible for discarding tokens
    return None
