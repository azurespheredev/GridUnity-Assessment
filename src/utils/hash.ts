import { createHash } from 'crypto';
import * as fs from 'fs/promises';

export async function hashFile(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}
