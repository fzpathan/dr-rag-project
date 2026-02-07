#!/bin/bash
# Setup SSL with Let's Encrypt for DR-RAG
set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: bash setup-ssl.sh your-domain.com"
    exit 1
fi

echo "=== Setting up SSL for $DOMAIN ==="

# Step 1: Get certificate
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Step 2: Update nginx config with SSL
cat > nginx/default.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://api:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF

# Step 3: Reload nginx
docker compose restart nginx

echo ""
echo "=== SSL Setup Complete ==="
echo "Your API is now live at: https://$DOMAIN"
echo ""
echo "Auto-renewal cron (add with: crontab -e):"
echo "0 3 * * * cd $(pwd) && docker compose run --rm certbot renew && docker compose restart nginx"
