---
layout: default
title: Development Guide
nav_order: 5
---

# Development Guide

Guide for developers working on the Open Receipt OCR codebase.

## Project Structure

```
open-receipt-ocr/
├── client/                      # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/      # Reusable UI components
│   │   │   ├── layouts/         # Page layouts
│   │   │   ├── pipes/           # Custom pipes & parsers
│   │   │   └── services/        # API & utility services
│   │   └── assets/
│   └── public/                  # Static assets & translations
├── server/                      # NestJS backend
│   ├── src/
│   │   ├── core/                # Core modules
│   │   │   ├── database/        # TypeORM & database
│   │   │   ├── storage/         # Storage providers
│   │   │   ├── secrets/         # Secret management
│   │   │   └── types/           # Shared type definitions
│   │   ├── ocr-jobs/            # OCR job management
│   │   ├── worker/              # Background job processing
│   │   │   ├── ocr/             # OCR processor implementations
│   │   │   └── config/
│   │   └── main.ts              # Server entry point
│   ├── .env.example             # Environment variables template
│   └── worker.ts                # Worker process entry point
├── packages/
│   ├── types/                   # Shared TypeScript types
│   │   └── src/
│   │       ├── ocr-provider.enum.ts      # OCR provider enum
│   │       └── ...
│   └── ...
├── docker-compose.yaml          # Multi-container setup
├── Dockerfile                   # Docker image
└── package.json                 # Root package (monorepo)
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Docker & Docker Compose (for containerized development)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/iursevla/open-receipt-ocr.git
cd open-receipt-ocr

# Install dependencies
npm install

# Setup environment
cp server/.env.example server/.env
# Edit server/.env with your configuration

# Start Redis
redis-server  # or: docker run -d -p 6379:6379 redis:latest

# Start development server
npm run dev
```

### Running Individual Services

```bash
# Start backend only
npm run dev:server

# Start frontend only (in another terminal)
npm run dev:client

# Start worker only (in another terminal)
npm run dev:worker
```

## Technology Stack

### Frontend
- **Framework:** Angular 18+
- **UI Library:** PrimeNG
- **Styling:** CSS/SCSS
- **State Management:** Angular Services
- **I18n:** Transloco

### Backend
- **Framework:** NestJS
- **ORM:** TypeORM
- **Database:** SQLite (development), PostgreSQL (recommended for production)
- **Job Queue:** BullMQ (with Redis)
- **API:** REST (JSON)

### DevOps
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **CI/CD:** GitHub Actions (if configured)

## Code Standards

### TypeScript

- Use strict mode: `"strict": true` in `tsconfig.json`
- Prefer interfaces over types for object shapes
- Use enums for fixed sets of values
- Add JSDoc comments for public APIs

Example:

```typescript
interface OcrResult {
  markdown: string;
  rawText: string;
}

/**
 * Process a file with the specified OCR provider
 */
async function processFile(file: File, provider: OcrProvider): Promise<OcrResult> {
  // implementation
}
```

### File Naming

- Components: `*.component.ts`
- Services: `*.service.ts`
- Processors: `*.processor.ts`
- Modules: `*.module.ts`
- Enums: `*.enum.ts`
- Interfaces: Defined in `*.ts` files or `*.interface.ts`

### Angular Components

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-receipt-viewer',
  templateUrl: './receipt-viewer.component.html',
  styleUrls: ['./receipt-viewer.component.scss']
})
export class ReceiptViewerComponent {
  // Component logic
}
```

### NestJS Services

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class OcrJobService {
  constructor(private repository: OcrJobRepository) {}

  async process(jobId: number): Promise<void> {
    // Business logic
  }
}
```

## Adding Features

### Add a New OCR Provider

See [Extending Guide](./extending.md) for detailed instructions.

### Add a New API Endpoint

1. Create a new controller or add to existing:

```typescript
// server/src/ocr-jobs/ocr-jobs.controller.ts
@Controller('ocr-jobs')
export class OcrJobsController {
  constructor(private service: OcrJobService) {}

  @Get(':id')
  async getJob(@Param('id') id: number) {
    return this.service.findOne(id);
  }
}
```

2. Add corresponding service method
3. Add tests for the endpoint
4. Update API documentation

