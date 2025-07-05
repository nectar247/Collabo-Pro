/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
"use client";

import { Filter, Search, X, SlidersHorizontal, Grid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Preloader from '@/components/loaders/preloader';
import ErrorLoader from '@/components/loaders/ErrorLoader';
import { DealCard1 } from '@/components/deals/card';
import { useEffect, useState, useMemo } from 'react';
import { recordSearch } from '@/lib/firebase/search';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Deal } from '@/lib/firebase/collections';

import Navigation from "@/components/navigation";
import Footer from '@/components/footer';
import { useBrands, useCategories, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryString = searchParams.get('q') || '';
  
  // States
  const [deals, setDeals] = useState<Deal[]>([]);
  const [searchTerm, setSearchTerm] = useState(queryString);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSearching, setIsSearching] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDeals, setTotalDeals] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const dealsPerPage = 24;
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'expiring' | 'popular'>('newest');
  
  // Hooks
  const { settings: settings__, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories } = useCategories();
  const { allBrands, featuredBrands, loading: loadingBrands } = useBrands();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  // Update search term when URL changes
  useEffect(() => {
    setSearchTerm(queryString);
  }, [queryString]);

  // Function to get total count of deals
  const getTotalDealsCount = async () => {
    try {
      const countQuery = query(
        collection(db, "deals_fresh"),
        where("status", "==", "active"),
        where("expiresAt", ">", Timestamp.now())
      );
      
      const snapshot = await getDocs(countQuery);
      return snapshot.docs.length;
    } catch (error) {
      console.error('❌ Error getting total deals count:', error);
      return 0;
    }
  };

  // Function to load deals with pagination
  const loadDealsWithPagination = async (page: number = 1) => {
    try {
      console.log("📄 Loading deals for page:", page);
      
      const dealsQuery = query(
        collection(db, "deals_fresh"),
        where("status", "==", "active"),
        where("expiresAt", ">", Timestamp.now()),
        orderBy("expiresAt"),
        limit(dealsPerPage * page) // Load all deals up to current page
      );
      
      const snapshot = await getDocs(dealsQuery);
      const allDeals = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      }) as Deal[];
      
      console.log("📄 Deals loaded for pagination:", allDeals.length);
      return allDeals;
      
    } catch (error) {
      console.error('❌ Error loading deals with pagination:', error);
      throw error;
    }
  };

  // Function to search the entire database
  const searchEntireDatabase = async (searchQuery: string) => {
    try {
      setIsSearching(true);
      console.log("🔍 Searching entire database for:", searchQuery);

      // Get all active deals from the database
      const dealsQuery = query(
        collection(db, "deals_fresh"),
        where("status", "==", "active"),
        where("expiresAt", ">", Timestamp.now()),
        orderBy("expiresAt"),
        limit(1000) // Increase limit for comprehensive search
      );
      
      const snapshot = await getDocs(dealsQuery);
      console.log("🔍 Total deals fetched for search:", snapshot.docs.length);
      
      if (snapshot.empty) {
        return [];
      }

      // Get all deals
      const allDeals = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      }) as Deal[];

      // Perform comprehensive search across all text fields
      const searchLower = searchQuery.toLowerCase();
      const searchResults = allDeals.filter((deal: any) => {
        const searchableFields = [
          deal.title || '',
          deal.description || '',
          deal.brand || '',
          deal.category || '',
          deal.tags?.join(' ') || '',
          deal.store || '',
          deal.couponCode || ''
        ];
        
        return searchableFields.some(field => 
          field.toLowerCase().includes(searchLower)
        );
      });

      console.log("🔍 Search results found:", searchResults.length);
      return searchResults;

    } catch (error) {
      console.error('❌ Error searching database:', error);
      throw error;
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch deals on initial load and URL changes
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoading(true);
        setError(null);
        setCurrentPage(1); // Reset pagination

        if (queryString.trim()) {
          // If there's a search query, search the entire database
          console.log("🔍 Performing database search for:", queryString);
          const searchResults = await searchEntireDatabase(queryString);
          setDeals(searchResults);
          setTotalDeals(searchResults.length);
        } else {
          // If no search query, load deals with pagination
          console.log("📄 Loading deals with pagination");
          const [paginatedDeals, totalCount] = await Promise.all([
            loadDealsWithPagination(1),
            getTotalDealsCount()
          ]);
          setDeals(paginatedDeals);
          setTotalDeals(totalCount);
        }
        
        setLoading(false);

      } catch (error: any) {
        console.error('❌ Error fetching deals:', error);
        setError(error);
        setLoading(false);
      }
    };
    
    fetchDeals();
  }, [queryString]);

  // Function to load more deals (pagination)
  const loadMoreDeals = async () => {
    if (isLoadingMore || queryString.trim()) return; // Don't paginate during search
    
    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const newDeals = await loadDealsWithPagination(nextPage);
      setDeals(newDeals);
      setCurrentPage(nextPage);
    } catch (error: any) {
      console.error('❌ Error loading more deals:', error);
      setError(error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Memoized filtered and sorted deals (now only for filters, not search)
  const filteredDeals = useMemo(() => {
    let filtered = deals;

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((deal: any) => deal.category === selectedCategory);
    }

    // Apply brand filter
    if (selectedBrand !== 'all') {
      filtered = filtered.filter((deal: any) => deal.brand === selectedBrand);
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a: any, b: any) => 
          new Date(b.createdAt?.seconds * 1000 || 0).getTime() - 
          new Date(a.createdAt?.seconds * 1000 || 0).getTime()
        );
        break;
      case 'expiring':
        filtered.sort((a: any, b: any) => 
          new Date(a.expiresAt?.seconds * 1000 || 0).getTime() - 
          new Date(b.expiresAt?.seconds * 1000 || 0).getTime()
        );
        break;
      case 'popular':
        filtered.sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
        break;
    }

    return filtered;
  }, [deals, selectedCategory, selectedBrand, sortBy]);

  // Handle search form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSearchTerm = searchTerm.trim();
    
    if (trimmedSearchTerm) {
      // Record the search
      await recordSearch(trimmedSearchTerm);
      
      // If the search term is different from the current URL query, navigate
      if (trimmedSearchTerm !== queryString) {
        router.push(`/search?q=${encodeURIComponent(trimmedSearchTerm)}`);
      } else {
        // If it's the same query, just refresh the search
        try {
          setIsSearching(true);
          const searchResults = await searchEntireDatabase(trimmedSearchTerm);
          setDeals(searchResults);
        } catch (error: any) {
          setError(error);
        }
      }
    } else {
      // If no search term, go to browse mode
      router.push('/search');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSortBy('newest');
  };

  // Get unique brands and categories from current deals
  const availableCategories = useMemo(() => 
    [...new Set(deals.map((deal: any) => deal.category))].filter(Boolean),
    [deals]
  );

  const availableBrands = useMemo(() => 
    [...new Set(deals.map((deal: any) => deal.brand))].filter(Boolean),
    [deals]
  );

  if (loading) {
    return <Preloader text="Searching for amazing deals..." />;
  }

  if (error) {
    return <ErrorLoader text="Search Error" message={error.message} />;
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black py-8">
        <div className="container mx-auto px-4">
          {/* Search Header */}
          <div className="max-w-7xl mx-auto mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-primary dark:text-white mb-4"
            >
              {queryString ? `Search Results for "${queryString}"` : 'All Deals'}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-800 dark:text-gray-400"
            >
              {queryString ? (
                `${filteredDeals.length} ${filteredDeals.length === 1 ? 'deal found' : 'deals found'}`
              ) : (
                `Showing ${filteredDeals.length} of ${totalDeals}+ deals`
              )}
            </motion.p>
          </div>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-7xl mx-auto mb-6"
          >
            <form onSubmit={handleSearch} className="relative">
              <input
                ref={(input) => {
                  input?.focus();
                }}
                type="text"
                placeholder="Search for deals..."
                className="w-full pl-12 pr-20 py-4 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl text-gray-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-lg backdrop-blur-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isSearching}
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Search</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Controls Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-7xl mx-auto mb-8 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition-colors text-sm"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {(selectedCategory !== 'all' || selectedBrand !== 'all') && (
                  <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                    {[selectedCategory !== 'all' ? 1 : 0, selectedBrand !== 'all' ? 1 : 0].reduce((a, b) => a + b)}
                  </span>
                )}
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 sm:px-4 py-2 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm flex-1 sm:flex-none"
              >
                <option value="newest">Newest First</option>
                <option value="expiring">Expiring Soon</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-primary text-white' 
                    : 'bg-white dark:bg-white/10 text-gray-700 dark:text-white border border-gray-300 dark:border-white/20'
                }`}
                title="Grid View"
              >
                <Grid className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-primary text-white' 
                    : 'bg-white dark:bg-white/10 text-gray-700 dark:text-white border border-gray-300 dark:border-white/20'
                }`}
                title="List View"
              >
                <List className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
          </motion.div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="max-w-7xl mx-auto mb-8 overflow-hidden"
              >
                <div className="bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl p-6 backdrop-blur-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="all">All Categories</option>
                        {availableCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        Brand
                      </label>
                      <select
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="all">All Brands</option>
                        {availableBrands.map((brand) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={clearFilters}
                        className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Results */}
          {filteredDeals.length > 0 ? (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className={`grid gap-6 max-w-7xl mx-auto ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                    : 'grid-cols-1'
                }`}
              >
                {filteredDeals.map((deal: any, index) => (
                  <motion.div
                    key={deal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <DealCard1 deal={deal} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination - Only show when not searching */}
              {!queryString.trim() && totalDeals > deals.length && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="max-w-7xl mx-auto mt-12 text-center"
                >
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-gray-600 dark:text-gray-400">
                      Showing {deals.length} of {totalDeals}+ deals
                    </p>
                    <button
                      onClick={loadMoreDeals}
                      disabled={isLoadingMore}
                      className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Loading More...
                        </>
                      ) : (
                        <>
                          Load More Deals
                          <span className="bg-white/20 text-white text-sm px-2 py-1 rounded">
                            +{Math.min(dealsPerPage, totalDeals - deals.length)}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Page indicator for browse mode */}
              {!queryString.trim() && currentPage > 1 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-7xl mx-auto mt-8 text-center"
                >
                  <div className="inline-flex items-center gap-2 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg px-4 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {Math.ceil(totalDeals / dealsPerPage)}+
                    </span>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center py-16"
            >
              <Search className="h-20 w-20 text-gray-400 mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-primary dark:text-white mb-4">No deals found</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                {queryString
                  ? `We couldn't find any deals matching "${queryString}". Try adjusting your search or filters.`
                  : 'Try searching for something else or browse our categories.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear Filters
                </button>
                <Link
                  href="/deals"
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Browse All Deals
                </Link>
              </div>
            </motion.div>
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