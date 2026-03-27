# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:24-alpine AS client-builder
WORKDIR /app

# Copy monorepo root manifests first for layer caching
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all workspace deps (needed for turbo, etc.)
RUN npm install

# Copy source and build the client
COPY client/ ./client/
RUN npm run build --workspace=client

# ── Stage 2: Build backend ────────────────────────────────────────────────────
FROM node:24-alpine AS server-builder
WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm install

COPY server/ ./server/
RUN npm run build --workspace=server

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:24-alpine
WORKDIR /app

# Only install production deps for the server
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm install --omit=dev --workspace=server

# Copy build artifacts
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=client-builder /app/client/dist/client/browser ./public

# Ensure persistence directories exist
RUN mkdir -p /app/data /app/uploads

EXPOSE 3000
CMD ["node", "server/dist/main"]
