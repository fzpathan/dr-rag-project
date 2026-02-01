# DR-RAG API

FastAPI backend for the DR-RAG Mobile Application.

## Features

- **JWT Authentication**: Secure email/password authentication
- **RAG Query Endpoint**: AI-powered remedy recommendations
- **Query Caching**: Intelligent caching for faster repeated queries
- **Speech-to-Text**: OpenAI Whisper integration for voice transcription
- **Auto-generated Docs**: Swagger UI at `/docs`

## Setup

### 1. Install Dependencies

```bash
# Install API dependencies
pip install -r api_requirements.txt

# Note: This assumes the main requirements.txt is already installed
pip install -r requirements.txt
```

### 2. Configure Environment

Add the following to your `.env` file:

```bash
# REQUIRED: JWT Secret Key (generate with: openssl rand -hex 32)
JWT_SECRET_KEY=your-secret-key-here

# LLM Configuration (choose one)
USE_OPENROUTER=true
OPENROUTER_API_KEY=your-key

# OR
OPENAI_API_KEY=sk-your-key
```

### 3. Initialize Database

The database is automatically created on first run. Default location: `./api_users.db`

### 4. Run the Server

```bash
# Development (with auto-reload)
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login, returns JWT tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user info |

### Query

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/query` | Submit remedy query (cached) |
| GET | `/api/v1/query/sources` | List available source books |
| GET | `/api/v1/query/stats` | Get knowledge base statistics |
| GET | `/api/v1/query/cache-stats` | Get cache statistics |

### Speech

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/speech/transcribe` | Transcribe audio to text |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/` | API info |

## Example Usage

### Register

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "full_name": "John Doe"}'
```

### Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Query

```bash
curl -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"question": "headache with fear and restlessness", "top_k": 5}'
```

## Caching

- Query results are cached for 24 hours (configurable)
- Cache key is based on normalized query + source filter
- LRU eviction when cache reaches max size (1000 entries default)
- Cache can be cleared via `/api/v1/query/cache-clear`

## Deployment

### Railway / Render

1. Set environment variables in the dashboard
2. Use the following start command:
   ```bash
   uvicorn api.main:app --host 0.0.0.0 --port $PORT
   ```

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt api_requirements.txt ./
RUN pip install -r requirements.txt -r api_requirements.txt

COPY . .

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Project Structure

```
api/
├── main.py              # FastAPI app entry point
├── config.py            # API configuration
├── database.py          # SQLAlchemy setup
├── dependencies.py      # Auth dependencies
├── models/              # Pydantic models
├── routers/             # API endpoints
├── services/            # Business logic
└── utils/               # Security utilities
```
