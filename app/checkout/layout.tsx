import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure Checkout | Musky Dose',
  description: 'Complete your order for pure Sojat Henna and botanical herbal products.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

