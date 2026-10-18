import { NextResponse } from 'next/server';

// Every page in app/(dev) and every /api/dev route. Next only runs the proxy for these paths, and
// tests/node/dev-shell-gate.test.ts fails when a (dev) page is not covered, so a new dev page cannot
// ship ungated (seven did: /admin, /scan, /simulate, /sessions, /simulations, /vine-simulator,
// /activity, /bank-simulator).
export function proxy(): NextResponse {
  const devAllowed =
    process.env.NODE_ENV !== 'production' || process.env['CHERRY_DEV_SHELL_ENABLED'] === 'true';
  if (!devAllowed) {
    return new NextResponse('Dev console is disabled in this environment.', { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  // Static literals only (Next requirement).
  matcher: [
    '/dev/:path*',
    '/api/dev/:path*',
    '/activity',
    '/admin',
    '/bank-simulator',
    '/scan',
    '/sessions/:path*',
    '/simulate',
    '/simulations/:path*',
    '/vine-simulator',
  ],
};
