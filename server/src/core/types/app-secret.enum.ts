export enum AppSecret {
  // Database (SQLite)
  DatabasePath = 'DATABASE_PATH',

  // Redis / BullMQ
  RedisHost = 'REDIS_HOST',
  RedisPort = 'REDIS_PORT',

  // Mistral OCR
  MistralApiKey = 'MISTRAL_API_KEY',

  // App
  Port = 'PORT',
  NodeEnv = 'NODE_ENV',
}
