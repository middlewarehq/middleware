import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

import { getFeaturesFromReq } from '@/api-helpers/features';
import { defaultFlags } from '@/constants/feature';

// CLUSTOX: paths reachable without a session. Health checks stay open so
// container and UI status probes keep working.
const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/status',
  '/api/db_status',
  '/api/internal_status',
  '/api/hello'
];

export async function middleware(request: NextRequest) {
  const flagOverrides = getFeaturesFromReq(request as any);
  const flags = { ...defaultFlags, ...flagOverrides };

  const url = request.nextUrl.clone();
  const isPublic = PUBLIC_PATHS.some((p) => url.pathname.startsWith(p));

  // CLUSTOX: redirect unauthenticated *page* requests to the sign-in screen.
  // API routes are deliberately excluded: they are guarded independently in
  // Endpoint.serve(), which returns 401. Redirecting an XHR to an HTML login
  // page would surface as a confusing parse error rather than an auth failure.
  const isApi = url.pathname.startsWith('/api/');
  if (!isPublic && !isApi) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
    if (!token) {
      const login = request.nextUrl.clone();
      login.pathname = '/login';
      login.search = '';
      return NextResponse.redirect(login);
    }
  }

  // Forward as-is if it's a next-auth URL, except /session
  if (
    url.pathname.startsWith('/api/auth') &&
    !url.pathname.startsWith('/api/auth/session')
  ) {
    return NextResponse.next();
  }

  url.searchParams.append('feature_flags', JSON.stringify(flags));

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // CLUSTOX: widened from the API-only matcher so pages are guarded too.
    '/((?!_next/static|_next/image|favicon.ico|assets|.*\\.png$|.*\\.svg$).*)'
  ]
};
