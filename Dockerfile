# --- Stage 1: Bundler (JS Build) ---
FROM node:24-bookworm AS js-builder
WORKDIR /app
COPY . .
# We only need devDependencies to build the bundles
RUN npm install && npm run build

# --- Stage 2: Native Driver Builder ---
FROM node:24-bookworm AS native-builder
WORKDIR /app
# Install ONLY sqlite3. Building from source ensures it works with our slim runtime.
RUN npm install sqlite3 --omit=dev --build-from-source

# --- Stage 3: Final Lightweight Runtime ---
FROM node:24-bookworm-slim
# Install only essential runtime system libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copy the bundled application code (few megabytes each)
COPY --from=js-builder /app/server/dist/main.js ./main.js
COPY --from=js-builder /app/server/dist/worker.js ./worker.js

# 2. Copy the built frontend (few megabytes)
COPY --from=js-builder /app/client/dist/client/browser ./public

# 3. Copy the native node_modules (contains sqlite3 and its binaries)
COPY --from=native-builder /app/node_modules ./node_modules

# 4. Copy essentials
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
RUN mkdir -p data/uploads data/db && chmod 777 data/uploads data/db

ENV NODE_ENV=production

EXPOSE 9999

ENTRYPOINT ["/app/docker-entrypoint.sh"]
