import { Readable } from 'stream';

/**
 * Storage is kept behind this tiny interface so the concrete backend
 * (MinIO today; SFTP / filesystem / S3 tomorrow) is a reversible internal
 * detail. The upload/download API contract never changes when it is swapped.
 */
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  /** Store raw bytes under `key`. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Open a readable stream for `key` (used to proxy bytes back to the client). */
  getStream(key: string): Promise<Readable>;
  /** Time-limited direct URL (optional fast path; not used while we proxy bytes). */
  getPresignedUrl(key: string, expirySeconds?: number): Promise<string>;
  /** Remove the object. */
  delete(key: string): Promise<void>;
}
