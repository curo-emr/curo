import { BadRequestException } from '@nestjs/common';

/** The file types accepted: each one's name, and the bytes its files start with. */
const ACCEPTED: Record<string, { name: string; signature: Buffer }> = {
  'application/pdf': { name: 'PDF', signature: Buffer.from('%PDF-') },
  'image/jpeg': { name: 'JPEG', signature: Buffer.from([0xff, 0xd8, 0xff]) },
  'image/png': {
    name: 'PNG',
    signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
};

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Throws 400 unless `file` is a PDF, JPEG or PNG of at most 20 MB. The type the
 * client declared must be one of those, and the bytes must be a file of that type:
 * the declared type is what the file is later served as.
 */
export function assertAcceptedFile(
  file: Express.Multer.File | undefined,
): asserts file is Express.Multer.File {
  if (!file) throw new BadRequestException('No file provided');
  const accepted = ACCEPTED[file.mimetype];
  if (!accepted)
    throw new BadRequestException(
      'Only PDF, JPEG and PNG files can be uploaded',
    );
  const { name, signature } = accepted;
  if (!file.buffer.subarray(0, signature.length).equals(signature))
    throw new BadRequestException(`This file isn't a valid ${name}`);
  if (file.size > MAX_FILE_BYTES)
    throw new BadRequestException('File exceeds the 20 MB limit');
}
