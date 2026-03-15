# DR-RAG — Homeopathic Repertorization Assistant

> An AI-powered clinical decision-support tool for homeopathic practitioners. Describe a patient's symptoms in plain language (or speak in Hindi / Marathi) and receive a structured repertorization table with remedy analysis drawn from seven classical and modern reference texts.

---

## Features

| Feature | Description |
|---|---|
| **Repertorization table** | Structured symptom × remedy matrix with totals, graded by source |
| **7 knowledge sources** | Kent, Phatak, Dube, Fredrick's Synthesis, Body Language, Mind Rubric Dictionary |
| **Streaming responses** | Token-by-token output via Server-Sent Events |
| **Voice input** | Speak in Hindi or Marathi — Whisper translates to English before querying |
| **Query caching** | Identical queries served from cache (24 h TTL) |
| **JWT authentication** | Access + refresh token flow with auto-renewal |
| **Admin panel** | Global UI toggles + per-user feature access control (ACL matrix) |
| **Saved rubrics** | Bookmark any response for later reference |
| **History** | Last 50 queries stored locally per session |
| **5 UI themes** | Teal (default), Blue, Purple, Rose, Dark |

---

## Knowledge Sources

| # | File | Type | Description |
|---|------|------|-------------|
| 1 | `kentbook.txt` | Materia Medica | Kent's Materia Medica — narrative remedy portraits |
| 2 | `kent-repertory.txt` | Repertory | Kent's Repertory — classic symptom-to-remedy index |
| 3 | `Phatak.txt` | Repertory | Phatak's Concise Repertory — compact, alphabetical |
| 4 | `Dube.txt` | Materia Medica | Dube's Materia Medica — structured with numbered guiding symptoms |
| 5 | `final mind rubric interpretation .txt` | Dictionary | Mind Rubric Interpretation — 526 mental symptom definitions |
| 6 | `body-language.txt` | Repertory | Clinical Repertory of Body Language — non-verbal observational symptoms |
| 7 | `Fedrick.txt` | Repertory | Fredrick's Synthesis Repertory — modern comprehensive repertory |

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
   ├── /api/v1/voice     — Whisper audio transcription
   └── /api/v1/admin     — Settings + per-user ACL
        │
        ├── ChromaDB vector store  (20 000+ chunks)
        ├── HuggingFace embeddings (all-MiniLM-L6-v2, CPU)
        ├── Gemini 2.5 Flash via OpenRouter
        └── faster-whisper base model (int8, CPU)
```

---

## Self-Hosted Deployment (AWS Lightsail / any Ubuntu VPS)

### Prerequisites

- Ubuntu 20.04+ server (2 GB RAM minimum recommended)
- Docker + Docker Compose installed
- Ports 80 and 443 open in the firewall / security group

### 1. Clone and configure

```bash
git clone https://github.com/fzpathan/dr-rag-project.git
cd dr-rag-project
```

Create a `.env` file:

```env
# LLM — OpenRouter (recommended)
USE_OPENROUTER=true
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=google/gemini-2.5-flash-preview

# Auth
JWT_SECRET_KEY=<generate with: openssl rand -hex 32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Embeddings
USE_OPENAI_EMBEDDINGS=false
```

### 2. Build and start

```bash
docker compose up -d --build
```

> The first build ingests all seven knowledge sources into ChromaDB (~20 000 chunks). This takes several minutes.

### 3. Set up HTTPS (self-signed, no domain required)

```bash
bash setup-selfsigned-ssl.sh
```

This generates a 10-year self-signed certificate and restarts nginx. Visit `https://<your-server-ip>` and click **Advanced → Proceed** once to accept the certificate. Voice input requires HTTPS.

### 4. Create the admin account

```bash
docker compose cp seed_admin.py api:/app/seed_admin.py
docker compose exec api python seed_admin.py
```

Default admin credentials:

```
Email:    admin@drrag.com
Password: OmSaiRam123!
```

> Change the password after first login.

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
- **Advanced Options** — top-k retrieval control
- **Processing Time** — response time badge
- **Theme** — colour scheme applied globally

### Per-User Access Control (ACL Matrix)
Each user has a row; each feature has a column. Toggle cells to grant or restrict access per user:

- **Faded toggle** — user inherits the global default
- **Solid toggle** — user has an explicit override

Use this to offer tiered access (e.g. voice-only on a higher plan, analysis disabled for basic users).

---

## Voice Input

Click the microphone button on the query page. Supported languages:

| Option | Behaviour |
|--------|-----------|
| Auto-detect | Whisper detects language automatically |
| Hindi | Transcribes Hindi speech → English text |
| Marathi | Transcribes Marathi speech → English text |
| English | Transcribes English speech directly |

Whisper's `translate` task converts all speech to English in one step before the RAG query runs. The base model (~150 MB) downloads on first use and is cached in a Docker volume.

---

## Local Development

```bash
# Install all dependencies
pip install -r requirements.txt -r api_requirements.txt

# Set environment variables (see .env example above)
cp .env.example .env   # then edit with your keys

# Ingest knowledge sources into ChromaDB
python ingest.py --reset

# Start the API
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

API docs (Swagger UI): `http://localhost:8000/docs`

Serve the frontend locally by opening `frontend/index.html` directly in a browser, or with any static file server pointed at the `frontend/` directory.

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
│   │   ├── voice.py        # Whisper transcription endpoint
│   │   └── admin.py        # Settings + per-user ACL
│   └── services/
│       ├── rag_service.py  # ChromaDB retrieval + LLM chain
│       └── voice_service.py# faster-whisper singleton
├── src/
│   ├── config.py           # Environment configuration
│   ├── document_loader.py  # Text chunking and loading
│   ├── llm_chain.py        # Prompt template + LLM integration
│   └── retriever.py        # Vector store retrieval
├── frontend/               # Plain HTML/JS SPA (served by nginx)
│   ├── index.html
│   ├── app.js
│   └── style.css
├── data/                   # Knowledge source text files
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
| LLM | Gemini 2.5 Flash (via OpenRouter) |
| Embeddings | `all-MiniLM-L6-v2` (HuggingFace, CPU) |
| Vector store | ChromaDB |
| Orchestration | LangChain |
| Backend | FastAPI + uvicorn |
| Auth | JWT (python-jose) |
| Voice | faster-whisper (base, int8, CPU) |
| Database | SQLite (via SQLAlchemy) |
| Frontend | Vanilla HTML / CSS / JS + marked.js |
| Reverse proxy | nginx |
| Containerisation | Docker + Docker Compose |
