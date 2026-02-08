# DR-RAG: Homeopathy Remedy Finder
# Optimized for Google Cloud Run deployment

# ── Stage 1: Build & ingest ──────────────────────────────────────────────────
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies (cached layer)
COPY requirements.txt api_requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r api_requirements.txt

# Copy source needed for ingestion
COPY src/ src/
COPY data/ data/
COPY ingest.py ./

# Build vectorstore at image build time
RUN python ingest.py --reset

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy built vectorstore from builder
COPY --from=builder /app/vectorstore vectorstore/

# Copy HuggingFace model cache so it isn't re-downloaded at runtime
COPY --from=builder /root/.cache/huggingface /root/.cache/huggingface

# Copy application source
COPY src/ src/
COPY api/ api/
COPY app.py ingest.py ./

# Cloud Run injects PORT (default 8080)
ENV PORT=8080
EXPOSE ${PORT}

# Start FastAPI, reading PORT from environment
CMD exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT}
