import * as path from 'node:path';

// Fixture tests pass `--root <dir>` (or `--root=<dir>`) on the command line. Registered runs never
// do, so they always scan the current checkout. Do not replace this with an env var: an inherited
// env var would silently redirect `npm run check`.
export function resolveRootArg(argv: readonly string[]): string {
  const index = argv.indexOf('--root');
  const inline = argv.find((arg) => arg.startsWith('--root='));
  const value = index === -1 ? inline?.slice('--root='.length) : argv[index + 1];
  return typeof value === 'string' && value.length > 0 ? path.resolve(value) : process.cwd();
}
