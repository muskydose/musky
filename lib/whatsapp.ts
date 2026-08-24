import { Product } from './types';

export const DEFAULT_WHATSAPP_TEMPLATE = `Hello {{brand_name}},

I would like to place an order from your website.

Order Details:
{{items}}

Total Quantity: {{quantity}}
Total Amount: ₹{{total}}

Customer Details:
Name: {{customer_name}}
Address: {{customer_address}}

Please confirm product availability and delivery estimate from Sojat, Rajasthan.

Thank you!`;

export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return '918233703080';
  // Remove non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  // Default to India prefix 91 if 10 digits
  if (cleanPhone.length === 10) {
    return `91${cleanPhone}`;
  }
  return cleanPhone || '918233703080';
}

export function getConfiguredWhatsAppNumber(siteSettings?: { whatsappNumber?: string } | null): string {
  const num = siteSettings?.whatsappNumber || '';
  return formatWhatsAppNumber(num);
}

/**
 * Replace {variable_name} or {{variable_name}} placeholders with string or numeric values
 */
export function renderWhatsAppTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  if (!template || !template.trim()) {
    template = DEFAULT_WHATSAPP_TEMPLATE;
  }

  let result = template;

  // Replace both {{key}} and {key}
  Object.entries(variables).forEach(([key, val]) => {
    const stringVal = String(val ?? '');
    // Double-brace match e.g. {{key}} or {{ key }}
    const doubleRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(doubleRegex, stringVal);

    // Single-brace match e.g. {key} or { key }
    const singleRegex = new RegExp(`{\\s*${key}\\s*}`, 'gi');
    result = result.replace(singleRegex, stringVal);
  });

  return result;
}

/**
 * Generate formatted WhatsApp message for a single product order
 */
export function generateWhatsAppOrderMessage(
  product: Product,
  quantity: number = 1,
  customerName?: string,
  customerAddress?: string,
  customTemplate?: string,
  brandName: string = 'Musky Dose',
  whatsappNumber: string = '918233703080',
  orderId?: string
): string {
  const itemTotal = (product.price || 0) * (quantity || 1);
  const itemsText = `1. *${product.name}* (${product.quantityOrWeight || 'Standard Pack'})\n   Qty: ${quantity} x ₹${product.price} = ₹${itemTotal}`;

  const vars: Record<string, string | number> = {
    brand_name: brandName,
    business_name: brandName,
    product_name: product.name,
    product_sku: product.sku || 'N/A',
    quantity: quantity,
    weight: product.quantityOrWeight || 'Standard Pack',
    unit_price: product.price,
    subtotal: itemTotal,
    total: itemTotal,
    items: itemsText,
    customer_name: customerName || 'Valued Customer',
    customer_address: customerAddress || 'Not specified (Direct WhatsApp enquiry)',
    order_id: orderId || `MD-${Date.now().toString().slice(-5)}`,
    order_date: new Date().toLocaleDateString('en-IN'),
    whatsapp_number: whatsappNumber,
  };

  return renderWhatsAppTemplate(customTemplate || DEFAULT_WHATSAPP_TEMPLATE, vars);
}

/**
 * Generate formatted WhatsApp message for multi-product cart order
 */
