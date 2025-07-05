// app/categories/page.tsx
import { generateMetadata as createMetadata } from '@/lib/metadata';
import CategoriesPageClient from './CategoriesPageClient';

// Export metadata for the categories page
export const metadata = createMetadata({
  title: 'Shop by Categories - Find Deals Across All Product Categories',
  description: 'Browse deals and vouchers by category. Find discounts in electronics, fashion, travel, food, beauty, home & garden, and more product categories.',
  keywords: ['categories', 'shop by category', 'product categories', 'deals by category', 'electronics deals', 'fashion vouchers', 'travel discounts', 'category discounts'],
});

export default function CategoriesPage() {
  return <CategoriesPageClient />;
}