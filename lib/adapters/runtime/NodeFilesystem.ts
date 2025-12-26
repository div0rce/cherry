import { accessSync, readFileSync, writeFileSync } from 'node:fs';
import type { FileEncoding, Filesystem } from '../contracts/Filesystem.js';

export class NodeFilesystem implements Filesystem {
  async readFile(path: string, encoding: FileEncoding = 'utf8'): Promise<string> {
    const content: unknown = readFileSync(path, { encoding });
    if (typeof content === 'string') {
      return content;
    }
    return String(content);
  }

  async writeFile(path: string, data: string, encoding: FileEncoding = 'utf8'): Promise<void> {
    const result: unknown = writeFileSync(path, data, { encoding });
    void result;
  }

  async exists(path: string): Promise<boolean> {
    try {
      const result: unknown = accessSync(path);
      void result;
      return true;
    } catch {
      return false;
    }
  }
}
