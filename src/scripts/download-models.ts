import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODEL_BASE =
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';
const FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.bin',
];

const modelsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../models',
);

async function downloadModels(): Promise<void> {
  await mkdir(modelsDir, { recursive: true });
  for (const file of FILES) {
    const response = await fetch(`${MODEL_BASE}/${file}`);
    if (!response.ok) {
      throw new Error(`Failed to download ${file}: ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(path.join(modelsDir, file), bytes);
  }
}

downloadModels().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
