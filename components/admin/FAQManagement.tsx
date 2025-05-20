"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Filter, X, ChevronDown, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useFAQs } from '@/lib/firebase/hooks';
import type { FAQ } from '@/lib/firebase/collections';
import ContentPreloader from '../loaders/ContentPreloader';
import ContentErrorLoader from '../loaders/ContentErrorLoader';

interface FAQFilters {
  category: string;
  status: 'all' | 'published' | 'draft';
}

export default function FAQManagement() {
  const { faqs, loading, error, addFAQ, updateFAQ, deleteFAQ } = useFAQs();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FAQFilters>({
    category: 'all',
    status: 'all'
  });

  // PAGINATION 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Get unique categories for filters
  const categories = ['all', ...new Set(faqs.map(faq => faq.category))];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFAQ) return;

    setSaveStatus('saving');
    try {
      if (editingFAQ.id) {
        let id = editingFAQ.id
        delete editingFAQ.id;
        await updateFAQ(id, editingFAQ);
      } else {
        delete editingFAQ.id;
        await addFAQ({
          question: editingFAQ.question,
          answer: editingFAQ.answer,
          category: editingFAQ.category,
          order: faqs.length,
          status: editingFAQ.status
        });
      }
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setEditingFAQ(null);
      }, 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      try {
        await deleteFAQ(id);
      } catch (error) {
        console.error('Error deleting FAQ:', error);
      }
    }
  };

  // Filter FAQs based on search and filters
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filters.category === 'all' || faq.category === filters.category;
    const matchesStatus = filters.status === 'all' || faq.status === filters.status;

    return matchesSearch && matchesCategory && matchesStatus;
  });
  
  const totalPages = Math.ceil(filteredFAQs.length / itemsPerPage);
  const paginatedFAQs = filteredFAQs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderFAQForm = () => (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Question */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question
        </label>
        <input
          type="text"
          value={editingFAQ?.question || ''}
          onChange={(e) =>
            setEditingFAQ((prev) => (prev ? { ...prev, question: e.target.value } : null))
          }
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
          required
        />
      </div>

      {/* Answer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Answer
        </label>
        <textarea
          value={editingFAQ?.answer || ''}
          onChange={(e) =>
            setEditingFAQ((prev) => (prev ? { ...prev, answer: e.target.value } : null))
          }
          rows={4}
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
          required
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <input
          type="text"
          value={editingFAQ?.category || ''}
          onChange={(e) =>
            setEditingFAQ((prev) => (prev ? { ...prev, category: e.target.value } : null))
          }
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
          required
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          value={editingFAQ?.status || 'draft'}
          onChange={(e) =>
            setEditingFAQ((prev) =>
              prev ? { ...prev, status: e.target.value as 'published' | 'draft' } : null
            )
          }
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditingFAQ(null)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saveStatus === 'saving'}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 ${
            saveStatus === 'saving'
              ? 'bg-gray-400 cursor-not-allowed'
              : saveStatus === 'success'
              ? 'bg-green-600 hover:bg-green-700'
              : saveStatus === 'error'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-secondary hover:bg-secondary-dark'
          }`}
        >
          {saveStatus === 'saving' && (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          )}
          {saveStatus === 'success' && <CheckCircle className="h-5 w-5" />}
          {saveStatus === 'error' && <AlertCircle className="h-5 w-5" />}
          {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
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
      <ContentPreloader text="Loading FAQs..." />
    );
  }

  if (error) {
    return (
      <ContentErrorLoader text='Error Loading FAQs' message={error.message} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          {/* Items Per Page Dropdown */}
          <select
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            onChange={(e) => setItemsPerPage(e.target.value as any)}
            defaultValue={itemsPerPage}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
          </select>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
          >
            <Filter className="h-5 w-5" />
          </button>

          {/* Add FAQ Button */}
          <button
            onClick={() =>
              setEditingFAQ({
                id: '',
                question: '',
                answer: '',
                category: '',
                order: faqs.length,
                status: 'draft',
                createdAt: new Date(),
                updatedAt: new Date(),
              })
            }
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Add FAQ
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
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4 shadow-sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
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
                    setFilters({
                      ...filters,
                      status: e.target.value as FAQFilters['status'],
                    })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
                >
                  <option value="all">All</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQ List or Editor */}
      {editingFAQ ? (
        renderFAQForm()
      ) : (
        <div className="space-y-4">
          {paginatedFAQs.map((faq: any) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{faq.question}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 font-medium rounded-full">
                      {faq.category}
                    </span>
                    <span
                      className={`text-sm px-2 py-1 rounded-full font-medium ${
                        faq.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {faq.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 transition-transform ${
                      expandedFAQ === faq.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            
              <AnimatePresence>
                {expandedFAQ === faq.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <p className="text-gray-700">{faq.answer}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setEditingFAQ(faq)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(faq.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          <div className='bg-white rounded'>
              {renderPagination(currentPage, setCurrentPage)}
          </div>
        </div>
      )}
    </div>
  );
}