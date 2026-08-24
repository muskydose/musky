import { CustomPage } from '@/lib/types';
import { getSiteSettings, updateSiteSettings } from './settings';

export function sanitizeSlug(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function getCustomPages(): Promise<CustomPage[]> {
  const siteSettings = await getSiteSettings();
  return siteSettings.customPages || [];
}

export async function getCustomPageBySlug(slug: string): Promise<CustomPage | null> {
  const cleanSlug = sanitizeSlug(slug);
  if (!cleanSlug) return null;
  const pages = await getCustomPages();
  return pages.find((p) => sanitizeSlug(p.slug) === cleanSlug) || null;
}

export async function saveCustomPage(page: CustomPage): Promise<CustomPage> {
  const siteSettings = await getSiteSettings();
  const existingPages = siteSettings.customPages || [];

  const cleanSlug = sanitizeSlug(page.slug || page.title);
  if (!cleanSlug) {
    throw new Error('A valid page slug or title is required.');
  }

  const updatedPage: CustomPage = {
    ...page,
    slug: cleanSlug,
    updatedAt: new Date().toISOString(),
    createdAt: page.createdAt || new Date().toISOString(),
  };

  const idx = existingPages.findIndex((p) => p.id === page.id);
  const newPages = [...existingPages];
  if (idx >= 0) {
    newPages[idx] = updatedPage;
  } else {
    const duplicate = existingPages.find((p) => sanitizeSlug(p.slug) === cleanSlug);
    if (duplicate) {
      throw new Error(`A page with slug "${cleanSlug}" already exists.`);
    }
    newPages.push(updatedPage);
  }

  await updateSiteSettings({ customPages: newPages });
  return updatedPage;
}

export async function deleteCustomPage(id: string): Promise<boolean> {
  const siteSettings = await getSiteSettings();
  const existingPages = siteSettings.customPages || [];
  const filtered = existingPages.filter((p) => p.id !== id && p.slug !== id);
  await updateSiteSettings({ customPages: filtered });
  return true;
}
