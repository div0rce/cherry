// Next.js calls register() once per server instance (each `next start` process and each Vercel
// function cold start) before serving requests. next.config.ts never runs inside Vercel
// functions, so the runtime config is initialized here from the deployment environment. In
// `next start`, next.config.ts already initialized this process (the store is process-wide).
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;
  const { hasServerConfig } = await import('./lib/config/store.js');
  if (hasServerConfig()) return;
  const { initConfigFromEnv } = await import('./lib/config/init.js');
  initConfigFromEnv(process.env);
}
