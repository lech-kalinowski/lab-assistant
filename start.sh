#!/bin/bash
# Start MetaLab - frontend + backend on local network
# Usage: ./start.sh

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
CERT_DIR="$DIR/certs"
CERT_FILE="$CERT_DIR/localhost+2.pem"
KEY_FILE="$CERT_DIR/localhost+2-key.pem"

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')

echo "=============================="
echo "  MetaLab - Local Network"
echo "=============================="

# Check if certs exist
if [ ! -f "$CERT_FILE" ]; then
  echo ""
  echo "No HTTPS certs found. Generating with mkcert..."
  echo "Run: mkcert -install  (if not done already, needs sudo)"
  mkdir -p "$CERT_DIR"
  cd "$CERT_DIR"
  mkcert localhost 127.0.0.1 "$LOCAL_IP"
  cd "$DIR"
fi

echo ""
echo "Local IP: $LOCAL_IP"
echo ""
echo "Frontend: https://$LOCAL_IP:5173"
echo "Backend:  https://$LOCAL_IP:8000"
echo ""
echo "Voice commands (configure in Meta AI):"
echo "  Record: https://$LOCAL_IP:5173/?action=record"
echo "  Stop:   https://$LOCAL_IP:5173/?action=stop"
echo ""
echo "=============================="
echo ""

# Start backend
echo "Starting backend..."
cd "$DIR/backend"
if [ ! -d "venv" ]; then
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
else
  source venv/bin/activate
fi

uvicorn main:app --host 0.0.0.0 --port 8000 \
  --ssl-keyfile "$KEY_FILE" \
  --ssl-certfile "$CERT_FILE" &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# Cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

echo ""
echo "Both servers running. Press Ctrl+C to stop."
wait
