import { randomUUID } from 'crypto';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Allowed types, identified by their magic bytes (the client-sent mimetype is not trusted).
const FILE_TYPES = [
  { mime: 'application/pdf', ext: '.pdf', magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'image/png', ext: '.png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', ext: '.jpg', magic: [0xff, 0xd8, 0xff] },
];

export function detectFileType(buffer: Buffer) {
  return FILE_TYPES.find((t) => t.magic.every((b, i) => buffer[i] === b));
}

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async upload(
    buildingId: string,
    uploadedBy: string,
    file: Express.Multer.File,
  ) {
    const type = detectFileType(file.buffer);
    if (!type) {
      throw new UnprocessableEntityException(
        'Dozvoljeni su samo PDF, PNG i JPEG fajlovi',
      );
    }
    const storageKey = `buildings/${buildingId}/${randomUUID()}${type.ext}`;
    await this.storage.put(storageKey, file.buffer, type.mime);
    return this.prisma.storedFile.create({
      data: {
        buildingId,
        uploadedBy,
        storageKey,
        // Multer decodes the multipart filename as latin1; restore UTF-8 (č, ć, š, ž, đ).
        fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        mimeType: type.mime,
        sizeBytes: file.size,
      },
      omit: { storageKey: true },
    });
  }

  async downloadUrl(buildingId: string, fileId: string) {
    const file = await this.prisma.storedFile.findFirstOrThrow({
      where: { id: fileId, buildingId },
    });
    return {
      url: await this.storage.signedDownloadUrl(file.storageKey, file.fileName),
    };
  }
}
