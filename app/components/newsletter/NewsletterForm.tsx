"use client";

import { useState } from 'react';
import { Send, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [preferences, setPreferences] = useState({
    dailyDeals: true,
    weeklyNewsletter: true,
    specialOffers: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus('success');
      // Reset form after success
      setTimeout(() => {
        setStatus('idle');
        setEmail('');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            disabled={status === 'loading'}
            required
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="absolute right-2 top-2 p-2 rounded-lg bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.dailyDeals}
              onChange={(e) => setPreferences({ ...preferences, dailyDeals: e.target.checked })}
              className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary"
            />
            Daily Deals Alert
          </label>
          <label className="flex items-center gap-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.weeklyNewsletter}
              onChange={(e) => setPreferences({ ...preferences, weeklyNewsletter: e.target.checked })}
              className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary"
            />
            Weekly Newsletter
          </label>
          <label className="flex items-center gap-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.specialOffers}
              onChange={(e) => setPreferences({ ...preferences, specialOffers: e.target.checked })}
              className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary"
            />
            Special Offers
          </label>
        </div>

        <AnimatePresence>
          {status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex items-center gap-2 p-4 rounded-xl ${
                status === 'success'
                  ? 'bg-green-500/10 text-green-500'
                  : status === 'error'
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-white/10 text-white'
              }`}
            >
              {status === 'loading' && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
              )}
              {status === 'success' && <CheckCircle className="h-5 w-5" />}
              {status === 'error' && <XCircle className="h-5 w-5" />}
              <span>
                {status === 'loading' && 'Subscribing...'}
                {status === 'success' && 'Successfully subscribed!'}
                {status === 'error' && 'Something went wrong. Please try again.'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}