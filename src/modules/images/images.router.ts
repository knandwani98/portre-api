import { Router } from 'express';
import { requireAppUser } from '../../middleware/auth.js';
import {
  deleteImage,
  getImage,
  getQuota,
  listImages,
} from './images.controller.js';

export const imagesRouter = Router();

imagesRouter.use(requireAppUser);
imagesRouter.get('/', listImages);
imagesRouter.get('/quota', getQuota);
imagesRouter.get('/:id', getImage);
imagesRouter.delete('/:id', deleteImage);
