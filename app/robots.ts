import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/admin/', '/api/analytics/', '/cart/', '/checkout/', '/wishlist/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
