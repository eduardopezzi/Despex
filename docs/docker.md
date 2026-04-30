---
layout: default
title: Docker Deployment
nav_order: 7
---

# Docker Deployment

Deploy Open Receipt OCR using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB free disk space (for image and data)

## Quick Start

### 1. Prepare Environment

Create `.env` in the project root:

```env
# OCR Providers
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
MISTRAL_API_KEY=your_mistral_key
TAB_SCANNER_API_KEY=your_tabscanner_key

# Optional: Local OCR
PADDLE_OCR_LOCAL_ENABLED=true
TESSERACT_LANGUAGE=eng+por

# Storage
STORAGE_PROVIDER=local
```

### 2. Build and Start

```bash
docker-compose up -d --build
```

This starts:
- **API Server** on `http://localhost:9999`
- **Frontend** served by the API at `http://localhost:9999`
- **Redis** for background jobs
- **Database** (SQLite in `./data/db/`)

### 3. Access the Application

```
http://localhost:9999
```

The frontend is automatically served by the backend.

## Docker Compose Configuration

The `docker-compose.yaml` includes:

```yaml
services:
  app:
    build: .
    ports:
      - "9999:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## File Structure After Deployment

```
open-receipt-ocr/
├── data/
│   ├── db/
│   │   └── ocr.sqlite          # SQLite database
│   └── uploads/                 # Uploaded files
└── docker-compose.yaml
```

## Configuration

### Environment Variables

All configuration is done via environment variables in the `.env` file:

```env
# Application
NODE_ENV=production
SERVER_PORT=3000

# Database
DATABASE_URL=sqlite:./data/db/ocr.sqlite

# Redis
REDIS_URL=redis://redis:6379

# OCR Providers
PADDLE_OCR_LOCAL_ENABLED=false
TESSERACT_LANGUAGE=eng
GEMINI_API_KEY=
OPENAI_API_KEY=
MISTRAL_API_KEY=
XAI_API_KEY=
TAB_SCANNER_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# Storage
STORAGE_PROVIDER=local
ONEDRIVE_CLIENT_ID=
ONEDRIVE_CLIENT_SECRET=
ONEDRIVE_TENANT_ID=
ONEDRIVE_FOLDER_ID=

# Secrets
SECRET_PROVIDER=env
```

### Volumes

Mount volumes to persist data:

```yaml
volumes:
  - ./data/db:/app/data/db      # Database
  - ./data/uploads:/app/uploads  # Uploaded files
```

### Ports

Change the exposed port in `docker-compose.yaml`:

```yaml
services:
  app:
    ports:
      - "8080:3000"  # Change from 9999 to 8080
```

## Deployment Scenarios

### Development Environment

```bash
docker-compose -f docker-compose.yml up
```

Includes:
- Hot reload (if configured)
- Debug logging
- SQLite database

### Production Environment

For production, consider:

1. **Use PostgreSQL instead of SQLite:**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ocr
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

# In app service:
DATABASE_URL: postgresql://user:password@postgres:5432/ocr
```

2. **Add SSL/TLS:**

Use a reverse proxy like Nginx:

```nginx
server {
  listen 443 ssl;
  server_name yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  location / {
    proxy_pass http://app:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

3. **Set resource limits:**

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

4. **Configure logging:**

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"
```

## Monitoring and Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

### Health Check

```bash
curl http://localhost:9999/health
```

### Monitor Resources

```bash
docker stats
```

## Maintenance

### Backup Database

```bash
# Create backup
cp data/db/ocr.sqlite data/db/ocr.sqlite.backup

# Or compress
tar czf ocr_db_backup.tar.gz data/db/
```

### Database Migration

To upgrade TypeORM migrations:

```bash
# Stop services
docker-compose down

# Run migrations in container
docker-compose run --rm app npm run typeorm:migration:run

# Restart
docker-compose up -d
```

### Clean Up

```bash
# Stop containers
docker-compose down

# Remove volumes (⚠️ deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Common issues:
# - Port already in use: Change port in docker-compose.yaml
# - Redis not running: docker-compose up redis
# - Permission denied: Ensure data/ directory is writable
```

### Permission Denied Errors

```bash
# Fix directory ownership
sudo chown -R $USER:$USER ./data
chmod -R 755 ./data
```

### Redis Connection Failed

```bash
# Verify Redis is running
docker-compose ps

# Check Redis logs
docker-compose logs redis

# Ensure REDIS_URL matches service name
REDIS_URL=redis://redis:6379
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a

# Remove old images
docker image prune
```

### Database Locked

SQLite can lock if accessed by multiple processes. For production, migrate to PostgreSQL.

## Advanced Configuration

### Custom Docker Build

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Build
RUN npm run build

# Start
CMD ["node", "dist/main.js"]
```

Build and tag:

```bash
docker build -t my-registry/ocr:v1.0.0 .
docker push my-registry/ocr:v1.0.0
```

### Using Environment Files

```bash
# Create .env files for different environments
cat > .env.prod << EOF
NODE_ENV=production
GEMINI_API_KEY=prod_key
EOF

# Use with docker-compose
docker-compose --env-file .env.prod up
```

### Health Checks

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Auto-restart on Failure

```yaml
services:
  app:
    restart: unless-stopped
```

Restart policies:
- `no` - Don't automatically restart
- `always` - Always restart if stopped
- `unless-stopped` - Restart unless explicitly stopped
- `on-failure` - Restart only on failure

## Security Best Practices

1. **Use environment variables** for all secrets, not hardcoded values
2. **Limit API access** with authentication/authorization
3. **Use HTTPS** in production (see SSL/TLS example above)
4. **Regular backups** of the database
5. **Keep images updated:** `docker-compose pull && docker-compose up -d`
6. **Run as non-root** user in production
7. **Scan for vulnerabilities:** `docker scan yourdomain/ocr:latest`

## Performance Tips

1. **Use PostgreSQL** instead of SQLite for better concurrency
2. **Enable Redis persistence** for better reliability
3. **Set resource limits** to prevent runaway containers
4. **Use Alpine-based images** for smaller footprint
5. **Implement caching** for API responses
6. **Monitor and optimize** slow database queries

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs: `docker-compose logs app`
3. Check [Development Guide](./development.md) for debugging tips
4. Open an issue on [GitHub](https://github.com/iursevla/open-receipt-ocr/issues)
