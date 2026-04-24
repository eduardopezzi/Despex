# --- Stage 1: Build everything ---
FROM node:24-bookworm AS builder

WORKDIR /app
COPY . .
RUN npm install
# Server now bundles almost all dependencies (except native ones)
RUN npm run build

# --- Stage 2: Runtime ---
FROM node:24-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    python3 \
    make \
    g++ \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install native dependencies FIRST in a clean directory.
# We build from source to ensure compatibility with the local GLIBC version.
RUN npm install sqlite3 --omit=dev --build-from-source && npm cache clean --force

# Now copy the bundled server binaries and frontend assets
COPY --from=builder /app/server/dist/main.js ./main.js
COPY --from=builder /app/server/dist/worker.js ./worker.js
COPY --from=builder /app/client/dist/client/browser ./public

# Optional: Copy package.json for metadata purposes, but AFTER install
COPY --from=builder /app/server/package.json ./package.json

# Remove build tools to keep image slim
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y

# Copy dynamic dependency installer script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create persistent storage directories
RUN mkdir -p data/uploads data/db && chmod 777 data/uploads data/db

# Final environment
ENV NODE_ENV=production

EXPOSE 9999

ENTRYPOINT ["/app/docker-entrypoint.sh"]
