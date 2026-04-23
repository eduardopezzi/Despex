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

## 🎨 Technology Stack
- **Frontend:** Angular, PrimeNG
- **Backend:** NestJS, BullMQ (for background job processing)
- **Database:** SQLite (via TypeORM)
- **Cache:** Redis (required for BullMQ)
