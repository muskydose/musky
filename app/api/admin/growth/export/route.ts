import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getMarketMetrics, getLeads, getKeywords, getCompetitors } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'leads';

    let csvContent = '';
    let filename = `growth_export_${type}_${Date.now()}.csv`;

    if (type === 'leads') {
      const leads = await getLeads();
      const headers = ['id', 'businessName', 'contactName', 'phone', 'whatsapp', 'email', 'leadType', 'state', 'district', 'city', 'status', 'priority', 'source', 'notes'];
      const rows = leads.map((l) => [
        l.id,
        `"${l.businessName.replace(/"/g, '""')}"`,
        `"${l.contactName.replace(/"/g, '""')}"`,
        l.phone,
        l.whatsapp || '',
        l.email || '',
        l.leadType,
        l.state,
        l.district || '',
        l.city || '',
        l.status,
        l.priority,
        l.source,
        `"${(l.notes || '').replace(/"/g, '""')}"`,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (type === 'markets') {
      const markets = await getMarketMetrics();
      const headers = ['id', 'marketName', 'state', 'district', 'city', 'ordersCount', 'revenue', 'customersCount', 'wholesaleLeadsCount', 'marketOpportunityScore', 'sourceTier'];
      const rows = markets.map((m) => [
        m.id,
        `"${m.marketName.replace(/"/g, '""')}"`,
        m.state,
        m.district || '',
        m.city || '',
        m.ordersCount,
        m.revenue,
        m.customersCount,
        m.wholesaleLeadsCount,
        m.marketOpportunityScore,
        m.sourceTier,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (type === 'keywords') {
      const keywords = await getKeywords();
      const headers = ['id', 'keyword', 'language', 'category', 'searchVolume', 'competition', 'cpc', 'trend', 'sourceTier', 'sourceName'];
      const rows = keywords.map((k) => [
        k.id,
        `"${k.keyword.replace(/"/g, '""')}"`,
        k.language,
        k.category || '',
        k.searchVolume || 0,
        k.competition || 'MEDIUM',
        k.cpc || 0,
        k.trend || 'STABLE',
        k.sourceTier,
        k.sourceName,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to export growth CSV data.');
  }
}
