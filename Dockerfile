# ── Stage 1: Build Shared Types ──────────────────────────────────────────────
FROM node:24-alpine AS types-builder
WORKDIR /app
COPY package*.json ./
COPY packages/types/package*.json ./packages/types/
RUN npm install
COPY packages/types/ ./packages/types/
RUN npm run build --workspace=@open-receipt-ocr/types

# ── Stage 2: Build frontend ──────────────────────────────────────────────────
FROM node:24-alpine AS client-builder
WORKDIR /app
COPY package*.json ./
COPY packages/types/package*.json ./packages/types/
COPY client/package*.json ./client/
RUN npm install
COPY packages/types/ ./packages/types/
COPY client/ ./client/
COPY --from=types-builder /app/packages/types/dist ./packages/types/dist
RUN npm run build --workspace=@open-receipt-ocr/client

# ── Stage 4: Build backend ────────────────────────────────────────────────────
FROM node:24-alpine AS server-builder
WORKDIR /app
COPY package*.json ./
COPY packages/types/package*.json ./packages/types/
COPY server/package*.json ./server/
RUN npm install
COPY packages/types/ ./packages/types/
COPY server/ ./server/
COPY --from=types-builder /app/packages/types/dist ./packages/types/dist
RUN npm run build --workspace=@open-receipt-ocr/server

# ── Stage 5: Production image ─────────────────────────────────────────────────
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/types/package*.json ./packages/types/
COPY server/package*.json ./server/
RUN npm install --omit=dev --workspace=@open-receipt-ocr/server
COPY --from=types-builder /app/packages/types/dist ./packages/types/dist
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=client-builder /app/client/dist/client/browser ./public
RUN mkdir -p /app/data /app/uploads
EXPOSE 3000
CMD ["node", "server/dist/main"]
