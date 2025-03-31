import * as fs from 'fs/promises';
import * as path from 'path';

export async function walk(directory: string): Promise<string[]> {
  const files: string[] = [];
  async function recurse(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await recurse(fullPath);
        } else {
          files.push(fullPath);
        }
      })
    );
  }
  await recurse(directory);
  return files;
}
