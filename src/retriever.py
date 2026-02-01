"""
Document retrieval with configurable parameters.
"""
from typing import List, Tuple

from langchain_core.documents import Document

from src.vector_store import VectorStoreManager
from src.config import config


class RemedyRetriever:
    """Retrieves relevant remedy information from the vector store."""

    def __init__(self, vector_store_manager: VectorStoreManager):
        self.vs_manager = vector_store_manager

    def retrieve(
        self,
        query: str,
        k: int = config.TOP_K_RESULTS,
        source_filter: List[str] = None,
    ) -> List[Tuple[Document, float]]:
        """
        Retrieve top-k relevant documents for a query.

        Args:
            query: Search query string
            k: Number of results to retrieve
            source_filter: Optional list of book names to filter by

        Returns:
            List of (Document, similarity_score) tuples
            Lower scores indicate higher similarity in Chroma
        """
        vs = self.vs_manager.get_vectorstore()
        if vs is None:
            raise ValueError("Vector store not initialized")

        # Build filter for source books if provided
        filter_dict = None
        if source_filter and len(source_filter) > 0:
            if len(source_filter) == 1:
                filter_dict = {"book_name": source_filter[0]}
            else:
                filter_dict = {"book_name": {"$in": source_filter}}

        # Use similarity search with scores
        results = vs.similarity_search_with_score(query, k=k, filter=filter_dict)

        return results

    def retrieve_filtered(
        self,
        query: str,
        k: int = config.TOP_K_RESULTS,
        max_distance: float = 1.5,
    ) -> List[Tuple[Document, float]]:
        """
        Retrieve documents filtered by similarity threshold.

        Args:
            query: Search query string
            k: Number of results to retrieve
            max_distance: Maximum distance threshold (lower = more similar)

        Returns:
            Filtered list of (Document, similarity_score) tuples
        """
        results = self.retrieve(query, k)

        # Filter by distance threshold
        filtered_results = [
            (doc, score) for doc, score in results if score <= max_distance
        ]

        return filtered_results

    def retrieve_as_context(
        self,
        query: str,
        k: int = config.TOP_K_RESULTS,
        source_filter: List[str] = None,
    ) -> Tuple[str, List[str], List[Document]]:
        """
        Retrieve documents and format as context string.

        Args:
            query: Search query string
            k: Number of results to retrieve
            source_filter: Optional list of book names to filter by

        Returns:
            Tuple of (context_string, list_of_citations, list_of_documents)
        """
        results = self.retrieve(query, k, source_filter=source_filter)

        if not results:
            return "", [], []

        context_parts = []
        citations = []
        documents = []

        for idx, (doc, score) in enumerate(results, 1):
            citation = doc.metadata.get("citation", f"Source {idx}")
            citations.append(citation)
            documents.append(doc)

            # Format each source with clear separation
            context_parts.append(
                f"[Source {idx}: {citation}]\n{doc.page_content}\n"
            )

        context = "\n---\n".join(context_parts)
        return context, citations, documents
