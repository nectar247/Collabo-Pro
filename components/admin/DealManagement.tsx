/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Filter, Eye, ChevronDown, Ban, CheckCircle } from 'lucide-react';
import { useBrands, useCategories, useDeals } from '@/lib/firebase/hooks';
import { DealsLabel } from '@/helper';
import { AnyARecord } from 'node:dns';
import ContentPreloader from '../loaders/ContentPreloader';
import ContentErrorLoader from '../loaders/ContentErrorLoader';

interface DealFilters {
  category: string;
  brand: string;
  status: 'all' | 'active' | 'inactive';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export default function DealManagement() {
  const { allAdminDeals, totalDealsCount, loading, error, addDeal, updateDeal, toggleDealStatus, deleteDeal, fetchAdminDeals } = useDeals();
  const { allCategories: allCategories } = useCategories();
  const { allBrands: allBrands } = useBrands();
  const [isAddingDeal, setIsAddingDeal] = useState(false);
  const [editDeal, setEditDeal] = useState<any>(null);
  const [showCode, setShowCode] = useState<boolean>(false);
  const [showLink, setShowLink] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [countryCode, setCountryCode] = useState('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [filters, setFilters] = useState<DealFilters>({
    category: 'all',
    brand: 'all',
    status: 'all',
    dateRange: 'all'
  });

