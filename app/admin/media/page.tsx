import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Universal Media & Assets — Musky Dose Admin',
  description: 'Canonical media asset management and requirements control center.',
};

export default function AdminMediaRedirectPage() {
  redirect('/admin/media-requirements');
}
