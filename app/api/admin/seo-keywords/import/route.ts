import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated } from '@/lib/auth';
import { saveSeoKeyword } from '@/lib/db/seo';

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
  if (!isRequestAdminAuthenticated(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
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
              keyword: kw,
              targetType: targetTypeIdx >= 0 && cols[targetTypeIdx] ? cols[targetTypeIdx] : 'homepage',
              targetUrl: targetUrlIdx >= 0 && cols[targetUrlIdx] ? cols[targetUrlIdx] : '/',
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
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

