import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeImageUrl(url?: string | null, fallback = '/images/fallback.svg'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  const obsoleteDomains = [
    'images.unsplash.com',
    'unsplash.com',
    'picsum.photos',
    'via.placeholder.com',
    'placeholder.com',
  ];

  const lower = trimmed.toLowerCase();
  for (const domain of obsoleteDomains) {
    if (lower.includes(domain)) {
      return fallback;
    }
  }

  // Prevent massive base64 inline strings from bloating SSR HTML payloads
  if (trimmed.startsWith('data:image/') && trimmed.length > 2048) {
    return fallback;
  }

  return trimmed;
}

export function sanitizeImageUrls(urls?: (string | null | undefined)[], fallback = '/images/fallback.svg'): string[] {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return [fallback];
  }
  const sanitized = urls
    .map((u) => sanitizeImageUrl(u, fallback))
    .filter((u) => Boolean(u));

  if (sanitized.length === 0) {
    return [fallback];
  }
  return sanitized;
}

export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(message || '');
  return `https://wa.me/${cleanPhone || '918233703080'}?text=${encodedMsg}`;
}

export function safeJsonLd(data: any): string {
  if (!data) return '{}';
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function renderDynamicContent(text: string, settings?: any): string {
  if (!text) return '';
  const brandName = settings?.brandName || 'Musky Dose';
  const businessName = settings?.businessName || 'Musky Dose Enterprise';
  const displayPhone = settings?.displayPhone || '+91 82337 03080';
  const businessEmail = settings?.businessEmail || 'info@muskydose.in';
  const websiteUrl = settings?.websiteUrl || 'https://muskydose.in';

  return text
    .replace(/\{\{\s*brandName\s*\}\}/gi, brandName)
    .replace(/\{\{\s*businessName\s*\}\}/gi, businessName)
    .replace(/\{\{\s*displayPhone\s*\}\}/gi, displayPhone)
    .replace(/\{\{\s*businessEmail\s*\}\}/gi, businessEmail)
    .replace(/\{\{\s*websiteUrl\s*\}\}/gi, websiteUrl);
}
