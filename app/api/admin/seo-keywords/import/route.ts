import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { saveSeoKeyword } from '@/lib/db/seo';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limit';

const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5 MiB cap

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function POST(req: NextRequest) {
  const authCheck = requireAdminAuthAndCsrf(req);
  if (!authCheck.authenticated) {
    return authCheck.errorResponse!;
  }

  const ip = getClientIp(req.headers);
  const rl = await checkRateLimitAsync(`seo_import:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many import requests. Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let itemsToImport: any[] = [];

    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (Array.isArray(body.keywords)) {
        itemsToImport = body.keywords;
      } else if (Array.isArray(body)) {
        itemsToImport = body;
      }
    } else {
      // Parse CSV text with quoted comma support
      const csvText = await req.text();
      if (Buffer.byteLength(csvText, 'utf8') > MAX_CSV_SIZE) {
        return NextResponse.json({ success: false, error: 'CSV file exceeds maximum allowed size of 5MB.' }, { status: 413 });
      }

      const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
        const kwIdx = header.findIndex((h) => h.includes('keyword'));
        const targetTypeIdx = header.findIndex((h) => h.includes('target') && h.includes('type'));
        const targetUrlIdx = header.findIndex((h) => h.includes('url'));
        const priorityIdx = header.findIndex((h) => h.includes('priority'));

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]).map((c) => c.replace(/^["']|["']$/g, '').trim());
          const kw = kwIdx >= 0 ? cols[kwIdx] : cols[0];
          if (kw) {
            itemsToImport.push({
              keyword: kw.substring(0, 200),
              targetType: targetTypeIdx >= 0 && cols[targetTypeIdx] ? cols[targetTypeIdx].substring(0, 50) : 'homepage',
              targetUrl: targetUrlIdx >= 0 && cols[targetUrlIdx] ? cols[targetUrlIdx].substring(0, 255) : '/',
              priority: priorityIdx >= 0 && cols[priorityIdx] ? cols[priorityIdx].toUpperCase() : 'MEDIUM',
              active: true,
            });
          }
        }
      }
    }

    if (itemsToImport.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid keywords provided for import.' }, { status: 400 });
    }

    if (itemsToImport.length > 2000) {
      return NextResponse.json({ success: false, error: 'Maximum batch size is 2,000 keywords per import.' }, { status: 400 });
    }

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const item of itemsToImport) {
      try {
        await saveSeoKeyword(item);
        importedCount++;
      } catch (err: any) {
        if (err.message && err.message.includes('already active')) {
          skippedCount++;
        } else {
          failedCount++;
          errors.push(`Keyword "${item.keyword || 'unknown'}": ${err.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      failedCount,
      errors: errors.slice(0, 10),
    });
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to import SEO keywords.');
  }
}
