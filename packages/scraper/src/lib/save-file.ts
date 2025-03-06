import fs from 'fs';
import path from 'path';

export function saveFile(fullPath: string, buffer: Buffer): void {
  const directory = path.dirname(fullPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(fullPath, buffer);
}
