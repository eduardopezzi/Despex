# Open Receipt OCR

Open Receipt OCR is a powerful, flexible, and extensible OCR (Optical Character Recognition) platform designed specifically for receipts and documents. It supports a wide range of OCR providers, from cloud-based AI models to local engines.

## 📸 Screenshots & Demo

<video src="docs/assets/screenshots/open-receipt-ocr.mp4" controls width="100%"></video>

| Dashboard | OCR Jobs (Card View) | OCR Jobs (Table View) |
|:---:|:---:|:---:|
| ![Dashboard](docs/assets/screenshots/dashboard-view.png) | ![Card view](docs/assets/screenshots/ocr-jobs-card-view.png) | ![Table view](docs/assets/screenshots/ocr-jobs-table-view.png) |

| Create Job | Multiple Files | Image Crop |
|:---:|:---:|:---:|
| ![Create job](docs/assets/screenshots/add-ocr-job-modal.png) | ![Multiple files](docs/assets/screenshots/add-ocr-modal-multiple-files.png) | ![Crop](docs/assets/screenshots/add-ocr-modal-apply-crop.png) |

| Job Detail — Results | Job Detail — Failed | Settings |
|:---:|:---:|:---:|
| ![Results](docs/assets/screenshots/ocr-job-modal.png) | ![Failed](docs/assets/screenshots/ocr-job-modal-failed.png) | ![Settings](docs/assets/screenshots/default-settings-modal.png) |

| Dark Mode | Localisation (German) |
|:---:|:---:|
| ![Dark mode](docs/assets/screenshots/dark-mode.png) | ![German UI](docs/assets/screenshots/ocr-jobs-language-selector.png) |

---

## 🚀 OCR Providers


This platform supports multiple OCR engines. You can configure which ones are available by setting the appropriate environment variables in your `server/.env` file.

### 🏠 Local Providers (No API Keys Required)

| Provider | Description | Configuration |
| :--- | :--- | :--- |
| **PaddleOCR Local** | High-quality local OCR based on PaddlePaddle. Runs on your CPU/GPU. | `PADDLE_OCR_LOCAL_ENABLED=true` |
| **Tesseract.js** | The classic open-source OCR engine running in WASM. | `TESSERACT_LANGUAGE=eng+por` (Add your language codes) |
| **llama.cpp** | Run advanced vision models (like LLaVA or Qwen-VL) locally. | `LLAMA_CPP_BASE_URL=http://localhost:8080/v1` |

> [!TIP]
> To use **llama.cpp**, you need to run the `llama-server` separately:
> `llama-server --mmproj <clip-model> -m <vision-model> --port 8080`

---

### ☁️ Cloud Providers (API Key Required)

| Provider | Best For | Required Keys |
| :--- | :--- | :--- |
| **TabScanner** | **Receipt Specialists.** Highly optimized for retail receipts and invoices. | `TAB_SCANNER_API_KEY` |
| **Google Gemini** | Complex layouts and high accuracy using Gemini 1.5/2.0 models. | `GEMINI_API_KEY` |
| **OpenAI** | Reliable performance using GPT-4o vision capabilities. | `OPENAI_API_KEY` |
| **Mistral OCR** | Native document understanding via Mistral's latest vision models. | `MISTRAL_API_KEY` |
| **xAI Grok** | Specialized vision-language processing via Grok-2. | `XAI_API_KEY` |
| **AWS Textract** | Enterprise-grade document extraction from AWS. | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` |
| **PaddleOCR API** | Hosted version of PaddleOCR for low-latency cloud processing. | `PADDLE_OCR_ENDPOINT`, `PADDLE_OCR_API_KEY` |

---

## 🛠️ Setup & Configuration

### Prerequisites

| Requirement | Version | Notes |
| :--- | :--- | :--- |
| **Node.js** | ≥ 22 | Required for the server, worker, and client |
| **Redis** | ≥ 6 | Required for BullMQ job queue |
| **npm** | ≥ 10 | Monorepo workspace support |

> **Note:** [Docker](#-docker-deployment) is the easiest way to run everything without installing Node.js or Redis manually.

---

### Option 1: Docker Compose (Recommended — Simplest)

The fastest way to get started. No Node.js or Redis installation needed.

```bash
# 1. Clone the repository
git clone https://github.com/iursevla/open-receipt-ocr.git
cd open-receipt-ocr

# 2. Create your .env file from the simple example
cp .env.simple.example .env

# 3. Start the application
docker compose up -d

# 4. Access the app at http://localhost:9191
```

That's it! The default configuration uses **PaddleOCR Local** (no API key needed).

**Persistence:**
- Database: `./data/db/ocr.sqlite`
- Uploaded Files: `./data/uploads/`
- Redis Data: Docker volume `redis_data`

To stop: `docker compose down`

---

### Option 2: Local Development (Manual)

Run the server, worker, and client separately for development.

```bash
# 1. Clone and install dependencies
git clone https://github.com/iursevla/open-receipt-ocr.git
cd open-receipt-ocr
npm install

