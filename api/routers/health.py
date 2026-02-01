"""
Health check endpoints.
"""
from fastapi import APIRouter

from api.services.rag_service import get_rag_service
from api.services.cache_service import query_cache

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns service status and component health.
    """
    # Check RAG service
    try:
        rag_service = get_rag_service()
        stats = rag_service.get_stats()
        rag_status = "healthy" if stats["status"] == "ready" else "degraded"
        rag_details = {
            "status": rag_status,
            "document_count": stats["document_count"],
        }
    except Exception as e:
        rag_status = "unhealthy"
        rag_details = {
            "status": "unhealthy",
            "error": str(e),
        }

    # Check cache
    cache_stats = query_cache.get_stats()

    return {
        "status": "healthy" if rag_status == "healthy" else "degraded",
        "version": "1.0.0",
        "components": {
            "rag": rag_details,
            "cache": {
                "status": "healthy",
                "size": cache_stats["size"],
                "hit_rate": f"{cache_stats['hit_rate_percent']}%",
            },
        },
    }


@router.get("/")
async def root():
    """
    API root endpoint.

    Returns API information and documentation links.
    """
    return {
        "name": "DR-RAG API",
        "description": "Homeopathy Remedy Finder API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
