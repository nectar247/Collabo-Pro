"use client";

import { useAuth, useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';
import Maintenance from '@/components/ui/maintenance';
import HeroSection from '@/components/landing/hero';
import { SkeletonLanding } from '@/components/skeleton';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import FilteredBrands from '@/components/landing/filteredBrands';
import CategoriesSection from '@/components/landing/categories';
import TrendingDeals from '@/components/landing/trendingDeals';
import SearchesSection from '@/components/landing/searches';
import { useEffect, useState } from 'react';
import { getPopularSearches } from '@/lib/firebase/search';

export default function Home() {

  const { user, isAdmin, loading: authLoading } = useAuth();
  const { settings, loading: settLoading } = useSettings();

  const { categories, loading: loadingCategories } = useCategories();
  const { featuredBrands, featuredBrandss, loading: loadingBrands } = useBrands();
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks, error } = useDynamicLinks();
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [loadingSearches, setLoadingSearches] = useState<boolean>(true);

  // console.log(trendingDeals)

  useEffect(() => {
      async function fetchData() {
          try {
              // Fetch popular searches from recent search history
              const searchesQuery = await getPopularSearches();
              const searchTerms = searchesQuery.map((doc: any) => doc.term);
              setPopularSearches(searchTerms);
          } catch (error) {
              console.error("Error fetching data:", error);
          } finally {
              setLoadingSearches(false);
          }
      }

      fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs once

  if(authLoading || settLoading) 
    return <SkeletonLanding />;
  if( settings?.general.maintenanceMode && ( !user || (user && !isAdmin) ) )
    return <Maintenance />;

  return (
    <>
      <Navigation />
      <div className="overflow-hidden">

        {/* Hero Section */}
        <HeroSection 
          popularSearches={popularSearches}
          setPopularSearches={setPopularSearches}
          loadingSearches={loadingSearches}
        />

        {/* Brands Section */}
        <FilteredBrands
          brands={featuredBrandss} 
          loadingBrands={loadingBrands}
        />
        
        {/* Trending Deals Section */}
        <TrendingDeals
          trendingDeals={trendingDeals} 
          loadingDeals={loadingDeals}
        />

        {/* Categories Section */}
        <CategoriesSection
          categories={categories} 
          loadingCategories={loadingCategories}
        />

        {/* Popular Searches Section */}
        <SearchesSection 
          popularSearches={popularSearches}
          setPopularSearches={setPopularSearches}
          loadingSearches={loadingSearches}
        />

      </div>
      <Footer 
        categories={categories} 
        loadingCategories={loadingCategories}
        brands={featuredBrands} 
        loadingBrands={loadingBrands}
        settings={settings} 
        settLoading={settLoading}
        dynamicLinks={dynamicLinks}
        loadingDynamicLinks={loadingDynamicLinks}
      />
    </>
  );
}