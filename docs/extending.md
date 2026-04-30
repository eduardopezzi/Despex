---
layout: default
title: Extending the Platform
nav_order: 6
---

# Extending the Platform

Learn how to extend Open Receipt OCR with custom providers and features.

## Adding a New OCR Provider

To add a new OCR provider (e.g., "CustomOCR"), follow these steps:

### 1. Update Shared Types

Add the provider to the enum in `packages/types/src/ocr-provider.enum.ts`:

```typescript
export enum OcrProvider {
  // ... existing providers
  CUSTOM_OCR = 'custom-ocr',
}
```

### 2. Configure Secrets

Add required API keys/credentials to `server/src/core/types/app-secret.enum.ts`:

```typescript
export enum AppSecret {
  // ... existing secrets
  CUSTOM_OCR_API_KEY = 'CUSTOM_OCR_API_KEY',
  CUSTOM_OCR_ENDPOINT = 'CUSTOM_OCR_ENDPOINT',
}
```

Document these in `server/.env.example`:

```env
CUSTOM_OCR_API_KEY=your_api_key
CUSTOM_OCR_ENDPOINT=https://api.customocr.com/v1
```

### 3. Create the Processor

Create `server/src/worker/ocr/custom-ocr.processor.ts`:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { SecretProvider } from '../../core/secrets/secrets.provider';
import { StorageProvider } from '../../core/storage/storage.provider';
import { AppSecret } from '../../core/types/app-secret.enum';
import { OcrFileEntity } from '../../ocr-jobs/entities/ocr-file.entity';

@Injectable()
export class CustomOcrProcessor {
  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
  ) {}

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    // 1. Get secrets
    const apiKey = await this.secretProvider.getSecret(
      AppSecret.CUSTOM_OCR_API_KEY,
    );
    const endpoint = await this.secretProvider.getSecret(
      AppSecret.CUSTOM_OCR_ENDPOINT,
    );

    if (!apiKey || !endpoint) {
      throw new Error('CustomOCR credentials not configured');
    }

    // 2. Get file stream from storage
    const fileStream = await this.storage.getStream(file.storageKey);

    // 3. Call your OCR API
    const result = await this.callCustomOcrApi(
      fileStream,
      apiKey,
      endpoint,
    );

    // 4. Return result as JSON string
    return JSON.stringify({
      markdown: result.markdown,
      rawText: result.text,
      confidence: result.confidence,
    });
  }

  private async callCustomOcrApi(
    fileStream: NodeJS.ReadableStream,
    apiKey: string,
    endpoint: string,
  ): Promise<any> {
    // Implementation depends on your OCR service API
    // Example using fetch:
    const formData = new FormData();
    const blob = new Blob([fileStream]);
    formData.append('image', blob);

    const response = await fetch(`${endpoint}/recognize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        `CustomOCR API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }
}
```

### 4. Register the Processor

Add your processor to `server/src/worker/worker.module.ts`:

```typescript
import { CustomOcrProcessor } from './ocr/custom-ocr.processor';

@Module({
  // ... other config
  providers: [
    // ... existing processors
    CustomOcrProcessor,
  ],
})
export class WorkerModule {}
```

### 5. Hook into OCR Processor

Update `server/src/worker/ocr/ocr.processor.ts`:

```typescript
import { CustomOcrProcessor } from './custom-ocr.processor';
import { OcrProvider } from '@open-receipt-ocr/types';

@Injectable()
export class OcrProcessor {
  constructor(
    // ... existing injections
    private readonly customOcr: CustomOcrProcessor,
  ) {}

