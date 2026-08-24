import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import CategoryTracker from '@/components/CategoryTracker';
import { getCategories } from '@/lib/db/categories';
import { getProductsByCategory } from '@/lib/db/products';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { safeJsonLd } from '@/lib/utils';
import { ArrowLeft, PackageX, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug || c.id === slug);

  if (!category || category.isActive === false) {
    return {
      title: 'Category Not Found | Musky Dose',
      description: 'The requested product category could not be found.',
    };
  }

  return await resolvePageSeoMetadata({
    targetType: 'category',
    targetId: category.id,
    targetUrl: `/categories/${category.slug}`,
    defaultTitle: `${category.name} | Musky Dose — Pure Sojat Mehendi & Herbal Care`,
    defaultDescription: category.description || `Explore ${category.name} handcrafted directly in Sojat, Rajasthan. 100% natural, chemical-free botanicals.`,
    defaultImage: category.image || '/images/hero-bg.jpg',
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [categories, siteSettings] = await Promise.all([
    getCategories(),
    getSiteSettings(),
  ]);

  const category = categories.find((c) => c.slug === slug || c.id === slug);

  if (!category || category.isActive === false) {
    notFound();
  }

  const categoryProducts = await getProductsByCategory(category.id);

  const jsonLdCategory = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${category.name} - Musky Dose`,
        url: `https://muskydose.in/categories/${category.slug}`,
        description: category.description,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: categoryProducts.map((prod, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `https://muskydose.in/products/${prod.slug}`,
            name: prod.name,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://muskydose.in',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Categories',
            item: 'https://muskydose.in/categories',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: category.name,
            item: `https://muskydose.in/categories/${category.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      <CategoryTracker id={category.id} name={category.name} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdCategory) }}
      />
      <Navbar siteSettings={siteSettings} />

      {/* Hero Category Banner */}
      <div className="relative bg-[#0f2d22] text-white py-16 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-[#2d6a4f]/30">
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-8 space-y-4">
            <nav className="flex items-center gap-2 text-xs text-[#c5a059] font-bold mb-2">
              <Link href="/" className="hover:underline">Home</Link>
              <span>/</span>
              <Link href="/categories" className="hover:underline">Categories</Link>
              <span>/</span>
              <span className="text-white font-medium">{category.name}</span>
            </nav>

            <h1 className="font-momo-display text-3xl sm:text-5xl font-normal text-white">
              {category.name}
            </h1>

            <p className="text-sm sm:text-base text-[#b2c8be] max-w-2xl leading-relaxed">
              {category.description || 'Pure Rajasthani botanical formulations crafted with natural ingredients.'}
            </p>
          </div>

          <div className="md:col-span-4 relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-[#c5a059]/30 shadow-xl">
            <Image
              src={category.image || '/images/fallback.svg'}
              alt={category.name}
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* Category Products Catalog */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#e8e2d5]">
          <div>
            <span className="text-xs font-semibold text-[#c5a059] uppercase tracking-wider">Catalog</span>
            <h2 className="font-momo-display text-2xl font-normal text-[#0f2d22]">
              {category.name} Products ({categoryProducts.length})
            </h2>
          </div>
        </div>

        {categoryProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6 lg:gap-8">
            {categoryProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                siteSettings={siteSettings}
                whatsappNumber={getConfiguredWhatsAppNumber(siteSettings)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e8e2d5] p-12 text-center space-y-4 my-12">
            <PackageX className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="font-momo-display text-2xl font-normal text-[#0f2d22]">
              No Products In This Category Yet
            </h3>
            <p className="text-xs text-[#626c66] max-w-md mx-auto">
              We are adding new products to this botanical collection soon. Explore our other categories in the meantime.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-5 py-2.5 rounded-lg font-bold text-xs shadow hover:bg-[#0f2d22]"
            >
              Browse All Products
            </Link>
          </div>
        )}
      </div>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
