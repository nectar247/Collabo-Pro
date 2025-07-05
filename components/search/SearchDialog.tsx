"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Search, X, TrendingUp, Sparkles, Loader2, Tag, Store, Grid3X3 } from 'lucide-react';
import { useCategories, useDeals } from '@/lib/firebase/hooks';
import { getPopularSearches, recordSearch } from '@/lib/firebase/search';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchSuggestion {
  text: string;
  type: 'deal' | 'brand' | 'category';
  icon: any;
}

export default function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { categories } = useCategories();
  const { allPublicDeals } = useDeals(); // Get all public deals
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const searchesQuery = await getPopularSearches();
        const searchTerms = searchesQuery.map((doc: any) => doc.term);
        setPopularSearches(searchTerms);
      } catch (error) {
        console.error('Error fetching popular searches:', error);
      }
    }

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [onClose, isOpen]);

  // Generate search suggestions from deals, brands, and categories
  useEffect(() => {
    if (searchQuery.length > 1) {
      const query = searchQuery.toLowerCase();
      const suggestions: SearchSuggestion[] = [];

      // Search through deals
      const dealMatches = allPublicDeals
        .filter(deal => 
          deal.title?.toLowerCase().includes(query) ||
          deal.description?.toLowerCase().includes(query)
        )
        .slice(0, 4)
        .map(deal => ({
          text: deal.title,
          type: 'deal' as const,
          icon: Tag
        }));

      // Search through brands
      const uniqueBrands = [...new Set(allPublicDeals.map(deal => deal.brand))];
      const brandMatches = uniqueBrands
        .filter(brand => brand?.toLowerCase().includes(query))
        .slice(0, 3)
        .map(brand => ({
          text: brand,
          type: 'brand' as const,
          icon: Store
        }));

      // Search through categories
      const categoryMatches = categories
        .filter(cat => cat.name.toLowerCase().includes(query))
        .slice(0, 2)
        .map(cat => ({
          text: cat.name,
          type: 'category' as const,
          icon: Sparkles
        }));

      // Combine and prioritize: deals first, then brands, then categories
      suggestions.push(...dealMatches, ...brandMatches, ...categoryMatches);
      
      setSearchSuggestions(suggestions.slice(0, 6)); // Limit to 6 total suggestions
    } else {
      setSearchSuggestions([]);
    }
  }, [searchQuery, allPublicDeals, categories]);

  const handleSearch = async (term: string) => {
    if (!term.trim()) return;
    
    setIsSearching(true);
    try {
      await recordSearch(term.trim());
      router.push(`/search?q=${encodeURIComponent(term.trim())}`);
      onClose();
      setSearchQuery("");
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await handleSearch(searchQuery);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSuggestionClick = async (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.text);
    await handleSearch(suggestion.text);
  };

  const handleViewAllDeals = () => {
    router.push('/deals');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
                
                <form onSubmit={handleFormSubmit} className="w-full">
                  <div className="flex items-center p-4">
                    <button
                      type="submit"
                      disabled={isSearching || !searchQuery.trim()}
                      className="disabled:opacity-50"
                    >
                      {isSearching ? (
                        <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                      ) : (
                        <Search className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-transparent text-white placeholder-gray-400 focus:outline-none text-lg"
                      placeholder="Search for deals, brands, categories..."
                      disabled={isSearching}
                    />
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      type="button"
                    >
                      <X className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                </form>

                {/* Live Search Suggestions */}
                {searchSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-t border-white/10 p-4 space-y-2"
                  >
                    {/* View All Deals Option */}
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={handleViewAllDeals}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/20 to-primary-dark/20 hover:from-primary/30 hover:to-primary-dark/30 border border-primary/20 hover:border-primary/30 transition-all text-left group"
                    >
                      <Grid3X3 className="h-4 w-4 text-primary group-hover:text-white transition-colors" />
                      <div className="flex-1">
                        <span className="text-white text-sm font-medium">View all deals</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                            Browse everything
                          </span>
                        </div>
                      </div>
                      <Search className="h-4 w-4 text-primary group-hover:text-white transition-colors" />
                    </motion.button>

                    {searchSuggestions.map((suggestion, index) => (
                      <motion.button
                        key={`${suggestion.type}-${suggestion.text}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (index + 1) * 0.05 }}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left group"
                      >
                        <suggestion.icon className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                        <div className="flex-1">
                          <span className="text-white text-sm">{suggestion.text}</span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              suggestion.type === 'deal' ? 'bg-green-500/20 text-green-400' :
                              suggestion.type === 'brand' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-purple-500/20 text-purple-400'
                            }`}>
                              {suggestion.type}
                            </span>
                          </div>
                        </div>
                        <Search className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Search Content - Only show when no suggestions */}
            {searchSuggestions.length === 0 && (
              <div className="mt-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                {/* View All Deals - Always visible when no suggestions */}
                <div className="mb-8">
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleViewAllDeals}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/20 to-primary-dark/20 hover:from-primary/30 hover:to-primary-dark/30 border border-primary/20 hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="flex-shrink-0">
                      <Grid3X3 className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white text-base font-semibold mb-1">View all deals</h3>
                      <p className="text-gray-300 text-sm">Browse our complete collection of amazing deals</p>
                    </div>
                    <div className="flex-shrink-0">
                      <Search className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
                    </div>
                  </motion.button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {/* Popular Searches */}
                  {popularSearches.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-secondary mb-4">
                        <TrendingUp className="h-5 w-5" />
                        <h3 className="font-semibold">Popular Searches</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {popularSearches.slice(0, 8).map((term, index) => (
                          <motion.button
                            key={term}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleSearch(term)}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group text-left"
                          >
                            <span className="text-white text-sm">{term}</span>
                            <Search className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Categories */}
                  {categories.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-secondary mb-4">
                        <Sparkles className="h-5 w-5" />
                        <h3 className="font-semibold">Browse Categories</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categories.slice(0, 12).map((category, index) => (
                          <motion.button
                            key={category.name}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => handleSearch(category.name)}
                            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white transition-all hover:scale-105 text-sm"
                          >
                            {category.name}
                            {category.dealCount > 0 && (
                              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                {category.dealCount}
                              </span>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Empty State */}
                {popularSearches.length === 0 && categories.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Start typing to search for deals...</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}