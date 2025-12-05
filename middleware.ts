import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const DEV_PATH_REGEX = /^\/dev(\/.*)?$/;
const DEV_API_REGEX = /^\/api\/dev(\/.*)?$/;

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isDevRoute = DEV_PATH_REGEX.test(pathname) || DEV_API_REGEX.test(pathname);

  if (!isDevRoute) {
    return NextResponse.next();
  }

  const env = process.env.NODE_ENV;
  const devAllowed =
    env !== 'production' || process.env['CHERRY_DEV_SHELL_ENABLED'] === 'true';

  if (!devAllowed) {
    return new NextResponse('Dev console is disabled in this environment.', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dev/:path*', '/api/dev/:path*'],
};
