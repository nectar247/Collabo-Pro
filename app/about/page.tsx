// app/about/page.tsx
import { generateMetadata as createMetadata } from '@/lib/metadata';
import AboutPageClient from './AboutPageClient';

// Direct metadata export for the about page
export const metadata = createMetadata({
  title: 'About Us - Learn About Our Mission to Save You Money',
  description: 'Learn about Shop4Vouchers mission to help you save money with the best deals, vouchers, and discount codes from trusted brands.',
  keywords: ['about us', 'company info', 'mission', 'save money', 'voucher company', 'who we are'],
});

export default function AboutPage() {
  return <AboutPageClient />;
}