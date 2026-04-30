---
layout: default
title: Quick Reference
nav_order: 8
---

# Quick Reference

Quick commands and snippets for common tasks.

## Installation & Setup

```bash
# Clone and install
git clone https://github.com/iursevla/open-receipt-ocr.git
cd open-receipt-ocr
npm install

# Configure
cp server/.env.example server/.env
# Edit server/.env with your API keys

# Start Redis
redis-server

# Run development server
npm run dev
```

## API Endpoints

### Upload Receipt
```bash
curl -X POST http://localhost:3000/ocr-jobs/upload \
  -F "file=@receipt.jpg" \
  -F "ocrProvider_0=mistral"
```

### Check Job Status
```bash
curl http://localhost:3000/ocr-jobs/{jobId}
```

### List Jobs
```bash
curl "http://localhost:3000/ocr-jobs?page=1&limit=20"
```

### Delete Job
```bash
curl -X DELETE http://localhost:3000/ocr-jobs/{jobId}
```

## Docker Commands

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Stop
docker-compose down

# Restart
docker-compose restart app

# Clean up
docker-compose down -v
```

## Environment Variables

### Essential
```env
NODE_ENV=development
DATABASE_URL=sqlite:./data/db/ocr.sqlite
REDIS_URL=redis://localhost:6379
```

### OCR Providers
```env
GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key
MISTRAL_API_KEY=your_key
TAB_SCANNER_API_KEY=your_key
PADDLE_OCR_LOCAL_ENABLED=true
```

## Development Commands

```bash
# Run backend only
npm run dev:server

# Run frontend only
npm run dev:client

# Run tests
npm run test

# Build for production
npm run build

# Format code
npm run lint:fix
```

## Database

```bash
# Query SQLite
sqlite3 data/db/ocr.sqlite

# Common queries
.tables
SELECT * FROM ocr_jobs LIMIT 5;
SELECT * FROM ocr_files WHERE job_id = 1;

# Generate migration
npm run typeorm:migration:generate -- -n MigrationName

# Run migrations
npm run typeorm:migration:run
```

## Redis

```bash
# Check if running
redis-cli ping

# Monitor commands
redis-cli MONITOR

# Check keys
redis-cli KEYS "bull:*"

# Clear all data (⚠️ careful!)
redis-cli FLUSHALL
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Commit with conventional commits
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/my-feature
```

## Debugging

```bash
# Enable debug logging
DEBUG=open-receipt-ocr:* npm run dev:server

# Check service status
curl http://localhost:3000/health

# View Redis connection
docker-compose logs redis

# Check database
sqlite3 data/db/ocr.sqlite ".schema"
```

## File Locations

| Path | Purpose |
|------|---------|
| `client/` | Angular frontend |
| `server/` | NestJS backend |
| `packages/types/` | Shared TypeScript types |
| `docs/` | Documentation |
| `data/db/` | SQLite database |
| `data/uploads/` | Uploaded files |
| `server/.env` | Environment configuration |

## Ports

| Port | Service |
|------|---------|
| 3000 | Backend API |
| 4200 | Frontend (dev) |
| 6379 | Redis |
| 9999 | Docker app (production) |

## Common Issues

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### Module Not Found
```bash
rm -rf node_modules package-lock.json
npm install
```

### Redis Connection Error
```bash
redis-cli ping  # Check if running
redis-server    # Start Redis
```

### Database Locked
```bash
# Use in-memory database for testing
DATABASE_URL=sqlite::memory: npm run test
```

## Performance Tips

1. Use local OCR (Tesseract, PaddleOCR) for frequent processing
2. Enable caching in Redis
3. Use PostgreSQL in production instead of SQLite
4. Monitor database queries with `EXPLAIN`
5. Set resource limits in Docker

## Security Reminders

- ✅ Use `.env` file for secrets (never commit)
- ✅ Validate all user input
- ✅ Use HTTPS in production
- ✅ Rotate API keys regularly
- ✅ Limit database access
- ✅ Enable authentication for public deployments

## Documentation Links

- [Getting Started](./getting-started.md)
- [Configuration](./configuration.md)
- [API Reference](./api.md)
- [Development Guide](./development.md)
- [Extending](./extending.md)
- [Docker Deployment](./docker.md)

## External Resources

- [NestJS Docs](https://docs.nestjs.com)
- [Angular Docs](https://angular.io)
- [TypeORM Docs](https://typeorm.io)
- [BullMQ Docs](https://docs.bullmq.io)
- [Docker Docs](https://docs.docker.com)