export function generateWhatsAppCartOrderMessage(
  items: { product: Product; quantity: number }[],
  whatsappNumber: string = '918233703080',
  customerName?: string,
  customerAddress?: string,
  customTemplate?: string,
  brandName: string = 'Musky Dose',
  orderId?: string
): string {
  let totalAmount = 0;
  let totalQuantity = 0;

  const itemLines = items.map((item, idx) => {
    const itemSubtotal = (item.product.price || 0) * item.quantity;
    totalAmount += itemSubtotal;
    totalQuantity += item.quantity;
    return `${idx + 1}. *${item.product.name}* (${item.product.quantityOrWeight || 'Pack'})\n   Qty: ${item.quantity} x ₹${item.product.price} = ₹${itemSubtotal}`;
  });

  const itemsText = itemLines.join('\n\n');

  const firstProduct = items[0]?.product;

  const vars: Record<string, string | number> = {
    brand_name: brandName,
    business_name: brandName,
    product_name: firstProduct ? `${firstProduct.name} (+${items.length - 1} other items)` : 'Musky Dose Items',
    product_sku: firstProduct?.sku || 'MD-MULTI',
    quantity: totalQuantity,
    weight: firstProduct?.quantityOrWeight || 'Multiple Items',
    unit_price: firstProduct?.price || 0,
    subtotal: totalAmount,
    total: totalAmount,
    items: itemsText,
    customer_name: customerName || 'Valued Customer',
    customer_address: customerAddress || 'Not specified (Direct WhatsApp enquiry)',
    order_id: orderId || `MD-${Date.now().toString().slice(-5)}`,
    order_date: new Date().toLocaleDateString('en-IN'),
    whatsapp_number: whatsappNumber,
  };

  return renderWhatsAppTemplate(customTemplate || DEFAULT_WHATSAPP_TEMPLATE, vars);
}

/**
 * Generate sample preview message for Admin Template Customizer
 */
export function getWhatsAppPreviewMessage(
  template: string,
  brandName: string = 'Musky Dose',
  whatsappNumber: string = '918233703080'
): string {
  const sampleVars: Record<string, string | number> = {
    brand_name: brandName,
    business_name: brandName,
    product_name: 'Sojat Pure Triple-Shifted Henna Powder',
    product_sku: 'MD-HEN-250',
    quantity: 2,
    weight: '250g Pack',
    unit_price: 249,
    subtotal: 498,
    total: 498,
    items: '1. *Sojat Pure Triple-Shifted Henna Powder* (250g Pack)\n   Qty: 2 x ₹249 = ₹498',
    customer_name: 'Priya Sharma (Preview)',
    customer_address: 'Civil Lines, Jaipur, Rajasthan - 302006',
    order_id: 'MD-PREVIEW-101',
    order_date: new Date().toLocaleDateString('en-IN'),
    whatsapp_number: whatsappNumber,
  };

  return renderWhatsAppTemplate(template || DEFAULT_WHATSAPP_TEMPLATE, sampleVars);
}

/**
 * Get properly encoded wa.me URL
 */
export function getWhatsAppDirectUrl(phone: string, textMessage: string): string {
  const cleanNumber = formatWhatsAppNumber(phone);
  const encoded = encodeURIComponent(textMessage);
  return `https://wa.me/${cleanNumber}?text=${encoded}`;
}

/**
 * Generate Phase 3 structured WhatsApp order message using template if provided
 */
