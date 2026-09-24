import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Serves the IndexNow verification key file dynamically.
 * Required by Bing, Yandex, Seznam, and IndexNow engines to verify domain ownership.
 * Example verification location: https://muskydose.in/<key>.txt
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedKey = (searchParams.get('key') || '').trim();

  const configuredKey = (process.env.INDEXNOW_KEY || process.env.INDEXNOW_API_KEY || '').trim();

  // If no key configured in environment or key doesn't match requested key, fail cleanly with 404
  if (!configuredKey || !requestedKey || requestedKey !== configuredKey) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // Return the configured verification key in plain text
  return new NextResponse(configuredKey, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
