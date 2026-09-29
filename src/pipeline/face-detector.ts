import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import type { TNetInput } from '@vladmandic/face-api';
import sharp from 'sharp';
import { logger } from '../lib/logger.js';

const require = createRequire(import.meta.url);
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof import('@vladmandic/face-api');

const wasmDir = path.join(
  path.dirname(require.resolve('@tensorflow/tfjs-backend-wasm/package.json')),
  'dist',
);
setWasmPaths(`${pathToFileURL(wasmDir).href}/`);

const MODELS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../models',
);

let loaded = false;

export async function loadFaceModels(): Promise<void> {
  if (loaded) {
    return;
  }
  await tf.setBackend('wasm');
  await tf.ready();
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_DIR);
  loaded = true;
  logger.info('Ready to find faces in photos');
}

export type FaceDetectionResult = {
  faceCount: number;
  largestFaceRatio: number;
};

export async function detectFaces(buffer: Buffer): Promise<FaceDetectionResult> {
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .resize({ width: 640, height: 640, fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const pixelCount = info.width * info.height * channels;
  const rgb = new Uint8Array(info.width * info.height * 3);

  if (channels === 3) {
    rgb.set(data.subarray(0, pixelCount));
  } else {
    for (let i = 0, j = 0; i < pixelCount; i += channels, j += 3) {
      rgb[j] = data[i] ?? 0;
      rgb[j + 1] = data[i + 1] ?? data[i] ?? 0;
      rgb[j + 2] = data[i + 2] ?? data[i] ?? 0;
    }
  }

  const tensor = tf.tensor3d(rgb, [info.height, info.width, 3]);
  try {
    const detections = await faceapi.detectAllFaces(
      tensor as unknown as TNetInput,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }),
    );
    const minDim = Math.min(info.width, info.height);
    let largest = 0;
    for (const detection of detections) {
      const box = detection.box;
      const faceMin = Math.min(box.width, box.height);
      largest = Math.max(largest, faceMin / minDim);
    }
    return {
      faceCount: detections.length,
      largestFaceRatio: largest,
    };
  } finally {
    tensor.dispose();
  }
}
