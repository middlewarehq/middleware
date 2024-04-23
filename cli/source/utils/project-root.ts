import { existsSync } from 'fs';
import { join, resolve } from 'path';

export function findProjectRoot(currentDir: string): string {
  if (existsSync(join(currentDir, 'Dockerfile'))) {
    return currentDir;
  } else {
    const parentDir = resolve(currentDir, '..');
    if (parentDir === currentDir) {
      // Reached the root directory
      throw new Error('Project root not found');
    }
    return findProjectRoot(parentDir);
  }
}
