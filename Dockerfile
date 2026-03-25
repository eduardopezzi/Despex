# Build Frontend
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npx ng build --configuration production

# Build Backend
FROM node:24-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ .
RUN npm run build

# Final Stage
FROM node:24-alpine
WORKDIR /app

# Production Dependencies
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy Assets
COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist/client/browser ./public

# Ensure directories for persistence
RUN mkdir -p /app/data /app/uploads

EXPOSE 3000
CMD ["node", "dist/main"]
