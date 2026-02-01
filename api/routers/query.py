"""
Query endpoints for RAG operations.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status

from api.models.query import (
    QueryRequest,
    QueryResponse,
    Citation,
    SourcesResponse,
    StatsResponse,
)
from api.services.rag_service import get_rag_service, RAGService
from api.services.cache_service import query_cache
from api.dependencies import get_current_user

router = APIRouter(prefix="/query", tags=["Query"])


@router.post("", response_model=QueryResponse)
async def query_remedy(
    request: QueryRequest,
    current_user=Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service),
):
    """
    Submit a remedy query to the RAG system.

    - **question**: The symptom or condition query (2-500 characters)
    - **source_filter**: Optional list of source books to search
    - **top_k**: Number of documents to retrieve (1-20, default 5)

    Returns AI-generated remedy recommendations with citations.
    Results are cached for 24 hours to improve response times.
    """
    # Check cache first
    cached_response = query_cache.get(request.question, request.source_filter)

    if cached_response:
        return QueryResponse(
            id=cached_response["id"],
            question=request.question,
            answer=cached_response["answer"],
            citations=[Citation(**c) for c in cached_response["citations"]],
            sources_used=cached_response["sources_used"],
            processing_time_ms=cached_response["processing_time_ms"],
            cached=True,
            created_at=datetime.utcnow(),
        )

    try:
        # Execute RAG query
        result = rag_service.query(
            question=request.question,
            source_filter=request.source_filter,
            top_k=request.top_k,
        )

        # Cache the result
        query_cache.set(request.question, result, request.source_filter)

        return QueryResponse(
            id=result["id"],
            question=result["question"],
            answer=result["answer"],
            citations=[Citation(**c) for c in result["citations"]],
            sources_used=result["sources_used"],
            processing_time_ms=result["processing_time_ms"],
            cached=False,
            created_at=datetime.utcnow(),
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process query. Please try again.",
        )


@router.get("/sources", response_model=SourcesResponse)
async def get_sources(
    current_user=Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service),
):
    """
    Get list of available source books in the knowledge base.

    Use these source names in the `source_filter` parameter
    when submitting queries to filter results.
    """
    sources = rag_service.get_sources()

    return SourcesResponse(
        sources=sources,
        count=len(sources),
    )


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    current_user=Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service),
):
    """
    Get statistics about the knowledge base.

    Returns document count, collection name, and available sources.
    """
    stats = rag_service.get_stats()

    return StatsResponse(
        status=stats["status"],
        document_count=stats["document_count"],
        collection_name=stats["collection_name"],
        sources=stats["sources"],
    )


@router.get("/cache-stats")
async def get_cache_stats(
    current_user=Depends(get_current_user),
):
    """
    Get cache statistics.

    Shows cache size, hit rate, and configuration.
    """
    return query_cache.get_stats()


@router.post("/cache-clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cache(
    current_user=Depends(get_current_user),
):
    """
    Clear the query cache.

    Use this after updating the knowledge base.
    """
    query_cache.invalidate()
    return None
