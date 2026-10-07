import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from 'minio';
import { Readable } from 'stream';
import { secretFromEnv } from '@curo/shared/config';
import { StorageProvider } from './storage.provider';

/**
 * MinIO (S3-compatible) implementation of StorageProvider. The bucket is
 * created on boot if missing so a fresh `docker compose up` works with no
 * manual setup.
 */
@Injectable()
export class MinioStorageProvider implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(MinioStorageProvider.name);
  private readonly bucket = process.env.MINIO_BUCKET || 'curo-documents';
  private readonly client: Client;
  private bucketReady = false;

  constructor() {
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: (process.env.MINIO_USE_SSL || 'false') === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'curo',
      secretKey: secretFromEnv('MINIO_SECRET_KEY', 'curo_secret_minio'),
    });
  }

  async onModuleInit() {
    // Best-effort: if MinIO isn't up yet at boot, ensureBucket() retries lazily
    // on the first upload, so startup is decoupled from MinIO readiness.
    await this.ensureBucket().catch((err) =>
      this.logger.warn(
        `MinIO not ready at boot (will retry on first use): ${(err as Error).message}`,
      ),
    );
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created object storage bucket "${this.bucket}"`);
    }
    this.bucketReady = true;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.ensureBucket();
    await this.client.putObject(this.bucket, key, body, body.length, {
      'Content-Type': contentType,
    });
  }

  async getStream(key: string): Promise<Readable> {
    return this.client.getObject(this.bucket, key);
  }

  async getPresignedUrl(key: string, expirySeconds = 300): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
