export enum AppSecret {
  // ─── App ────────────────────────────────────────────────────────────────────
  ApiPort = 'API_PORT',
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

  // ─── Azure OCR ──────────────────────────────────────────────────────────────
  AzureOcrApiKey = 'AZURE_OCR_API_KEY',
  AzureOcrEndpoint = 'AZURE_OCR_ENDPOINT',

  // ─── AWS TextExtract ───────────────────────────────────────────────────────
  AwsAccessKeyId = 'AWS_ACCESS_KEY_ID',
  AwsSecretAccessKey = 'AWS_SECRET_ACCESS_KEY',
  AwsRegion = 'AWS_REGION',

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