  async process(
    file: OcrFileEntity,
    provider: OcrProvider,
    executionId: number,
  ): Promise<string> {
    switch (provider) {
      // ... existing cases
      case OcrProvider.CUSTOM_OCR:
        return this.customOcr.process(file, executionId);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
```

### 6. Client-Side Rendering (Optional)

Create a parser for your OCR output in `client/src/app/pipes/parsers/custom-ocr.parser.ts`:

```typescript
import { Injectable } from '@angular/core';
import { OcrOutputParser } from '../ocr-output-parser.interface';

interface CustomOcrOutput {
  markdown: string;
  rawText: string;
  confidence: number;
}

@Injectable()
export class CustomOcrParser implements OcrOutputParser {
  supports(provider: string): boolean {
    return provider === 'custom-ocr';
  }

  parse(data: string): string {
    try {
      const output: CustomOcrOutput = JSON.parse(data);
      return `
        <h3>Confidence: ${(output.confidence * 100).toFixed(0)}%</h3>
        ${output.markdown}
      `;
    } catch (e) {
      return data;
    }
  }
}
```

Register in `client/src/app/pipes/parsers/ocr-output-parser.service.ts`:

```typescript
import { CustomOcrParser } from './custom-ocr.parser';

@Injectable()
export class OcrOutputParserService {
  private parsers: OcrOutputParser[] = [
    // ... existing parsers
    new CustomOcrParser(),
  ];
}
```

## Adding a New Storage Provider

To add a new storage backend (e.g., "S3"):

### 1. Define the Provider Type

Update `server/src/core/storage/storage-provider-type.enum.ts`:

```typescript
export enum StorageProviderType {
  // ... existing types
  S3 = 's3',
}
```

### 2. Implement the Provider

Create `server/src/core/storage/s3-storage.provider.ts`:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { StorageProvider } from './storage.provider';
import { StorageProviderType } from './storage-provider-type.enum';
import { SecretProvider } from '../secrets/secrets.provider';
import { AppSecret } from '../types/app-secret.enum';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3StorageProvider extends StorageProvider {
  readonly name = StorageProviderType.S3;
  private s3: AWS.S3;

  constructor(
    @Inject(SecretProvider) private secretProvider: SecretProvider,
  ) {
    super();
  }

  async initialize(): Promise<void> {
    const accessKey = await this.secretProvider.getSecret(
      AppSecret.AWS_ACCESS_KEY_ID,
    );
    const secretKey = await this.secretProvider.getSecret(
      AppSecret.AWS_SECRET_ACCESS_KEY,
    );
    const region = await this.secretProvider.getSecret(AppSecret.AWS_REGION);

    this.s3 = new AWS.S3({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: region,
    });
  }

  async uploadStream(
    key: string,
    stream: NodeJS.ReadableStream,
  ): Promise<void> {
    const params = {
      Bucket: 'your-bucket-name',
      Key: key,
      Body: stream,
    };

    await this.s3.upload(params).promise();
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    const params = {
      Bucket: 'your-bucket-name',
      Key: key,
    };

    return this.s3.getObject(params).createReadStream();
  }

  async exists(key: string): Promise<boolean> {
    try {
      const params = {
        Bucket: 'your-bucket-name',
        Key: key,
      };
      await this.s3.headObject(params).promise();
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    const params = {
      Bucket: 'your-bucket-name',
      Key: key,
    };

    await this.s3.deleteObject(params).promise();
  }
}
```

### 3. Register the Provider

Update `server/src/core/storage/storage.module.ts`:

```typescript
import { S3StorageProvider } from './s3-storage.provider';

@Module({
  providers: [
    // ... existing providers
    S3StorageProvider,
  ],
  exports: [
    // ... existing exports
    S3StorageProvider,
  ],
})
export class StorageModule {}
```

Update factory in `server/src/core/storage/storage.provider.ts`:

```typescript
static async create(
  @Inject(SecretProvider) secretProvider: SecretProvider,
  @Inject(S3StorageProvider) s3Provider: S3StorageProvider,
): Promise<StorageProvider> {
  const type = process.env.STORAGE_PROVIDER as StorageProviderType;

  let provider: StorageProvider;
  switch (type) {
    // ... existing cases
    case StorageProviderType.S3:
      provider = s3Provider;
      break;
    default:
      provider = localProvider;
  }

  await provider.initialize?.();
  return provider;
}
```

## Adding a New Secret Provider

To add a new secret management backend (e.g., "HashiCorp Vault"):

### 1. Define the Provider Type

Update `server/src/core/secrets/secret-provider-type.enum.ts`:

```typescript
export enum SecretProviderType {
  // ... existing types
  VAULT = 'vault',
}
```

### 2. Implement the Provider

Create `server/src/core/secrets/providers/vault-secret.provider.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { SecretProvider } from '../secrets.provider';
import { SecretProviderType } from '../secret-provider-type.enum';
import { AppSecret } from '../../types/app-secret.enum';
import axios from 'axios';

@Injectable()
export class VaultSecretProvider extends SecretProvider {
  readonly name = SecretProviderType.VAULT;
  private vaultUrl: string;
  private vaultToken: string;

  constructor() {
    super();
    this.vaultUrl = process.env.VAULT_ADDR || 'http://localhost:8200';
    this.vaultToken = process.env.VAULT_TOKEN || '';
  }

  async getSecret(name: AppSecret): Promise<string | undefined> {
    try {
      const response = await axios.get(
        `${this.vaultUrl}/v1/secret/data/${name}`,
        {
          headers: {
            'X-Vault-Token': this.vaultToken,
          },
        },
      );

      return response.data.data.data.value;
    } catch (error) {
      console.error(`Failed to fetch secret ${name} from Vault:`, error);
      return undefined;
    }
  }
}
```

### 3. Register and Configure

Update `server/src/core/secrets/secrets.module.ts`:

```typescript
import { VaultSecretProvider } from './providers/vault-secret.provider';

@Module({
  providers: [
    // ... existing providers
    VaultSecretProvider,
  ],
  exports: [
    // ... existing exports
    VaultSecretProvider,
  ],
})
export class SecretsModule {}
```

Update factory in `server/src/core/secrets/secrets.provider.ts`:

```typescript
static create(vaultProvider: VaultSecretProvider): SecretProvider {
  const type = process.env.SECRET_PROVIDER as SecretProviderType;

  switch (type) {
    // ... existing cases
    case SecretProviderType.VAULT:
      return vaultProvider;
    default:
      return new EnvSecretProvider();
  }
}
```

## Best Practices

1. **Error Handling:** Provide clear error messages when credentials are missing
2. **Logging:** Log important steps for debugging (use NestJS logger)
3. **Testing:** Include unit tests for your provider
4. **Documentation:** Update configuration guide with setup instructions
5. **Dependencies:** Add to `package.json` if your provider requires external packages
6. **Validation:** Validate configuration at startup time, not at runtime

## Testing Your Provider

```typescript
describe('CustomOcrProcessor', () => {
  let processor: CustomOcrProcessor;
  let mockSecretProvider: any;
  let mockStorageProvider: any;

  beforeEach(async () => {
    mockSecretProvider = {
      getSecret: jest.fn(),
    };
    mockStorageProvider = {
      getStream: jest.fn(),
    };

    processor = new CustomOcrProcessor(
      mockSecretProvider,
      mockStorageProvider,
    );
  });

  it('should process a file successfully', async () => {
    mockSecretProvider.getSecret.mockResolvedValue('test-key');
    mockStorageProvider.getStream.mockResolvedValue(null);

    const result = await processor.process({} as OcrFileEntity, 1);
    expect(result).toBeDefined();
  });
});
```
