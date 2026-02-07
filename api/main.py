"""
FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import api_config
from api.database import create_tables
from api.routers import auth_router, query_router, health_router
from api.services.rag_service import get_rag_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.

    Runs on startup and shutdown.
    """
    # Startup
    logger.info("Starting DR-RAG API...")

    # Create database tables
    create_tables()
    logger.info("Database tables created")

    # Initialize RAG service (preload vector store)
    try:
        rag_service = get_rag_service()
        stats = rag_service.get_stats()
        logger.info(f"RAG service initialized: {stats['document_count']} documents")
    except Exception as e:
        logger.warning(f"RAG service initialization warning: {e}")

    logger.info("DR-RAG API started successfully")

    yield

    # Shutdown
    logger.info("Shutting down DR-RAG API...")


# Create FastAPI application
app = FastAPI(
    title="DR-RAG API",
    description="""
    ## Homeopathy Remedy Finder API

    This API provides access to the DR-RAG (Homeopathy Remedy Finder) system
    through a RESTful interface designed for mobile applications.

    ### Features

    - **User Authentication**: JWT-based authentication with email/password
    - **Remedy Queries**: AI-powered remedy recommendations from classical texts
    - **Caching**: Intelligent caching for faster repeated queries

    ### Authentication

    Most endpoints require authentication. Include the JWT access token
    in the Authorization header:

    ```
    Authorization: Bearer <access_token>
    ```

    ### Rate Limits

    - Queries: Cached for 24 hours to reduce load

    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=api_config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(query_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
