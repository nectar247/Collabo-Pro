'use client';

import dynamic from 'next/dynamic';
import { Deal, Category, Brand, ContentSection } from '@/lib/firebase/collections';

const SearchPage = dynamic(() => import('../search/SearchPage'), { ssr: false });

interface DealsPageClientProps {
  initialDeals: Deal[];
  totalCount: number;
  categories: Category[];
  brands: Brand[];
  dynamicLinks: ContentSection[];
}

export default function DealsPageClient({
  initialDeals,
  totalCount,
  categories,
  brands,
  dynamicLinks
}: DealsPageClientProps) {
  // Only pass server data if it's actually populated
  // This ensures client-side fetch happens when server data is empty
  const hasServerData = initialDeals.length > 0;

  return (
    <SearchPage
      serverInitialDeals={hasServerData ? initialDeals : undefined}
      serverTotalCount={hasServerData ? totalCount : undefined}
      serverCategories={categories.length > 0 ? categories : undefined}
      serverBrands={brands.length > 0 ? brands : undefined}
      serverDynamicLinks={dynamicLinks.length > 0 ? dynamicLinks : undefined}
    />
  );
}
