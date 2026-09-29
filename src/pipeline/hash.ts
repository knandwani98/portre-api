import sharp from 'sharp';

export async function computeDHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = 0n;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = data[y * 9 + x] ?? 0;
      const right = data[y * 9 + x + 1] ?? 0;
      if (left < right) {
        hash |= 1n << BigInt(y * 8 + x);
      }
    }
  }
  return hash.toString(16).padStart(16, '0');
}

export function hammingDistance(a: string, b: string): number {
  const xor = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let bits = xor;
  let distance = 0;
  while (bits > 0n) {
    distance += 1;
    bits &= bits - 1n;
  }
  return distance;
}
