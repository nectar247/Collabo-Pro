"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Search, X, TrendingUp, History, ArrowRight, Sparkles } from 'lucide-react';
import { useCategories } from '@/lib/firebase/hooks';
import { getPopularSearches, recordSearch } from '@/lib/firebase/search';
import { handleSearchClick } from '@/helper';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const { categories } = useCategories();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch popular searches from recent search history
        const searchesQuery = await getPopularSearches();
        const searchTerms = searchesQuery.map((doc: any) => doc.term);
        setPopularSearches(searchTerms);
        // Fetch popular searches from recent search history
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // const handleSearch = async (term: string) => {
  //   await recordSearch(term);
  //   router.push(`/search?q=${encodeURIComponent(term)}`);
  //   onClose();
  // };

  const handleSearch = async (term: string) => {
    await recordSearch(term);
    // Update to use router.push with a callback
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setSearchQuery(term);
    onClose();
  };
  
  // const handleSearch____ = async (e: any) => {
  //     e.preventDefault();
  //     onClose();
  //     let search = e.target.elements.searchTerm?.value;
  //     await recordSearch(search);
  //     handleSearchClick(router, search);
  // }

  const handleSearch____ = async (e: any) => {
    e.preventDefault();
    let search = e.target.elements.searchTerm?.value;
    await recordSearch(search);
    router.push(`/search?q=${encodeURIComponent(search)}`);
    setSearchQuery(search);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="min-h-screen px-4 text-center">
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-lg"
              onClick={onClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform"
            >
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-dark/20 blur-xl" />
                <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
                
                  <form
                    onSubmit={handleSearch____}
                    method='post'
                    className='w-[100%]'
                  >
                  <div className="flex items-center p-4">
                    <button
                        type="submit"
                    >
                        <Search className="h-6 w-6 text-gray-400" />
                    </button>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-transparent text-white placeholder-gray-400 focus:outline-none text-lg"
                      placeholder="Search for deals..."
                      name="searchTerm"
                      autoFocus
                    />
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      type='button'
                    >
                      <X className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                  </form>
                </div>
              </div>

              {/* Search Content */}
              <div className="mt-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                  {/* Trending Searches */}
                  <div>
                    <div className="flex items-center gap-2 text-secondary mb-4">
                      <TrendingUp className="h-5 w-5" />
                      <h3 className="font-semibold">Popular Searches</h3>
                    </div>
                    <div className="space-y-2">
                      {popularSearches.filter((_, index) => index < 6).map((term, index) => (
                        <motion.button
                          key={term}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={async () => await handleSearch(term)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
                        >
                          <span className="text-white">{term}</span>
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  {/* Recent Searches */}
                  {/* <div>
                    <div className="flex items-center gap-2 text-primary mb-4">
                      <History className="h-5 w-5" />
                      <h3 className="font-semibold">Recent</h3>
                    </div>
                    <div className="space-y-2">
                      {recentSearches.map((term, index) => (
                        <motion.button
                          key={term}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleSearch(term)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
                        >
                          <span className="text-white">{term}</span>
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                        </motion.button>
                      ))}
                    </div>
                  </div> */}
                </div>

                {/* Quick Categories */}
                <div className="mt-8">
                  <div className="flex items-center gap-2 text-secondary mb-4">
                    <Sparkles className="h-5 w-5" />
                    <h3 className="font-semibold">Quick Categories</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.filter((_, index) => index < 10).map((category) => (
                      <button
                        key={category.name}
                        onClick={async () => await handleSearch(category.name)}
                        className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white transition-all hover:scale-105"
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}