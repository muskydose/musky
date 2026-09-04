/**
 * MUSKY DOSE — GOOGLE MERCHANT CENTER FREE LISTINGS PRODUCT FEED ENGINE (PHASE 8)
 * 
 * Generates compliant Google Merchant Center XML & JSON product feeds for India.
 * 
 * Safety & Governance:
 * 1. REAL CATALOG DATA ONLY: No fabricated GTINs, MPNs, or simulated barcodes.
 * 2. IDENTIFIER_EXISTS = NO: Direct agricultural / handcrafted botanical products set identifier_exists strictly to 'no'.
 * 3. INR PRICING: Currency formatted as 'XXX.XX INR'.
 * 4. STRICT ELIGIBILITY: Inactive products (isActive === false) and non-indexable products (robotsIndex === false) are excluded.
 * 5. IMAGE VALIDATION: Missing images or fallback.svg are flagged as FEED_NEEDS_REVIEW and omitted from XML feed.
 * 6. NO EXTERNAL UPLOAD: Feed generator only. Feeds are served at /api/feeds/google-merchant.xml and /api/feeds/google-merchant.
 */

import { Product } from '@/lib/types';
import {
  GoogleMerchantFeedItem,
  MerchantFeedHealthSummary,
  MerchantFeedProductStatus,
} from './types';

