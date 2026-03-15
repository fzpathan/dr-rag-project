"""
API routers.
"""
from api.routers.auth import router as auth_router
from api.routers.query import router as query_router
from api.routers.health import router as health_router
from api.routers.admin import router as admin_router
from api.routers.voice import router as voice_router

__all__ = [
    "auth_router",
    "query_router",
    "health_router",
    "admin_router",
    "voice_router",
]
