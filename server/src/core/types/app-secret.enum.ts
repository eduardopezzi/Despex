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

  // ─── TabScanner OCR ─────────────────────────────────────────────────────────
  TabScannerApiKey = 'TAB_SCANNER_API_KEY',

  // ─── Azure OCR ──────────────────────────────────────────────────────────────
  AzureOcrApiKey = 'AZURE_OCR_API_KEY',
  AzureOcrEndpoint = 'AZURE_OCR_ENDPOINT',

  // ─── AWS TextExtract ───────────────────────────────────────────────────────
  AwsAccessKeyId = 'AWS_ACCESS_KEY_ID',
  AwsSecretAccessKey = 'AWS_SECRET_ACCESS_KEY',
  AwsRegion = 'AWS_REGION',

  // ─── Storage ────────────────────────────────────────────────────────────────
  StorageProvider = 'STORAGE_PROVIDER',
  MaxFileSizeBytes = 'MAX_FILE_SIZE_BYTES',
  // ─── Storage - Local ────────────────────────────────────────────────────────
  UploadsDir = 'UPLOADS_DIR',
  // ─── Storage - OneDrive ─────────────────────────────────────────────────────
  OneDriveClientId = 'ONEDRIVE_CLIENT_ID',
  OneDriveClientSecret = 'ONEDRIVE_CLIENT_SECRET',
  OneDriveTenantId = 'ONEDRIVE_TENANT_ID',
  OneDriveRefreshToken = 'ONEDRIVE_REFRESH_TOKEN',
  OneDriveDriveId = 'ONEDRIVE_DRIVE_ID',
  OneDriveFolder = 'ONEDRIVE_FOLDER',

  // ─── Infisical ─────────────────────────────────────────────────────────────
  InfisicalClientId = 'INFISICAL_CLIENT_ID',
  InfisicalClientSecret = 'INFISICAL_CLIENT_SECRET',
  InfisicalProjectId = 'INFISICAL_PROJECT_ID',
  InfisicalEnvironment = 'INFISICAL_ENVIRONMENT',
  InfisicalSiteUrl = 'INFISICAL_SITE_URL',
}
