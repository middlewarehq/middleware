import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

let version = 'unknown';
try {
  const pkgPath = join(process.cwd(), 'package.json');
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
  version = pkgJson.version || 'unknown';
} catch (err) {
  console.log(err);
}

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    version,
  });
}