  // PAGINATION 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay for better responsiveness

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to first page when debounced search query changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      setCurrentPage(1);
    }
  }, [debouncedSearchQuery]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, countryCode]);

  // Handle filter changes with page reset
  const handleFilterChange = (filterType: string, value: any) => {
    setCurrentPage(1); // Reset to first page
    
    switch (filterType) {
      case 'itemsPerPage':
        setItemsPerPage(value);
        break;
      case 'country':
        setCountryCode(value);
        break;
      default:
        setFilters(prev => ({ ...prev, [filterType]: value }));
        break;
    }
  };

  useEffect(() => {
    console.log('Fetching deals with params:', {
      searchTerm: debouncedSearchQuery,
      countryCode,
      page: currentPage,
      pageSize: itemsPerPage,
      dealFilters: filters,
    });
    
    fetchAdminDeals({
      searchTerm: debouncedSearchQuery,
      countryCode,
      page: currentPage,
      pageSize: itemsPerPage,
      dealFilters: filters,
    });
  }, [
    debouncedSearchQuery, 
    currentPage, 
    fetchAdminDeals, 
    countryCode, 
    itemsPerPage, 
    filters
  ]);

  // Get unique categories and brands for filters
  const categories = ['all', ...new Set(allAdminDeals.map(deal => deal.category))];
  const brands = ['all', ...new Set(allBrands.map((brand: any) => brand.name))];

  const handleAddDeal = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const brandExists = allBrands.some((brand: any) => brand.name === editDeal.brand);
          if (!brandExists) {
              throw new Error('Selected brand does not exist');
          }
          await addDeal({
              ...editDeal,
              expiresAt: new Date(editDeal.expiresAt?.seconds ? editDeal.expiresAt.seconds * 1000 : editDeal.expiresAt),
              startsAt: new Date(editDeal.startsAt?.seconds ? editDeal.startsAt.seconds * 1000 : editDeal.startsAt)
          });
          setIsAddingDeal(false);
          setEditDeal(null);
      } catch (error) {
          console.error('Error adding deal:', error);
      }
  };

  const handleUpdateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeal) return;
  
    try {
      const { id, createdAt, updatedAt, ...updateData } = editDeal;
      await updateDeal(id, {
        ...updateData,
        status: new Date(updateData.expiresAt).getTime() < Date.now() ? 'inactive' : updateData.status,
        expiresAt: new Date(updateData.expiresAt?.seconds ? updateData.expiresAt.seconds * 1000 : updateData.expiresAt),
        startsAt: new Date(updateData.startsAt?.seconds ? updateData.startsAt.seconds * 1000 : updateData.startsAt)
      });
      setEditDeal(null);
    } catch (error) {
      console.error('Error updating deal:', error);
    }
  };

  useEffect(()=>{
    
    if(editDeal){
      switch (editDeal.label) {
        case 'GetCode':
          setShowCode(true);
          setShowLink(true);
          break;
        case 'GetDeals':
          setShowCode(false);
          setShowLink(true);
          break;
        case 'GetReward':
          setShowCode(false);
          setShowLink(true);
          break;
        case 'GetDiscount':
          setShowCode(false);
          setShowLink(true);
          break;
        default:
          setShowCode(false);
          setShowLink(false);
          break;
      }
    }
  },[editDeal])

  const handleDeleteDeal = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this deal?')) {
      try {
        await deleteDeal(id);
      } catch (error) {
        console.error('Error deleting deal:', error);
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: 'active' | 'inactive') => {
    try {
      await toggleDealStatus(id, currentStatus);
    } catch (error) {
      console.error('Error toggling deal status:', error);
    }
  };

  const totalPages = Math.ceil(totalDealsCount / itemsPerPage);

  const renderDealForm = () => (
    <form onSubmit={isAddingDeal ? handleAddDeal : handleUpdateDeal} className="space-y-4">
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          value={editDeal?.description || ''}
          onChange={(e) => setEditDeal({ ...editDeal, description: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          required
        />
      </div>

      {/* Two-column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Brand */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Brand <span className="text-red-500">*</span></label>
          <select
            value={editDeal?.brand || ''}
            onChange={(e) => setEditDeal({ ...editDeal, brand: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            required
          >
            <option value="">-select-</option>
            {allBrands
              .filter((brand: any) => brand.status === 'active')
              .sort((a: any, b: any) => a.name.localeCompare(b.name))
              .map((brand: any) => (
                <option key={brand.id} value={brand.name}>{brand.name}</option>
              ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
          <select
            value={editDeal?.category || ''}
            onChange={(e) => setEditDeal({ ...editDeal, category: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            required
          >
            <option value="">-select-</option>
            {allCategories
              .filter((cat: any) => cat.status === 'active')
              .sort((a: any, b: any) => a.name.localeCompare(b.name))
              .map((v: any, i: number) => (
                <option key={i} value={v.name}>{v.name}</option>
              ))}
          </select>
        </div>

        {/* Discount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Discount Label</label>
          <input
            type="text"
            value={editDeal?.discount || ''}
            onChange={(e) => setEditDeal({ ...editDeal, discount: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price/Amount</label>
          <input
            type="text"
            value={editDeal?.price || ''}
            onChange={(e) => setEditDeal({ ...editDeal, price: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
        </div>
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Image URL ~ If left empty will use brand image
        </label>
        <input
          type="url"
          value={editDeal?.image || ''}
          onChange={(e) => setEditDeal({ ...editDeal, image: e.target.value })}
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
        />
        <span className="italic font-mono text-[11px] text-gray-500">
          Accept: images.unsplash.com, ui.awin.com, awin.com, awin1.com, a1.awin1.com
        </span>
      </div>

      {/* Status */}
      <div className="grid grid-cols-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status <span className="text-red-500">*</span></label>
          <select
            value={editDeal?.status || ''}
            onChange={(e) => setEditDeal({ ...editDeal, status: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            required
          >
            <option value="">-select status-</option>
            <option value="inactive">inactive</option>
            <option value="active">active</option>
          </select>
        </div>
      </div>

      {/* Starts/Expires At + Label/Code/Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Starts At <span className="text-red-500">*</span></label>
          <input
            type="datetime-local"
            defaultValue={
              editDeal?.startsAt && editDeal.startsAt.seconds > 0
                ? new Date(editDeal.startsAt.seconds * 1000).toISOString().slice(0, 16)
                : ''
            }
            onChange={(e) => setEditDeal({ ...editDeal, startsAt: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Expires At <span className="text-red-500">*</span></label>
          <input
            type="datetime-local"
            defaultValue={
              editDeal?.expiresAt && editDeal.expiresAt.seconds > 0
                ? new Date(editDeal.expiresAt.seconds * 1000).toISOString().slice(0, 16)
                : ''
            }
            onChange={(e) => setEditDeal({ ...editDeal, expiresAt: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            required
          />
        </div>

        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Label <span className="text-red-500">*</span></label>
          <select
            value={editDeal?.label || ''}
            onChange={(e) => setEditDeal({ ...editDeal, label: e.target.value, code: '', link: '' })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            required
          >
            <option value="">-select label-</option>
            {Object.entries(DealsLabel).map(([key__, value__]: any) => (
              <option key={key__} value={key__}>{value__}</option>
            ))}
          </select>
        </div>

        {showCode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Code <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={editDeal?.code || ''}
              onChange={(e) => setEditDeal({ ...editDeal, code: e.target.value })}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
              required
            />
          </div>
        )}

        {showLink && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Link <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={editDeal?.link || ''}
              onChange={(e) => setEditDeal({ ...editDeal, link: e.target.value })}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
              required
            />
          </div>
        )}
      </div>

      {/* Terms */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Terms</label>
        <textarea
          value={editDeal?.terms || ''}
          onChange={(e) => setEditDeal({ ...editDeal, terms: e.target.value })}
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setIsAddingDeal(false);
            setEditDeal(null);
          }}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors shadow"
        >
          {isAddingDeal ? 'Add Deal' : 'Update Deal'}
        </button>
      </div>
    </form>
  );

  const renderDealCard = (deal: any) => (
    <motion.div
      key={deal.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-white">
          <img
            src={deal.image ? deal.image : (deal as any).brandDetails?.logo}
            alt={deal.brand}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 hidden">{deal.description}</h3>
          <p className="text-sm text-gray-600">{deal.brand}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">
              {deal?.startsAt?.seconds
                ? new Date(deal.startsAt.seconds * 1000).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }) + ' - '
                : ''}
              {new Date(deal.expiresAt.seconds * 1000).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                deal.status === 'active'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {deal.status}
            </span>
          </div>
        </div>
        <button
          type="button"
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
                type="button"
                onClick={() => {
                  setEditDeal(deal);
                  setIsAddingDeal(false);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 transition-colors border border-gray-200 shadow-sm"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(deal.id, deal.status)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors shadow-sm ${
                  deal.status === 'active'
                    ? 'bg-red-100 hover:bg-red-200 text-red-600'
                    : 'bg-green-100 hover:bg-green-200 text-green-600'
                }`}
              >
                {deal.status === 'active' ? (
                  <>
                    <Ban className="h-4 w-4" />
                    Expire
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Activate
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDeal(deal.id)}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-600 transition-colors shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderPagination = (currentPage: number, setCurrentPage: (x: number)=>void) => {
    return (
      <div className='text-center p-2'>
          <button
              className="px-4 py-2 bg-gray-700 text-white rounded-md disabled:opacity-50 m-2"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
          >
              Previous
          </button>
          <span className="text-primary m-2">Page {currentPage} of {totalPages}</span>
          <button
              className="px-4 py-2 bg-gray-700 text-white rounded-md disabled:opacity-50 m-2"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
          >
              Next
          </button>
      </div>
    )
  }

  if (loading) {
    return (
      <ContentPreloader text="Loading deals..." />
    );
  }

  if (error) {
    return (
      <ContentErrorLoader text='Error Loading deals' message={error.message} />
    );
  }

  return (
    <div className="space-y-6" data-component="deal-management">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals..."
            className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 w-5 h-5 flex items-center justify-center text-lg leading-none"
              type="button"
            >
              ×
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <select
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            onChange={(e) => handleFilterChange('itemsPerPage', e.target.value)}
            defaultValue={itemsPerPage}
          >
            {[5, 10, 50, 100, 200, 500, 1000].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm"
          >
            <Filter className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAddingDeal(true);
              setEditDeal({ status: 'inactive' });
            }}
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors flex items-center gap-2 shadow"
          >
            <Plus className="h-5 w-5" />
            Add Deal
          </button>
        </div>
      </div>

      {/* Search Results Info */}
      {debouncedSearchQuery && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-800 text-sm">
            Searching for "<strong>{debouncedSearchQuery}</strong>"
            {totalDealsCount !== undefined && (
              <span> - {totalDealsCount} deals found</span>
            )}
          </p>
        </div>
      )}

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
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
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
                  onChange={(e) => handleFilterChange('brand', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
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
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Country Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
                >
                  <option value="all">All</option>
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
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
        <div className="hidden md:block overflow-x-auto bg-white rounded p-4">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="pb-3 text-gray-600 font-medium">::</th>
                <th className="pb-3 text-gray-600 font-medium">Image</th>
                <th className="pb-3 text-gray-600 font-medium">Brand</th>
                <th className="pb-3 text-gray-600 font-medium">Status</th>
                <th className="pb-3 text-gray-600 font-medium">Expires</th>
                <th className="pb-3 text-gray-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allAdminDeals.map((deal, index) => (
                <motion.tr
                  key={deal.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-gray-200"
                >
                  <td className="py-4 text-gray-800">
                    {((currentPage - 1) * itemsPerPage) + index + 1}
                  </td>
                  <td className="py-4 text-gray-800">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-white">
                      <img
                        src={deal.image ? deal.image : (deal as any).brandDetails?.logo}
                        alt={deal.brand}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="py-4 text-gray-800">
                    {deal.brand}
                    <br />
                    <span className="text-sm text-gray-500">{deal.category}</span>
                    <br />
                    <span className="text-sm text-gray-500">{deal.discount}</span>
                  </td>
                  <td className="py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        deal.status === 'active'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {deal.status}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-gray-700">
                    {(deal?.startsAt as any)?.seconds
                      ? new Date((deal.startsAt as any).seconds * 1000).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        ) + ' - '
                      : ''}
                    {new Date((deal.expiresAt as any).seconds * 1000).toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric', year: 'numeric' }
                    )}
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditDeal(deal);
                          setIsAddingDeal(false);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                      >
                        <Edit2 className="h-4 w-4 text-green-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(deal.id, deal.status)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                      >
                        {deal.status === 'active' ? (
                          <Ban className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDeal(deal.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {renderPagination(currentPage, setCurrentPage)}
        </div>


        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {allAdminDeals.map(deal => renderDealCard(deal))}
          <div className='bg-white rounded'>
          {renderPagination(currentPage, setCurrentPage)}
          </div>
        </div>
      </>

      {/* Add/Edit Deal Modal */}
      <AnimatePresence>
        {(isAddingDeal || editDeal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto shadow-xl"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {isAddingDeal ? 'Add Deal' : 'Edit Deal'}
              </h2>
              {renderDealForm()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}