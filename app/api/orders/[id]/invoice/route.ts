import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/db/orders';
import { getSiteSettings } from '@/lib/db/settings';
import { generateInvoiceHtml } from '@/lib/invoicing';
import { isRequestAdminAuthenticated } from '@/lib/auth';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isRequestAdminAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized administrative access required.' },
        { status: 401 }
      );
    }

    const ip = getClientIp(request.headers);
    const rate = await checkRateLimitAsync(`invoice:${ip}`, 60, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many invoice requests. Please slow down.' },
        { status: 429 }
      );
    }

    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const settings = await getSiteSettings();
    const prefix = settings.invoiceConfig?.invoicePrefix || 'MD-INV-';
    const invoiceNumber = `${prefix}${order.orderNumber || order.id.slice(0, 8).toUpperCase()}`;
    const invoiceDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const html = generateInvoiceHtml({
      invoiceNumber,
      invoiceDate,
      order,
      settings,
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Invoice generation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate invoice' }, { status: 500 });
  }
}

