import type { Metadata } from 'next';
import { Fraunces, Karla } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import Providers from '@/components/Providers';
import AnalyticsScript from '@/components/AnalyticsScript';
import { getSiteSettings } from '@/lib/db/settings';
import { DEFAULT_BRAND_COLORS } from '@/lib/data-store';
import { safeJsonLd } from '@/lib/utils';
import { getSiteFavicon, getSiteLogo, getSiteAppleIcon } from '@/lib/brand-assets';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const karla = Karla({
  subsets: ['latin'],
  variable: '--font-karla',
  display: 'swap',
});

const momoTrustDisplay = localFont({
  src: '../public/fonts/MomoTrustDisplay-Regular.ttf',
  variable: '--font-momo-trust',
  weight: '400',
  style: 'normal',
  display: 'swap',
});

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings();
  const baseUrl = siteSettings.websiteUrl || 'https://muskydose.in';
  const title = siteSettings.seoTitle || 'Musky Dose | Premium Henna & Herbal Products from Sojat, Rajasthan';
  const description =
    siteSettings.seoDescription ||
    'Pure Botanical, Ultra-Fine Sifted Sojat Mehendi, Pure Natural Henna, Hair Care & Herbal Wellness Products direct from Sojat, Rajasthan, India.';
  const keywords = siteSettings.seoKeywords
    ? siteSettings.seoKeywords.split(',').map((k: string) => k.trim())
    : ['Musky Dose', 'Sojat Henna', 'Natural Henna Powder', 'Pure Mehendi', 'Herbal Hair Care', 'Rajasthan Henna', 'Pure Mehendi Powder'];
  const favicon = getSiteFavicon(siteSettings);
  const appleIcon = getSiteAppleIcon(siteSettings);
  const logo = getSiteLogo(siteSettings);
  const ogImage = siteSettings.ogImageUrl || logo || '/images/fallback.svg';

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: `%s | ${siteSettings.brandName || 'Musky Dose'}`,
    },
    description,
    keywords,
    alternates: {
      canonical: baseUrl,
    },
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName: siteSettings.brandName || 'Musky Dose',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${siteSettings.brandName || 'Musky Dose'} Sojat Henna`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: [
        { url: favicon, type: 'image/png' },
        { url: '/favicon.ico', sizes: 'any' },
      ],
      shortcut: [{ url: favicon, type: 'image/png' }],
      apple: [{ url: appleIcon, type: 'image/png' }],
    },
  };
}

function buildJsonLd(siteSettings: any) {
  const baseUrl = siteSettings.websiteUrl || 'https://muskydose.in';
  const logoUrl = siteSettings.logoUrl
    ? siteSettings.logoUrl.startsWith('http')
      ? siteSettings.logoUrl
      : `${baseUrl}${siteSettings.logoUrl.startsWith('/') ? '' : '/'}${siteSettings.logoUrl}`
    : `${baseUrl}/logo.png`;

  const postalAddress: any = {
    '@type': 'PostalAddress',
    streetAddress: siteSettings.address || 'Village: Dholiwadi Ka Bas, Post: Sojat City',
    addressLocality: siteSettings.city || 'Sojat City',
    addressRegion: siteSettings.state || 'Rajasthan',
    postalCode: siteSettings.pincode || '306104',
    addressCountry: 'IN',
  };

  const org: any = {
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: siteSettings.businessName || siteSettings.brandName || 'Musky Dose',
    url: baseUrl,
    logo: logoUrl,
  };

  if (siteSettings.seoDescription) {
    org.description = siteSettings.seoDescription;
  }
  if (siteSettings.address) {
    org.address = postalAddress;
  }
  const phone = siteSettings.displayPhone;
  if (phone) {
    org.contactPoint = {
      '@type': 'ContactPoint',
      telephone: phone,
      contactType: 'customer service',
      email: siteSettings.businessEmail,
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    };
  }

  const localBusiness: any = {
    '@type': ['LocalBusiness', 'Manufacturer'],
    '@id': `${baseUrl}/#localbusiness`,
    name: siteSettings.businessName || siteSettings.brandName || 'Musky Dose',
    url: baseUrl,
    logo: logoUrl,
    image: [logoUrl],
    description: siteSettings.seoDescription || org.description,
    telephone: phone || undefined,
    email: siteSettings.businessEmail || undefined,
    address: postalAddress,
    priceRange: '₹₹',
    parentOrganization: {
      '@id': `${baseUrl}/#organization`,
    },
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      localBusiness,
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: siteSettings.brandName || 'Musky Dose',
        publisher: {
          '@id': `${baseUrl}/#organization`,
        },
      },
    ],
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteSettings = await getSiteSettings();
  const jsonLdOrg = buildJsonLd(siteSettings);
  const layoutControls = siteSettings.layoutControls || {};
  const headerStyle = layoutControls.headerStyle || 'normal';
  const mobileLogoW = layoutControls.mobileLogoWidth || 140;
  const desktopLogoW = layoutControls.desktopLogoWidth || 180;
  const headerPaddingV = layoutControls.headerPaddingVertical || 12;
  const mobileHeroH = layoutControls.mobileHeroHeight || 420;
  const desktopHeroH = layoutControls.desktopHeroHeight || 560;
  const heroMobileFs = layoutControls.heroHeadingMobileSize || 28;
  const heroDesktopFs = layoutControls.heroHeadingDesktopSize || 48;
  const containerMaxW = layoutControls.containerMaxWidth || 1280;
  const bodyFsBase = layoutControls.bodyFontSizeBase || 16;
  const headingScale = layoutControls.headingScaleFactor || 1.0;
  const sectionPy =
    layoutControls.sectionVerticalPadding === 'compact'
      ? '1.5rem'
      : layoutControls.sectionVerticalPadding === 'generous'
      ? '4rem'
      : '2.5rem';
  const mobileMargin = layoutControls.mobileScreenMargin || 16;

  const brandColors = siteSettings.brandColors || DEFAULT_BRAND_COLORS;
  const primaryColor = brandColors.primary || '#183F2B';
  const secondaryColor = brandColors.secondary || '#5F7F52';
  const hennaColor = brandColors.henna || '#9A4F32';
  const goldColor = brandColors.gold || '#C49A55';
  const bgColor = brandColors.background || '#F7F3E8';
  const cardColor = brandColors.card || '#FFFDF8';
  const textColor = brandColors.text || '#22231F';
  const mutedColor = brandColors.muted || '#626c66';
  const borderColor = brandColors.border || '#e8e2d5';

  return (
    <html lang="en" className={`scroll-smooth ${fraunces.variable} ${karla.variable} ${momoTrustDisplay.variable}`}>
      <head>
        {siteSettings.googleSearchConsoleVerification && (
          <meta
            name="google-site-verification"
            content={
              siteSettings.googleSearchConsoleVerification.includes('content=')
                ? siteSettings.googleSearchConsoleVerification.split('content=')[1].replace(/["'>]/g, '').trim()
                : siteSettings.googleSearchConsoleVerification
            }
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdOrg) }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --brand-primary: ${primaryColor};
                --brand-secondary: ${secondaryColor};
                --brand-henna: ${hennaColor};
                --brand-gold: ${goldColor};
                --brand-bg: ${bgColor};
                --brand-card: ${cardColor};
                --brand-text: ${textColor};
                --brand-muted: ${mutedColor};
                --brand-border: ${borderColor};

                --site-mobile-logo-w: ${mobileLogoW}px;
                --site-desktop-logo-w: ${desktopLogoW}px;
                --site-header-padding-v: ${headerPaddingV}px;
                --site-header-style: '${headerStyle}';
                --site-mobile-hero-h: ${mobileHeroH}px;
                --site-desktop-hero-h: ${desktopHeroH}px;
                --site-hero-mobile-fs: ${heroMobileFs}px;
                --site-hero-desktop-fs: ${heroDesktopFs}px;
                --site-container-max-w: ${containerMaxW}px;
                --site-body-fs-base: ${bodyFsBase}px;
                --site-heading-scale: ${headingScale};
                --site-section-py: ${sectionPy};
                --site-mobile-screen-margin: ${mobileMargin}px;
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-[var(--brand-bg,#F7F3E8)] text-[var(--brand-text,#22231F)] antialiased selection:bg-[var(--brand-primary,#183F2B)] selection:text-[#faf5e8]">
        <AnalyticsScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

