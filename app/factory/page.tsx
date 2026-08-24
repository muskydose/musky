import React from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { Factory, CheckCircle, Shield, Droplets, Sparkles } from 'lucide-react';
import { getSiteSettings } from '@/lib/db/settings';
import { resolvePageSeoMetadata } from '@/lib/db/seo';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/Motion';

export async function generateMetadata() {
  return await resolvePageSeoMetadata({
    targetType: 'factory',
    targetUrl: '/factory',
    defaultTitle: 'Our Sojat Factory | Musky Dose — Manufacturing & Quality Lab',
    defaultDescription: 'Explore our processing facility in Sojat City, Rajasthan. Learn about our triple cloth-sifting and lab testing standards.',
    defaultKeywords: ['Sojat Factory', 'Mehendi Processing', 'Triple Sifted Henna Lab'],
  });
}

export default async function FactoryPage() {
  const siteSettings = await getSiteSettings();

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      <Navbar siteSettings={siteSettings} />

      <div className="bg-[#0f2d22] text-white py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <FadeIn direction="down">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="text-[#c5a059] text-xs font-bold uppercase tracking-widest">
              {siteSettings.factoryHeroEyebrow || 'STATE-OF-THE-ART PROCESSING'}
            </span>
            <h1 className="font-momo-display text-4xl sm:text-5xl font-normal text-white">
              {siteSettings.factoryHeroTitle || 'Our Sojat Factory & Lab'}
            </h1>
            <p className="text-sm sm:text-base text-[#b2c8be] leading-relaxed">
              {siteSettings.factoryHeroSubtitle || 'Where traditional Rajasthani herbal expertise meets modern hygienic processing.'}
            </p>
          </div>
        </FadeIn>
      </div>

      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 flex-1">
        <FadeIn direction="up">
          <div className="bg-white p-8 rounded-3xl border border-[#e8e2d5] shadow-xs space-y-6">
            <h2 className="font-momo-display text-3xl font-normal text-[#0f2d22]">
              {siteSettings.factorySectionHeading || 'Hygienic Manufacturing & Processing Steps'}
            </h2>
            <p className="text-sm text-[#2b302c] leading-relaxed">
              {siteSettings.factoryStory ||
                'Located in Sojat City, Pali district, our plant handles solar drying, stainless steel micro-pulverizing, and triple cloth-sifting. Every batch is sealed in moisture-proof food grade pouches to preserve peak dye potency.'}
            </p>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4" staggerDelay={0.12}>
              <StaggerItem className="p-4 rounded-xl bg-[#f5f1e8] space-y-2 border border-[#e8e2d5] hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-[#0f2d22] font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-xs">1</span>
                  <span>{siteSettings.factoryStep1Title || 'Solar Shade Drying'}</span>
                </div>
                <p className="text-xs text-[#626c66]">{siteSettings.factoryStep1Description || 'Leaves are shade-dried under controlled solar chambers to protect chlorophyll and lawsone pigments from degradation.'}</p>
              </StaggerItem>

              <StaggerItem className="p-4 rounded-xl bg-[#f5f1e8] space-y-2 border border-[#e8e2d5] hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-[#0f2d22] font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-xs">2</span>
                  <span>{siteSettings.factoryStep2Title || 'Micro Pulverization'}</span>
                </div>
                <p className="text-xs text-[#626c66]">{siteSettings.factoryStep2Description || 'Heavy-duty food-grade stainless steel mills grind leaves into uniform fine particles without heat buildup.'}</p>
              </StaggerItem>

              <StaggerItem className="p-4 rounded-xl bg-[#f5f1e8] space-y-2 border border-[#e8e2d5] hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-[#0f2d22] font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-xs">3</span>
                  <span>{siteSettings.factoryStep3Title || 'Triple Cloth Sifting'}</span>
                </div>
                <p className="text-xs text-[#626c66]">{siteSettings.factoryStep3Description || 'Milled powder passes three distinct micro-mesh cloth filters to eliminate any stem fibers or coarse residue.'}</p>
              </StaggerItem>

              <StaggerItem className="p-4 rounded-xl bg-[#f5f1e8] space-y-2 border border-[#e8e2d5] hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-[#0f2d22] font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-xs">4</span>
                  <span>{siteSettings.factoryStep4Title || 'Vacuum Pouch Sealing'}</span>
                </div>
                <p className="text-xs text-[#626c66]">{siteSettings.factoryStep4Description || 'Packed in nitrogen-flushed, multi-layer aluminum barrier pouches to prevent moisture ingress and oxidation.'}</p>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </FadeIn>
      </div>

      <Footer siteSettings={siteSettings} />
      <WhatsAppFloat siteSettings={siteSettings} />
    </div>
  );
}
