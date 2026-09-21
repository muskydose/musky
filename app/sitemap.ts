import { MetadataRoute } from 'next';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getCustomPages } from '@/lib/db/custom-pages';
import { getPublishedGuides } from '@/lib/db/guides';
import { getPublishedKnowledgeEntities } from '@/lib/db/knowledge';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';
  const products = await getProducts();
  const categories = await getCategories();
  const customPages = await getCustomPages();
  const guides = await getPublishedGuides();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/guides`,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/documents`,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/factory`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/wholesale`,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/sojat-henna`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/offers`,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/shipping-policy`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/return-policy`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cancellation-policy`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((prod) => prod.isActive !== false && prod.robotsIndex !== false)
    .map((prod) => ({
      url: `${baseUrl}/products/${prod.slug}`,
      ...(prod.updatedAt ? { lastModified: new Date(prod.updatedAt) } : {}),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter((cat) => cat.isActive !== false)
    .map((cat) => ({
      url: `${baseUrl}/categories/${cat.slug}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const customPageRoutes: MetadataRoute.Sitemap = customPages
    .filter((p) => p.published)
    .map((p) => ({
      url: `${baseUrl}/pages/${p.slug}`,
      ...(p.updatedAt ? { lastModified: new Date(p.updatedAt) } : {}),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const guideRoutes: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${baseUrl}/guides/${g.slug}`,
    ...(g.updatedAt ? { lastModified: new Date(g.updatedAt) } : {}),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const knowledgeEntities = await getPublishedKnowledgeEntities();
  const knowledgeEntityRoutes: MetadataRoute.Sitemap = knowledgeEntities
    .filter((entity) => entity.robotsIndex !== false && entity.published && entity.dbStatus === 'published' && entity.entityKey !== 'UNKNOWN')
    .map((entity) => ({
      url: `${baseUrl}/knowledge/${entity.slug}`,
      ...(entity.updatedAt ? { lastModified: new Date(entity.updatedAt) } : {}),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  return [
    ...staticRoutes,
    ...productRoutes,
    ...categoryRoutes,
    ...customPageRoutes,
    ...guideRoutes,
    ...knowledgeEntityRoutes,
  ];
}