export type {
  GoogleMerchantFeedItem,
  MerchantFeedHealthSummary,
  MerchantFeedProductStatus,
};

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

  // 1. Active & Indexability check
  if (product.isActive === false) {
    errors.push('Product is inactive');
  }
  if (product.robotsIndex === false || (product as any).seoRobotsIndex === false) {
    errors.push('Product is marked noindex');
  }

  // 2. Title validation
  const title = (product.name || '').trim();
  if (!title) {
    errors.push('Missing product title');
  }

  // 3. Price validation
  const priceNum = Number(product.price);
  if (isNaN(priceNum) || priceNum <= 0) {
    errors.push('Missing or invalid price (must be > 0)');
  }
  const formattedPrice = !isNaN(priceNum) && priceNum > 0 ? `${priceNum.toFixed(2)} INR` : '0.00 INR';

  // 4. Image validation (must not be empty and must not be fallback.svg)
  const validImages = (product.images || []).filter(
    (img) => img && typeof img === 'string' && img.trim() !== '' && !img.includes('fallback.svg')
  );
  let imageLink = validImages[0] || (product.images?.[0] || '');
  if (!imageLink || imageLink.includes('fallback.svg') || imageLink.trim() === '') {
    errors.push('Missing high-resolution product image (fallback images not permitted in Merchant Feed)');
  } else if (!imageLink.startsWith('http')) {
    imageLink = `${baseUrl}${imageLink.startsWith('/') ? '' : '/'}${imageLink}`;
  }

  const additionalImageLinks = validImages
    .slice(1, 10)
    .map((img) => (img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`));

  // 5. URL validation
  const slug = (product.slug || '').trim();
  if (!slug) {
    errors.push('Missing unique product URL slug');
  }
  const productLink = `${baseUrl}/products/${slug}`;

  // 6. Description validation
  const desc = (product.shortDescription || product.fullDescription || product.seoDescription || '').trim();
  if (desc.length < 20) {
    errors.push('Description too short (< 20 characters) for Google Free Listings');
  }

  // 7. Availability validation
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
    salePrice:
      product.compareAtPrice && product.compareAtPrice > priceNum
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
    .filter((p) => p.isActive !== false && p.robotsIndex !== false && (p as any).seoRobotsIndex !== false)
    .map((p) => validateProductForMerchantFeed(p, baseUrl).cleanItem);
}

export function generateMerchantXmlFeed(
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

export const generateGoogleMerchantXmlFeed = generateMerchantXmlFeed;

export function getMerchantFeedHealthSummary(
  products: Product[],
  baseUrl: string = 'https://muskydose.in'
): MerchantFeedHealthSummary {
  const activeProds = products.filter(
    (p) => p.isActive !== false && p.robotsIndex !== false && (p as any).seoRobotsIndex !== false
  );
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

export function generateMerchantJsonFeed(
  products: Product[],
  baseUrl: string = 'https://muskydose.in'
) {
  const items = buildMerchantFeedItems(products, baseUrl);
  const summary = getMerchantFeedHealthSummary(products, baseUrl);
  return {
    success: true,
    summary,
    items,
  };
}

// ============================================================
// PHASE 8.1: IDENTIFIER GOVERNANCE & CATALOG AUDIT
// ============================================================

export type MerchantIdentifierStatus =
  | 'VALID_GTIN'
  | 'VALID_MPN'
  | 'NO_IDENTIFIER'
  | 'IDENTIFIER_REVIEW';

export function determineMerchantIdentifierStatus(product: Product): {
  status: MerchantIdentifierStatus;
  identifierExists: 'yes' | 'no';
  gtin?: string;
  mpn?: string;
  reason: string;
} {
  const gtin = ((product as any).gtin || (product as any).barcode || '').trim();
  const mpn = ((product as any).mpn || '').trim();

  // Validate GTIN: standard GTINs are 8, 12, 13, or 14 digits numeric
  if (gtin) {
    const isDigitsOnly = /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(gtin);
    if (isDigitsOnly) {
      return {
        status: 'VALID_GTIN',
        identifierExists: 'yes',
        gtin,
        reason: 'Real assigned GTIN barcode present',
      };
    } else {
      return {
        status: 'IDENTIFIER_REVIEW',
        identifierExists: 'no',
        reason: 'Malformed GTIN barcode format (must be 8, 12, 13, or 14 digits)',
      };
    }
  }

  // Validate MPN if assigned
  if (mpn) {
    return {
      status: 'VALID_MPN',
      identifierExists: 'yes',
      mpn,
      reason: 'Valid manufacturer part number assigned',
    };
  }

  // Genuine handcrafted / direct farm agricultural harvest without commercial barcode
  return {
    status: 'NO_IDENTIFIER',
    identifierExists: 'no',
    reason: 'Direct agricultural botanical harvest without assigned commercial barcode or MPN',
  };
}

export interface MerchantProductAuditItem {
  id: string;
  name: string;
  sku: string;
  slug: string;
  price: string;
  priceNum: number;
  salePrice?: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  primaryImage: string;
  imageStatus: 'IMAGE_READY' | 'IMAGE_NEEDS_REVIEW';
  priceStatus: 'PRICE_READY' | 'PRICE_NEEDS_REVIEW';
  identifierStatus: MerchantIdentifierStatus;
  identifierExists: 'yes' | 'no';
  gtin?: string;
  mpn?: string;
  canonicalUrl: string;
  canonicalStatus: 'CANONICAL_READY' | 'CANONICAL_NEEDS_REVIEW';
  feedStatus: MerchantFeedProductStatus;
  validationErrors: string[];
  exactReason: string;
  action: string;
}

export interface MerchantCatalogReadinessAudit {
  totalActiveProducts: number;
  feedReadyCount: number;
  needsReviewCount: number;
  imageIssueCount: number;
  priceIssueCount: number;
  identifierIssueCount: number;
  canonicalIssueCount: number;
  items: MerchantProductAuditItem[];
}

export function auditMerchantCatalog(
  products: Product[],
  baseUrl: string = 'https://muskydose.in'
): MerchantCatalogReadinessAudit {
  const activeProducts = products.filter((p) => p && p.isActive !== false);

  const items: MerchantProductAuditItem[] = activeProducts.map((product) => {
    const { feedStatus, validationErrors, cleanItem } = validateProductForMerchantFeed(product, baseUrl);
    const idResult = determineMerchantIdentifierStatus(product);

    const priceNum = Number(product.price);
    const priceStatus = (!isNaN(priceNum) && priceNum > 0) ? 'PRICE_READY' : 'PRICE_NEEDS_REVIEW';

    const validImages = (product.images || []).filter(
      (img) => img && typeof img === 'string' && img.trim() !== '' && !img.includes('fallback.svg')
    );
    const imageStatus = validImages.length > 0 ? 'IMAGE_READY' : 'IMAGE_NEEDS_REVIEW';

    const slug = (product.slug || '').trim();
    const canonicalStatus = slug.length > 0 && product.robotsIndex !== false ? 'CANONICAL_READY' : 'CANONICAL_NEEDS_REVIEW';

    let action = 'Feed Ready - No action required.';
    if (imageStatus === 'IMAGE_NEEDS_REVIEW') {
      action = 'Upload a high-resolution product photograph (minimum 800x800px) in Admin Products.';
    } else if (priceStatus === 'PRICE_NEEDS_REVIEW') {
      action = 'Set a valid retail selling price greater than ₹0.00 in Admin Products.';
    } else if (canonicalStatus === 'CANONICAL_NEEDS_REVIEW') {
      action = 'Verify product slug and ensure indexable status (robotsIndex !== false).';
    } else if (idResult.status === 'IDENTIFIER_REVIEW') {
      action = 'Correct malformed barcode digits or remove invalid identifier.';
    }

    return {
      id: product.id,
      name: product.name || 'Untitled Product',
      sku: product.sku || product.id,
      slug,
      price: cleanItem.price,
      priceNum,
      salePrice: cleanItem.salePrice,
      availability: cleanItem.availability,
      primaryImage: cleanItem.imageLink,
      imageStatus,
      priceStatus,
      identifierStatus: idResult.status,
      identifierExists: idResult.identifierExists,
      gtin: idResult.gtin,
      mpn: idResult.mpn,
      canonicalUrl: cleanItem.link,
      canonicalStatus,
      feedStatus,
      validationErrors,
      exactReason: validationErrors.length > 0
        ? validationErrors.join('; ')
        : 'All mandatory Google Free Listings requirements met.',
      action,
    };
  });

  const totalActiveProducts = items.length;
  const feedReadyCount = items.filter((i) => i.feedStatus === 'FEED_READY').length;
  const needsReviewCount = items.filter((i) => i.feedStatus === 'FEED_NEEDS_REVIEW').length;
  const imageIssueCount = items.filter((i) => i.imageStatus === 'IMAGE_NEEDS_REVIEW').length;
  const priceIssueCount = items.filter((i) => i.priceStatus === 'PRICE_NEEDS_REVIEW').length;
  const identifierIssueCount = items.filter((i) => i.identifierStatus === 'IDENTIFIER_REVIEW').length;
  const canonicalIssueCount = items.filter((i) => i.canonicalStatus === 'CANONICAL_NEEDS_REVIEW').length;

  return {
    totalActiveProducts,
    feedReadyCount,
    needsReviewCount,
    imageIssueCount,
    priceIssueCount,
    identifierIssueCount,
    canonicalIssueCount,
    items,
  };
}

