import type { NextFunction, Request, Response } from 'express';
import type { AuthedRequest } from '../../middleware/auth.js';
import { badRequest } from '../../types/app-error.js';
import { UploadsService } from './uploads.service.js';

const uploadsService = new UploadsService();

export async function presignUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { appUser } = req as AuthedRequest;
    const data = await uploadsService.presign(appUser, req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
}

export async function putUploadFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { appUser } = req as AuthedRequest;
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    const imageId = req.params.imageId;
    if (!imageId) {
      throw badRequest('Missing image id');
    }
    await uploadsService.putFile(
      appUser.id,
      imageId,
      body,
      req.header('content-type'),
    );
    res.status(200).end();
  } catch (error) {
    next(error);
  }
}

export async function completeUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { appUser } = req as AuthedRequest;
    const data = await uploadsService.complete(appUser.id, req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
}
