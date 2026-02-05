"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { firebaseCache } from '@/lib/firebase/cache';
import type { Category, Brand, SystemSettings, ContentSection } from '@/lib/firebase/collections';

interface CachedData {
  categories: Category[];
  footerBrands: Brand[];
  settings: SystemSettings | null;
  dynamicLinks: ContentSection[];
  loading: boolean;
}

const CacheContext = createContext<CachedData | undefined>(undefined);

/**
 * Global Cache Provider
 * Fetches common data once and shares across all components
 * Prevents redundant Firestore reads
 */
export function CacheProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CachedData>({
    categories: [],
    footerBrands: [],
    settings: null,
    dynamicLinks: [],
    loading: true,
  });

  useEffect(() => {
    // Fetch all common data once on app mount
    const fetchCachedData = async () => {
      try {
        console.log('🚀 CacheProvider: Loading shared data...');

        const [categories, footerBrands, settings, dynamicLinks] = await Promise.all([
          firebaseCache.getCategories(),
          firebaseCache.getFooterBrands(),
          firebaseCache.getSettings(),
          firebaseCache.getDynamicLinks(),
        ]);

        setData({
          categories,
          footerBrands,
          settings,
          dynamicLinks,
          loading: false,
        });

        console.log('✅ CacheProvider: Data loaded successfully');
      } catch (error) {
        console.error('❌ CacheProvider: Error loading data', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchCachedData();

    // Optional: Refresh data every 5 minutes in background
    const interval = setInterval(() => {
      console.log('🔄 CacheProvider: Background refresh');
      fetchCachedData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return <CacheContext.Provider value={data}>{children}</CacheContext.Provider>;
}

/**
 * Hook to access cached data
 * Use this instead of individual Firebase hooks for common data
 */
export function useCachedData() {
  const context = useContext(CacheContext);

  if (context === undefined) {
    throw new Error('useCachedData must be used within CacheProvider');
  }

  return context;
}
