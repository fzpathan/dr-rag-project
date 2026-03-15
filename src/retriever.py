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

    # Common stopwords to exclude from keyword extraction
    _STOPWORDS = {
        "a", "an", "the", "for", "with", "and", "or", "of", "in", "to",
        "is", "it", "by", "on", "at", "from", "that", "this", "be", "as",
        "are", "was", "were", "been", "have", "has", "had", "do", "does",
        "did", "but", "not", "no", "what", "which", "who", "how", "when",
        "where", "can", "could", "would", "should", "may", "might",
        "remedy", "remedies", "treatment", "medicine", "homeopathic",
    }

    def _extract_keywords(self, query: str) -> List[str]:
        """Extract meaningful keywords from query, excluding stopwords."""
        words = query.lower().split()
        return [w for w in words if w not in self._STOPWORDS and len(w) > 2]

    def retrieve(
        self,
        query: str,
        k: int = config.TOP_K_RESULTS,
        source_filter: List[str] = None,
    ) -> List[Tuple[Document, float]]:
        """
        Retrieve top-k relevant documents using hybrid search.

        First tries keyword-filtered similarity search for each keyword,
        then fills remaining slots with pure similarity search.

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

        # Extract keywords for hybrid matching
        keywords = self._extract_keywords(query)

        seen_ids = set()
        keyword_results = []

        # Keyword-filtered search: find docs containing key terms
        if keywords:
            collection = vs._collection
            for keyword in keywords[:3]:  # Limit to top 3 keywords
                try:
                    chroma_results = collection.query(
                        query_texts=[query],
                        where_document={"$contains": keyword},
                        n_results=k,
                        **({"where": filter_dict} if filter_dict else {}),
                    )
                    if chroma_results and chroma_results["ids"][0]:
                        for i, doc_id in enumerate(chroma_results["ids"][0]):
                            if doc_id not in seen_ids:
                                seen_ids.add(doc_id)
                                doc = Document(
                                    page_content=chroma_results["documents"][0][i],
                                    metadata=chroma_results["metadatas"][0][i] or {},
                                )
                                dist = chroma_results["distances"][0][i]
                                keyword_results.append((doc, dist))
                except Exception:
                    continue

        # Sort keyword results by distance (lower = more similar)
        keyword_results.sort(key=lambda x: x[1])

        # Fill remaining slots with pure similarity search
        if len(keyword_results) < k:
            semantic_results = vs.similarity_search_with_score(
                query, k=k, filter=filter_dict
            )
            for doc, score in semantic_results:
                if len(keyword_results) >= k:
                    break
                # Deduplicate by content
                content_key = doc.page_content[:100]
                if content_key not in {r[0].page_content[:100] for r in keyword_results}:
                    keyword_results.append((doc, score))

        return keyword_results[:k]

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
