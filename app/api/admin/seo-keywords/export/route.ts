import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated } from '@/lib/auth';
import { getSeoKeywords } from '@/lib/db/seo';

export async function GET(req: NextRequest) {
  if (!isRequestAdminAuthenticated(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.' }, { status: 401 });
  }

  try {
    const keywords = await getSeoKeywords();
    
    // Format as CSV
    const headers = ['ID', 'Keyword', 'Target Type', 'Target ID', 'Target URL', 'Priority', 'Active', 'Is Primary', 'Notes', 'Created At'];
    const csvRows = [headers.join(',')];

    for (const k of keywords) {
      const row = [
        `"${k.id}"`,
        `"${k.keyword.replace(/"/g, '""')}"`,
        `"${k.targetType}"`,
        `"${(k.targetId || '').replace(/"/g, '""')}"`,
        `"${k.targetUrl}"`,
        `"${k.priority}"`,
        k.active ? 'true' : 'false',
        k.isPrimary ? 'true' : 'false',
        `"${(k.notes || '').replace(/"/g, '""')}"`,
        `"${k.createdAt}"`,
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="muskydose-seo-keywords-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
