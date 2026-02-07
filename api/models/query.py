"""
Query Pydantic models.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class Citation(BaseModel):
    """Citation from a source document."""
    source: str
    page: Optional[int] = None
    excerpt: str


class QueryRequest(BaseModel):
    """Request model for remedy query."""
    question: str = Field(..., min_length=2, max_length=500)
    source_filter: Optional[List[str]] = None
    top_k: int = Field(default=5, ge=1, le=20)


class QueryResponse(BaseModel):
    """Response model for remedy query."""
    id: str
    question: str
    answer: str
    citations: List[Citation]
    sources_used: List[str]
    processing_time_ms: int
    cached: bool
    created_at: datetime


class SourcesResponse(BaseModel):
    """Response model for available sources."""
    sources: List[str]
    count: int


class StatsResponse(BaseModel):
    """Response model for knowledge base statistics."""
    status: str
    document_count: int
    collection_name: str
    sources: List[str]


