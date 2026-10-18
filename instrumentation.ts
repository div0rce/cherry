// Next.js calls register() once per server instance (each `next start` process and each Vercel
// function cold start) before serving requests. next.config.ts never runs inside Vercel
// functions, so the runtime config is initialized here from the deployment environment. In
// `next start`, next.config.ts already initialized this process (the store is process-wide).
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;
  const { hasServerConfig } = await import('./lib/config/store.js');
  if (hasServerConfig()) return;
  const { initConfigFromEnv } = await import('./lib/config/init.js');
  try {
    initConfigFromEnv(process.env);
  } catch (error: unknown) {
    // An invalid environment (e.g. production without CHERRY_VINE_SIGNATURE_MODE=enforce) must
    // not take down routes that never read config; those that do keep failing with
    // "ServerConfig not initialized". The cause is logged once here.
    console.error('[cherry] server config init failed; config-dependent routes will fail:', error);
  }
}
