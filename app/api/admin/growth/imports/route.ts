import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated, verifyAdminCsrfAndOrigin } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { parseAndImportCsvData } from '@/lib/growth/sources/import-adapter';
import { getImportJobs } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }

    const jobs = await getImportJobs();
    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch import jobs.');
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }
    if (!verifyAdminCsrfAndOrigin(req)) {
      return NextResponse.json({ success: false, error: 'Forbidden: CSRF / Origin mismatch' }, { status: 403 });
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
      filename = file.name;
      text = await file.text();
    } else {
      const body = await req.json().catch(() => ({}));
      importType = body.importType || 'LEADS';
      filename = body.filename || `${importType.toLowerCase()}_import.csv`;
      text = body.csvContent || '';
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
