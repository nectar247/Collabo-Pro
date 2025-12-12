// HomePageClient.tsx
"use client";

import { useAuth, useSettings } from '@/lib/firebase/hooks';
import Maintenance from '@/components/ui/maintenance';
import HeroMinimalist from '@/components/landing/hero/HeroMinimalist';
import { SkeletonLanding } from '@/components/skeleton';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import FilteredBrands from '@/components/landing/filteredBrands';
import CategoriesSection from '@/components/landing/categories';
import TrendingDeals from '@/components/landing/trendingDeals';
import SearchesSection from '@/components/landing/searches';
import SearchDialog from '@/components/search/SearchDialog';
import { useState } from 'react';
import { Brand, Category, Deal } from '@/lib/firebase/collections';

interface HomePageClientProps {
  categories: Category[];
  featuredBrands: Brand[];
  trendingDeals: Deal[];
  popularSearches: string[];
  footerBrands: Brand[];
}

export default function HomePageClient({
  categories,
  featuredBrands,
  trendingDeals,
  popularSearches: initialPopularSearches,
  footerBrands,
}: HomePageClientProps) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { settings, loading: settLoading } = useSettings();

  const [popularSearches, setPopularSearches] = useState<string[]>(initialPopularSearches);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if(authLoading || settLoading)
    return <SkeletonLanding />;
  if( settings?.general.maintenanceMode && ( !user || (user && !isAdmin) ) )
    return <Maintenance />;

  return (
    <>
      <Navigation onOpenSearch={() => setIsSearchOpen(true)} />
      <div className="overflow-hidden">

        {/* Hero Section */}
        <HeroMinimalist
          popularSearches={popularSearches}
          setPopularSearches={setPopularSearches}
          loadingSearches={false}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Brands Section */}
        <FilteredBrands
          brands={featuredBrands}
          loadingBrands={false}
        />

        {/* Trending Deals Section */}
        <TrendingDeals
          trendingDeals={trendingDeals}
          loadingDeals={false}
        />

        {/* Categories Section */}
        <CategoriesSection
          categories={categories}
          loadingCategories={false}
        />

        {/* Popular Searches Section */}
        <SearchesSection
          popularSearches={popularSearches}
          setPopularSearches={setPopularSearches}
          loadingSearches={false}
        />

      </div>

      <Footer
        categories={categories}
        loadingCategories={false}
        brands={footerBrands}
        loadingBrands={false}
        settings={settings}
        settLoading={settLoading}
        dynamicLinks={[]}
        loadingDynamicLinks={false}
      />

      {/* Add the SearchDialog component here */}
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
