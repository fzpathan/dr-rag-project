"""
RAG service wrapping existing retriever and chain.
"""
import time
import logging
from typing import Dict, Any, List, Optional, Tuple
import uuid

from src.vector_store import VectorStoreManager
from src.retriever import RemedyRetriever
from src.llm_chain import RemedyChain
from src.utils import sanitize_query

logger = logging.getLogger(__name__)


class RAGService:
    """
    Service for RAG operations.

    Wraps the existing VectorStoreManager, RemedyRetriever, and RemedyChain
    for use in the FastAPI endpoints.
    """

    _instance = None
    _initialized = False

    def __new__(cls):
        """Singleton pattern to avoid reinitializing the vector store."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize RAG components (only once due to singleton)."""
        if RAGService._initialized:
            return

        logger.info("Initializing RAG service...")

        try:
            self.vs_manager = VectorStoreManager()
            self.retriever = RemedyRetriever(self.vs_manager)
            self.chain = RemedyChain()

            # Load vector store
            vs = self.vs_manager.get_vectorstore()
            if vs is None:
                logger.warning("Vector store not found. Run ingest.py first.")
            else:
                stats = self.vs_manager.get_collection_stats()
                logger.info(f"Vector store loaded: {stats}")

            RAGService._initialized = True
            logger.info("RAG service initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {e}")
            raise

    def query(
        self,
        question: str,
        source_filter: Optional[List[str]] = None,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Execute a RAG query.

        Args:
            question: User's query
            source_filter: Optional list of source books to filter by
            top_k: Number of documents to retrieve

        Returns:
            Query response dict with answer, citations, etc.
        """
        start_time = time.time()
        query_id = str(uuid.uuid4())

        try:
            # Sanitize query
            clean_query = sanitize_query(question)
            logger.info(f"Processing query [{query_id}]: {clean_query[:50]}...")

            # Retrieve context
            context, citations, documents = self.retriever.retrieve_as_context(
                clean_query,
                k=top_k,
                source_filter=source_filter,
            )

            if not context:
                return {
                    "id": query_id,
                    "question": question,
                    "answer": "No relevant information found in the knowledge base for this query.",
                    "citations": [],
                    "sources_used": [],
                    "processing_time_ms": int((time.time() - start_time) * 1000),
                }

            # Generate response
            answer, used_citations = self.chain.generate_response(
                clean_query,
                context,
                citations,
            )

            # Extract unique sources
            sources_used = list(set(
                doc.metadata.get("book_name", "Unknown")
                for doc in documents
            ))

            # Format citations for response
            formatted_citations = []
            for doc in documents:
                formatted_citations.append({
                    "source": doc.metadata.get("book_name", "Unknown"),
                    "page": doc.metadata.get("page_number"),
                    "excerpt": doc.page_content[:300] + "..." if len(doc.page_content) > 300 else doc.page_content,
                })

            processing_time = int((time.time() - start_time) * 1000)
            logger.info(f"Query [{query_id}] completed in {processing_time}ms")

            return {
                "id": query_id,
                "question": question,
                "answer": answer,
                "citations": formatted_citations,
                "sources_used": sources_used,
                "processing_time_ms": processing_time,
            }

        except ValueError as e:
            logger.warning(f"Query validation error: {e}")
            raise
        except Exception as e:
            logger.error(f"Query error [{query_id}]: {e}")
            raise

    def get_sources(self) -> List[str]:
        """Get list of available source books."""
        return self.vs_manager.list_sources()

    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics."""
        stats = self.vs_manager.get_collection_stats()
        sources = self.get_sources()

        return {
            "status": stats.get("status", "unknown"),
            "document_count": stats.get("count", 0),
            "collection_name": stats.get("name", "unknown"),
            "sources": sources,
        }


# Global RAG service instance (singleton)
def get_rag_service() -> RAGService:
    """Get the RAG service instance."""
    return RAGService()
