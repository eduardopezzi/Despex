export enum AppSecret {
  // ─── App ────────────────────────────────────────────────────────────────────
  Port = 'PORT',
  NodeEnv = 'NODE_ENV',

  // ─── Secret provider ────────────────────────────────────────────────────────
  SecretProvider = 'SECRET_PROVIDER',

  // ─── Database (SQLite) ──────────────────────────────────────────────────────
  DatabasePath = 'DATABASE_PATH',

  // ─── Redis / BullMQ ─────────────────────────────────────────────────────────
  RedisHost = 'REDIS_HOST',
  RedisPort = 'REDIS_PORT',

  // ─── Mistral OCR ─────────────────────────────────────────────────────────────
  MistralApiKey = 'MISTRAL_API_KEY',

  // ─── Storage ─────────────────────────────────────────────────────────────────
  StorageProvider = 'STORAGE_PROVIDER',
  UploadsDir = 'UPLOADS_DIR',
  MaxFileSizeBytes = 'MAX_FILE_SIZE_BYTES',

  // ─── Infisical ───────────────────────────────────────────────────────────────
  InfisicalClientId = 'INFISICAL_CLIENT_ID',
  InfisicalClientSecret = 'INFISICAL_CLIENT_SECRET',
  InfisicalProjectId = 'INFISICAL_PROJECT_ID',
  InfisicalEnvironment = 'INFISICAL_ENVIRONMENT',
  InfisicalSiteUrl = 'INFISICAL_SITE_URL',
}
