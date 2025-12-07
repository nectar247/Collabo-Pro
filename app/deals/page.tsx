// app/deals/page.tsx
export const revalidate = 600; // ← Enables ISR: rebuilds page every 60 seconds

import { generateMetadata as createMetadata } from '@/lib/metadata';
import DealsPageClient from './DealsPageClient';

// Add metadata export for this page
export const metadata = createMetadata({
  title: 'Great Deals', // This will become "Deals | Shop4Vouchers"
  description: 'Browse our latest deals and vouchers. Find amazing discounts from top brands and save money on your purchases.',
  keywords: ['deals', 'vouchers', 'discounts', 'offers', 'promotions', 'savings'],
});

export default function DealsPage() {
  return <DealsPageClient />;
}