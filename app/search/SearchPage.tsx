/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
"use client";

import { Filter, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Preloader from '@/components/loaders/preloader';
import ErrorLoader from '@/components/loaders/ErrorLoader';
import { DealCard1 } from '@/components/deals/card';
import { useEffect, useState } from 'react';
import { recordSearch } from '@/lib/firebase/search';
import { handleSearchClick } from '@/helper';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, getDocs, limit } from 'firebase/firestore';
import { Deal } from '@/lib/firebase/collections';

import Navigation from "@/components/navigation";
import Footer from '@/components/footer';
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryString = searchParams.get('q') || '';
  const {getBrandDetails} = useDeals();
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [searchTerm, setSearchTerm] = useState(queryString);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    setSearchTerm(queryString);
  }, [queryString]);

  
  useEffect(() => {
    const fetchDeals = async () => {
      try {

        let dealsQuery = query(
          collection(db, "deals"),
          where("status", "==", "active"),
          where("expiresAt", ">", new Date()),
          orderBy("expiresAt"),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        
        const snapshot = await getDocs(dealsQuery);
        
        if (snapshot.empty) {
          setLoading(false);
          return;
        }
  
        const newDeals = await Promise.all(
          snapshot.docs.map(async (doc) => ({
            id: doc.id,
            ...doc.data(),
            brandDetails: await getBrandDetails(doc.data().brand),
          })) as unknown as Deal[]
        );
  
        setDeals(newDeals as any);
        setLoading(false);

      } catch (error: any) {
        setError(error);
        setLoading(false);
      }
    };
    
    fetchDeals();
  }, []);

  // Real-time search and filtering
  useEffect(() => {
    const filtered = deals.filter((deal: any) =>
      deal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDeals(filtered);
  }, [deals, searchTerm]);

  const handleSearch = async (e: any) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      await recordSearch(searchTerm);
      router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const { settings: settings__, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: null
  });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  // If loading
  if (loading) {
    return <Preloader text="Loading deals..." />;
  }

  // If error
  if (error) {
    return <ErrorLoader text="Error Loading Deals" message={(error as any).message} />;
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black py-12">
        <div className="container mx-auto px-4">
          {/* Search Results Header */}
          <div className="max-w-4xl mx-auto mb-12">
            <h1 className="text-3xl font-bold text-primary dark:text-white mb-4">
              {searchTerm ? `Search Results for "${searchTerm}"` : 'All Deals'}
            </h1>
            <p className="text-gray-800 dark:text-gray-400">
              {filteredDeals.length} {filteredDeals.length === 1 ? 'deal' : 'deals'} found
            </p>
          </div>

          {/* Search and Filter Controls */}
          <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} method='post' className='w-[100%]'>
              <div className="relative flex-1">
                <input
                  name="searchTerm"
                  type="text"
                  placeholder="Search deals..."
                  className="text-center border-gray-300 shadow-lg w-full pl-12 pr-4 py-3 bg-white dark:bg-white/5 border dark:border-white/20 rounded-xl text-dark-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} // Real-time update of search term
                />
                <button type="submit">
                  <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </button>
              </div>
            </form>
          </div>

          {/* Search Results */}
          {filteredDeals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
              {filteredDeals.map((deal: any) => (
                <DealCard1 deal={deal} key={deal.id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-primary dark:text-white mb-2">No deals found</h2>
              <p className="text-gray-400 mb-8">
                {searchTerm
                  ? `We couldn't find any deals matching "${searchTerm}"`
                  : 'Try searching for something else'}
              </p>
              <Link
                href="/deals"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors"
              >
                Browse All Deals
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer 
        categories={categories} 
        loadingCategories={loadingCategories}
        brands={featuredBrands} 
        loadingBrands={loadingBrands}
        settings={settings__} 
        settLoading={settLoading}
        dynamicLinks={dynamicLinks}
        loadingDynamicLinks={loadingDynamicLinks}
      />
    </>
  );
}
