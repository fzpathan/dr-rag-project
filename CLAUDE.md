# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DR-RAG is a Retrieval-Augmented Generation system for homeopathy remedy lookup. It consists of:
- **FastAPI backend** (`api/`) — JWT-authenticated REST API with query caching
- **Streamlit web UI** (`app.py`) — direct vector store interface for local use
- **React Native mobile app** (`dr-rag-mobile/`) — Expo-based client with voice input
- **RAG pipeline** (`src/`) — ChromaDB vector store + LLM chain

## Commands

### Backend
```bash
# Install dependencies
pip install -r requirements.txt -r api_requirements.txt

# Ingest documents into vector store
python ingest.py                    # Process data/ directory
python ingest.py --reset            # Clear and rebuild
python ingest.py --data-dir /path   # Custom directory

# Run API server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
# Docs at http://localhost:8000/docs

# Streamlit web UI
streamlit run app.py

# Seed test user (test@example.com / password123)
python seed_dummy_user.py
```

### Mobile App
```bash
cd dr-rag-mobile
npm install
npm start           # Expo dev server
npm run android
npm run ios
```

### Docker
```bash
docker compose up -d --build        # Local dev (API + Nginx + Certbot)
gcloud builds submit --config cloudbuild.yaml  # Deploy to Cloud Run
```

## Architecture

### Data Flow
```
Client (Mobile/Streamlit)
  → FastAPI /api/v1/query
  → CacheService (SHA256 key, 24h TTL)
  → RAGService (singleton)
      → Retriever → ChromaDB similarity search
      → LLMChain → OpenRouter/OpenAI/Ollama
  → JSON response with citations
```

### RAG Pipeline (`src/`)
- `config.py` — central config: embedding model (`all-MiniLM-L6-v2`), ChromaDB collection name, paths
- `vector_store.py` — ChromaDB wrapper (create/load/add docs)
- `retriever.py` — similarity search with optional source filtering, context formatting
- `llm_chain.py` — supports OpenAI, OpenRouter (free models), or local Ollama
- `document_loader.py` — loads TXT/PDF from `data/` with metadata (book_name, source, page)
- `text_splitter.py` — 1000-char chunks, 200 overlap, preserves remedy/citation metadata

### API Layer (`api/`)
- `main.py` — FastAPI app, lifespan handlers, CORS, route registration
- `routers/auth.py` — register, login, refresh, logout, /me
- `routers/query.py` — POST /api/v1/query, GET /sources, /stats, /cache-stats, POST /cache-clear
- `services/rag_service.py` — singleton wrapping VectorStoreManager + Retriever + LLMChain
- `services/cache_service.py` — LRU cache, thread-safe, normalized query keys
- `database.py` — SQLAlchemy: `users` and `query_history` tables (SQLite by default)

### Key Design Decisions
- The vector store is built **at Docker image build time** (builder stage in Dockerfile), not at runtime. If source documents change, rebuild the image.
- The HuggingFace embedding model cache is also baked into the image to avoid download on cold start.
- RAGService is a singleton — initialized once on FastAPI startup via lifespan handler.
- JWT: 15-min access tokens, 7-day refresh tokens.

## Environment Variables

**Required:**
- `JWT_SECRET_KEY` — generate with `openssl rand -hex 32`

**LLM (choose one):**
- `OPENROUTER_API_KEY` + `USE_OPENROUTER=true` — free tier models
- `OPENAI_API_KEY` — paid
- `OLLAMA_BASE_URL` + `OLLAMA_MODEL` — local

**Optional:**
- `CORS_ORIGINS` — comma-separated (defaults include localhost:8081)
- `DATABASE_URL` — defaults to SQLite `api_users.db`
- `USE_OPENAI_EMBEDDINGS` — use OpenAI instead of local HuggingFace

## Deployment

Targets: Google Cloud Run (primary via `cloudbuild.yaml`), GCP VM (via `deploy.sh`), or any Docker host. Cloud Run uses Secret Manager for `OPENROUTER_API_KEY` and `JWT_SECRET_KEY`, scales 0–3 instances with 2Gi memory.
