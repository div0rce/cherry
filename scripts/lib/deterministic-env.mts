export function buildDeterministicEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };

  delete env['NODE_OPTIONS'];
  for (const key of Object.keys(env)) {
    if (key.startsWith('TS_NODE_')) {
      delete env[key];
    }
  }

  env['TZ'] = 'UTC';
  env['LC_ALL'] = 'C';
  env['CHERRY_TSESM'] = '1';

  return env;
}
