/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Filter, Eye, ChevronDown, Power, Ban, CheckCircle } from 'lucide-react';
import { useBrands } from '@/lib/firebase/hooks';
import ContentPreloader from '../loaders/ContentPreloader';
import ContentErrorLoader from '../loaders/ContentErrorLoader';

interface BrandFilters {
  activeDeals: 'all' | 'active' | 'inactive';
  status: 'all' | 'active' | 'inactive';
}

export default function BrandManagement() {
  const { adminBrands, totalBrandsCount, fetchAdminBrands, loading, error, addBrand, updateBrand, deleteBrand, toggleBrandStatus } = useBrands();
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeDealsOnly, setActiveDealsOnly] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // PAGINATION 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [editBrand, setEditBrand] = useState<any>(null);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [newBrand, setNewBrand] = useState({
    name: '',
    logo: '',
    brandimg: '',
    description: '',
    activeDeals: 0,
    status: 'active'
  });

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const brandData = {
        ...newBrand,
        activeDeals: 0,
        // No longer defaulting brandimg to logo
        brandimg: newBrand.brandimg
      };

      await addBrand(brandData as any);

      setIsAddingBrand(false);
      setNewBrand({
        name: '',
        logo: '',
        brandimg: '',
        description: '',
        activeDeals: 0,
        status: 'inactive'
      });

      setEditBrand(null);
      // console.log(brandData);
    } catch (error) {
      console.error('Error adding brand:', error);
    }
  };
  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBrand) return;

    console.log(editBrand);
    
    try {
      // If brand has no active deals, it should be inactive
      const updatedBrand = {
        ...editBrand,
        status: editBrand.activeDeals === 0 ? 'inactive' : editBrand.status,
        brandimg: editBrand.brandimg
      };

      await updateBrand(updatedBrand.id, updatedBrand);
      setEditBrand(null);
    } catch (error) {
      console.error('Error updating brand:', error);
    }
  };
  const handleToggleStatus = async (brandId: string, currentStatus: 'active' | 'inactive') => {
    try {
      const brand = adminBrands.find(b => b.id === brandId)
      if (!brand) {
        alert("Brand not found");
        return;
      }

      // if (currentStatus === 'inactive' && brand.activeDeals === 0) {
      //   alert("Cannot activate brand with no active deals");
      //   return;
        
      // }
      await toggleBrandStatus(brandId, currentStatus);
    } catch (error) {
      console.error('Error toggling brand status:', error);
    }
  };
  const handleDeleteBrand = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      try {
        await deleteBrand(id);
      } catch (error) {
        console.error('Error deleting brand:', error);
      }
    }
  };

  useEffect(() => {
    fetchAdminBrands({
      searchTerm: searchQuery,
      status: selectedStatus,
      activeDealsOnly,
      selectedStatus,
      page: currentPage,
      pageSize: itemsPerPage,
    });
  }, [
    searchQuery, 
    selectedStatus, 
    currentPage, 
    fetchAdminBrands, 
    itemsPerPage, 
    activeDealsOnly
  ]);

  const totalPages = Math.ceil(totalBrandsCount / itemsPerPage);

  const renderBrandForm = () => (
    <form onSubmit={isAddingBrand ? handleAddBrand : handleUpdateBrand} className="space-y-4">
      {/* Brand Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Brand Name
        </label>
        <input
          type="text"
          value={isAddingBrand ? newBrand.name : editBrand.name}
          onChange={(e) =>
            isAddingBrand
              ? setNewBrand({ ...newBrand, name: e.target.value })
              : setEditBrand({ ...editBrand, name: e.target.value })
          }
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          required
        />
      </div>

      {/* Logo URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Logo URL
        </label>
        <input
          type="url"
          value={isAddingBrand ? newBrand.logo : editBrand.logo}
          onChange={(e) =>
            isAddingBrand
              ? setNewBrand({ ...newBrand, logo: e.target.value })
              : setEditBrand({ ...editBrand, logo: e.target.value })
          }
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          required
        />
      </div>

      {/* Banner URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Brand Banner Image URL
        </label>
        <input
          type="url"
          value={isAddingBrand ? newBrand.brandimg : editBrand.brandimg}
          onChange={(e) =>
            isAddingBrand
              ? setNewBrand({ ...newBrand, brandimg: e.target.value })
              : setEditBrand({ ...editBrand, brandimg: e.target.value })
          }
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
        />
      </div>

      {/* Status */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status <span className="text-red-500 text-xl">*</span>
          </label>
          <select
            value={isAddingBrand ? newBrand.status : editBrand?.status || ''}
            onChange={(e) =>
              isAddingBrand
                ? setNewBrand({ ...newBrand, status: e.target.value })
                : setEditBrand({ ...editBrand, status: e.target.value })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            required
          >
            <option value="">-select status-</option>
            <option value="inactive">inactive</option>
            <option value="active">active</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={isAddingBrand ? newBrand.description : editBrand.description}
          onChange={(e) =>
            isAddingBrand
              ? setNewBrand({ ...newBrand, description: e.target.value })
              : setEditBrand({ ...editBrand, description: e.target.value })
          }
          rows={3}
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          required
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => (isAddingBrand ? setIsAddingBrand(false) : setEditBrand(null))}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors shadow"
        >
          {isAddingBrand ? 'Add Brand' : 'Update Brand'}
        </button>
      </div>
    </form>
  );
  const renderBrandCard = (brand: any) => (
    <motion.div
      key={brand.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm ${
        brand.status === 'inactive' ? 'text-red-600' : 'text-gray-800'
      }`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-gray-200">
          <img
            src={brand.logo}
            alt={brand.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold mb-1">{brand.name}</h3>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                brand.status === 'active'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {brand.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full font-medium">
              {brand.activeDeals} Active Deals
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpandedBrand(expandedBrand === brand.id ? null : brand.id)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform ${
              expandedBrand === brand.id ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <AnimatePresence>
        {expandedBrand === brand.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <p className="text-gray-600 text-sm">{brand.description}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEditBrand(brand)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 transition-colors border border-gray-200 shadow-sm"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => handleToggleStatus(brand.id, brand.status)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors shadow-sm ${
                  brand.status === 'inactive'
                    ? 'bg-green-100 hover:bg-green-200 text-green-600'
                    : 'bg-red-100 hover:bg-red-200 text-red-600'
                }`}
              >
                <Power className="h-4 w-4" />
                {brand.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleDeleteBrand(brand.id)}
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
  // Update the desktop view status toggle
  const renderDesktopStatusToggle = (brand: any) => (
    <button
    onClick={() => handleToggleStatus(brand.id, brand.status)}
    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
  >
    {brand.status === 'active' ? (
      <Ban className="h-4 w-4 text-green-500" />
    ) : (
      <Ban className="h-4 w-4 text-red-500" />
    )}
  </button>
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
      <ContentPreloader text="Loading brands..." />
    );
  }

  if (error) {
    return (
      <ContentErrorLoader text='Error Loading brands' message={error.message} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brands..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <select
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            onChange={(e) => setItemsPerPage(e.target.value as any)}
            defaultValue={itemsPerPage}
          >
            {[5, 10, 50, 100, 200, 500, 1000].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm"
          >
            <Filter className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              setIsAddingBrand(true);
              setEditBrand(null);
            }}
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors flex items-center gap-2 shadow"
          >
            <Plus className="h-5 w-5" />
            Add Brand
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Active Deals Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Active Deals
                </label>
                <select
                  value={activeDealsOnly}
                  onChange={(e) =>
                    setActiveDealsOnly(e.target.value as BrandFilters['activeDeals'])
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value as BrandFilters['status'])
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
                <th className="pb-3 text-gray-600 font-medium">Name</th>
                <th className="pb-3 text-gray-600 font-medium">Active Deals</th>
                <th className="pb-3 text-gray-600 font-medium">Status</th>
                <th className="pb-3 text-gray-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminBrands.map((brand, index) => (
                <motion.tr
                  key={brand.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-gray-200"
                >
                  <td className='py-4 text-gray-800'>
                    {(index+1)}
                  </td>
                  <td className="py-4 text-gray-800">
                    {brand.name}
                    <br />
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white mt-2 border border-gray-200">
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="py-4 text-gray-800">{brand.activeDeals}</td>
                  <td className="py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        brand.status === 'active'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {brand.status}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditBrand(brand)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                      >
                        <Edit2 className="h-4 w-4 text-green-600" />
                      </button>
                      {renderDesktopStatusToggle(brand)}
                      <button
                        onClick={() => handleDeleteBrand(brand.id)}
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
          {adminBrands.map(brand => renderBrandCard(brand))}
          <div className='bg-white rounded'>
          {renderPagination(currentPage, setCurrentPage)}
          </div>
        </div>
      </>

      {/* Add/Edit Brand Modal */}
      <AnimatePresence>
        {(isAddingBrand || editBrand) && (
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
              className="bg-white rounded-xl p-6 w-full max-w-md m-4 shadow-xl"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {isAddingBrand ? 'Add Brand' : 'Edit Brand'}
              </h2>
              {renderBrandForm()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}