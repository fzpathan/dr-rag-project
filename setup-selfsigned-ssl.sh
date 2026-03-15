#!/usr/bin/env bash
# Generates a self-signed SSL certificate for nginx.
# Run once on the server: bash setup-selfsigned-ssl.sh
set -e

CERT_DIR="$(cd "$(dirname "$0")" && pwd)/nginx/ssl"
mkdir -p "$CERT_DIR"

echo "Generating self-signed certificate in $CERT_DIR ..."

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$CERT_DIR/selfsigned.key" \
  -out    "$CERT_DIR/selfsigned.crt" \
  -subj   "/C=IN/ST=Maharashtra/L=Mumbai/O=DR-RAG/CN=drrag.local" \
  -addext "subjectAltName=IP:$(curl -s ifconfig.me || echo 127.0.0.1)"

chmod 600 "$CERT_DIR/selfsigned.key"
echo "Certificate generated:"
ls -lh "$CERT_DIR"

echo ""
echo "Restarting nginx to load the certificate..."
docker compose up -d --no-build nginx
echo "Done! Access the site at https://$(curl -s ifconfig.me 2>/dev/null || echo YOUR_IP)"
echo ""
echo "NOTE: Your browser will show a security warning."
echo "Click 'Advanced' → 'Proceed' to continue."
echo "The microphone will work after you accept."
