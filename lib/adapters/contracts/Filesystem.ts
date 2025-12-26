export type FileEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

export interface Filesystem {
  readFile(path: string, encoding?: FileEncoding): Promise<string>;
  writeFile(path: string, data: string, encoding?: FileEncoding): Promise<void>;
  exists(path: string): Promise<boolean>;
}
