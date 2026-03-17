#!/usr/bin/env bash
# start.sh — Build and start DR-RAG services with checks at each step
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
fail() { echo -e "${RED}[✗] $*${NC}"; exit 1; }

# ─── 0. Preflight checks ─────────────────────────────────────────────────────

log "Checking .env file..."
[[ -f .env ]] || fail ".env file not found. Create it first."

if ! grep -q "OPENROUTER_API_KEY" .env; then
    warn "OPENROUTER_API_KEY not found in .env — LLM responses will be disabled"
fi
if ! grep -q "USE_OPENROUTER=true" .env; then
    warn "USE_OPENROUTER=true not set in .env — add it to enable OpenRouter"
fi
if ! grep -q "JWT_SECRET_KEY" .env; then
    fail "JWT_SECRET_KEY missing from .env. Generate with: openssl rand -hex 32"
fi

log "Checking Docker..."
docker info > /dev/null 2>&1 || fail "Docker is not running."

log "Checking available memory..."
FREE_MB=$(free -m | awk '/^Mem:/{print $7}')
if (( FREE_MB < 512 )); then
    warn "Only ${FREE_MB}MB free RAM. Build may be slow or fail. Consider stopping other processes."
else
    ok "${FREE_MB}MB free RAM"
fi

log "Checking swap..."
SWAP=$(free -m | awk '/^Swap:/{print $2}')
if (( SWAP < 1024 )); then
    warn "Swap is ${SWAP}MB. Recommend 2GB swap. Run:"
    warn "  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
else
    ok "Swap: ${SWAP}MB"
fi

log "Checking disk space..."
FREE_DISK=$(df -BG . | awk 'NR==2{print $4}' | tr -d 'G')
if (( FREE_DISK < 5 )); then
    fail "Only ${FREE_DISK}GB free disk space. Need at least 5GB."
else
    ok "${FREE_DISK}GB free disk space"
fi

# ─── 1. Stop existing containers ─────────────────────────────────────────────

log "Stopping existing containers..."
docker compose down --remove-orphans 2>/dev/null || true
ok "Containers stopped"

# ─── 2. Build API image and extract vectorstore ──────────────────────────────

log "Building API image (this includes ingesting documents — may take 10-20 min first time)..."
docker build -t dr-rag-api . 2>&1 | tail -5
ok "API image built"

log "Extracting vectorstore from API image..."
docker rm tmp-extract 2>/dev/null || true
docker create --name tmp-extract dr-rag-api
docker cp tmp-extract:/app/vectorstore ./vectorstore
docker rm tmp-extract
ok "Vectorstore extracted ($(du -sh vectorstore | cut -f1))"

# ─── 3. Fix .dockerignore if vectorstore is excluded ─────────────────────────

if grep -q "^vectorstore/" .dockerignore 2>/dev/null; then
    warn "Removing vectorstore/ from .dockerignore so Streamlit can copy it..."
    sed -i '/^vectorstore\//d' .dockerignore
    sed -i '/^# Pre-built vectorstore/d' .dockerignore
    ok ".dockerignore fixed"
fi

# ─── 4. Build all services ───────────────────────────────────────────────────

log "Building all Docker services..."
docker compose build 2>&1 | tail -5
ok "All images built"

# ─── 5. Start services ───────────────────────────────────────────────────────

log "Starting all services..."
docker compose up -d
ok "Services started"

# ─── 6. Health checks ────────────────────────────────────────────────────────

log "Waiting for services to be ready (up to 60s)..."

wait_for() {
    local name=$1
    local url=$2
    local retries=12
    for i in $(seq 1 $retries); do
        if curl -sf "$url" > /dev/null 2>&1; then
            ok "$name is up"
            return 0
        fi
        echo -n "."
        sleep 5
    done
    echo ""
    fail "$name did not become healthy after 60s. Check logs: docker compose logs $name"
}

wait_for "API"   "http://localhost:8000/health"
wait_for "Nginx" "http://localhost:80"

# ─── 7. Seed test user if DB is new ──────────────────────────────────────────

if ! docker compose exec -T api python -c "
from api.database import SessionLocal
from api.models import User
db = SessionLocal()
exists = db.query(User).filter_by(email='test@example.com').first()
db.close()
exit(0 if exists else 1)
" 2>/dev/null; then
    log "Seeding test user..."
    docker compose exec -T api python seed_dummy_user.py
    ok "Test user created: test@example.com / password123"
else
    ok "Test user already exists"
fi

# ─── 8. Summary ──────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  DR-RAG is running!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo -e "  API docs:   ${BLUE}http://$(curl -sf http://checkip.amazonaws.com || echo 'your-ip'):80/docs${NC}"
echo -e "  Streamlit:  ${BLUE}http://$(curl -sf http://checkip.amazonaws.com || echo 'your-ip')/streamlit/${NC}"
echo ""
echo -e "  Logs:  docker compose logs -f"
echo -e "  Stop:  docker compose down"
echo ""
