import express, { Router } from 'express';
import { requireAppUser } from '../../middleware/auth.js';
import { MAX_FILE_SIZE_BYTES } from '../../shared/index.js';
import {
  completeUpload,
  presignUpload,
  putUploadFile,
} from './uploads.controller.js';

export const uploadsRouter = Router();

uploadsRouter.use(requireAppUser);
uploadsRouter.post('/presign', presignUpload);
uploadsRouter.put(
  '/:imageId/file',
  express.raw({ type: () => true, limit: MAX_FILE_SIZE_BYTES }),
  putUploadFile,
);
uploadsRouter.post('/complete', completeUpload);
