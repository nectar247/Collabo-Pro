/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Search, Filter, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useProfile } from '@/lib/firebase/hooks';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Deal } from '@/lib/firebase/collections';
import Preloader from '@/components/loaders/preloader';
import ErrorLoader from '@/components/loaders/ErrorLoader';
import { DealCard1 } from '@/components/deals/card';
import Navigation from "@/components/navigation";

export default function SavedDealsPage() {
  const { user, loading: authLoading } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const {savedDeals, savedUnsaveDeals, loading, error} = useProfile();

  useEffect(()=>{
      let deals = [] as Deal[];
      savedDeals.forEach((el: any)=>{
        deals.push(el.dealData);
      })
      setDeals(deals);
  },[savedDeals])

  if (loading) {
    return <Preloader text="Loading saved deals..." />;
  }

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center">
          <div className="text-center">
            <Heart className="h-16 w-16 text-primary dark:text-gray-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-primary dark:text-white mb-4">Sign in to view saved deals</h1>
            <p className="text-gray-800 dark:text-gray-400 mb-8">Create an account or sign in to save and manage your favorite deals.</p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/sign-in"
                className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-6 py-3 border shadow bg-green-100 dark:bg-white/10 dark:hover:bg-white/20 text-dark-800 dark:text-white rounded-lg dark:transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
    </>
    );
  }

  if (error) {
    return <ErrorLoader text="Error Loading Deals" message={error.message} />;
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto mb-12">
            <h1 className="text-3xl font-bold text-primary text-center dark:text-white mb-4">Saved Deals</h1>
            <p className="text-gray-800 dark:text-gray-400 text-center">
              {deals.length} {deals.length === 1 ? 'deal' : 'deals'} saved
            </p>
          </div>

          {deals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
              {deals.map((deal) => (
                deal && <DealCard1 deal={deal} key={deal.id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Heart className="h-16 w-16 text-primary dark:text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-primary dark:text-white mb-2">No saved deals yet</h2>
              <p className="text-gray-800 dark:text-gray-400 mb-8">
                Start saving deals by clicking the heart icon on any deal you like.
              </p>
              <Link
                href="/deals"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors"
              >
                Browse Deals
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          )}
        </div>
      </main>
  </>
  );
}