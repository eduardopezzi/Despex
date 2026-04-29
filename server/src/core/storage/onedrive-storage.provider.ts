import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { StorageProvider, UploadResult } from '@core/storage/storage-provider.interface';
import { StorageProviderType } from '@core/storage/storage-provider-type.enum';
import { Client, ResponseType } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';
import { ClientSecretCredential } from '@azure/identity';
import streamWeb from 'node:stream/web';
import { randomUUID } from 'node:crypto';

@Injectable()
export class OneDriveStorageProvider extends StorageProvider {
  readonly name = StorageProviderType.OneDrive;
  private readonly logger = new Logger(OneDriveStorageProvider.name);
  private graphClient: Client;
  private driveId: string;
  private folder: string;

  // --- Helper type guards and utilities as static methods ---
  private static isAccessTokenResponse(data: unknown): data is { access_token: string } {
    return (
      typeof data === 'object' && data !== null && 'access_token' in data && typeof (data as { access_token: unknown }).access_token === 'string'
    );
  }

  private static isUploadSessionResponse(data: unknown): data is { uploadUrl: string } {
    return typeof data === 'object' && data !== null && 'uploadUrl' in data && typeof (data as { uploadUrl: unknown }).uploadUrl === 'string';
  }

  private static isFileMetaResponse(data: unknown): data is { id: string; size: number; '@microsoft.graph.downloadUrl'?: string } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      typeof (data as { id: unknown }).id === 'string' &&
      'size' in data &&
      typeof (data as { size: unknown }).size === 'number'
    );
  }

  private static extractErrorMessage(err: unknown): string {
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message;
    }
    return 'Unknown error';
  }

  constructor(private readonly secretProvider: SecretProvider) {
    super();
  }

  private async getGraphClient(): Promise<Client> {
    if (!this.graphClient) {
      const clientId = await this.secretProvider.getSecretOrThrow(AppSecret.OneDriveClientId);
      const clientSecret = await this.secretProvider.getSecretOrThrow(AppSecret.OneDriveClientSecret);
      const tenantId = await this.secretProvider.getSecretOrThrow(AppSecret.OneDriveTenantId);
      this.driveId = await this.secretProvider.getSecretOrThrow(AppSecret.OneDriveDriveId);
      this.folder = await this.secretProvider.getSecretOrThrow(AppSecret.OneDriveFolder);
      const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
      this.graphClient = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            const token = await credential.getToken('https://graph.microsoft.com/.default');
            if (!token || !token.token) throw new InternalServerErrorException('Failed to get Microsoft Graph access token');
            return token.token;
          },
        },
      });
    }
    return this.graphClient;
  }

  async uploadStream(stream: Readable, filename: string): Promise<UploadResult> {
    const client = await this.getGraphClient();
    const uniqueFilename = `${randomUUID()}-${filename}`;
    const uploadSessionResp: unknown = await client.api(`/drives/${this.driveId}/root:/${this.folder}/${uniqueFilename}:/createUploadSession`).post({
      item: {
        '@microsoft.graph.conflictBehavior': 'replace',
        name: uniqueFilename,
      },
    });
    if (!OneDriveStorageProvider.isUploadSessionResponse(uploadSessionResp)) {
      this.logger.error(`Invalid upload session response: ${JSON.stringify(uploadSessionResp)}`);
      throw new InternalServerErrorException('Failed to create OneDrive upload session');
    }
    const uploadUrl = uploadSessionResp.uploadUrl;
    const chunkSize = 320 * 1024; // 320 KB
    let fileSize = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (!Buffer.isBuffer(chunk)) {
        this.logger.error('Stream chunk is not a Buffer');
        throw new InternalServerErrorException('Stream chunk is not a Buffer');
      }
      chunks.push(chunk);
      fileSize += chunk.length;
    }
    const allChunks = Buffer.concat(chunks);
    let start = 0;
    while (start < fileSize) {
      const end = Math.min(start + chunkSize, fileSize) - 1;
      const chunk = allChunks.slice(start, end + 1);

      try {
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': chunk.length.toString(),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          },
          body: chunk,
        });

        if (!res.ok) {
          const text = await res.text();
          this.logger.error(`OneDrive upload chunk failed: ${text}`);
          throw new InternalServerErrorException('OneDrive upload chunk failed');
        }
      } catch (err: unknown) {
        const msg = OneDriveStorageProvider.extractErrorMessage(err);
        this.logger.error(`OneDrive fetch error during chunk upload: ${msg}`);
        // If it's a fetch error (like ECONNRESET), throw a specific exception that NestJS handles
        throw new InternalServerErrorException(`Network error during OneDrive upload: ${msg}`);
      }
      start = end + 1;
    }
    const fileMetaResp: unknown = await client.api(`/drives/${this.driveId}/root:/${this.folder}/${uniqueFilename}`).get();
    if (!OneDriveStorageProvider.isFileMetaResponse(fileMetaResp)) {
      this.logger.error(`Invalid file metadata response: ${JSON.stringify(fileMetaResp)}`);
      throw new InternalServerErrorException('Failed to get OneDrive file metadata');
    }
    return {
      url: typeof fileMetaResp['@microsoft.graph.downloadUrl'] === 'string' ? fileMetaResp['@microsoft.graph.downloadUrl'] : '',
      key: fileMetaResp.id,
      size: fileMetaResp.size,
    };
  }

  async getStream(key: string): Promise<Readable> {
    const client = await this.getGraphClient();

    // Request the content as a binary blob/stream
    const response: unknown = await client.api(`/drives/${this.driveId}/items/${key}/content`).responseType(ResponseType.STREAM).get();

    return Readable.fromWeb(response as streamWeb.ReadableStream);
  }

  async exists(key: string): Promise<boolean> {
    const client = await this.getGraphClient();
    try {
      await client.api(`/drives/${this.driveId}/items/${key}`).get();
      return true;
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'statusCode' in err && (err as { statusCode: unknown }).statusCode === 404) return false;
      const msg = OneDriveStorageProvider.extractErrorMessage(err);
      this.logger.error('OneDrive exists check failed:', msg);
      throw new InternalServerErrorException('OneDrive exists check failed');
    }
  }

  async delete(key: string): Promise<void> {
    const client = await this.getGraphClient();
    try {
      await client.api(`/drives/${this.driveId}/items/${key}`).delete();
    } catch (err: unknown) {
      const msg = OneDriveStorageProvider.extractErrorMessage(err);
      this.logger.error('OneDrive delete failed:', msg);
      throw new InternalServerErrorException('OneDrive delete failed');
    }
  }
}
