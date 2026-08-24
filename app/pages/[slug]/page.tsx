import React from 'react';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import CustomPageRenderer from '@/components/CustomPageRenderer';
import { getCustomPageBySlug } from '@/lib/db/custom-pages';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { FadeIn } from '@/components/Motion';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const page = await getCustomPageBySlug(slug);

  if (!page || !page.published) {
    return {
      title: 'Page Not Found | Musky Dose',
      description: 'The requested page could not be found.',
    };
  }

  return await resolvePageSeoMetadata({
    targetType: 'custom_page',
    targetId: page.id,
    targetUrl: `/pages/${page.slug}`,
    defaultTitle:
      page.seoTitle || `${page.title} | Musky Dose`,
    defaultDescription:
      page.seoDescription ||
      page.description ||
      `Read about ${page.title} from Musky Dose Sojat.`,
    defaultKeywords: [
      page.title,
      'Musky Dose',
      'Sojat Henna',
    ],
  });
}

export default async function DynamicCustomPage({ params }: PageProps) {
  const { slug } = await params;

  const [page, products, categories, siteSettings] = await Promise.all([
    getCustomPageBySlug(slug),
    getProducts(),
    getCategories(),
    getSiteSettings(),
  ]);

  if (!page || !page.published) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      <Navbar siteSettings={siteSettings} />

      {/* Hero Banner Header */}
      <div className="bg-[#0f2d22] text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <FadeIn direction="down">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <span className="text-[#c5a059] text-xs font-bold uppercase tracking-widest block">
              MUSKY DOSE EXCLUSIVE
            </span>
            <h1 className="font-serif-heading text-3xl sm:text-5xl font-extrabold text-white leading-tight">
              {page.title}
            </h1>
            {page.description && (
              <p className="text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto pt-2 leading-relaxed">
                {page.description}
              </p>
            )}
          </div>
        </FadeIn>
      </div>

      {/* Main Custom Page Sections */}
      <main className="flex-grow py-12 md:py-16">
        <CustomPageRenderer
          sections={page.sections}
          products={products}
          categories={categories}
          siteSettings={siteSettings}
        />
      </main>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
