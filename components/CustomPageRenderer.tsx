'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CustomPageSection, Product, Category, SiteSettings } from '@/lib/types';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { sanitizeImageUrl } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import CategoryCard from '@/components/CategoryCard';
import { MessageCircle, ArrowRight, ChevronDown, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomPageRendererProps {
  sections: CustomPageSection[];
  products?: Product[];
  categories?: Category[];
  siteSettings?: SiteSettings;
}

export default function CustomPageRenderer({
  sections,
  products = [],
  categories = [],
  siteSettings,
}: CustomPageRendererProps) {
  const activeSections = (sections || [])
    .filter((sec) => sec.enabled)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const whatsappNumber = getConfiguredWhatsAppNumber(siteSettings);

  if (activeSections.length === 0) {
    return (
      <div className="py-20 text-center text-gray-500 font-medium text-sm">
        This page has no active content sections.
      </div>
    );
  }

  return (
    <div className="space-y-12 md:space-y-20 pb-16">
      {activeSections.map((section) => (
        <React.Fragment key={section.id}>
          {renderSection(section, products, categories, siteSettings, whatsappNumber)}
        </React.Fragment>
      ))}
    </div>
  );
}

function renderSection(
  section: CustomPageSection,
  products: Product[],
  categories: Category[],
  siteSettings?: SiteSettings,
  whatsappNumber: string = '918233703080'
) {
  const { type, content, title, subtitle } = section;

  switch (type) {
    case 'heading_text': {
      const align = content?.textAlignment || 'left';
      const bg = content?.backgroundColor || 'default';
      const alignClass =
        align === 'center' ? 'text-center mx-auto' : align === 'right' ? 'text-right ml-auto' : 'text-left';

      const bgClass =
        bg === 'neutral'
          ? 'bg-[#FAF8F5] py-12 px-6 sm:px-10 rounded-3xl border border-[#e8e2d5]'
          : bg === 'emerald'
          ? 'bg-[#0f2d22] text-white py-12 px-6 sm:px-10 rounded-3xl'
          : bg === 'dark'
          ? 'bg-[#1f2421] text-white py-12 px-6 sm:px-10 rounded-3xl'
          : 'py-6';

      const headingText = content?.heading || title;
      const subheadingText = content?.subheading || subtitle;

      return (
        <section className={`max-w-5xl mx-auto px-4 ${bgClass}`}>
          <div className={`space-y-4 ${alignClass} max-w-3xl`}>
            {subheadingText && (
              <span
                className={`text-xs font-bold uppercase tracking-widest block ${
                  bg === 'emerald' || bg === 'dark' ? 'text-[#c5a059]' : 'text-emerald-800'
                }`}
              >
                {subheadingText}
              </span>
            )}
            {headingText && (
              <h2
                className={`font-serif-heading font-bold text-2xl md:text-4xl leading-tight ${
                  bg === 'emerald' || bg === 'dark' ? 'text-white' : 'text-[#0f2d22]'
                }`}
              >
                {headingText}
              </h2>
            )}
            {content?.bodyText && (
              <div
                className={`text-sm md:text-base leading-relaxed space-y-4 pt-2 ${
                  bg === 'emerald' || bg === 'dark' ? 'text-emerald-100/90' : 'text-gray-700'
                }`}
              >
                {content.bodyText.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    }

    case 'image_text': {
      const imagePos = content?.imagePosition || 'left';
      const headingText = content?.heading || title;
      const subheadingText = content?.subheading || subtitle;

      return (
        <section className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-3xl border border-[#e8e2d5] p-6 sm:p-10 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Image Column */}
            <div
              className={`md:col-span-6 overflow-hidden rounded-2xl relative aspect-[4/3] bg-[#FAF8F5] border border-[#e8e2d5] ${
                imagePos === 'right' ? 'md:order-2' : 'md:order-1'
              }`}
            >
              <Image
                src={sanitizeImageUrl(content?.imageUrl)}
                alt={content?.imageAlt || headingText || 'Musky Dose Content Image'}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            {/* Content Column */}
            <div
              className={`md:col-span-6 space-y-4 ${
                imagePos === 'right' ? 'md:order-1' : 'md:order-2'
              }`}
            >
              {subheadingText && (
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 block">
                  {subheadingText}
                </span>
              )}
              {headingText && (
                <h2 className="font-serif-heading font-bold text-2xl md:text-3xl text-[#0f2d22] leading-tight">
                  {headingText}
                </h2>
              )}
              {content?.bodyText && (
                <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                  {content.bodyText.split('\n\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
              {content?.buttonText && content?.buttonLink && (
                <div className="pt-2">
                  <Link
                    href={content.buttonLink}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#1b4332] hover:bg-[#0f2d22] text-white font-bold text-xs rounded-xl shadow-xs transition-all hover:gap-3"
                  >
                    <span>{content.buttonText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    case 'banner_cta': {
      const bg = content?.backgroundColor || 'emerald';
      const headingText = content?.heading || title;
      const subheadingText = content?.subheading || subtitle;

      const bgClasses =
        bg === 'dark'
          ? 'bg-[#1f2421] text-white'
          : bg === 'gold'
          ? 'bg-[#FAF4E6] border-2 border-[#c5a059] text-[#0f2d22]'
          : bg === 'neutral'
          ? 'bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22]'
          : 'bg-[#0f2d22] text-white';

      return (
        <section className="max-w-6xl mx-auto px-4">
          <div className={`p-8 sm:p-12 rounded-3xl text-center space-y-6 relative overflow-hidden shadow-md ${bgClasses}`}>
            <div className="max-w-2xl mx-auto space-y-3 relative z-10">
              {subheadingText && (
                <span className="text-xs font-bold uppercase tracking-widest text-[#c5a059] block">
                  {subheadingText}
                </span>
              )}
              {headingText && (
                <h2 className="font-serif-heading font-bold text-2xl md:text-4xl leading-tight">
                  {headingText}
                </h2>
              )}
              {content?.bodyText && (
                <p className="text-sm md:text-base opacity-90 leading-relaxed">
                  {content.bodyText}
                </p>
              )}

              {content?.buttonText && content?.buttonLink && (
                <div className="pt-4 flex flex-wrap justify-center gap-4">
                  <Link
                    href={content.buttonLink}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#c5a059] hover:bg-[#b08c45] text-[#0f2d22] font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
                  >
                    <span>{content.buttonText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    case 'product_grid': {
      const headingText = content?.heading || title || 'Featured Products';
      const subheadingText = content?.subheading || subtitle;

      let displayProducts = products.filter((p) => p.isActive !== false);

      if (content?.categoryId) {
        displayProducts = displayProducts.filter((p) => p.categoryId === content.categoryId);
      } else if (content?.productIds && content.productIds.length > 0) {
        displayProducts = displayProducts.filter((p) => content.productIds?.includes(p.id));
      }

      const limit = content?.productCount || 8;
      displayProducts = displayProducts.slice(0, limit);

      return (
        <section className="max-w-7xl mx-auto px-4 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            {subheadingText && (
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 block">
                {subheadingText}
              </span>
            )}
            <h2 className="font-serif-heading font-bold text-2xl md:text-3xl text-[#0f2d22]">
              {headingText}
            </h2>
          </div>

          {displayProducts.length === 0 ? (
            <div className="text-center p-8 bg-[#FAF8F5] rounded-2xl border border-[#e8e2d5] text-xs text-gray-500 font-medium">
              No matching products available for this collection.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayProducts.map((prod) => (
                <ProductCard key={prod.id} product={prod} siteSettings={siteSettings} />
              ))}
            </div>
          )}
        </section>
      );
    }

    case 'category_grid': {
      const headingText = content?.heading || title || 'Explore Categories';
      const subheadingText = content?.subheading || subtitle;

      let displayCategories = categories.filter((c) => c.isActive !== false);
      if (content?.categoryIds && content.categoryIds.length > 0) {
        displayCategories = displayCategories.filter((c) => content.categoryIds?.includes(c.id));
      }

      return (
        <section className="max-w-7xl mx-auto px-4 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            {subheadingText && (
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 block">
                {subheadingText}
              </span>
            )}
            <h2 className="font-serif-heading font-bold text-2xl md:text-3xl text-[#0f2d22]">
              {headingText}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayCategories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </section>
      );
    }

    case 'faq': {
      const headingText = content?.heading || title || 'Frequently Asked Questions';
      const subheadingText = content?.subheading || subtitle;
      const faqsList = content?.faqs || [];

      return (
        <section className="max-w-4xl mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            {subheadingText && (
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 block">
                {subheadingText}
              </span>
            )}
            <h2 className="font-serif-heading font-bold text-2xl md:text-3xl text-[#0f2d22]">
              {headingText}
            </h2>
          </div>

          {faqsList.length === 0 ? (
            <div className="text-center p-8 bg-[#FAF8F5] rounded-2xl border border-[#e8e2d5] text-xs text-gray-500 font-medium">
              No questions added yet.
            </div>
          ) : (
            <FaqAccordion items={faqsList} />
          )}
        </section>
      );
    }

    case 'whatsapp_cta': {
      const headingText = content?.heading || title || 'Musky Dose Support & Enquiries';
      const subheadingText = content?.subheading || subtitle || 'Reach out to our Sojat team for help or guidance';
      const buttonLabel = content?.buttonText || 'Connect on WhatsApp Support';
      const isOrderCta = /order|buy|purchase|checkout/i.test(`${headingText} ${buttonLabel}`);
      const isEnquiryCta = /enquiry|quote|wholesale|bulk/i.test(`${headingText} ${buttonLabel}`);

      const supportMsg = encodeURIComponent(
        `Hello Musky Dose Support Team! I have a general customer support question regarding "${headingText}".`
      );
      const waUrl = `https://wa.me/${whatsappNumber}?text=${supportMsg}`;

      return (
        <section className="max-w-5xl mx-auto px-4">
          <div className="bg-gradient-to-br from-[#0f2d22] to-[#1b4332] text-white p-8 sm:p-12 rounded-3xl shadow-lg border border-[#2d6a4f]/40 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#25D366]/20 text-[#25D366] rounded-full text-xs font-bold uppercase tracking-wider">
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Customer Support</span>
              </span>
              <h2 className="font-serif-heading font-bold text-2xl md:text-3xl leading-tight">
                {headingText}
              </h2>
              {subheadingText && (
                <p className="text-sm text-emerald-100/90 leading-relaxed">{subheadingText}</p>
              )}
            </div>

            <div className="shrink-0">
              {isOrderCta ? (
                <Link
                  href="/products"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-[#c5a059] hover:bg-[#b08c45] text-[#0f2d22] font-extrabold text-sm rounded-2xl shadow-md transition-all uppercase tracking-wider"
                >
                  <ArrowRight className="w-5 h-5" />
                  <span>Browse Products & Order</span>
                </Link>
              ) : isEnquiryCta ? (
                <Link
                  href="/wholesale"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>Submit Detailed Enquiry</span>
                </Link>
              ) : (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-sm rounded-2xl shadow-md transition-all transform hover:scale-105"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>WhatsApp Customer Support</span>
                </a>
              )}
            </div>
          </div>
        </section>
      );
    }

    default:
      return null;
  }
}

function FaqAccordion({ items }: { items: { id: string; question: string; answer: string }[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-[#e8e2d5] overflow-hidden transition-all shadow-xs"
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-[#0f2d22] hover:bg-[#FAF8F5] transition-colors"
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`w-5 h-5 text-emerald-800 shrink-0 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 pt-0 text-xs md:text-sm text-gray-700 leading-relaxed border-t border-[#f5f1e8]">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
