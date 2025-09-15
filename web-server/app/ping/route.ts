import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex'
    },
  });
}
