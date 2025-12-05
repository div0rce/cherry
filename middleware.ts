import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ROUTES } from '@/lib/routes';

const DEV_PATH_REGEX = new RegExp(`^${ROUTES.dev.root}(\\/.*)?$`);
const DEV_API_REGEX = new RegExp(`^/api${ROUTES.dev.root}(\\/.*)?$`);

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
  matcher: [`${ROUTES.dev.root}/:path*`, `/api${ROUTES.dev.root}/:path*`],
};
