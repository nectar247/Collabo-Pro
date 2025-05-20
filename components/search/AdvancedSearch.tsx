"use client";

import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchHistory } from '@/lib/firebase/hooks';
import { sanitizeInput } from '@/lib/utils/sanitize';

interface SearchFilters {
  category: string;
  priceRange: [number, number];
  sortBy: 'popularity' | 'date' | 'price';
  brand?: string;
}

export default function AdvancedSearch() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    category: 'all',
    priceRange: [0, 1000],
    sortBy: 'popularity'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { recentSearches, popularSearches, addSearchTerm } = useSearchHistory();

  const handleSearch = (query: string) => {
    const sanitizedQuery = sanitizeInput(query);
    setSearchQuery(sanitizedQuery);
    
    // Simulate search suggestions
    if (sanitizedQuery.length > 2) {
      const filteredSuggestions = popularSearches.filter(item => 
        item.toLowerCase().includes(sanitizedQuery.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSearchSubmit = async (term: string) => {
    if (term.trim()) {
      await addSearchTerm(term.trim());
      // Additional search logic here
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <div className="relative flex items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search for deals..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 dark:bg-gray-800/50 backdrop-blur-xl border border-white/20 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          <Search className="absolute left-4 h-5 w-5 text-gray-500 dark:text-gray-400" />
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="absolute right-4 p-1 hover:bg-white/10 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Search Suggestions */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(suggestion);
                    handleSearchSubmit(suggestion);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters Panel */}
        <AnimatePresence>
          {isFiltersOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-40 w-full mt-2 p-6 bg-white dark:bg-gray-800 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                <button
                  onClick={() => setIsFiltersOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Electronics', 'Fashion', 'Food', 'Travel'].map((category) => (
                      <button
                        key={category}
                        onClick={() => setFilters({ ...filters, category: category.toLowerCase() })}
                        className={`px-4 py-2 rounded-lg border ${
                          filters.category === category.toLowerCase()
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        } transition-colors`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price Range
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={filters.priceRange[0]}
                      onChange={(e) => setFilters({
                        ...filters,
                        priceRange: [parseInt(e.target.value), filters.priceRange[1]]
                      })}
                      className="w-full"
                    />
                    <span className="text-gray-900 dark:text-white">${filters.priceRange[0]}</span>
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({
                      ...filters,
                      sortBy: e.target.value as SearchFilters['sortBy']
                    })}
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="popularity">Popularity</option>
                    <option value="date">Date</option>
                    <option value="price">Price</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}