export function generateStructuredWhatsAppOrderMessage(
  order: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerWhatsapp?: string;
    customerHouseShop?: string;
    customerAddress?: string;
    customerArea?: string;
    customerLandmark?: string;
    customerCity?: string;
    customerState?: string;
    customerPincode?: string;
    items: { productName: string; quantity: number; price: number }[];
    subtotal: number;
    discountAmount?: number;
    discountDetails?: string;
    shippingFee: number;
    totalAmount: number;
    notes?: string;
  },
  customTemplate?: string
): string {
  const itemLines = order.items
    .map((item, idx) => {
      return `${idx + 1}. ${item.productName}\n   Quantity: ${item.quantity}\n   Price: ₹${item.price}`;
    })
    .join('\n\n');

  const discountText = order.discountAmount && order.discountAmount > 0
    ? `-₹${order.discountAmount}${order.discountDetails ? ` (${order.discountDetails})` : ''}`
    : '₹0';

  if (customTemplate && customTemplate.trim()) {
    const vars: Record<string, string | number> = {
      orderNumber: order.orderNumber,
      order_number: order.orderNumber,
      customerName: order.customerName,
      customer_name: order.customerName,
      phone: order.customerPhone,
      whatsapp: order.customerWhatsapp || order.customerPhone,
      houseShop: order.customerHouseShop || 'N/A',
      address: order.customerAddress || 'N/A',
      customer_address: order.customerAddress || 'N/A',
      area: order.customerArea || 'N/A',
      landmark: order.customerLandmark || 'N/A',
      city: order.customerCity || 'N/A',
      state: order.customerState || 'N/A',
      pincode: order.customerPincode || 'N/A',
      products: itemLines,
      items: itemLines,
      subtotal: order.subtotal,
      discount: discountText,
      shipping: order.shippingFee > 0 ? `₹${order.shippingFee}` : 'Charges Extra',
      total: order.totalAmount,
      totalAmount: order.totalAmount,
      notes: order.notes || 'None',
    };
    return renderWhatsAppTemplate(customTemplate, vars);
  }

  const defaultDiscountLine = order.discountAmount && order.discountAmount > 0
    ? `\nBulk Discount: -₹${order.discountAmount}${order.discountDetails ? ` (${order.discountDetails})` : ''}`
    : '';

  const shippingStr = order.shippingFee > 0 ? `₹${order.shippingFee}` : 'Charges Extra (Calculated on Order Confirmation)';

  return `MUSKY DOSE ORDER

Order No: ${order.orderNumber}

Customer:
Name: ${order.customerName}
Mobile: ${order.customerPhone}
WhatsApp: ${order.customerWhatsapp || order.customerPhone}

Delivery Address:
House/Shop: ${order.customerHouseShop || 'N/A'}
Address: ${order.customerAddress || 'N/A'}
Area: ${order.customerArea || 'N/A'}
Landmark: ${order.customerLandmark || 'N/A'}
City: ${order.customerCity || 'N/A'}
State: ${order.customerState || 'N/A'}
PIN: ${order.customerPincode || 'N/A'}

Products:
${itemLines}

Subtotal: ₹${order.subtotal}${defaultDiscountLine}
Shipping: ${shippingStr}
Total Payable Amount: ₹${order.totalAmount} (Product Amount)

Notes: ${order.notes || 'None'}`;
}

export function generateWholesaleWhatsAppMessage(
  enquiry: {
    customerName: string;
    businessName?: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    city?: string;
    state?: string;
    productsRequired: string;
    approxQuantity: string;
    notes?: string;
  },
  customTemplate?: string
): string {
  if (customTemplate && customTemplate.trim()) {
    const vars: Record<string, string | number> = {
      customerName: enquiry.customerName,
      customer_name: enquiry.customerName,
      businessName: enquiry.businessName || 'N/A',
      business_name: enquiry.businessName || 'N/A',
      phone: enquiry.phone,
      whatsapp: enquiry.whatsapp || enquiry.phone,
      email: enquiry.email || 'N/A',
      city: enquiry.city || 'N/A',
      state: enquiry.state || 'N/A',
      products: enquiry.productsRequired,
      productsRequired: enquiry.productsRequired,
      quantity: enquiry.approxQuantity,
      approxQuantity: enquiry.approxQuantity,
      notes: enquiry.notes || 'None',
    };
    return renderWhatsAppTemplate(customTemplate, vars);
  }

  return `MUSKY DOSE WHOLESALE / BULK ENQUIRY

Name: ${enquiry.customerName}
Business Name: ${enquiry.businessName || 'N/A'}
Phone: ${enquiry.phone}
WhatsApp: ${enquiry.whatsapp || enquiry.phone}
Email: ${enquiry.email || 'N/A'}
Location: ${[enquiry.city, enquiry.state].filter(Boolean).join(', ') || 'N/A'}

Products Required:
${enquiry.productsRequired}

Approximate Quantity:
${enquiry.approxQuantity}

Additional Notes / Requirements:
${enquiry.notes || 'None'}

Please provide wholesale pricing and minimum order terms. Thank you!`;
}
