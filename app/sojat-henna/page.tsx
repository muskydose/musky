import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { getSiteSettings } from '@/lib/db/settings';
import { getProducts } from '@/lib/db/products';
import { getPublishedGuides } from '@/lib/db/guides';
import { safeJsonLd } from '@/lib/utils';
import {
  Sparkles,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Leaf,
  ArrowRight,
  MessageCircle,
  HelpCircle,
  Truck,
  Building2,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings();
  const baseUrl = siteSettings?.websiteUrl || 'https://muskydose.in';
  const title = 'Sojat Henna Powder & Pure Mehndi | Factory Direct from Sojat, Rajasthan';
  const description =
    'Authentic Lawsonia Inermis henna grown and processed in Sojat City, Rajasthan. Explore genuine Sojat mehndi origin, traditional sifting methods, retail packs, and direct factory bulk supply.';

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    keywords: [
      'Sojat Henna',
      'Sojat Mehndi',
      'Pure Henna Powder',
      'Sojat Henna Manufacturer',
      'Sojat Henna Supplier',
      'Natural Henna Powder Rajasthan',
      'BAQ Henna Powder',
      'Bridal Mehndi Cones Sojat',
      'Henna Mandi Sojat',
      'Lawsonia Inermis India',
    ],
    alternates: {
      canonical: `${baseUrl}/sojat-henna`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/sojat-henna`,
      siteName: siteSettings?.brandName || 'Musky Dose',
      type: 'article',
      images: [
        {
          url: siteSettings?.ogImageUrl || '/images/hero-1.webp',
          width: 1200,
          height: 630,
          alt: 'Authentic Sojat Henna Fields in Rajasthan',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SojatHennaPillarPage() {
  const [siteSettings, allProducts, allGuides] = await Promise.all([
    getSiteSettings(),
    getProducts(),
    getPublishedGuides(),
  ]);

  const baseUrl = siteSettings?.websiteUrl || 'https://muskydose.in';

  // Filter Henna-related catalog items
  const hennaProducts = allProducts
    .filter((p) => {
      if (p.isActive === false) return false;
      const text = `${p.name} ${p.slug} ${p.categoryName || ''}`.toLowerCase();
      return text.includes('henna') || text.includes('mehndi') || text.includes('mehendi');
    })
    .slice(0, 4);

  // Filter Henna-related published guides
  const hennaGuides = allGuides
    .filter((g) => {
      const text = `${g.title} ${g.slug} ${g.shortIntro || ''}`.toLowerCase();
      return text.includes('henna') || text.includes('mehndi') || text.includes('sojat');
    })
    .slice(0, 3);

  const phone = siteSettings?.displayPhone || '+91 82337 03080';
  const whatsappNum = siteSettings?.whatsappNumber || '918233703080';
  const businessAddress =
    siteSettings?.address ||
    'Musky Dose Products, Village: Dholiwadi Ka Bas, Post: Sojat City, District: Pali, Rajasthan – 306104, India';

  // Structured Schema (WebPage + BreadcrumbList + FAQPage)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/sojat-henna#webpage`,
        url: `${baseUrl}/sojat-henna`,
        name: 'Sojat Henna & Mehndi Botanical Authority Hub',
        description:
          'Comprehensive guide on authentic Sojat henna cultivation, characteristics, processing, and direct sourcing from Sojat City, Pali district, Rajasthan.',
        isPartOf: {
          '@id': `${baseUrl}/#website`,
        },
        about: {
          '@id': `${baseUrl}/#localbusiness`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${baseUrl}/sojat-henna#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: baseUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Sojat Henna Authority Hub',
            item: `${baseUrl}/sojat-henna`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${baseUrl}/sojat-henna#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Why is Sojat known as the Henna Capital of India?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sojat City in the Pali district of Rajasthan features a specific semi-arid climate, low rainfall, and mineral-dense soil that naturally favors the growth of Lawsonia Inermis with high natural pigment concentration.',
            },
          },
          {
            '@type': 'Question',
            name: 'How is authentic Sojat henna powder processed?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Mature henna leaves are harvested in autumn, solar shade-dried to preserve pigment, pulverized in mechanical stone mills, and cloth-sifted up to three times to produce an ultra-fine, silky powder.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the difference between hair-grade henna and BAQ bridal henna?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Hair-grade henna is finely milled for hair pack blending and conditioning. Body Art Quality (BAQ) henna is micro-cloth-sifted to remove all plant fiber, ensuring smooth flow through fine cone nozzles without clogging.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I purchase Sojat henna directly in wholesale or bulk quantities?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Musky Dose provides factory-direct wholesale supply starting from 5kg for salon retail sizes and 25kg to 500kg+ commercial drums with Pan-India freight dispatch.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1f2421] flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <Navbar siteSettings={siteSettings} />

      {/* Hero Section */}
      <header className="relative bg-[#0f2d22] text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-[#c5a059]/20">
        <div className="max-w-6xl mx-auto relative z-10 space-y-6">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-[#c5a059] font-bold">
            <Link href="/" className="hover:underline">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[#FAF8F5] font-medium">Sojat Henna</span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-[#1b4332] text-[#c5a059] border border-[#c5a059]/30 text-xs font-bold px-3 py-1 rounded-full">
            <MapPin className="w-3.5 h-3.5" />
            <span>Cultivated & Processed in Sojat City, Pali, Rajasthan</span>
          </div>

          <h1 className="font-momo-display text-3xl sm:text-5xl lg:text-6xl font-normal text-[#FAF8F5] tracking-tight leading-tight">
            Authentic Sojat Henna <br className="hidden sm:inline" />
            <span className="text-[#c5a059]">Direct from the Source</span>
          </h1>

          <p className="text-sm sm:text-base text-[#b2c8be] max-w-3xl leading-relaxed">
            Sojat City, Rajasthan is globally renowned as the heartland of Indian henna (Lawsonia Inermis). 
            Discover the origin, traditional cultivation, micro-cloth sifting standards, and direct factory sourcing 
            of pure Rajasthani mehndi.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="#products"
              className="px-6 py-3 rounded-xl bg-[#c5a059] hover:bg-[#d4af37] text-[#0f2d22] font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95"
            >
              Explore Henna Products
            </Link>
            <Link
              href="/wholesale"
              className="px-6 py-3 rounded-xl bg-[#1b4332] hover:bg-[#143628] text-white border border-[#c5a059]/40 font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <span>Wholesale & Bulk Supply</span>
              <ArrowRight className="w-4 h-4 text-[#c5a059]" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow space-y-16 py-12">
        {/* Section 1: The Terroir of Sojat City */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider block">
                Geographic Origin & Soil Science
              </span>
              <h2 className="font-momo-display text-2xl sm:text-4xl text-[#0f2d22]">
                Why Sojat is the Henna Heartland
              </h2>
              <p className="text-xs sm:text-sm text-[#4b554e] leading-relaxed">
                Located in the Pali district of Western Rajasthan, Sojat experiences extreme diurnal temperatures, 
                sparse annual rainfall, and well-drained clay-loam soil. Under these semi-arid conditions, the 
                <em>Lawsonia Inermis</em> shrub naturally synthesizes higher densities of the natural red-orange 
                Lawsone dye molecule (2-hydroxy-1,4-naphthoquinone) within its leaves to protect itself against solar heat.
              </p>
              <p className="text-xs sm:text-sm text-[#4b554e] leading-relaxed">
                The Sojat agricultural belt accounts for the vast majority of commercial henna production in India, 
                supplying bridal mehndi artists, cosmetic formulators, and natural hair colorists worldwide.
              </p>
            </div>

            <div className="md:col-span-5 bg-white p-6 rounded-2xl border border-[#e8e2d5] space-y-4 shadow-2xs">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0f2d22] border-b border-gray-100 pb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1b4332]" />
                Factory Origin Profile
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-500 block">Cultivation Belt:</span>
                  <strong className="text-[#0f2d22]">Sojat City, Pali District, Rajasthan</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Processing Hub:</span>
                  <strong className="text-[#0f2d22]">Dholiwadi Ka Bas, Sojat City</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Botanical Species:</span>
                  <strong className="text-[#0f2d22]">Lawsonia Inermis (Single-Origin)</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Harvest Period:</span>
                  <strong className="text-[#0f2d22]">Post-Monsoon Autumn (October – November)</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Traditional Processing & Sifting Standards */}
        <section className="bg-[#f5f1e8] py-14 border-y border-[#e8e2d5]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">
                Harvesting & Milling Precision
              </span>
              <h2 className="font-momo-display text-2xl sm:text-3xl text-[#0f2d22]">
                From Sun-Dried Leaf to Silk-Smooth Powder
              </h2>
              <p className="text-xs sm:text-sm text-[#626c66]">
                Pure Sojat henna requires strict temperature control and multiple mechanical sifting stages 
                to ensure maximum color potency and smooth application.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] space-y-3 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#e8f3ed] text-[#1b4332] font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <h3 className="font-bold text-sm text-[#0f2d22]">Solar Shade Drying</h3>
                <p className="text-xs text-[#626c66] leading-relaxed">
                  Freshly pruned branches are dried under shaded airflow to dehydrate the leaves without scorching 
                  the heat-sensitive dye pigments, preserving the vibrant olive-green color.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] space-y-3 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#e8f3ed] text-[#1b4332] font-bold flex items-center justify-center text-xs">
                  2
                </div>
                <h3 className="font-bold text-sm text-[#0f2d22]">Hygienic Micro-Pulverization</h3>
                <p className="text-xs text-[#626c66] leading-relaxed">
                  De-stemmed whole leaves are finely milled in heavy-duty pulverizers at controlled speeds 
                  to prevent frictional heat buildup, preserving the active botanical dye compounds.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] space-y-3 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#e8f3ed] text-[#1b4332] font-bold flex items-center justify-center text-xs">
                  3
                </div>
                <h3 className="font-bold text-sm text-[#0f2d22]">Triple Cloth Filtration</h3>
                <p className="text-xs text-[#626c66] leading-relaxed">
                  The milled powder passes through micro-mesh cloth sieves up to three times to separate residual 
                  leaf fibers, yielding a silk-smooth BAQ powder ideal for clog-free cone preparation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Featured Products */}
        <section id="products" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 border-b border-[#e8e2d5] pb-4">
            <div>
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider block">
                Direct From Mill
              </span>
              <h2 className="font-momo-display text-2xl sm:text-3xl text-[#0f2d22] mt-1">
                Authentic Sojat Henna Formulations
              </h2>
            </div>
            <Link
              href="/categories/henna"
              className="text-xs font-bold text-[#1b4332] hover:underline flex items-center gap-1"
            >
              <span>View Complete Henna Range</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {hennaProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* Section 4: Wholesale & B2B Sourcing Hub */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-[#0f2d22] text-white p-8 sm:p-12 border border-[#c5a059]/30 relative overflow-hidden shadow-md">
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider block">
                B2B & Commercial Sourcing
              </span>
              <h2 className="font-momo-display text-2xl sm:text-4xl text-[#FAF8F5]">
                Direct Factory Wholesale Supply from Sojat
              </h2>
              <p className="text-xs sm:text-sm text-[#b2c8be] leading-relaxed">
                We provide commercial supply of triple-sifted BAQ henna powder, bulk mehendi cones, and whole leaves 
                to bridal artists, beauty salons, Ayurvedic clinics, and distributors across India. 
                Transparent tier pricing starting from 5kg to 500kg+ with verified batch packaging.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Link
                  href="/wholesale"
                  className="px-6 py-3 rounded-xl bg-[#c5a059] hover:bg-[#d4af37] text-[#0f2d22] font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  <span>Open Wholesale Calculator & Tiers</span>
                  <ArrowRight className="w-4 h-4 text-[#0f2d22]" />
                </Link>
                <a
                  href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent('Hello Musky Dose! I am interested in bulk Sojat henna supply for my business.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-[#1b4332] hover:bg-[#143628] text-white border border-[#c5a059]/40 font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>Enquire on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Educational Guides */}
        {hennaGuides.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="border-b border-[#e8e2d5] pb-3">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider block">
                Botanical Knowledge & Practical Tutorials
              </span>
              <h2 className="font-momo-display text-xl sm:text-2xl text-[#0f2d22] mt-1">
                Sojat Henna Application & Care Guides
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hennaGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/guides/${guide.slug}`}
                  className="p-5 rounded-xl border border-[#e8e2d5] bg-white hover:border-[#1b4332] transition-all space-y-2 group shadow-2xs"
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold text-[#1b4332]">
                    <BookOpen className="w-3.5 h-3.5 text-[#c5a059]" />
                    <span>Botanical Guide</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0f2d22] group-hover:text-[#1b4332] transition-colors leading-snug">
                    {guide.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {guide.shortIntro || guide.seoDescription}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1b4332] pt-1">
                    Read Complete Guide &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Section 6: Verified FAQs */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="border-b border-[#e8e2d5] pb-3">
            <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider block">
              Frequently Asked Questions
            </span>
            <h2 className="font-momo-display text-xl sm:text-2xl text-[#0f2d22] mt-1">
              Common Questions About Sojat Henna
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white border border-[#e8e2d5] space-y-2">
              <h3 className="font-bold text-sm text-[#0f2d22] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#1b4332] shrink-0" />
                Why does Sojat henna produce a deeper stain?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                The hot, dry conditions and alkaline clay soil in Sojat prompt the henna plant to develop higher 
                percentages of natural Lawsone pigment in its leaves compared to regions with higher humidity.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#e8e2d5] space-y-2">
              <h3 className="font-bold text-sm text-[#0f2d22] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#1b4332] shrink-0" />
                How should Sojat henna powder be stored?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Keep the powder sealed in its airtight opaque pouch in a cool, dark, and dry pantry. 
                Avoid exposing it to direct sunlight or humidity to prevent premature pigment oxidation.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#e8e2d5] space-y-2">
              <h3 className="font-bold text-sm text-[#0f2d22] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#1b4332] shrink-0" />
                Can Sojat henna be blended with Indigo for black hair?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes. Pure Sojat henna is traditionally used in the classic 2-step Ayurvedic hair dyeing process: 
                first applying henna to deposit red-orange undertones, followed by pure Indigo to yield natural black 
                or dark brown shades.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#e8e2d5] space-y-2">
              <h3 className="font-bold text-sm text-[#0f2d22] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#1b4332] shrink-0" />
                How are commercial orders dispatched across India?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                All commercial and wholesale consignments are packaged in moisture-barrier HDPE liners and dispatched 
                directly from our Sojat mill with pan-India road freight or express air cargo options.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}

