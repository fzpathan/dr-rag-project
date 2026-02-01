"""
Security utilities for password hashing and JWT handling.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from jose import jwt, JWTError
import bcrypt

from api.config import api_config


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return bcrypt.hashpw(
        password.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')


def create_access_token(data: Dict[str, Any]) -> str:
    """
    Create an access token.

    Args:
        data: Data to encode in the token (should include 'sub' for user_id)

    Returns:
        Encoded JWT access token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=api_config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow(),
    })
    return jwt.encode(to_encode, api_config.JWT_SECRET_KEY, algorithm=api_config.JWT_ALGORITHM)


def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Create a refresh token.

    Args:
        data: Data to encode in the token (should include 'sub' for user_id)

    Returns:
        Encoded JWT refresh token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=api_config.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "iat": datetime.utcnow(),
    })
    return jwt.encode(to_encode, api_config.JWT_SECRET_KEY, algorithm=api_config.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a JWT token.

    Args:
        token: The JWT token to decode

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            api_config.JWT_SECRET_KEY,
            algorithms=[api_config.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None
