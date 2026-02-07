FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first (for Docker layer caching)
COPY requirements.txt api_requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt -r api_requirements.txt

# Pre-download the sentence-transformers model so it's baked into the image
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application code
COPY src/ ./src/
COPY api/ ./api/
COPY data/ ./data/
COPY ingest.py seed_dummy_user.py ./

# Copy vectorstore if it exists (pre-built embeddings)
COPY vectorstore/ ./vectorstore/

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Create volume mount point for persistent data
RUN mkdir -p /data

# Expose port
EXPOSE 8080

# Run via startup script
CMD ["./start.sh"]
