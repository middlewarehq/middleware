import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read and cache the version at module load
let version = 'unknown';
try {
  const pkgPath = join(process.cwd(), 'package.json');
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
  version = pkgJson.version || 'unknown';
} catch (err) {
    console.log(err);
  // If reading fails, version stays 'unknown'
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'OK',
    version,
  });
}