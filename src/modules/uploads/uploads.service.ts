import {
  MAX_FILE_SIZE_BYTES,
  completeUploadSchema,
  presignRequestSchema,
} from '../../shared/index.js';
import { env } from '../../config/env.js';
import { createId } from '../../lib/ids.js';
import { objectExists, objectKey, putObject } from '../../lib/storage.js';
import { badRequest, conflict, notFound } from '../../types/app-error.js';
import { ImagesRepository } from '../images/images.repository.js';
import { ImagesService } from '../images/images.service.js';
import { UploadsRepository } from './uploads.repository.js';

export class UploadsService {
  constructor(
    private readonly images = new ImagesRepository(),
    private readonly uploads = new UploadsRepository(),
    private readonly imagesService = new ImagesService(),
  ) {}

  async presign(
    user: { id: string; clerkId: string },
    body: unknown,
  ) {
    const input = presignRequestSchema.parse(body);
    if (input.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw badRequest('File is too large', 'FILE_TOO_LARGE');
    }

    const imageId = createId();
    const storageKey = objectKey(user.clerkId, imageId);
    const reserved = await this.images.reserveSlot(user.id, {
      id: imageId,
      userId: user.id,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey,
      batchId: input.batchId,
    });

    if (!reserved.ok) {
      throw conflict(
        'You already have 10 accepted or processing photos',
        'QUOTA_EXCEEDED',
      );
    }

    return {
      imageId: reserved.image.id,
      uploadUrl: `${env.API_PUBLIC_URL}/api/v1/uploads/${reserved.image.id}/file`,
      storageKey,
    };
  }

  async putFile(
    userId: string,
    imageId: string,
    body: Buffer,
    contentType: string | undefined,
  ): Promise<void> {
    const image = await this.images.findByIdForUser(imageId, userId);
    if (!image) {
      throw notFound('Image not found');
    }
    if (image.status !== 'PENDING') {
      throw badRequest('Upload already completed');
    }
    const mimeType = contentType?.split(';')[0]?.trim();
    if (!mimeType || mimeType !== image.mimeType) {
      throw badRequest('Invalid content type');
    }
    if (body.length === 0) {
      throw badRequest('Empty file');
    }
    if (body.length > MAX_FILE_SIZE_BYTES) {
      throw badRequest('File is too large', 'FILE_TOO_LARGE');
    }
    await putObject(image.storageKey, body, mimeType);
  }

  async complete(userId: string, body: unknown) {
    const { imageId } = completeUploadSchema.parse(body);
    const image = await this.images.findByIdForUser(imageId, userId);
    if (!image) {
      throw notFound('Image not found');
    }
    if (image.status !== 'PENDING') {
      throw badRequest('Upload already completed');
    }

    const exists = await objectExists(image.storageKey);
    if (!exists) {
      throw badRequest('File was not uploaded');
    }

    const existingJob = await this.uploads.findJobByImageId(image.id);
    if (!existingJob) {
      await this.uploads.createJob(image.id);
    }
    const updated = await this.images.markProcessing(image.id);
    return this.imagesService.toDto(updated);
  }
}
