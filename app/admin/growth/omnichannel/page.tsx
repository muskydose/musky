import { Metadata } from 'next';
import OmnichannelClient from './OmnichannelClient';

export const metadata: Metadata = {
  title: 'Omnichannel Customer Engine | Musky Dose Admin',
  description: 'Multi-channel product launch, content repurposing queue, and attribution breakdown',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OmnichannelPage() {
  return <OmnichannelClient />;
}

