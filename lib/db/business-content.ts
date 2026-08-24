import { BusinessContentItem } from '@/lib/types';
import { INITIAL_BUSINESS_CONTENT } from '@/lib/data-store';
import { getSiteSettings, updateSiteSettings } from './settings';
import { sanitizeSlug } from './custom-pages';

export async function getBusinessContentItems(): Promise<BusinessContentItem[]> {
  const siteSettings = await getSiteSettings();
  if (siteSettings.businessContentItems && Array.isArray(siteSettings.businessContentItems) && siteSettings.businessContentItems.length > 0) {
    return siteSettings.businessContentItems.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return INITIAL_BUSINESS_CONTENT.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getPublishedBusinessContentItems(): Promise<BusinessContentItem[]> {
  const items = await getBusinessContentItems();
  return items.filter(
    (item) =>
      item.published !== false &&
      Boolean(item.fileUrl && item.fileUrl.trim() !== '' && item.fileUrl !== '/images/fallback.svg')
  );
}

export async function getBusinessContentItemById(id: string): Promise<BusinessContentItem | null> {
  const items = await getBusinessContentItems();
  return items.find((item) => item.id === id || item.slug === id) || null;
}

export async function getBusinessContentByLocation(location: string): Promise<BusinessContentItem[]> {
  const published = await getPublishedBusinessContentItems();
  return published.filter((item) => item.displayLocations && item.displayLocations.includes(location as any));
}

export async function saveBusinessContentItem(data: Partial<BusinessContentItem> & { title: string }): Promise<BusinessContentItem> {
  const items = await getBusinessContentItems();
  const cleanSlug = sanitizeSlug(data.slug || data.title);
  if (!cleanSlug) {
    throw new Error('A valid title or slug is required for business content.');
  }

  const itemId = data.id || `doc-${Date.now()}`;
  const updatedItem: BusinessContentItem = {
    id: itemId,
    title: data.title,
    slug: cleanSlug,
    type: data.type || 'DOCUMENT',
    shortDescription: data.shortDescription || '',
    longDescription: data.longDescription || '',
    fileUrl: data.fileUrl || '',
    thumbnailUrl: data.thumbnailUrl || '',
    badgeIcon: data.badgeIcon || 'ShieldCheck',
    issueDate: data.issueDate || '',
    expiryDate: data.expiryDate || '',
    certificateNumber: data.certificateNumber || '',
    issuingAuthority: data.issuingAuthority || '',
    verificationUrl: data.verificationUrl || '',
    downloadEnabled: data.downloadEnabled ?? true,
    published: data.published ?? true,
    displayLocations: Array.isArray(data.displayLocations) && data.displayLocations.length > 0 ? data.displayLocations : ['documents_page'],
    sortOrder: data.sortOrder ?? 1,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = items.findIndex((i) => i.id === itemId);
  const newItems = [...items];
  if (existingIdx >= 0) {
    newItems[existingIdx] = updatedItem;
  } else {
    newItems.push(updatedItem);
  }

  await updateSiteSettings({ businessContentItems: newItems });
  return updatedItem;
}

export async function deleteBusinessContentItem(id: string): Promise<boolean> {
  const items = await getBusinessContentItems();
  const filtered = items.filter((item) => item.id !== id && item.slug !== id);
  await updateSiteSettings({ businessContentItems: filtered });
  return true;
}
