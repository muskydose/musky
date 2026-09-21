import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Special Offers & Exclusive Discounts | Musky Dose',
  description:
    'Explore active discounts, seasonal deals, and verified promo coupon codes on pure Sojat Henna powder, Indigo, and herbal botanical products from Musky Dose.',
  alternates: {
    canonical: 'https://muskydose.in/offers',
  },
  openGraph: {
    title: 'Special Offers & Exclusive Discounts | Musky Dose',
    description:
      'Explore active discounts, seasonal deals, and verified promo coupon codes on pure Sojat Henna powder, Indigo, and herbal botanical products from Musky Dose.',
    url: 'https://muskydose.in/offers',
    siteName: 'Musky Dose',
    type: 'website',
    images: [
      {
        url: 'https://muskydose.in/logo.png',
        width: 1200,
        height: 630,
        alt: 'Musky Dose Special Offers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Special Offers & Exclusive Discounts | Musky Dose',
    description:
      'Explore active discounts, seasonal deals, and verified promo coupon codes on pure Sojat Henna powder, Indigo, and herbal botanical products from Musky Dose.',
    images: ['https://muskydose.in/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function OffersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

