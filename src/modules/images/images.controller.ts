import type { NextFunction, Request, Response } from 'express';
import { imageIdParamSchema, listImagesQuerySchema } from '../../shared/index.js';
import type { AuthedRequest } from '../../middleware/auth.js';
import { ImagesService } from './images.service.js';

const imagesService = new ImagesService();

export async function listImages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listImagesQuerySchema.parse(req.query);
    const { appUser } = req as AuthedRequest;
    const data = await imagesService.list({
      userId: appUser.id,
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getQuota(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { appUser } = req as AuthedRequest;
    const data = await imagesService.quota(appUser.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = imageIdParamSchema.parse(req.params);
    const { appUser } = req as AuthedRequest;
    const data = await imagesService.get(appUser.id, id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function deleteImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = imageIdParamSchema.parse(req.params);
    const { appUser } = req as AuthedRequest;
    await imagesService.deleteOne(appUser.id, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
