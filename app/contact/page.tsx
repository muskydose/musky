import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { MapPin, Phone, Mail, MessageCircle, Clock, Send } from 'lucide-react';
import ContactForm from './ContactForm';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { getCmsText } from '@/lib/cms';
import { FadeIn } from '@/components/Motion';
import { safeJsonLd } from '@/lib/utils';

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'contact',
    targetUrl: '/contact',
    defaultTitle: 'Contact Us — Sojat Henna',
    defaultDescription: 'Contact Musky Dose for retail orders, bulk wholesale enquiries, or factory visits in Sojat, Rajasthan.',
    defaultKeywords: ['Contact Musky Dose', 'Sojat Henna Enquiry', 'Bulk Henna Order Contact'],
  });
}

export default async function ContactPage() {
  const siteSettings = await getSiteSettings();
  const whatsappNumber = getConfiguredWhatsAppNumber(siteSettings);
  const cms = getCmsText(siteSettings);

  const jsonLdContact = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact ${siteSettings.businessName || siteSettings.brandName || 'Musky Dose'}`,
    url: `${siteSettings.websiteUrl || 'https://muskydose.in'}/contact`,
    description: 'Contact Musky Dose for retail orders, bulk wholesale enquiries, or factory visits in Sojat, Rajasthan.',
    mainEntity: {
      '@type': 'LocalBusiness',
      name: siteSettings.businessName || siteSettings.brandName || 'Musky Dose',
      telephone: siteSettings.displayPhone,
      email: siteSettings.businessEmail,
      address: siteSettings.address ? {
        '@type': 'PostalAddress',
        streetAddress: siteSettings.address,
        addressCountry: 'IN',
      } : undefined,
    },
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdContact) }}
      />
      <Navbar siteSettings={siteSettings} />

      <div className="bg-[#0f2d22] text-white py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <FadeIn direction="down">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="text-[#c5a059] text-xs font-bold uppercase tracking-widest">
              {cms.contactBadgeText || 'GET IN TOUCH'}
            </span>
            <h1 className="font-momo-display text-4xl sm:text-5xl font-normal text-white">
              {cms.contactHeroTitle || 'Contact Musky Dose'}
            </h1>
            <p className="text-sm sm:text-base text-[#b2c8be] leading-relaxed">
              {cms.contactHeroSubtitle || 'Have a question or bulk wholesale requirement? We are here to assist you from Sojat, Rajasthan.'}
            </p>
          </div>
        </FadeIn>
      </div>

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Contact Information Cards */}
          <div className="lg:col-span-5">
            <FadeIn direction="left">
              <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] space-y-6 shadow-xs hover:shadow-md transition-shadow">
                <h3 className="font-momo-display text-2xl font-normal text-[#0f2d22]">
                  Contact Information
                </h3>

                <div className="space-y-4 text-xs text-[#2b302c]">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#f5f1e8] text-[#1b4332] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="block text-[#0f2d22] font-semibold mb-0.5">Sojat Factory Address:</strong>
                      <span>{siteSettings.address}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#f5f1e8] text-[#1b4332] flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="block text-[#0f2d22] font-semibold mb-0.5">Phone Call:</strong>
                      <a href={`tel:${siteSettings.displayPhone}`} className="hover:text-[#1b4332] font-medium">
                        {siteSettings.displayPhone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#e8f3ed] text-[#25D366] flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 fill-[#25D366]" />
                    </div>
                    <div>
                      <strong className="block text-[#0f2d22] font-semibold mb-0.5">WhatsApp Helpline:</strong>
                      <a href="#contact-form" className="hover:underline font-bold text-[#1b4332]">
                        +{whatsappNumber} (Send Message Below)
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#f5f1e8] text-[#1b4332] flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="block text-[#0f2d22] font-semibold mb-0.5">Email Support:</strong>
                      <a href={`mailto:${siteSettings.businessEmail}`} className="hover:text-[#1b4332]">
                        {siteSettings.businessEmail}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#f5f1e8] text-[#c5a059] flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="block text-[#0f2d22] font-semibold mb-0.5">Working Hours:</strong>
                      <span>{siteSettings.businessHours || 'Monday – Saturday: 9:00 AM – 7:00 PM IST'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="#contact-form"
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#20bd5a] transition-colors shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Fill Contact Form to Connect</span>
                  </a>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Contact Direct Form */}
          <div id="contact-form" className="lg:col-span-7">
            <FadeIn direction="right" delay={0.15}>
              <ContactForm whatsappNumber={whatsappNumber} />
            </FadeIn>
          </div>

        </div>
      </div>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
