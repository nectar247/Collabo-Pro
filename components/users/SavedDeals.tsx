/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Filter, Eye, ChevronDown, Ban, CheckCircle } from 'lucide-react';
import { useAuth, useBrands, useCategories, useDeals, useProfile } from '@/lib/firebase/hooks';
import { DealsLabel } from '@/helper';
import { Deal } from '@/lib/firebase/collections';

interface DealFilters {
  category: string;
  brand: string;
  status: 'all' | 'active' | 'expired';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export default function SavedDeals() {

  const {user} = useAuth();
  const {savedDeals, savedUnsaveDeals, loading, error, } = useProfile();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [filters, setFilters] = useState<DealFilters>({
    category: 'all',
    brand: 'all',
    status: 'all',
    dateRange: 'all'
  });

  useEffect(()=>{
      let deals = [] as Deal[];
      savedDeals.forEach((el: any)=>{
        deals.push(el.dealData);
      })
      setDeals(deals);
  },[savedDeals])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading deals...</p>
      </div>
    );
  }

  console.log(deals);

  // Get unique categories and brands for filters
  const categories = ['all',...new Set( deals.length ? deals.map(deal => deal?.category).filter(deal => deal) : [] )];
  const brands = ['all', ...new Set( deals.length ? deals.map(deal => deal?.brand).filter(deal => deal) : [] )];
  console.log(categories);

  // Filter deals based on search and filters
  const filteredDeals = deals.filter(deal => {

    if(!deal) return false;

    const matchesSearch = 
      // deal?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.brand.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filters.category === 'all' || deal.category === filters.category;
    const matchesBrand = filters.brand === 'all' || deal.brand === filters.brand;
    const matchesStatus = filters.status === 'all' || deal.status === filters.status;
    
    let matchesDate = true;
    const dealDate = new Date((deal.createdAt as any));
    const now = new Date();
    
    switch (filters.dateRange) {
      case 'today':
        matchesDate = dealDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        matchesDate = dealDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        matchesDate = dealDate >= monthAgo;
        break;
    }

    return matchesSearch && matchesCategory && matchesBrand && matchesStatus && matchesDate;
  });

  const handleSaveDeal = async (dealId: string, status: boolean) => {
    try {
      if(!user) return false;
      let response = await savedUnsaveDeals({
        dealId
      }, status);
      if(response === false){
        setDeals(deals.filter((deal: any) => deal.id !== dealId));
      }
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const renderDealCard = (deal: any) => (
    <motion.div
      key={deal.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
          <img
            src={deal.image ? deal.image : (deal as any).brandDetails?.logo}
            alt={deal.description}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{deal.description}</h3>
          <p className="text-sm text-gray-600">{deal.brand}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">
              {new Date(deal.expiresAt.seconds * 1000).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpandedDeal(expandedDeal === deal.id ? null : deal.id)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform ${
              expandedDeal === deal.id ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <AnimatePresence>
        {expandedDeal === deal.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <p className="text-gray-600 text-sm">{deal.description}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => await handleSaveDeal(deal.id, false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  deal.status === 'active'
                    ? 'bg-red-100 hover:bg-red-200 text-red-600'
                    : 'bg-green-100 hover:bg-green-200 text-green-600'
                }`}
              >
                <Ban className="h-4 w-4" />
                Unsave
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading deals: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1 relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 shadow-sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <select
                  value={filters.brand}
                  onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                >
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand.charAt(0).toUpperCase() + brand.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as DealFilters['status'] })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters({ ...filters, dateRange: e.target.value as DealFilters['dateRange'] })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Content Area */}
      <>
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="pb-3 text-gray-600 font-medium">Title</th>
                <th className="pb-3 text-gray-600 font-medium">Brand</th>
                <th className="pb-3 text-gray-600 font-medium">Category</th>
                <th className="pb-3 text-gray-600 font-medium">Discount</th>
                <th className="pb-3 text-gray-600 font-medium">Expires</th>
                <th className="pb-3 text-gray-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal) => (
                <motion.tr
                  key={deal.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-gray-200"
                >
                  <td className="py-4 text-gray-800">
                    {deal.description}
                    <br />
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 mt-2 border border-gray-200">
                      <img
                        src={deal.image ? deal.image : (deal as any).brandDetails?.logo}
                        alt={deal.description}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="py-4 text-gray-800">{deal.brand}</td>
                  <td className="py-4 text-gray-800">{deal.category}</td>
                  <td className="py-4 text-gray-800">{deal.discount}</td>
                  <td className="py-4 text-gray-800">
                    {new Date((deal.expiresAt as any).seconds * 1000).toLocaleDateString()}
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={async () => await handleSaveDeal(deal.id, false)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
                      >
                        <Ban className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {filteredDeals.map(deal => renderDealCard(deal))}
        </div>
      </>

    </div>
  );
}