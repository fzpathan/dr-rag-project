#!/bin/bash
# DR-RAG GCP Deployment Script
# Run this on your GCP VM after cloning the repo
set -e

echo "=== DR-RAG GCP Deployment ==="

# Step 1: Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to log out and back in for group changes."
fi

# Step 2: Check .env file exists
if [ ! -f .env ]; then
    echo ""
    echo "ERROR: .env file not found!"
    echo "Create it with:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    echo ""
    echo "Required variables:"
    echo "  JWT_SECRET_KEY=<run: openssl rand -hex 32>"
    echo "  USE_OPENROUTER=true"
    echo "  OPENROUTER_API_KEY=sk-or-v1-..."
    exit 1
fi

# Step 3: Build and start
echo "Building and starting containers..."
docker compose up -d --build

# Step 4: Wait for API to be ready
echo "Waiting for API to start..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "API is healthy!"
        break
    fi
    echo "  waiting... ($i/30)"
    sleep 5
done

# Step 5: Seed the database if empty
echo "Seeding test user..."
docker compose exec api python seed_dummy_user.py || true

echo ""
echo "=== Deployment Complete ==="
echo "API:    http://$(curl -s ifconfig.me):80"
echo "Docs:   http://$(curl -s ifconfig.me):80/docs"
echo "Health: http://$(curl -s ifconfig.me):80/health"
echo ""
echo "Next steps:"
echo "  1. Point your domain to this server's IP"
echo "  2. Run: bash setup-ssl.sh YOUR_DOMAIN"
echo "  3. Update your mobile app API_BASE_URL"
