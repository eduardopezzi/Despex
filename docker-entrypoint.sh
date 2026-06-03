#!/bin/sh

# This script checks for environment variables and installs heavy optional dependencies at runtime.
# This keeps the base Docker image lightweight (~150MB instead of 2GB).

# 1. Handle PaddleOCR Local
if [ "$PADDLE_OCR_LOCAL_ENABLED" = "true" ]; then
    if [ ! -d "/app/node_modules/ppu-paddle-ocr" ]; then
        echo "🚨 PADDLE_OCR_LOCAL_ENABLED=true: Installing heavy OCR dependencies (onnxruntime, ppu-paddle-ocr)..."
        echo "   Note: This may take a minute and requires internet access."
        npm install --no-save ppu-paddle-ocr onnxruntime-node sqlite3
    fi
fi

# 2. Add other runtime installs here if needed
# if [ -n "$SOME_OTHER_LOCAL_VAR" ]; then ... fi

echo "🚀 Starting Open Receipt OCR..."
# Start the API server and the Background Worker concurrently.
node main.js &
MAIN_PID=$!

node worker.js &
WORKER_PID=$!

# Wait for ANY process to exit, then kill the other and exit
# This ensures that if the worker crashes, the container stops (and restarts if configured)
while kill -0 $MAIN_PID 2>/dev/null && kill -0 $WORKER_PID 2>/dev/null; do
  sleep 1
done

echo "⚠️ A background process has exited. Shutting down..."
kill $MAIN_PID $WORKER_PID 2>/dev/null
exit 1
