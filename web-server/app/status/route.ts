import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let version = 'unknown';
try {
  const pkgPath = join(process.cwd(), 'package.json');
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
  version = pkgJson.version || 'unknown';
} catch (err) {
  console.warn('status route: failed to read package.json for version', err instanceof Error ? err.message : err);
}

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    version,
  },
  {
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
