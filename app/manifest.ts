import { MetadataRoute } from 'next';
import { getSiteSettings } from '@/lib/db/settings';
import { getSitePwaIcons } from '@/lib/brand-assets';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const siteSettings = await getSiteSettings().catch(() => null);
  const brandName = siteSettings?.brandName || 'Musky Dose';
  const icons = getSitePwaIcons(siteSettings);

  return {
    name: `${brandName} — Premium Henna & Herbal Products`,
    short_name: brandName,
    description: 'Pure Botanical, Ultra-Fine Sifted Sojat Mehendi, Pure Natural Henna & Herbal Wellness Products direct from Sojat, Rajasthan, India.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fcfbf7',
    theme_color: '#0f2d22',
    orientation: 'portrait-primary',
    categories: ['shopping', 'beauty', 'lifestyle'],
    icons,
  };
}
