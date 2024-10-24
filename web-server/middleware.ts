import { NextRequest, NextResponse } from 'next/server';

import { getFeaturesFromReq } from '@/api-helpers/features';
import { defaultFlags } from '@/constants/feature';

export async function middleware(request: NextRequest) {
  const flagOverrides = getFeaturesFromReq(request as any);
  const flags = { ...defaultFlags, ...flagOverrides };

  const url = request.nextUrl.clone();

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
    '/api/auth/:path*',
    '/api/integrations/:path*',
    '/api/internal/:path*',
    '/api/resources/:path*'
  ]
};
