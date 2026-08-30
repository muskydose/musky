import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { parseAndImportCsvData } from '@/lib/growth/sources/import-adapter';
import { getImportJobs } from '@/lib/growth/growth-db';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limit';

const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5 MiB cap

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const jobs = await getImportJobs();
    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch import jobs.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const ip = getClientIp(req.headers);
    const rl = await checkRateLimitAsync(`import:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many import requests. Please wait a moment before trying again.' },
        { status: 429 }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    let importType: 'MARKETS' | 'KEYWORDS' | 'LEADS' | 'COMPETITORS' = 'LEADS';
    let filename = 'dataset.csv';
    let text = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      importType = (formData.get('importType') as any) || 'LEADS';
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: 'No CSV file provided in form data' }, { status: 400 });
      }
      if (file.size > MAX_CSV_SIZE) {
        return NextResponse.json({ success: false, error: 'CSV file exceeds maximum allowed size of 5MB.' }, { status: 413 });
      }
      filename = file.name;
      text = await file.text();
    } else {
      const body = await req.json().catch(() => ({}));
      importType = body.importType || 'LEADS';
      filename = body.filename || `${importType.toLowerCase()}_import.csv`;
      text = body.csvContent || '';
      if (typeof text === 'string' && Buffer.byteLength(text, 'utf8') > MAX_CSV_SIZE) {
        return NextResponse.json({ success: false, error: 'CSV content exceeds maximum allowed size of 5MB.' }, { status: 413 });
      }
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'CSV file or content is empty' }, { status: 400 });
    }

    const result = await parseAndImportCsvData(importType, filename, text);
    return NextResponse.json({ success: true, result, importSummary: result });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to execute CSV import.');
  }
}
