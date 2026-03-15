# DR-RAG — Homeopathic Repertorization Assistant

> An AI-powered clinical decision-support tool for homeopathic practitioners. Describe a patient's symptoms in plain language (or speak in Hindi / Marathi) and receive a structured repertorization table with remedy analysis drawn from a curated corpus of classical and modern homeopathic reference texts.

---

## Features

| Feature | Description |
|---|---|
| **Repertorization table** | Structured symptom × remedy matrix with totals, graded by source |
| **Multi-source knowledge base** | Curated corpus of classical materia medica, repertories, and reference texts |
| **Streaming responses** | Token-by-token output via Server-Sent Events |
| **Voice input** | Speak in Hindi or Marathi — automatically translated to English before querying |
| **Query caching** | Identical queries served from cache (24 h TTL) |
| **JWT authentication** | Access + refresh token flow with auto-renewal |
| **Admin panel** | Global UI toggles + per-user feature access control (ACL matrix) |
| **Saved rubrics** | Bookmark any response for later reference |
| **History** | Last 50 queries stored locally per session |
| **5 UI themes** | Teal (default), Blue, Purple, Rose, Dark |

---

## Architecture

```
Browser (plain HTML/JS SPA)
        │  HTTPS (nginx)
        ▼
nginx reverse proxy
        │  HTTP (internal Docker network)
        ▼
FastAPI (uvicorn)
   ├── /api/v1/auth      — JWT login / register / refresh
   ├── /api/v1/query     — RAG query + SSE streaming
   ├── /api/v1/voice     — Audio transcription
   └── /api/v1/admin     — Settings + per-user ACL
        │
        ├── ChromaDB vector store
        ├── HuggingFace sentence embeddings (CPU)
        ├── LLM via API
        └── Whisper speech model (CPU)
```

---

## Self-Hosted Deployment

### Prerequisites

- Ubuntu 20.04+ server (2 GB RAM minimum recommended)
- Docker + Docker Compose installed
- Ports 80 and 443 open in the firewall / security group

### 1. Clone and configure

```bash
git clone <repository-url>
cd dr-rag-project
```

Create a `.env` file:

```env
# LLM provider
USE_OPENROUTER=true
OPENROUTER_API_KEY=<your-api-key>
OPENROUTER_MODEL=<your-preferred-model>

# Auth
JWT_SECRET_KEY=<generate with: openssl rand -hex 32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Embeddings
USE_OPENAI_EMBEDDINGS=false
```

### 2. Add knowledge sources

Place your licensed text files in the `data/` directory. The ingest pipeline accepts plain `.txt` files and will chunk and embed them automatically during the build step.

### 3. Build and start

```bash
docker compose up -d --build
```

> The first build ingests all knowledge sources into ChromaDB. This may take several minutes depending on corpus size.

### 4. Set up HTTPS (self-signed, no domain required)

```bash
bash setup-selfsigned-ssl.sh
```

Generates a self-signed certificate and restarts nginx. Visit `https://<your-server-ip>` and accept the certificate warning once in your browser. Voice input requires HTTPS.

### 5. Create the admin account

Edit `seed_admin.py` to set your desired admin email and password, then run:

```bash
docker compose cp seed_admin.py api:/app/seed_admin.py
docker compose exec api python seed_admin.py
```

---

## Admin Panel

Log in as admin and navigate to **Admin** in the sidebar.

### Global Defaults
Toggle features on or off for all users:

- **Voice Input** — microphone + Hindi/Marathi transcription
- **Analysis Section** — narrative paragraph below the repertorization table
- **Source Citations** — collapsible citation cards
- **History** — query history tab
- **Saved Rubrics** — bookmark tab
- **Advanced Options** — retrieval depth control
- **Processing Time** — response time badge
- **Theme** — colour scheme applied globally

### Per-User Access Control (ACL Matrix)
Each user has a row; each feature has a column. Toggle cells to grant or restrict access per user:

- **Faded toggle** — user inherits the global default
- **Solid toggle** — user has an explicit override

Use this to offer tiered access (e.g. voice input on a higher plan, analysis section disabled for basic users).

---

## Voice Input

Click the microphone button on the query page. Supported languages:

| Option | Behaviour |
|--------|-----------|
| Auto-detect | Language detected automatically |
| Hindi | Transcribes Hindi speech → English text |
| Marathi | Transcribes Marathi speech → English text |
| English | Transcribes English speech directly |

The speech model's `translate` task converts all input to English in one step before the RAG query runs. The model downloads on first use and is cached in a Docker volume.

---

## Local Development

```bash
# Install all dependencies
pip install -r requirements.txt -r api_requirements.txt

# Copy and configure environment variables
cp .env.example .env

# Ingest knowledge sources
python ingest.py --reset

# Start the API
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

API docs (Swagger UI): `http://localhost:8000/docs`

Serve the frontend by opening `frontend/index.html` in a browser or pointing any static file server at the `frontend/` directory.

---

## Project Structure

```
dr-rag-project/
├── api/                    # FastAPI application
│   ├── main.py             # App entry point, router registration
│   ├── database.py         # SQLAlchemy models (User, QueryHistory)
│   ├── dependencies.py     # Auth dependencies
│   ├── routers/
│   │   ├── auth.py         # Login, register, token refresh
│   │   ├── query.py        # RAG query + SSE streaming
│   │   ├── voice.py        # Audio transcription endpoint
│   │   └── admin.py        # Settings + per-user ACL
│   └── services/
│       ├── rag_service.py  # Vector store retrieval + LLM chain
│       └── voice_service.py# Speech transcription service
├── src/
│   ├── config.py           # Environment configuration
│   ├── document_loader.py  # Text chunking and loading
│   ├── llm_chain.py        # Prompt template + LLM integration
│   └── retriever.py        # Vector store retrieval
├── frontend/               # Plain HTML/JS SPA (served by nginx)
│   ├── index.html
│   ├── app.js
│   └── style.css
├── data/                   # Knowledge source text files (not included)
├── nginx/
│   ├── default.conf        # Reverse proxy + SSL config
│   └── ssl/                # Self-signed certificate (git-ignored)
├── docker-compose.yml
├── Dockerfile
├── ingest.py               # One-time vectorstore builder
└── seed_admin.py           # Creates the admin user
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | Configurable via API (OpenRouter / OpenAI compatible) |
| Embeddings | Sentence transformers (HuggingFace, CPU) |
| Vector store | ChromaDB |
| Orchestration | LangChain |
| Backend | FastAPI + uvicorn |
| Auth | JWT (python-jose) |
| Voice | faster-whisper (CPU) |
| Database | SQLite (via SQLAlchemy) |
| Frontend | Vanilla HTML / CSS / JS + marked.js |
| Reverse proxy | nginx |
| Containerisation | Docker + Docker Compose |
