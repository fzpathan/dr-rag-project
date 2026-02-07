FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first (Docker layer caching)
COPY requirements.txt api_requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt -r api_requirements.txt

# Pre-download the sentence-transformers model
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application code
COPY src/ ./src/
COPY api/ ./api/
COPY data/ ./data/
COPY vectorstore/ ./vectorstore/
COPY ingest.py seed_dummy_user.py ./

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
