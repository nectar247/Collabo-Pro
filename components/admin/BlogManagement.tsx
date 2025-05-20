/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Filter, Eye, Bold, Italic, Link as LinkIcon, List, ListOrdered, X, ChevronDown, Save } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import type { BlogPost } from '@/lib/firebase/collections';
import { useBlogPosts } from '@/lib/firebase/hooks';
import ContentPreloader from '../loaders/ContentPreloader';
import ContentErrorLoader from '../loaders/ContentErrorLoader';

type ViewMode = 'list' | 'add' | 'edit' | 'view';

interface PostFilters {
  category: string;
  author: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
  status: 'all' | 'draft' | 'publish';
}

export default function BlogManagement() {
  const { posts, loading, error, addPost, deletePost, updatePost } = useBlogPosts();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PostFilters>({
    category: 'all',
    author: 'all',
    dateRange: 'all',
    status: 'all'
  });

  // PAGINATION 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [editPost, setEditPost] = useState({
    title: '',
    excerpt: '',
    content: '',
    image: '',
    category: '',
    author: '',
    readTime: '',
    status: 'draft' as 'draft' | 'publish'
  });
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  // Get unique categories and authors for filters
  const categories = ['all', ...new Set(posts.map(post => post.category))];
  const authors = ['all', ...new Set(posts.map(post => post.author))];

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary hover:text-primary-dark underline',
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (viewMode === 'add') {
        setEditPost(prev => ({
          ...prev,
          content: editor.getHTML()
        }));
      }
    },
  });

  // Update editor content when switching to edit mode
  useEffect(() => {
    if (viewMode === 'edit' && selectedPost) {
      editor?.commands.setContent(selectedPost.content);
    } else if (viewMode === 'add') {
      editor?.commands.setContent('');
    }
  }, [viewMode, selectedPost, editor]);

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addPost({
        ...editPost,
        content: editor?.getHTML() || '',
        date: new Date(),
      });
      
      setViewMode('list');
      editor?.commands.setContent('');
      setEditPost({
        title: '',
        excerpt: '',
        content: '',
        image: '',
        category: '',
        author: '',
        readTime: '',
        status: 'draft'
      });
    } catch (error) {
      console.error('Error adding post:', error);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;

    try {
      await updatePost(selectedPost.id, {
        ...editPost,
        content: editor?.getHTML() || '',
        updatedAt: new Date()
      });
      
      setViewMode('list');
      setSelectedPost(null);
      editor?.commands.setContent('');
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(id);
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleEditClick = (post: BlogPost) => {
    setSelectedPost(post);
    setEditPost({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      image: post.image,
      category: post.category,
      author: post.author,
      readTime: post.readTime,
      status: post.status
    });
    setViewMode('edit');
  };

  const handleViewClick = (post: BlogPost) => {
    setSelectedPost(post);
    setViewMode('view');
  };

  // Filter and search posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filters.category === 'all' || post.category === filters.category;
    const matchesAuthor = filters.author === 'all' || post.author === filters.author;
    
    let matchesDate = true;
    const postDate = new Date(post.date);
    const now = new Date();
    
    switch (filters.dateRange) {
      case 'today':
        matchesDate = postDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        matchesDate = postDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        matchesDate = postDate >= monthAgo;
        break;
    }

    return matchesSearch && matchesCategory && matchesAuthor && matchesDate;
  });
  
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderPostCard = (post: BlogPost) => (
    <motion.div
      key={post.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>
          <p className="text-sm text-gray-600">{post.author}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">
              {new Date(post.date).toLocaleDateString()}
            </span>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {post.category}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                post.status === 'publish'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-yellow-100 text-yellow-600'
              }`}
            >
              {post.status}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform ${
              expandedPost === post.id ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <AnimatePresence>
        {expandedPost === post.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <p className="text-sm text-gray-700">{post.excerpt}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedPost(post);
                  setViewMode('view');
                }}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 transition-colors border border-gray-300 shadow-sm"
              >
                <Eye className="h-4 w-4" />
                View
              </button>
              <button
                onClick={() => {
                  setSelectedPost(post);
                  setEditPost({
                    title: post.title,
                    excerpt: post.excerpt,
                    content: post.content,
                    image: post.image,
                    category: post.category,
                    author: post.author,
                    readTime: post.readTime,
                    status: post.status,
                  });
                  setViewMode('edit');
                }}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 transition-colors border border-gray-300 shadow-sm"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => handleDeletePost(post.id)}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 transition-colors border border-red-200 shadow-sm"
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
      <ContentPreloader text="Loading blogs..." />
    );
  }

  if (error) {
    return (
      <ContentErrorLoader text='Error Loading blogs' message={error.message} />
    );
  }

  const renderPostForm = (onSubmit: (e: React.FormEvent) => Promise<void>) => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 border border-gray-200 shadow-md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Title"
            value={editPost.title}
            onChange={(e) => setEditPost({ ...editPost, title: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            required
          />
          <input
            type="text"
            placeholder="Category"
            value={editPost.category}
            onChange={(e) => setEditPost({ ...editPost, category: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            required
          />
          <input
            type="text"
            placeholder="Author"
            value={editPost.author}
            onChange={(e) => setEditPost({ ...editPost, author: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            required
          />
          <input
            type="text"
            placeholder="Read Time (e.g., 5 min)"
            value={editPost.readTime}
            onChange={(e) => setEditPost({ ...editPost, readTime: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            required
          />
          <input
            type="text"
            placeholder="Image URL"
            value={editPost.image}
            onChange={(e) => setEditPost({ ...editPost, image: e.target.value })}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            required
          />
          <div className="col-span-2 md:col-span-1">
            <select
              value={editPost.status}
              onChange={(e) =>
                setEditPost({ ...editPost, status: e.target.value as 'draft' | 'publish' })
              }
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            >
              <option value="draft">Draft</option>
              <option value="publish">Publish</option>
            </select>
          </div>
        </div>

        {/* Excerpt */}
        <textarea
          placeholder="Excerpt"
          value={editPost.excerpt}
          onChange={(e) => setEditPost({ ...editPost, excerpt: e.target.value })}
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
          rows={2}
          required
        />

        {/* WYSIWYG Toolbar */}
        <div className="flex flex-wrap gap-2 p-2 bg-gray-100 rounded-t-lg border-b border-gray-300">
          {[
            { icon: <Bold className="h-5 w-5" />, action: 'toggleBold', is: 'bold' },
            { icon: <Italic className="h-5 w-5" />, action: 'toggleItalic', is: 'italic' },
            {
              icon: <LinkIcon className="h-5 w-5" />,
              action: () => {
                const url = window.prompt('Enter URL');
                if (url) editor?.chain().focus().setLink({ href: url }).run();
              },
              is: 'link',
            },
            { icon: <List className="h-5 w-5" />, action: 'toggleBulletList', is: 'bulletList' },
            { icon: <ListOrdered className="h-5 w-5" />, action: 'toggleOrderedList', is: 'orderedList' },
          ].map((btn, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() =>
                typeof btn.action === 'string'
                  ? (editor as any)?.chain().focus()[btn.action]().run()
                  : btn.action()
              }
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor?.isActive(btn.is) ? 'bg-gray-200 text-primary' : 'text-gray-700'
              }`}
            >
              {btn.icon}
            </button>
          ))}
        </div>

        {/* WYSIWYG Content */}
        <div className="min-h-[200px] bg-primary border border-gray-300 rounded-b-lg overflow-hidden">
          <EditorContent
            editor={editor}
            className="p-4 text-gray-800 prose max-w-none"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              setSelectedPost(null);
              editor?.commands.clearContent();
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 flex items-center bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow"
          >
            <Save className="h-5 w-5 mr-2" />
            {editPost.status === 'draft' ? 'Save as Draft' : 'Publish Now'}
          </button>
        </div>
      </form>
    </motion.div>
  );

  const renderPostView = () => {
    if (!selectedPost) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 border border-gray-200 shadow-md"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{selectedPost.title}</h2>
          <button
            onClick={() => {
              setViewMode('list');
              setSelectedPost(null);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6">
          {/* Meta & Image */}
          <div className="flex items-center gap-4">
            <img
              src={selectedPost.image}
              alt={selectedPost.title}
              className="w-32 h-32 object-cover rounded-lg border border-gray-200"
            />
            <div className="text-sm space-y-1">
              <p className="text-gray-600">Author: <span className="font-medium text-gray-800">{selectedPost.author}</span></p>
              <p className="text-gray-600">Category: <span className="font-medium text-gray-800">{selectedPost.category}</span></p>
              <p className="text-gray-600">Read Time: <span className="font-medium text-gray-800">{selectedPost.readTime}</span></p>
              <p className="text-gray-600">
                Published: <span className="font-medium text-gray-800">
                  {new Date(selectedPost.date).toLocaleDateString()}
                </span>
              </p>
            </div>
          </div>

          {/* Excerpt */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Excerpt</h3>
            <p className="text-gray-700">{selectedPost.excerpt}</p>
          </div>

          {/* Content */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Content</h3>
            <div
              className="prose max-w-none bg-primary p-4 rounded"
              dangerouslySetInnerHTML={{ __html: selectedPost.content }}
            />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      {viewMode === 'list' && (
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
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
              onClick={() => setViewMode('add')}
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors flex items-center gap-2 shadow"
            >
              <Plus className="h-5 w-5" />
              Add Post
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <AnimatePresence>
        {showFilters && viewMode === 'list' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 shadow-sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

              {/* Author Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author
                </label>
                <select
                  value={filters.author}
                  onChange={(e) => setFilters({ ...filters, author: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                >
                  {authors.map((author) => (
                    <option key={author} value={author}>
                      {author.charAt(0).toUpperCase() + author.slice(1)}
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
                    setFilters({ ...filters, status: e.target.value as PostFilters['status'] })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                >
                  <option value="all">All</option>
                  <option value="publish">Published</option>
                  <option value="draft">Draft</option>
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
                    setFilters({
                      ...filters,
                      dateRange: e.target.value as PostFilters['dateRange'],
                    })
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
      {viewMode === 'list' && (
        <>
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto bg-white rounded p-4">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="pb-3 text-gray-600 font-medium">Title</th>
                  <th className="pb-3 text-gray-600 font-medium">Author</th>
                  <th className="pb-3 text-gray-600 font-medium">Category</th>
                  <th className="pb-3 text-gray-600 font-medium">Date</th>
                  <th className="pb-3 text-gray-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPosts.map((post) => (
                  <motion.tr
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-200"
                  >
                    <td className="py-4 text-gray-800">{post.title}</td>
                    <td className="py-4 text-gray-800">{post.author}</td>
                    <td className="py-4 text-gray-800">{post.category}</td>
                    <td className="py-4 text-gray-700">
                      {new Date(post.date).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewClick(post)}
                          className="p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleEditClick(post)}
                          className="p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
                        >
                          <Edit2 className="h-4 w-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
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
            {paginatedPosts.map(post => renderPostCard(post))}
            <div className='bg-white rounded'>
            {renderPagination(currentPage, setCurrentPage)}
            </div>
          </div>
        </>
      )}

      {viewMode === 'add' && renderPostForm(handleAddPost)}
      {viewMode === 'edit' && renderPostForm(handleUpdatePost)}
      {viewMode === 'view' && renderPostView()}
    </div>
  );
}