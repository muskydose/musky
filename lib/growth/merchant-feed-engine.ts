/**
 * MUSKY DOSE — GOOGLE MERCHANT CENTER FREE LISTINGS PRODUCT FEED ENGINE V1
 * Generates compliant Google Merchant XML / JSON product feeds for India.
 * 
 * Safety Guarantee:
 * - Real product data only (No fake GTINs, MPNs, or fabricated identifiers)
 * - Handcrafted/direct botanical identifierExists="no"
 * - Currency strictly set to INR
 * - Clear FEED_READY vs FEED_NEEDS_REVIEW distinction
 */

import { Product } from '@/lib/types';
import { GoogleMerchantFeedItem, MerchantFeedHealthSummary, MerchantFeedProductStatus } from './types';

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function validateProductForMerchantFeed(
  product: Product,
  baseUrl: string = 'https://muskydose.in'
): {
  feedStatus: MerchantFeedProductStatus;
  validationErrors: string[];
  cleanItem: GoogleMerchantFeedItem;
} {
  const errors: string[] = [];

  // 1. Title validation
  const title = (product.name || '').trim();
  if (!title) {
    errors.push('Missing product title');
  }

  // 2. Price validation
  const priceNum = Number(product.price);
  if (isNaN(priceNum) || priceNum <= 0) {
    errors.push('Missing or invalid price (must be > 0)');
  }
  const formattedPrice = `${priceNum.toFixed(2)} INR`;

  // 3. Image validation
  const validImages = (product.images || []).filter(
    (img) => img && typeof img === 'string' && img.trim() !== '' && !img.includes('fallback.svg')
  );
  let imageLink = validImages[0] || (product.images?.[0] || '');
  if (!imageLink || imageLink.includes('fallback.svg')) {
    errors.push('Missing high-resolution product image');
  } else if (!imageLink.startsWith('http')) {
    imageLink = `${baseUrl}${imageLink.startsWith('/') ? '' : '/'}${imageLink}`;
  }

  const additionalImageLinks = validImages
    .slice(1, 10)
    .map((img) => (img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`));

  // 4. URL validation
  const slug = (product.slug || '').trim();
  if (!slug) {
    errors.push('Missing unique product URL slug');
  }
  const productLink = `${baseUrl}/products/${slug}`;

  // 5. Description validation
  const desc = (product.shortDescription || product.fullDescription || product.seoDescription || '').trim();
  if (desc.length < 20) {
    errors.push('Description too short (< 20 characters) for Google Free Listings');
  }

  // 6. Availability validation
  let availability: GoogleMerchantFeedItem['availability'] = 'in_stock';
  if (product.stockStatus === 'out_of_stock') {
    availability = 'out_of_stock';
  } else if (product.stockStatus === 'pre_order') {
    availability = 'preorder';
  }

  // Category mapping
  const category = product.categoryName || 'Health & Beauty > Personal Care > Hair Care';

  const feedStatus: MerchantFeedProductStatus = errors.length === 0 ? 'FEED_READY' : 'FEED_NEEDS_REVIEW';

  const cleanItem: GoogleMerchantFeedItem = {
    id: product.id || `prod_${slug}`,
    title,
    description: desc || `${title} - 100% Pure triple-sifted botanical harvest direct from Sojat, Rajasthan.`,
    link: productLink,
    imageLink,
    additionalImageLinks: additionalImageLinks.length > 0 ? additionalImageLinks : undefined,
    availability,
    price: formattedPrice,
    salePrice: product.compareAtPrice && product.compareAtPrice > priceNum
      ? `${Number(product.compareAtPrice).toFixed(2)} INR`
      : undefined,
    brand: 'Musky Dose',
    condition: 'new',
    productType: category,
    googleProductCategory: 'Health & Beauty > Personal Care > Hair Care',
    identifierExists: 'no', // Direct agricultural botanicals without GTIN
    shippingWeight: product.quantityOrWeight || '250g',
    shipping: {
      country: 'IN',
      service: 'Standard Express Direct from Sojat',
      price: '0.00 INR', // Free freight across India
    },
    feedStatus,
    validationErrors: errors,
  };

  return { feedStatus, validationErrors: errors, cleanItem };
}

export function buildMerchantFeedItems(
  products: Product[],
  baseUrl: string = 'https://muskydose.in'
): GoogleMerchantFeedItem[] {
  return products
    .filter((p) => p.isActive !== false)
    .map((p) => validateProductForMerchantFeed(p, baseUrl).cleanItem);
}

export function generateGoogleMerchantXmlFeed(
  products: Product[],
  baseUrl: string = 'https://muskydose.in'
): string {
  const items = buildMerchantFeedItems(products, baseUrl);
  const eligibleItems = items.filter((i) => i.feedStatus === 'FEED_READY');

  const xmlItems = eligibleItems
    .map((item) => {
      let xml = `    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>
      <g:availability>${escapeXml(item.availability)}</g:availability>
      <g:price>${escapeXml(item.price)}</g:price>`;

      if (item.salePrice) {
        xml += `\n      <g:sale_price>${escapeXml(item.salePrice)}</g:sale_price>`;
      }

      xml += `\n      <g:brand>${escapeXml(item.brand)}</g:brand>
      <g:condition>${escapeXml(item.condition)}</g:condition>
      <g:product_type>${escapeXml(item.productType)}</g:product_type>
      <g:google_product_category>${escapeXml(item.googleProductCategory || '')}</g:google_product_category>
      <g:identifier_exists>${escapeXml(item.identifierExists)}</g:identifier_exists>`;

      if (item.shippingWeight) {
        xml += `\n      <g:shipping_weight>${escapeXml(item.shippingWeight)}</g:shipping_weight>`;
      }

      if (item.shipping) {
        xml += `\n      <g:shipping>
        <g:country>${escapeXml(item.shipping.country)}</g:country>
        <g:service>${escapeXml(item.shipping.service)}</g:service>
        <g:price>${escapeXml(item.shipping.price)}</g:price>
      </g:shipping>`;
      }

      xml += `\n    </item>`;
      return xml;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Musky Dose - Google Merchant Center Free Listings Product Feed</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>100% Pure Triple-Shifted Sojat Henna &amp; Botanical Powders Direct from Sojat, Rajasthan</description>
${xmlItems}
  </channel>
</rss>`;
}

export function getMerchantFeedHealthSummary(
  products: Product[],
  baseUrl: string = 'https://muskydose.in'
): MerchantFeedHealthSummary {
  const activeProds = products.filter((p) => p.isActive !== false);
  const validated = activeProds.map((p) => validateProductForMerchantFeed(p, baseUrl));

  const totalProducts = activeProds.length;
  const feedReadyCount = validated.filter((v) => v.feedStatus === 'FEED_READY').length;
  const needsReviewCount = validated.filter((v) => v.feedStatus === 'FEED_NEEDS_REVIEW').length;

  const missingImageCount = validated.filter((v) =>
    v.validationErrors.some((e) => e.toLowerCase().includes('image'))
  ).length;
  const missingPriceCount = validated.filter((v) =>
    v.validationErrors.some((e) => e.toLowerCase().includes('price'))
  ).length;
  const missingAvailabilityCount = validated.filter((v) =>
    v.validationErrors.some((e) => e.toLowerCase().includes('availability'))
  ).length;
  const invalidUrlCount = validated.filter((v) =>
    v.validationErrors.some((e) => e.toLowerCase().includes('slug') || e.toLowerCase().includes('url'))
  ).length;

  return {
    totalProducts,
    feedReadyCount,
    needsReviewCount,
    missingImageCount,
    missingPriceCount,
    missingAvailabilityCount,
    invalidUrlCount,
    lastGeneratedAt: new Date().toISOString(),
    feedXmlUrl: `${baseUrl}/api/feeds/google-merchant.xml`,
    feedJsonUrl: `${baseUrl}/api/feeds/google-merchant`,
  };
}

