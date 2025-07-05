/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Filter, Eye, ChevronDown, Ban, CheckCircle } from 'lucide-react';
import { useCategories } from '@/lib/firebase/hooks';
import Preloader from '../loaders/preloader';
import ErrorLoader from '../loaders/ErrorLoader';
import { DynamicIcon, renderIconSelect } from '@/helper';
import ContentPreloader from '../loaders/ContentPreloader';
import ContentErrorLoader from '../loaders/ContentErrorLoader';

interface CategoryFilters {
  name: string;
  status: 'all' | 'active' | 'inactive';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export default function CategoryManagement() {
  const { allCategories: categories, loading, error, addCategory, updateCategory, toggleCategoryStatus, deleteCategory } = useCategories();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<CategoryFilters>({
    name: 'all',
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
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);



  // Reset to first page when search changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      setCurrentPage(1);
    }
  }, [debouncedSearchQuery]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCategory({
        ...editCategory,
        createdAt: new Date(),
        });
      setIsAddingCategory(false);
      setEditCategory(null);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategory) return;

    try {
      const { id, createdAt, updatedAt, ...updateData } = editCategory;
      await updateCategory(id, {
        ...updateData,
      });
      setEditCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(id);
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: 'active' | 'inactive') => {
    try {
      await toggleCategoryStatus(id, currentStatus);
    } catch (error) {
      console.error('Error toggling category status:', error);
    }
  };

  // Filter categories based on search and filters
  const filteredCategories = categories.filter(category => {

    const matchesSearch = 
      category.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

    const matchesStatus = filters.status === 'all' || category.status === filters.status;
    
    let matchesDate = true;
    const categoryDate = category.createdAt ? new Date(((category.createdAt as any).seconds as any) * 1000): new Date();
    // const categoryDate = new Date(category.createdAt?.seconds * 1000); //Sets createdAt to undefined if false
    const now = new Date();
    
    switch (filters.dateRange) {
      case 'today':
        matchesDate = categoryDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        matchesDate = categoryDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        matchesDate = categoryDate >= monthAgo;
        break;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const paginatedCategories = filteredCategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderCategoryForm = () => (
    <form
      onSubmit={isAddingCategory ? handleAddCategory : handleUpdateCategory}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            value={editCategory?.name || ''}
            onChange={(e) =>
              setEditCategory({ ...editCategory, name: e.target.value })
            }
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Icon
          </label>
          {renderIconSelect(editCategory.icon, (icon) =>
            setEditCategory({ ...editCategory, icon: icon })
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={editCategory?.description || ''}
          onChange={(e) =>
            setEditCategory({ ...editCategory, description: e.target.value })
          }
          rows={3}
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setIsAddingCategory(false);
            setEditCategory(null);
          }}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors shadow"
        >
          {isAddingCategory ? 'Add Category' : 'Update Category'}
        </button>
      </div>
    </form>
  );

  const renderCategoryCard = (category: any) => (
    <motion.div
      key={category.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
          <DynamicIcon name={category.icon} color='text-primary' />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{category.name}</h3>
          <p className="text-sm text-gray-600">{category.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                category.status === 'active'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {category.status}
            </span>
          </div>
        </div>
        <button
          onClick={() =>
            setExpandedCategory(expandedCategory === category.id ? null : category.id)
          }
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform ${
              expandedCategory === category.id ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <AnimatePresence>
        {expandedCategory === category.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <p className="text-gray-600 text-sm">{category.description}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setEditCategory(category);
                  setIsAddingCategory(false);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 transition-colors border border-gray-200"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => handleToggleStatus(category.id, category.status)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  category.status === 'active'
                    ? 'bg-red-100 hover:bg-red-200 text-red-600'
                    : 'bg-green-100 hover:bg-green-200 text-green-600'
                }`}
              >
                {category.status === 'active' ? (
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
                onClick={() => handleDeleteCategory(category.id)}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-600 transition-colors"
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
    return <ContentPreloader text="Loading categories..." />;
  }

  if (error) {
    return <ContentErrorLoader text='Error Loading Categories' message={error.message} />;
  }

  return (
    <div className="space-y-6" data-component="category-management">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1 relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
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
        <div className="flex gap-2">
          <select
            className="bg-white border border-gray-300 rounded-lg text-gray-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
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
              setIsAddingCategory(true);
              setEditCategory({});
            }}
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors flex items-center gap-2 shadow"
          >
            <Plus className="h-5 w-5" />
            Add Category
          </button>
        </div>
      </div>

      {/* Search Results Info */}
      {debouncedSearchQuery && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-800 text-sm">
            Searching for "<strong>{debouncedSearchQuery}</strong>"
            {filteredCategories.length !== undefined && (
              <span> - {filteredCategories.length} categories found</span>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as CategoryFilters['status'] })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters({ ...filters, dateRange: e.target.value as CategoryFilters['dateRange'] })
                  }
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

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto bg-white rounded p-4">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="pb-3 text-gray-600 font-medium">Icon</th>
              <th className="pb-3 text-gray-600 font-medium">Name</th>
              <th className="pb-3 text-gray-600 font-medium">Deal Count</th>
              <th className="pb-3 text-gray-600 font-medium">Status</th>
              <th className="pb-3 text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCategories.map((category) => (
              <motion.tr
                key={category.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-gray-200"
              >
                <td className="py-4 text-gray-800">
                  <DynamicIcon name={category.icon} color='text-primary' />
                </td>
                <td className="py-4 text-gray-800">
                  {category.name}
                  <br />
                  <span className="text-sm text-gray-500">{category.description}</span>
                </td>
                <td className="py-4 text-gray-800">{category.dealCount}</td>
                <td className="py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      category.status === 'active'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {category.status}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditCategory(category);
                        setIsAddingCategory(false);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <Edit2 className="h-4 w-4 text-green-600" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(category.id, category.status)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      {category.status === 'active' ? (
                        <Ban className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
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
        {paginatedCategories.map(category => renderCategoryCard(category))}
        <div className='bg-white rounded'>
        {renderPagination(currentPage, setCurrentPage)}
        </div>
      </div>

      {/* Add/Edit Category Modal */}
      <AnimatePresence>
        {(isAddingCategory || editCategory) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto shadow-xl"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {isAddingCategory ? 'Add Category' : 'Edit Category'}
              </h2>
              {renderCategoryForm()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}