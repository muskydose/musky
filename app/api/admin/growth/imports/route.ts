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

    const formData = await req.formData();
    const importType = (formData.get('importType') as any) || 'LEADS';
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No CSV file provided' }, { status: 400 });
    }

    const text = await file.text();
    const result = await parseAndImportCsvData(importType, file.name, text);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to execute CSV import.');
  }
}
