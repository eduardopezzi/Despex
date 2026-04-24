#!/bin/sh

# This script checks for environment variables and installs heavy optional dependencies at runtime.
# This keeps the base Docker image lightweight (~150MB instead of 2GB).

# 1. Handle PaddleOCR Local
if [ "$PADDLE_OCR_LOCAL_ENABLED" = "true" ]; then
    if [ ! -d "/app/node_modules/ppu-paddle-ocr" ]; then
        echo "🚨 PADDLE_OCR_LOCAL_ENABLED=true: Installing heavy OCR dependencies (onnxruntime, ppu-paddle-ocr)..."
        echo "   Note: This may take a minute and requires internet access."
        npm install --no-save ppu-paddle-ocr onnxruntime-node
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

# Wait for background processes to finish
wait $MAIN_PID $WORKER_PID
