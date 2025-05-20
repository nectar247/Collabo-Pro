"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, MoreVertical, Mail, Ban, Shield, Check, X, User, CheckCircle, ChevronDown } from 'lucide-react';
import { UserInterface, useUsers } from '@/lib/firebase/hooks';
import ContentErrorLoader from '../loaders/ContentErrorLoader';
import ContentPreloader from '../loaders/ContentPreloader';

interface UserFilters {
  status: 'all' | 'active' | 'inactive';
  role: 'all' | 'admin' | 'user';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

interface User__ {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  isAdmin: boolean;
  joinDate: string;
  lastLogin: string;
}

interface EditUserData {
  name: string;
  email: string;
  password?: string;
}

interface EmailModalProps {
  userId: string;
  userEmail: string;
  onClose: () => void;
  onSend: (subject: string, message: string) => Promise<void>;
}

function EmailModal({ userId, userEmail, onClose, onSend }: EmailModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await onSend(subject, message);
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-800 rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Send Email</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              To
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-4 py-2 bg-gray-800 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function UserManagement() {
  const { users, loading, error, updateUserStatus, sendEmailToUser, updateUser, updateUserRole } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({
    status: 'all',
    role: 'all',
    dateRange: 'all'
  });

  // PAGINATION 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<User__ | null>(null);
  const [editData, setEditData] = useState<EditUserData>({
    name: '',
    email: '',
    password: ''
  });
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Filter users based on search query and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filters.status === 'all' || user.status === filters.status;
    const matchesRole = filters.role === 'all' || 
      (filters.role === 'admin' ? user.isAdmin : !user.isAdmin);
    
    let matchesDate = true;
    const joinDate = new Date(user.joinDate);
    const now = new Date();
    
    switch (filters.dateRange) {
      case 'today':
        matchesDate = joinDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        matchesDate = joinDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        matchesDate = joinDate >= monthAgo;
        break;
    }

    return matchesSearch && matchesStatus && matchesRole && matchesDate;
  }) as any;

  
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateUser(editingUser.id, editData);
      setEditingUser(null);
      setEditData({ name: '', email: '', password: '' });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleToggleRole = async (userId: string, currentIsAdmin: boolean) => {
    try {
      await updateUserRole(userId, !currentIsAdmin);
      setShowActionMenu(null);
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: 'active' | 'inactive') => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateUserStatus(userId, newStatus);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const renderUserCard = (user: User__) => (
    <motion.div
      key={user.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>
        <button
          onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
        >
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform ${
              expandedUser === user.id ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Status and Role Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            user.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {user.status}
        </span>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            user.isAdmin
              ? 'bg-primary/10 text-primary'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {user.isAdmin ? 'Admin' : 'User'}
        </span>
      </div>

      {/* Expanded Info */}
      <AnimatePresence>
        {expandedUser === user.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="text-sm text-gray-700">
              <p>Joined: {new Date(user.joinDate).toLocaleDateString()}</p>
              <p>Last Login: {new Date(user.lastLogin).toLocaleDateString()}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleToggleRole(user.id, user.isAdmin)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 transition-colors border border-gray-300 shadow-sm"
              >
                <Shield className="h-4 w-4" />
                {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
              </button>
              <button
                onClick={() => handleStatusToggle(user.id, user.status)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border shadow-sm ${
                  user.status === 'active'
                    ? 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200'
                    : 'bg-green-100 hover:bg-green-200 text-green-700 border-green-200'
                }`}
              >
                {user.status === 'active' ? (
                  <>
                    <Ban className="h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Activate
                  </>
                )}
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
      <ContentPreloader text="Loading users..." />
    );
  }

  if (error) {
    return (
      <ContentErrorLoader text='Error Loading users' message={error.message} />
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
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2">
          <select
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-sm"
            onChange={(e) => setItemsPerPage(e.target.value as any)}
            defaultValue={itemsPerPage}
          >
            {[5, 10, 50, 100, 200, 500, 1000].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as UserFilters['status'] })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={filters.role}
                  onChange={(e) =>
                    setFilters({ ...filters, role: e.target.value as UserFilters['role'] })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                >
                  <option value="all">All</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
              </div>

              {/* Join Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Join Date
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters({ ...filters, dateRange: e.target.value as UserFilters['dateRange'] })
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

      {/* Desktop View */}
      {/* Users Table */}
      <div className="hidden md:block overflow-x-auto bg-white rounded p-4">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="pb-3 text-gray-600 font-medium">Name</th>
              <th className="pb-3 text-gray-600 font-medium">Email</th>
              <th className="pb-3 text-gray-600 font-medium">Status</th>
              <th className="pb-3 text-gray-600 font-medium">Role</th>
              <th className="pb-3 text-gray-600 font-medium">Join Date</th>
              <th className="pb-3 text-gray-600 font-medium">Last Login</th>
              <th className="pb-3 text-gray-600 font-medium">Deals</th>
              <th className="pb-3 text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user: any) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-gray-200"
              >
                <td className="py-4 text-gray-800">{user.name}</td>
                <td className="py-4 text-gray-800">{user.email}</td>
                <td className="py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="py-4">
                  {user.isAdmin ? (
                    <span className="flex items-center gap-1 text-secondary font-medium">
                      <Shield className="h-4 w-4" />
                      Admin
                    </span>
                  ) : (
                    <span className="text-gray-500">User</span>
                  )}
                </td>
                <td className="py-4 text-gray-700">{new Date(user.joinDate).toLocaleDateString()}</td>
                <td className="py-4 text-gray-700">{new Date(user.lastLogin).toLocaleDateString()}</td>
                <td className="py-4 text-gray-700">{user.dealsRedeemed}</td>
                <td className="py-4 relative">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedUserId(user.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                    >
                      <Mail className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleStatusToggle(user.id, user.status)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                    >
                      {user.status === 'active' ? (
                        <Ban className="h-4 w-4 text-red-600" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setShowActionMenu(showActionMenu === user.id ? null : user.id)
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-500" />
                    </button>

                    {/* Action Menu */}
                    <AnimatePresence>
                      {showActionMenu === user.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
                        >
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setEditData({
                                name: user.name,
                                email: user.email,
                                password: '',
                              });
                              setShowActionMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors"
                          >
                            <User className="h-4 w-4" />
                            Edit Profile
                          </button>
                          <button
                            onClick={() => handleToggleRole(user.id, user.isAdmin)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors"
                          >
                            <Shield className="h-4 w-4" />
                            {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {renderPagination(currentPage, setCurrentPage)}
      </div>



      {/* Mobile View */}
      {/* Users Table */}
      <div className="md:hidden space-y-4">
        {filteredUsers.map((user: any) => renderUserCard(user))}
        <div className='bg-white rounded'>
          {renderPagination(currentPage, setCurrentPage)}
        </div>
      </div>

      {/* Email Modal */}
      <AnimatePresence>
        {selectedUserId && (
          <EmailModal
            userId={selectedUserId}
            userEmail={users.find(u => u.id === selectedUserId)?.email || ''}
            onClose={() => setSelectedUserId(null)}
            onSend={async (subject, message) => {
              await sendEmailToUser(selectedUserId, subject, message);
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
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
              className="bg-white rounded-xl p-6 w-full max-w-md m-4 shadow-lg border border-gray-200"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit User</h2>

              <form onSubmit={handleEditUser} className="space-y-4">
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                    required
                  />
                </div>

                {/* Email Field (disabled) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-gray-500 text-sm">~ disabled</span>
                  </label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 placeholder-gray-500 focus:outline-none cursor-not-allowed"
                    required
                    disabled
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);
                      setEditData({ name: '', email: '', password: '' });
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}