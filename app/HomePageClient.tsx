// HomePageClient.tsx
"use client";

import { useAuth, useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';
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
import { useEffect, useState } from 'react';
import { getPopularSearches } from '@/lib/firebase/search';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Brand } from '@/lib/firebase/collections';

export default function HomePageClient() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { settings, loading: settLoading } = useSettings();

  const { categories, loading: loadingCategories } = useCategories();
  const { featuredBrands, featuredBrandss, loading: loadingBrands } = useBrands();
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks, error } = useDynamicLinks();
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [loadingSearches, setLoadingSearches] = useState<boolean>(true);
  const [footerBrands, setFooterBrands] = useState<Brand[]>([]);
  const [loadingFooterBrands, setLoadingFooterBrands] = useState<boolean>(true);

  // Add search modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
      async function fetchData() {
          try {
              console.log('🔄 [HomePage] Starting to fetch popular searches and footer brands...');

              // Fetch popular searches from recent search history
              const searchesQuery = await getPopularSearches();
              const searchTerms = searchesQuery.map((doc: any) => doc.term);
              setPopularSearches(searchTerms);
              console.log('✅ [HomePage] Popular searches fetched:', searchTerms.length);

              // Fetch footer brands - 15 brands with most active deals
              console.log('🔄 [HomePage] Fetching footer brands...');
              const startTime = performance.now();

              const brandsSnapshot = await getDocs(query(
                collection(db, 'brands'),
                where('status', '==', 'active'),
                where('activeDeals', '>', 0),
                orderBy('activeDeals', 'desc'),
                limit(15)
              ));

              const brands = brandsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })) as Brand[];

              const endTime = performance.now();
              console.log(`✅ [HomePage] Footer brands fetched: ${brands.length} brands in ${(endTime - startTime).toFixed(2)}ms`);
              console.log('📊 [HomePage] Footer brands:', brands.map(b => b.name));

              setFooterBrands(brands);
              setLoadingFooterBrands(false);
          } catch (error) {
              console.error("❌ [HomePage] Error fetching data:", error);
              setLoadingFooterBrands(false);
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
      <Navigation onOpenSearch={() => setIsSearchOpen(true)} />
      <div className="overflow-hidden">

        {/* Hero Section */}
        <HeroMinimalist
          popularSearches={popularSearches}
          setPopularSearches={setPopularSearches}
          loadingSearches={loadingSearches}
          onOpenSearch={() => setIsSearchOpen(true)} // This will open the home page modal
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
        brands={footerBrands}
        loadingBrands={loadingFooterBrands}
        settings={settings}
        settLoading={settLoading}
        dynamicLinks={dynamicLinks}
        loadingDynamicLinks={loadingDynamicLinks}
      />

      {/* Add the SearchDialog component here */}
      <SearchDialog 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}