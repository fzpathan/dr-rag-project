"""
API routers.
"""
from api.routers.auth import router as auth_router
from api.routers.query import router as query_router
from api.routers.health import router as health_router
from api.routers.admin import router as admin_router
from api.routers.voice import router as voice_router
from api.routers.history import router as history_router
from api.routers.saved import router as saved_router
from api.routers.patients import router as patients_router
from api.routers.payments import router as payments_router

__all__ = [
    "auth_router",
    "query_router",
    "health_router",
    "admin_router",
    "voice_router",
    "history_router",
    "saved_router",
    "patients_router",
    "payments_router",
]
