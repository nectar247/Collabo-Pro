// app/brands/page.tsx
import { generateMetadata as createMetadata } from '@/lib/metadata';
import BrandsDirectoryClient from './BrandsDirectoryClient';

// Export metadata for the brands directory page
export const metadata = createMetadata({
  title: 'All Brands Directory - Shop Top Brands & Find Exclusive Deals',
  description: 'Browse our complete directory of featured brands. Discover amazing deals, vouchers, and discount codes from your favorite retailers and top brands.',
  keywords: ['brands directory', 'top brands', 'featured brands', 'brand deals', 'retailer vouchers', 'brand discounts', 'all brands'],
});

export default function BrandsPage() {
  return <BrandsDirectoryClient />;
}