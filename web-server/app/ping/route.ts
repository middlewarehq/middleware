import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// For plain text response
export function GET(request: NextRequest) {
  return new Response('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
