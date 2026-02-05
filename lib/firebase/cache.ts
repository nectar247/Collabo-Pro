/**
 * Firebase Cache Layer
 * Reduces Firestore reads by caching frequently accessed data in memory
 */

import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Category, Brand, SystemSettings, ContentSection } from './collections';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class FirebaseCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly LONG_TTL = 30 * 60 * 1000; // 30 minutes for rarely changing data

  /**
   * Get data from cache or fetch if not available/expired
   */
  private async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Return cached data if valid
    if (cached && cached.expiresAt > now) {
      console.log(`✅ Cache HIT: ${key}`);
      return cached.data;
    }

    // Fetch fresh data
    console.log(`❌ Cache MISS: ${key} - Fetching from Firestore`);
    const data = await fetcher();

    // Store in cache
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });

    return data;
  }

  /**
   * Manually invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Cache invalidated: ${key}`);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    console.log('🗑️ All cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([_, v]) => v.expiresAt > now).length,
      expiredEntries: entries.filter(([_, v]) => v.expiresAt <= now).length,
      cacheSize: JSON.stringify(Object.fromEntries(this.cache)).length,
    };
  }

  // ===== CACHED FETCHERS =====

  /**
   * Fetch active categories (5 min cache)
   */
  async getCategories(): Promise<Category[]> {
    return this.getOrFetch('categories:active', async () => {
      const snapshot = await getDocs(
        query(
          collection(db, 'categories'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(50)
        )
      );
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Category))
        .filter(c => c.dealCount > 0)
        .sort((a, b) => b.dealCount - a.dealCount);
    }, this.DEFAULT_TTL);
  }

  /**
   * Fetch footer brands (5 min cache)
   */
  async getFooterBrands(): Promise<Brand[]> {
    return this.getOrFetch('brands:footer', async () => {
      const snapshot = await getDocs(
        query(
          collection(db, 'brands'),
          where('status', '==', 'active'),
          orderBy('activeDeals', 'desc'),
          limit(15)
        )
      );
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Brand))
        .filter(b => b.activeDeals > 0);
    }, this.DEFAULT_TTL);
  }

  /**
   * Fetch all active brands (5 min cache)
   */
  async getAllBrands(): Promise<Brand[]> {
    return this.getOrFetch('brands:all', async () => {
      const snapshot = await getDocs(
        query(
          collection(db, 'brands'),
          where('status', '==', 'active')
        )
      );
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Brand))
        .filter(b => b.activeDeals > 0)
        .sort((a, b) => b.activeDeals - a.activeDeals);
    }, this.DEFAULT_TTL);
  }

  /**
   * Fetch featured brands (5 min cache)
   */
  async getFeaturedBrands(limitCount: number = 50): Promise<Brand[]> {
    return this.getOrFetch(`brands:featured:${limitCount}`, async () => {
      const snapshot = await getDocs(
        query(
          collection(db, 'brands'),
          where('status', '==', 'active'),
          where('brandimg', '!=', ''),
          orderBy('brandimg', 'asc'),
          orderBy('activeDeals', 'desc'),
          limit(limitCount)
        )
      );
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Brand))
        .filter(b => b.activeDeals > 0)
        .sort((a, b) => b.activeDeals - a.activeDeals);
    }, this.DEFAULT_TTL);
  }

  /**
   * Fetch system settings (30 min cache - rarely changes)
   */
  async getSettings(): Promise<SystemSettings | null> {
    return this.getOrFetch('settings:system', async () => {
      const snapshot = await getDoc(doc(db, 'settings', 'system'));
      return snapshot.exists() ? (snapshot.data() as SystemSettings) : null;
    }, this.LONG_TTL);
  }

  /**
   * Fetch dynamic links (30 min cache - rarely changes)
   */
  async getDynamicLinks(): Promise<ContentSection[]> {
    return this.getOrFetch('content:dynamic-links', async () => {
      const snapshot = await getDocs(
        query(
          collection(db, 'content'),
          where('status', '==', 'published'),
          orderBy('order', 'asc')
        )
      );
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ContentSection));
    }, this.LONG_TTL);
  }
}

// Export singleton instance
export const firebaseCache = new FirebaseCache();

// Export utility to clear cache when admin makes changes
export const invalidateCache = (key?: string) => {
  if (key) {
    firebaseCache.invalidate(key);
  } else {
    firebaseCache.clearAll();
  }
};

// Export stats for monitoring
export const getCacheStats = () => firebaseCache.getStats();
