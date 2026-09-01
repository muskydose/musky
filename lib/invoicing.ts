// ============================================================
// MUSKY DOSE — TAX INVOICE & RECEIPT GENERATION ENGINE
// ============================================================

import { Order, SiteSettings } from './types';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  order: Order;
  settings?: Partial<SiteSettings>;
}

export function generateInvoiceHtml({ invoiceNumber, invoiceDate, order, settings }: InvoiceData): string {
  const companyName = settings?.invoiceConfig?.companyLegalName || 'Musky Dose Enterprise';
  const companyAddress = settings?.invoiceConfig?.registeredAddress || 'Musky Dose Complex, Station Road, Sojat City, Pali District, Rajasthan - 306104';
  const companyGstin = settings?.invoiceConfig?.gstin || '08XXXXX0000X1Z0 (Registered Sojat MSME)';
  const companyPhone = settings?.displayPhone || '+91 82337 03080';
  const companyEmail = settings?.businessEmail || 'info@muskydose.in';

  const itemsHtml = (order.items || [])
    .map(
      (item, idx) => `
      <tr style="border-bottom: 1px solid #e8e2d5;">
        <td style="padding: 10px; font-size: 12px; color: #555;">${idx + 1}</td>
        <td style="padding: 10px; font-size: 12px; font-weight: bold; color: #0f2d22;">
          ${item.productName}
          ${item.weight ? `<br/><span style="font-size: 11px; font-weight: normal; color: #777;">Pack: ${item.weight}</span>` : ''}
        </td>
        <td style="padding: 10px; font-size: 12px; text-align: center; color: #333;">${item.quantity}</td>
        <td style="padding: 10px; font-size: 12px; text-align: right; color: #333;">₹${item.price}</td>
        <td style="padding: 10px; font-size: 12px; text-align: right; font-weight: bold; color: #1b4332;">₹${item.price * item.quantity}</td>
      </tr>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Tax Invoice — ${invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2b302c;
      background: #fcfbf7;
      margin: 0;
      padding: 30px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e8e2d5;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1b4332;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .logo-area h1 {
      margin: 0;
      font-size: 24px;
      color: #0f2d22;
      letter-spacing: -0.5px;
    }
    .logo-area p {
      margin: 4px 0 0 0;
      font-size: 11px;
      color: #626c66;
      line-height: 1.4;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-meta h2 {
      margin: 0;
      font-size: 18px;
      color: #1b4332;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .invoice-meta p {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #444;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
      padding: 16px;
      background: #fcfbf7;
      border: 1px solid #e8e2d5;
      border-radius: 12px;
    }
    .party-box {
      flex: 1;
      font-size: 12px;
    }
    .party-box strong {
      display: block;
      color: #0f2d22;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #f5f1e8;
      color: #0f2d22;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e8e2d5;
    }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .totals-table {
      width: 300px;
      font-size: 12px;
    }
    .totals-table td {
      padding: 6px 0;
    }
    .totals-table .grand-total td {
      border-top: 2px solid #1b4332;
      font-size: 16px;
      font-weight: bold;
      color: #1b4332;
      padding-top: 10px;
    }
    .footer {
      border-top: 1px solid #e8e2d5;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #777;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .invoice-card {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
      <button onclick="window.print()" style="background: #1b4332; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer;">
        🖨️ Print / Save PDF
      </button>
    </div>

    <div class="header">
      <div class="logo-area">
        <h1>${companyName}</h1>
        <p>${companyAddress}<br/>GSTIN: ${companyGstin}<br/>Phone: ${companyPhone} | Email: ${companyEmail}</p>
      </div>
      <div class="invoice-meta">
        <h2>TAX INVOICE</h2>
        <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
        <p><strong>Date:</strong> ${invoiceDate}</p>
        <p><strong>Order ID:</strong> ${order.orderNumber || order.id}</p>
        <p><strong>Payment:</strong> ${order.paymentMethod} (${order.paymentStatus})</p>
      </div>
    </div>

    <div class="parties">
      <div class="party-box">
        <strong>Billed / Shipped To:</strong>
        <div style="font-weight: bold; color: #0f2d22; font-size: 13px;">${order.customerName}</div>
        <div>${order.customerHouseShop ? `${order.customerHouseShop}, ` : ''}${order.customerAddress}</div>
        ${order.customerArea ? `<div>Area: ${order.customerArea}</div>` : ''}
        ${order.customerLandmark ? `<div>Landmark: ${order.customerLandmark}</div>` : ''}
        <div>${order.customerCity || ''}${order.customerState ? `, ${order.customerState}` : ''} - ${order.customerPincode || ''}</div>
        <div>Mobile: ${order.customerPhone}${order.customerWhatsapp ? ` | WA: ${order.customerWhatsapp}` : ''}</div>
      </div>
      <div class="party-box" style="text-align: right;">
        <strong>Place of Supply & Dispatch:</strong>
        <div>Sojat City, Pali District</div>
        <div>Rajasthan, India (State Code: 08)</div>
        <div style="margin-top: 8px;"><strong>Status:</strong> <span style="color: #1b4332; font-weight: bold;">${order.orderStatus}</span></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Description of Botanical Goods</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          <th style="text-align: right; width: 80px;">Rate</th>
          <th style="text-align: right; width: 100px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals-area">
      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td style="text-align: right; font-weight: bold;">₹${order.subtotal}</td>
        </tr>
        ${
          order.discountAmount && order.discountAmount > 0
            ? `<tr>
                <td style="color: #b91c1c;">Discount ${order.couponCode ? `(${order.couponCode})` : ''}:</td>
                <td style="text-align: right; color: #b91c1c; font-weight: bold;">-₹${order.discountAmount}</td>
              </tr>`
            : ''
        }
        <tr>
          <td>Shipping & Handling:</td>
          <td style="text-align: right; font-weight: bold;">${order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee}`}</td>
        </tr>
        <tr class="grand-total">
          <td>Total Payable:</td>
          <td style="text-align: right;">₹${order.totalAmount}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <div>
        Authentic Sojat Lawsonia Inermis & Herbal Botanical Care.<br/>
        This is a computer-generated tax invoice.
      </div>
      <div style="text-align: right;">
        <strong>For ${companyName}</strong><br/>
        <span style="font-size: 10px; color: #888;">Authorized Signatory</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