# 2. Make sure Redis is running
# macOS:  brew services start redis
# Linux:  sudo systemctl start redis
# Or:     redis-server

# 3. Configure the server
cp server/.env.example server/.env
# Edit server/.env — minimum required:
#   PADDLE_OCR_LOCAL_ENABLED=true
#   REDIS_HOST=localhost
#   REDIS_PORT=6379

# 4. Start the server (Terminal 1)
cd server && npm run start:dev

# 5. Start the worker (Terminal 2)
cd server && npm run start:dev:worker

# 6. Start the client (Terminal 3)
cd client && npm run start

# 7. Access the app:
#    - Frontend: http://localhost:4200
#    - API:      http://localhost:9999
```

---

### Option 3: Local Development (tmux — All-in-One)

Use the included tmux script that opens a pre-configured development environment with 5 panes.

```bash
# 1. Clone, install, and configure (same as Option 2, steps 1-3)
git clone https://github.com/iursevla/open-receipt-ocr.git
cd open-receipt-ocr
npm install
cp server/.env.example server/.env
# Make sure Redis is running!

# 2. Launch the tmux development environment
./local-env/start-local.sh
```

This opens a tmux session with:

| Pane | Command | Description |
| :--- | :--- | :--- |
| **Server** | `npm run start:dev` | NestJS API (auto-starts) |
| **Worker** | `npm run start:dev:worker` | OCR job processor (auto-starts) |
| **Client** | `npm run start` | Angular dev server (auto-starts) |
| **Seed** | `npm run seed` | Load sample data (press Enter to run) |
| **Unseed** | `npm run unseed` | Clear sample data (press Enter to run) |

> **Tip:** Detach from tmux with `Ctrl+B` then `D`. Reattach with `tmux attach -t ocr_project`.

---

### PaddleOCR Local — Performance Tips

PaddleOCR Local runs **100% offline** with no API keys. On Apple M1/M2/M3/M4 it processes a receipt in ~1 second.

| Environment Variable | Default | Description |
| :--- | :--- | :--- |
| `PADDLE_OCR_LOCAL_ENABLED` | `true` | Enable PaddleOCR Local |
| `PADDLE_OCR_EXECUTION_PROVIDER` | auto | `cpu` (recommended), `coreml`, `cuda` |
| `PADDLE_OCR_MAX_IMAGE_SIZE` | `1280` | Max image dimension before OCR (px). Set `0` to disable |
| `PADDLE_OCR_WARMUP_ENABLED` | `true` | Warm up ONNX engine on startup (avoids slow first request) |

> **⚠️ Apple Silicon users:** `cpu` is the recommended provider — it's 7x faster than `coreml` for PaddleOCR models (~1s vs ~7s) because CoreML doesn't support all required ONNX operators.

---

### Using the UI

When uploading a receipt, you'll see a dropdown to select your preferred OCR provider among those you have configured in your `.env` file.

---

## 📦 Storage Providers

By default, files are stored locally in the `server/uploads` directory. However, you can also use cloud storage:

- **Local (Default):** `STORAGE_PROVIDER=local`
- **OneDrive:** `STORAGE_PROVIDER=onedrive`. Requires Azure AD / Microsoft Graph credentials (`ONEDRIVE_CLIENT_ID`, etc.).

## 🔐 Secret Management

You can choose how the application retrieves secrets (like API keys):
- **Env (Default):** Reads directly from your `.env` file.
- **Infisical:** Integrates with [Infisical](https://infisical.com/) for enterprise secret management.

---

## 🔌 API Usage (Headless)

You can use the platform without the UI by interacting directly with the REST API.

### 1. Upload a File for OCR
Send a `multipart/form-data` request to the `/ocr-jobs/upload` endpoint. For every file uploaded, you must provide a corresponding `ocrProvider_<index>` field.

**Example using `curl`:**
```bash
curl -X POST http://localhost:9999/ocr-jobs/upload \
  -F "file=@receipt.jpg" \
  -F "ocrProvider_0=mistral" \
  -F "jobName=Weekly Groceries"
