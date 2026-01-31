"""
Streamlit web application for the RAG Medical Remedy Finder.

Usage:
    streamlit run app.py
"""
import sys
from pathlib import Path

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import streamlit as st

from src.config import config
from src.vector_store import VectorStoreManager
from src.retriever import RemedyRetriever
from src.llm_chain import RemedyChain
from src.document_loader import load_single_file
from src.text_splitter import MetadataPreservingTextSplitter
from src.utils import sanitize_query


# =============================================================================
# Page Configuration
# =============================================================================
st.set_page_config(
    page_title="Homeopathy Remedy Finder",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded",
)


# =============================================================================
# Cached Initialization
# =============================================================================
@st.cache_resource
def initialize_vector_store():
    """Initialize vector store manager (cached)."""
    return VectorStoreManager()


@st.cache_resource
def initialize_retriever(_vs_manager):
    """Initialize retriever (cached)."""
    return RemedyRetriever(_vs_manager)


@st.cache_resource
def initialize_chain():
    """Initialize LLM chain (cached)."""
    try:
        return RemedyChain()
    except ValueError as e:
        return None


# =============================================================================
# Main Application
# =============================================================================
def main():
    # Header
    st.title("🌿 Homeopathy Remedy Finder")
    st.markdown("*Search remedies across classical homeopathy textbooks using AI*")

    # Initialize components
    vs_manager = initialize_vector_store()
    vectorstore = vs_manager.load_vectorstore()

    # Check if vector store exists
    if vectorstore is None:
        st.error("⚠️ Vector store not found!")
        st.markdown(
            """
            ### Setup Required

            Please run the ingestion script first to process your documents:

            ```bash
            python ingest.py
            ```

            This will process the documents in the `data/` folder and create the search index.
            """
        )
        st.stop()

    # Initialize retriever
    retriever = initialize_retriever(vs_manager)

    # Check for API key and initialize chain
    chain = initialize_chain()
    api_key_missing = chain is None

    # ==========================================================================
    # Sidebar
    # ==========================================================================
    with st.sidebar:
        st.header("📚 Knowledge Base")

        # Statistics
        stats = vs_manager.get_collection_stats()
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Chunks", stats.get("count", 0))
        with col2:
            st.metric("Status", "Ready" if stats.get("status") == "ready" else "Error")

        st.divider()

        # Source books
        st.subheader("Source Books")
        sources = vs_manager.list_sources()
        if sources:
            for source in sources:
                st.markdown(f"• {source}")
        else:
            st.markdown("*No sources loaded*")

        st.divider()

        # Settings
        st.subheader("⚙️ Settings")
        num_results = st.slider(
            "Number of sources to retrieve",
            min_value=1,
            max_value=10,
            value=config.TOP_K_RESULTS,
            help="More sources provide broader context but may slow down responses",
        )

        show_sources = st.checkbox("Show source passages", value=True)

        st.divider()

        # File upload
        st.subheader("📤 Add Documents")
        uploaded_file = st.file_uploader(
            "Upload additional files",
            type=["txt", "pdf"],
            help="Upload homeopathy texts to expand the knowledge base",
        )

        if uploaded_file is not None:
            if st.button("Process Uploaded File", type="secondary"):
                with st.spinner("Processing document..."):
                    try:
                        # Save temporarily
                        temp_path = config.DATA_DIR / uploaded_file.name
                        with open(temp_path, "wb") as f:
                            f.write(uploaded_file.getvalue())

                        # Load and process
                        docs = load_single_file(temp_path)
                        splitter = MetadataPreservingTextSplitter()
                        new_chunks = splitter.split_documents(docs)

                        if new_chunks:
                            vs_manager.add_documents(new_chunks)
                            st.success(
                                f"✅ Added {len(new_chunks)} chunks from {uploaded_file.name}"
                            )
                            st.rerun()
                    except Exception as e:
                        st.error(f"Error processing file: {e}")

    # ==========================================================================
    # Main Content Area
    # ==========================================================================

    # API Key Warning
    if api_key_missing:
        st.warning(
            """
            ⚠️ **OpenAI API Key Required**

            To generate AI-powered responses, please:
            1. Create a `.env` file in the project root
            2. Add your API key: `OPENAI_API_KEY=sk-your-key-here`
            3. Restart the application

            You can still search and view source passages without the API key.
            """
        )

    # Search Section
    st.header("🔍 Search for Remedies")

    # Search input
    query = st.text_input(
        "Enter disease, symptom, or remedy name:",
        placeholder="e.g., headache with fear, rheumatic pain, Aconite indications...",
        key="search_query",
    )

    # Search button
    col1, col2, col3 = st.columns([1, 1, 4])
    with col1:
        search_button = st.button("Search", type="primary", use_container_width=True)
    with col2:
        clear_button = st.button("Clear", use_container_width=True)

    if clear_button:
        st.rerun()

    # Process search
    if search_button and query:
        try:
            clean_query = sanitize_query(query)

            with st.spinner("Searching through homeopathy texts..."):
                # Retrieve relevant chunks
                context, citations, documents = retriever.retrieve_as_context(
                    clean_query, k=num_results
                )

                if not context:
                    st.warning(
                        "No relevant information found in the corpus for this query."
                    )
                    st.info("Try rephrasing your search or using different keywords.")
                else:
                    # Generate AI response if chain is available
                    if chain is not None:
                        st.subheader("📋 Answer")

                        with st.spinner("Generating response..."):
                            response, used_citations = chain.generate_response(
                                clean_query, context, citations
                            )

                        st.markdown(response)

                        # Display citations
                        if used_citations:
                            st.subheader("📖 Sources Referenced")
                            for idx, citation in enumerate(used_citations, 1):
                                st.markdown(f"{idx}. {citation}")
                    else:
                        st.info(
                            "AI response generation unavailable. Showing source passages below."
                        )

                    # Show retrieved passages
                    if show_sources:
                        st.divider()
                        st.subheader("📄 Retrieved Passages")

                        for idx, doc in enumerate(documents, 1):
                            citation = doc.metadata.get("citation", f"Source {idx}")
                            book_name = doc.metadata.get("book_name", "Unknown")

                            with st.expander(f"**Source {idx}:** {citation}", expanded=idx == 1):
                                st.markdown(f"**Book:** {book_name}")
                                if "page_number" in doc.metadata:
                                    st.markdown(f"**Page:** {doc.metadata['page_number']}")
                                st.divider()
                                st.text(doc.page_content)

        except ValueError as e:
            st.error(str(e))
        except Exception as e:
            st.error(f"An error occurred: {str(e)}")
            st.info("Please check your configuration and try again.")

    # Footer
    st.divider()
    st.caption(
        """
        **Disclaimer:** This tool searches through homeopathic textbooks for educational purposes.
        Always consult a qualified healthcare practitioner for medical advice.
        """
    )


if __name__ == "__main__":
    main()
