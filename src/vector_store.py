"""
ChromaDB vector store operations.
"""
from pathlib import Path
from typing import List, Optional

from langchain_core.documents import Document
from langchain_chroma import Chroma

from src.config import config
from src.embeddings import get_embedding_model


class VectorStoreManager:
    """Manages ChromaDB vector store operations."""

    def __init__(
        self,
        persist_directory: Optional[Path] = None,
        collection_name: Optional[str] = None,
    ):
        self.persist_directory = persist_directory or config.VECTORSTORE_DIR
        self.collection_name = collection_name or config.CHROMA_COLLECTION_NAME
        self._embeddings = None
        self._vectorstore = None

    @property
    def embeddings(self):
        """Lazy load embeddings model."""
        if self._embeddings is None:
            self._embeddings = get_embedding_model()
        return self._embeddings

    def create_vectorstore(self, documents: List[Document]) -> Chroma:
        """
        Create new vector store from documents.
        Overwrites existing store if present.

        Args:
            documents: List of Document objects to index

        Returns:
            Chroma vector store instance
        """
        # Ensure directory exists
        self.persist_directory.mkdir(parents=True, exist_ok=True)

        print(f"Creating embeddings for {len(documents)} documents...")
        print("This may take a few minutes on first run...")

        self._vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=str(self.persist_directory),
            collection_name=self.collection_name,
        )

        print(f"Created vector store with {len(documents)} documents")
        return self._vectorstore

    def load_vectorstore(self) -> Optional[Chroma]:
        """Load existing vector store from disk."""
        if not self.persist_directory.exists():
            return None

        try:
            self._vectorstore = Chroma(
                persist_directory=str(self.persist_directory),
                embedding_function=self.embeddings,
                collection_name=self.collection_name,
            )
            return self._vectorstore
        except Exception as e:
            print(f"Error loading vector store: {e}")
            return None

    def get_vectorstore(self) -> Optional[Chroma]:
        """Get current vector store instance."""
        if self._vectorstore is None:
            self._vectorstore = self.load_vectorstore()
        return self._vectorstore

    def add_documents(self, documents: List[Document]):
        """Add documents to existing vector store."""
        vs = self.get_vectorstore()
        if vs is None:
            raise ValueError("No vector store exists. Create one first.")

        vs.add_documents(documents)
        print(f"Added {len(documents)} documents to vector store")

    def get_collection_stats(self) -> dict:
        """Get statistics about the vector store collection."""
        vs = self.get_vectorstore()
        if vs is None:
            return {"status": "not_initialized", "count": 0}

        try:
            collection = vs._collection
            count = collection.count()
            return {
                "status": "ready",
                "count": count,
                "name": self.collection_name,
            }
        except Exception as e:
            return {"status": "error", "count": 0, "error": str(e)}

    def list_sources(self) -> List[str]:
        """List unique source books in the collection."""
        vs = self.get_vectorstore()
        if vs is None:
            return []

        try:
            # Query all documents to get metadata
            results = vs._collection.get(include=["metadatas"])

            sources = set()
            for metadata in results.get("metadatas", []):
                if metadata and "book_name" in metadata:
                    sources.add(metadata["book_name"])

            return sorted(list(sources))
        except Exception as e:
            print(f"Error listing sources: {e}")
            return []

    def delete_collection(self):
        """Delete the entire collection."""
        vs = self.get_vectorstore()
        if vs is not None:
            try:
                vs._client.delete_collection(self.collection_name)
                self._vectorstore = None
                print(f"Deleted collection: {self.collection_name}")
            except Exception as e:
                print(f"Error deleting collection: {e}")
