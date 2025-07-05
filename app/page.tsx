// app/page.tsx
import { generateMetadata as createMetadata } from '@/lib/metadata';
import HomePageClient from './HomePageClient';

// Export metadata for the home page
export const metadata = createMetadata({
  title: 'Best Deals & Vouchers - Save Money with Exclusive Discount Codes',
  description: 'Discover the best deals and vouchers from trusted brands. Find amazing discounts, promotional codes, and exclusive offers.',
  keywords: ['deals', 'vouchers', 'discount codes', 'savings', 'coupons', 'promotional codes', 'exclusive offers', 'best deals'],
});

export default function HomePage() {
  return <HomePageClient />;
}