# Open Receipt OCR

Open Receipt OCR is a powerful, flexible, and extensible OCR (Optical Character Recognition) platform designed specifically for receipts and documents. It supports a wide range of OCR providers, from cloud-based AI models to local engines.

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

1. **Clone the repository.**
2. **Configure the Server:**
   - Navigate to the `server` directory.
   - Copy `.env.example` to `.env`.
   - Fill in the API keys for the providers you wish to use.
3. **Run the application:**
   - In the root directory, run `npm run dev` to start both client and server.
4. **Using the UI:**
   - When uploading a receipt, you will see a dropdown to select your preferred OCR provider among those you have configured.

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

## 🎨 Technology Stack
- **Frontend:** Angular, PrimeNG
- **Backend:** NestJS, BullMQ (for background job processing)
- **Database:** SQLite (via TypeORM)
- **Cache:** Redis (required for BullMQ)