```
*Note: The index `0` corresponds to the first file in the multipart request.*

**Response:**
```json
{ "id": 123 }
```

### 2. Check Job Status & Results
Polling the job by ID will return the status and the transcribed OCR data once finished.

**Example using `curl`:**
```bash
curl http://localhost:9999/ocr-jobs/123
```

**Response Snippet:**
```json
{
  "id": 123,
  "status": "completed",
  "files": [
    {
      "originalName": "receipt.jpg",
      "executions": [
        {
          "status": "completed",
          "ocrProvider": "mistral",
          "ocrData": "{\"markdown\": \"# Receipt ...\"}"
        }
      ]
    }
  ]
}
```

---

## 🛠️ Adding a New OCR Provider

To add a new OCR provider (e.g., "AI-OCR-2000"), follow these steps:

### 1. Update Shared Types
Add the new provider to the `OcrProvider` enum in `packages/types/src/ocr-provider.enum.ts`.

### 2. Configure Secrets
- Add any required API keys or settings to `AppSecret` enum in `server/src/core/types/app-secret.enum.ts`.
- Document these variables in `server/.env.example`.

### 3. Create the Processor
Create `server/src/worker/ocr/ai-ocr-2000.processor.ts`. It should follow this structure:
```typescript
@Injectable()
export class AiOcr2000Processor {
  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider
  ) {}

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    // 1. Get API key from secretProvider
    // 2. Get file stream from storage
    // 3. Call your OCR API
    // 4. Return result as a string (JSON or Markdown)
  }
}
```

### 4. Register the Processor
- Add your new processor to the `providers` array in `server/src/worker/worker.module.ts`.

### 5. Hook it Up
In `server/src/worker/ocr/ocr.processor.ts`:
- Inject your new processor in the `constructor`.
- Add a new `case` to the `switch` statement in the `process()` method to call your implementation.

### 6. Client-Side Rendering (Optional but Recommended)
To ensure the OCR output is correctly rendered in the UI:
- Create a new parser in `client/src/app/pipes/parsers/ai-ocr-2000.parser.ts`. It should implement the `OcrOutputParser` interface.
- Register your parser in `client/src/app/pipes/parsers/ocr-output-parser.service.ts` by adding it to the `parsers` record.

---

## 📦 Adding a New Storage Provider

To add a new storage backend (e.g., "S3"):

### 1. Define the Provider Type
Add `s3` to the `StorageProviderType` enum in `server/src/core/storage/storage-provider-type.enum.ts`.

### 2. Implement the Provider
Create `server/src/core/storage/s3-storage.provider.ts` extending the `StorageProvider` abstract class:
```typescript
@Injectable()
export class S3StorageProvider extends StorageProvider {
  readonly name = StorageProviderType.S3;
  // Implement uploadStream, getStream, exists, and delete
}
```

### 3. Register and Configure
- Add your provider to the `providers` and `exports` in `server/src/core/storage/storage.module.ts`.
- Update the factory in `server/src/core/storage/storage.provider.ts` to include your new provider in the `switch` statement.
- Add any new environment variables to `AppSecret` (server) and `.env.example`.

---

## 🔐 Adding a New Secret Provider

To add a new secret management backend (e.g., "Vault"):

### 1. Define the Provider Type
Add `vault` to the `SecretProviderType` enum in `server/src/core/secrets/secret-provider-type.enum.ts`.

### 2. Implement the Provider
Create `server/src/core/secrets/providers/vault-secret.provider.ts` extending the `SecretProvider` abstract class:
```typescript
@Injectable()
export class VaultSecretProvider extends SecretProvider {
  readonly name = SecretProviderType.Vault;
  // Implement getSecret
  async getSecret(name: AppSecret): Promise<string | undefined> {
    // Fetch secret from Vault
  }
}
```

### 3. Register and Configure
- Add your provider to the `providers` array in `server/src/core/secrets/secrets.module.ts`.
- Update the factory in `server/src/core/secrets/secrets.provider.ts` to include your new provider in the `switch` statement.
- Document any required setup variables in `server/.env.example`.

---

## 🌍 Adding a New Language

To add a new language (e.g., German - `de`):

### 1. Create the Translation File
Create `client/public/i18n/de.json` by copying `client/public/i18n/en.json` and translating all the values.

### 2. Register the Language
In `client/src/app/app.config.ts`, add the new language code to the `availableLangs` array:
```typescript
provideTransloco({
  config: {
    availableLangs: ['en', 'pt', 'fr', 'de'], // Add 'de' here
    // ...
  },
  loader: TranslocoHttpLoader,
}),
```

### 3. Update Language Labels
To ensure the new language appears correctly in the settings dropdown across all versions:
- Add `"de": "Deutsch"` to the `languages` section in your new `de.json`.
- Add `"de": "German"` to `en.json`.
- Add `"de": "Alemão"` to `pt.json`.

### 4. Update the Settings UI
In `client/src/app/components/config-dialog/config-dialog.component.ts`, add the new language to the `languageOptions` getter:
```typescript
get languageOptions() {
  return [
    { label: this.translocoService.translate('config.languages.en'), value: 'en' },
    { label: this.translocoService.translate('config.languages.pt'), value: 'pt' },
    { label: this.translocoService.translate('config.languages.fr'), value: 'fr' },
    { label: this.translocoService.translate('config.languages.de'), value: 'de' }, // Add this
  ];
}
```

### 5. Update the Quick Switcher
In `client/src/app/layouts/shell/shell.layout.ts`, update the `toggleLang()` method to include the new language in the rotation list:
```typescript
toggleLang() {
  const langs = ['en', 'pt', 'fr', 'de']; // Include 'de' here
  // ... (rotation logic remains same)
}
```

---

## 🎨 Technology Stack
- **Frontend:** Angular, PrimeNG
- **Backend:** NestJS, BullMQ (for background job processing)
- **Database:** SQLite (via TypeORM)
- **Cache:** Redis (required for BullMQ)
