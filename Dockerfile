# --- Stage 1: Build everything ---
FROM node:24-bookworm AS builder

WORKDIR /app
COPY . .
RUN npm install
# Build all projects (Server, Client, Shared Types)
RUN npm run build

# --- Stage 2: Isolate Production Dependencies ---
# We use turbo prune to extract only the server's dependency graph
FROM node:24-bookworm AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @open-receipt-ocr/server --docker

# --- Stage 3: Install Production Dependencies ---
FROM node:24-bookworm AS runner
WORKDIR /app

# Copy pruned manifests
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json

# Install ONLY production dependencies for the server
# This excludes all client dependencies and devDependencies
RUN npm install --omit=dev

# --- Stage 4: Runtime ---
FROM node:24-bookworm-slim

# Install system dependencies for native modules
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production node_modules (this should be significantly smaller)
COPY --from=runner /app/node_modules ./node_modules

# Copy built server assets
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json

# Copy built frontend to the server's public directory
COPY --from=builder /app/client/dist/client/browser ./public

# Create persistent storage directories
RUN mkdir -p data/uploads data/db && chmod 777 data/uploads data/db

# Final environment
ENV NODE_ENV=production

EXPOSE 9999

# Start script
CMD ["sh", "-c", "node server/dist/main.js & node server/dist/worker.js"]
