"""
Data ingestion script for the RAG system.
Processes documents and creates/updates the vector store.

Usage:
    python ingest.py              # Process all files in data/
    python ingest.py --reset      # Clear and rebuild vector store
    python ingest.py --data-dir /path/to/docs  # Custom data directory
"""
import argparse
import shutil
import sys
from pathlib import Path

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from src.config import config
from src.document_loader import load_documents_from_directory
from src.text_splitter import MetadataPreservingTextSplitter
from src.vector_store import VectorStoreManager


def main():
    parser = argparse.ArgumentParser(
        description="Ingest documents into vector store for RAG system"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear existing vector store before ingestion",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=config.DATA_DIR,
        help="Directory containing source documents",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=config.CHUNK_SIZE,
        help=f"Chunk size for text splitting (default: {config.CHUNK_SIZE})",
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=config.CHUNK_OVERLAP,
        help=f"Chunk overlap for text splitting (default: {config.CHUNK_OVERLAP})",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("RAG Medical Remedy Finder - Data Ingestion")
    print("=" * 60)

    # Reset vector store if requested
    if args.reset and config.VECTORSTORE_DIR.exists():
        print(f"\nClearing existing vector store at {config.VECTORSTORE_DIR}")
        shutil.rmtree(config.VECTORSTORE_DIR)
        print("Vector store cleared.")

    # Step 1: Load documents
    print(f"\n[1/3] Loading documents from {args.data_dir}")
    print("-" * 40)

    documents = load_documents_from_directory(args.data_dir)

    if not documents:
        print("\nNo documents found. Please add documents to the data directory.")
        print(f"Expected location: {args.data_dir}")
        sys.exit(1)

    print(f"\nTotal documents loaded: {len(documents)}")

    # Step 2: Split into chunks
    print(f"\n[2/3] Splitting documents into chunks")
    print("-" * 40)
    print(f"  Chunk size: {args.chunk_size} characters")
    print(f"  Chunk overlap: {args.chunk_overlap} characters")

    splitter = MetadataPreservingTextSplitter(
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
    )
    chunks = splitter.split_documents(documents)

    print(f"\nTotal chunks created: {len(chunks)}")

    # Show sample chunk info
    if chunks:
        print("\nSample chunk metadata:")
        sample = chunks[0]
        for key, value in sample.metadata.items():
            if key != "source":  # Skip full path for readability
                print(f"  {key}: {value}")

    # Step 3: Create vector store
    print(f"\n[3/3] Creating vector store")
    print("-" * 40)
    print(f"  Embedding model: {config.EMBEDDING_MODEL}")
    print(f"  Persist directory: {config.VECTORSTORE_DIR}")
    print(f"  Collection name: {config.CHROMA_COLLECTION_NAME}")

    vs_manager = VectorStoreManager()
    vs_manager.create_vectorstore(chunks)

    # Print summary
    stats = vs_manager.get_collection_stats()
    sources = vs_manager.list_sources()

    print("\n" + "=" * 60)
    print("INGESTION COMPLETE")
    print("=" * 60)
    print(f"\nVector Store Statistics:")
    print(f"  Status: {stats['status']}")
    print(f"  Total chunks indexed: {stats['count']}")
    print(f"  Collection name: {stats['name']}")

    print(f"\nSource Books ({len(sources)}):")
    for source in sources:
        print(f"  - {source}")

    print("\n" + "-" * 60)
    print("Next steps:")
    print("  1. Create a .env file with your OPENAI_API_KEY")
    print("  2. Run: streamlit run app.py")
    print("-" * 60)


if __name__ == "__main__":
    main()