### Add a New Angular Component

1. Generate using Angular CLI:

```bash
ng generate component components/receipt-upload --skip-tests
```

2. Add to appropriate module's declarations
3. Style with SCSS
4. Add unit tests

## Testing

### Run All Tests

```bash
npm run test
```

### Run Specific Test

```bash
npm run test -- --include='**/ocr.processor.spec.ts'
```

### Test Coverage

```bash
npm run test:cov
```

Coverage reports are generated in the `coverage/` directory.

### Writing Tests

Backend example (NestJS):

```typescript
describe('OcrJobService', () => {
  let service: OcrJobService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [OcrJobService],
    }).compile();

    service = module.get<OcrJobService>(OcrJobService);
  });

  it('should process a job', async () => {
    const result = await service.processJob(1);
    expect(result).toBeDefined();
  });
});
```

## Git Workflow

### Branch Naming

- Feature: `feature/short-description`
- Bug fix: `fix/issue-description`
- Documentation: `docs/topic`
- Chore: `chore/task-description`

Example: `feature/add-paddle-ocr-support`

### Commit Messages

Use conventional commits:

```
type(scope): description

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:

```
feat(ocr): add support for local PaddleOCR

- Integrate paddleocr npm package
- Add configuration option PADDLE_OCR_LOCAL_ENABLED
- Implement PaddleOCR processor

Closes #42
```

### Pull Request Checklist

- [ ] Code follows project standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes (or clearly documented)
- [ ] Commit messages are descriptive

## Debugging

### Backend

Enable debug logging:

```env
DEBUG=open-receipt-ocr:*
```

Use VS Code debugger with `server/.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "NestJS Server",
  "program": "${workspaceFolder}/server/dist/main.js",
  "cwd": "${workspaceFolder}/server"
}
```

### Frontend

Use Angular DevTools Chrome extension or:

```typescript
// In component
constructor(private logger: Logger) {}

ngOnInit() {
  this.logger.log('Component initialized', this.data);
}
```

### Database

Query SQLite directly:

```bash
sqlite3 data/db/ocr.sqlite
sqlite> .tables
sqlite> SELECT * FROM ocr_jobs LIMIT 5;
```

### Redis

Monitor Redis commands:

```bash
redis-cli
127.0.0.1:6379> MONITOR
```

## Building for Production

### Build Docker Image

```bash
docker build -t open-receipt-ocr:latest .
```

### Build Frontend Only

```bash
npm run build:client
```

### Build Backend Only

```bash
npm run build:server
```

## Performance Optimization

### Frontend

- Use `OnPush` change detection strategy
- Lazy load modules
- Optimize images and assets
- Monitor bundle size: `npm run analyze`

### Backend

- Use connection pooling for database
- Implement caching with Redis
- Optimize database queries with indexing
- Use async/await properly

### Database

Recommended indexes:

```sql
CREATE INDEX idx_ocr_jobs_status ON ocr_jobs(status);
CREATE INDEX idx_ocr_jobs_created_at ON ocr_jobs(created_at);
CREATE INDEX idx_ocr_files_job_id ON ocr_files(job_id);
```

## Documentation

- Update `docs/` folder for user-facing documentation
- Add JSDoc comments for public APIs
- Include examples in README sections
- Keep architecture diagrams up to date

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Commit: `git commit -m "feat: description"`
6. Push: `git push origin feature/your-feature`
7. Open a Pull Request

## Common Tasks

### Migrate Database

```bash
# Generate migration
npm run typeorm:migration:generate -- -n AddNewColumn

# Run migrations
npm run typeorm:migration:run
```

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update specific package
npm update @nestjs/core

# Update all
npm update
```

### Reset Database

```bash
rm data/db/ocr.sqlite
npm run typeorm:migration:run
```

## Troubleshooting

### "Cannot find module" errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port conflicts

```bash
lsof -i :3000  # Find process
kill -9 <PID>
```

### Redis connection issues

```bash
redis-cli ping  # Should return PONG
ps aux | grep redis  # Check if running
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Angular Documentation](https://angular.io/docs)
- [TypeORM Documentation](https://typeorm.io)
- [BullMQ Documentation](https://docs.bullmq.io)
