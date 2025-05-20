"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Filter, Search } from 'lucide-react';
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';
import Preloader from '@/components/loaders/preloader';
import ErrorLoader from '@/components/loaders/ErrorLoader';
import { DealCard1 } from '@/components/deals/card';
import { recordSearch } from '@/lib/firebase/search';
import { handleSearchClick } from '@/helper';
import { useRouter } from 'next/navigation';
import Footer from '@/components/footer';
import Navigation from '@/components/navigation';

export default function DealsPage() {
  const { deals, loading, loadMoreDeals, error } = useDeals();
  const router = useRouter();
  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories } = useCategories();
  const { featuredBrands, loading: loadingBrands } = useBrands();
  // const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();
  // const [popularSearches, setPopularSearches] = useState<string[]>([]);
  // const [loadingSearches, setLoadingSearches] = useState<boolean>(true);

  const handleSearch = async (e: any) => {
      e.preventDefault();
      let search = e.target.elements.searchTerm?.value;
      await recordSearch(search);
      handleSearchClick(router, search);
  }


  if (loading) {
    return <Preloader text="Loading deals..." />;
  }

  if (error) {
    return <ErrorLoader text="Error Loading Deals" message={error.message} />;
  }

  return (
    <>
    <Navigation />
    <main className="min-h-screen py-8 bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black">
      <div className="container mx-auto px-4">
        {/* Search and Filter Section */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-center">
          <form
              onSubmit={handleSearch}
              method='post'
              className='w-[100%]'
          >
            <div className="relative flex-1">
              <input
                name="searchTerm"
                type="text"
                placeholder="Search deals..."
                className="text-center border-gray-300 shadow-lg w-full pl-12 pr-4 py-3 bg-white dark:bg-white/5 border dark:border-white/20 rounded-xl text-dark-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                  type="submit"
              >
                  <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              </button>
            </div>
          </form>
          {/* <button className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-900 hover:bg-gray-700 dark:bg-white/10 dark:hover:bg-white/20 text-white transition-colors">
            <Filter className="h-5 w-5" />
            <span>Filter Deals</span>
          </button> */}
        </div>

        {/* Deals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {deals.map((deal) => (
            <DealCard1 deal={deal} key={deal.id} />
          ))}
        </div>

        <div
          className='flex my-4'
          onClick={loadMoreDeals}
        >
          <button
            className='w-full text-center bg-secondary rounded-sm p-1 text-white hover:bg-secondary/80'
          >
            Load more deals
          </button>
        </div>
      </div>
    </main>
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