# Firestore Read Optimization Guide

## 🎯 Goal
Reduce Firestore reads by **80-95%** to significantly lower costs while maintaining performance.

## 📊 Current Issues

### 1. **Real-time Listeners on Every Page**
- Every page load creates `onSnapshot` listeners
- Listeners continue reading on every data update
- No caching between page navigations
- Footer alone: ~86 reads per page view

### 2. **Estimated Current Costs**
With 1,000 daily visitors × 5 pages:
- **1,605,000+ reads/day**
- **~48M reads/month**
- **Cost: $144/month** (at $0.003 per 1K reads)

## ✅ Solution: Multi-Layer Caching

### Implementation Files Created:
1. `lib/firebase/cache.ts` - Memory cache with TTL
2. `components/CacheProvider.tsx` - React Context for shared data
3. `components/footer-cached.tsx` - Optimized footer component

---

## 🚀 Implementation Steps

### Step 1: Add CacheProvider to Root Layout

**File**: `app/layout.tsx`

```tsx
import { CacheProvider } from '@/components/CacheProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CacheProvider>  {/* Add this */}
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </CacheProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Step 2: Replace Footer with Cached Version

**Find and replace** in all pages/components:

```tsx
// BEFORE
import Footer from '@/components/footer';
<Footer
  categories={categories}
  loadingCategories={loadingCategories}
  brands={footerBrands}
  loadingBrands={loadingBrands}
  settings={settings__}
  settLoading={settLoading}
  dynamicLinks={dynamicLinks}
  loadingDynamicLinks={loadingDynamicLinks}
/>

// AFTER
import FooterCached from '@/components/footer-cached';
<FooterCached />
```

Files to update:
- `app/admin/components/AdminDashboardClient.tsx` ✅ (Already optimized with one-time fetch)
- All other pages using Footer

### Step 3: Use Cached Data in Other Components

**Instead of**:
```tsx
const { categories, loading } = useCategories();
const { footerBrands, loading: brandsLoading } = useBrands({ limit: 20 });
```

**Use**:
```tsx
import { useCachedData } from '@/components/CacheProvider';

const { categories, footerBrands, settings, dynamicLinks, loading } = useCachedData();
```

### Step 4: Invalidate Cache After Admin Actions

**File**: `components/admin/BrandManagement.tsx`, `CategoryManagement.tsx`, etc.

```tsx
import { invalidateCache } from '@/lib/firebase/cache';

// After creating/updating/deleting
const handleUpdate = async () => {
  await updateBrand(id, data);
  invalidateCache('brands:all'); // Clear specific cache
  // or
  invalidateCache(); // Clear all cache
};
```

---

## 📈 Expected Improvements

### Reads Reduction Per Page Type:

| Page Type | Current Reads | With Cache | Reduction |
|-----------|---------------|------------|-----------|
| Homepage | ~350 reads | 0 reads (after cache) | **100%** |
| Category Page | ~150 reads | 0-20 reads | **87-100%** |
| Brand Page | ~150 reads | 0-20 reads | **87-100%** |
| Deal Page | ~50 reads | 0-10 reads | **80-100%** |
| Admin Page | ~400 reads | ~20 reads | **95%** |

### Overall Expected Savings:

**Before**: 48M reads/month = $144/month
**After**: 5-10M reads/month = $15-30/month
**💰 Savings: $120-130/month (80-85% reduction)**

---

## 🎛️ Advanced Optimizations

### 1. Extend Cache to Other Collections

Add to `lib/firebase/cache.ts`:

```typescript
/**
 * Fetch all deals (with caching)
 */
async getAllDeals(): Promise<Deal[]> {
  return this.getOrFetch('deals:all', async () => {
    const snapshot = await getDocs(
      query(
        collection(db, 'deals_fresh'),
        where('status', '==', 'active'),
        where('expiresAt', '>', new Date()),
        orderBy('expiresAt', 'asc'),
        limit(200)
      )
    );
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deal));
  }, this.DEFAULT_TTL);
}
```

### 2. Use Browser LocalStorage for Longer Persistence

Extend cache to persist across page reloads:

```typescript
// Save to localStorage
private saveToLocalStorage(key: string, data: any) {
  try {
    localStorage.setItem(
      `cache:${key}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch (e) {
    console.warn('Failed to save to localStorage', e);
  }
}

// Load from localStorage
private loadFromLocalStorage(key: string, maxAge: number = 5 * 60 * 1000) {
  try {
    const item = localStorage.getItem(`cache:${key}`);
    if (!item) return null;

    const { data, timestamp } = JSON.parse(item);
    if (Date.now() - timestamp > maxAge) return null;

    return data;
  } catch (e) {
    return null;
  }
}
```

### 3. Server-Side Caching (Most Effective)

For pages using Server Components, implement server-side caching:

```typescript
// lib/firebase/server-cache.ts
import { unstable_cache } from 'next/cache';

export const getCachedCategories = unstable_cache(
  async () => {
    // Fetch from Firestore
    return categories;
  },
  ['categories'],
  { revalidate: 300 } // 5 minutes
);
```

Use in Server Components:
```tsx
// app/page.tsx
const categories = await getCachedCategories();
```

### 4. Homepage Cache (Already Implemented ✅)

Your homepage already uses a smart cache:
- Fetches from `homepageCache/current` document
- Falls back to direct queries if cache missing
- Update this cache via a scheduled function

**Recommendation**: Ensure this cache updates every 5 minutes via Cloud Function.

---

## 🧪 Testing & Monitoring

### 1. Check Cache Stats

```typescript
import { getCacheStats } from '@/lib/firebase/cache';

console.log('Cache Stats:', getCacheStats());
// Output:
// {
//   totalEntries: 5,
//   validEntries: 4,
//   expiredEntries: 1,
//   cacheSize: 125000
// }
```

### 2. Monitor Firestore Usage

1. Go to Firebase Console → Firestore → Usage tab
2. Compare reads before/after implementation
3. Expected drop: 80-95%

### 3. Test Cache Invalidation

```typescript
// In admin components after updates
import { invalidateCache } from '@/lib/firebase/cache';

// After brand update
invalidateCache('brands:all');
invalidateCache('brands:footer');
invalidateCache('brands:featured:50');
```

---

## ⚠️ Important Notes

### 1. **Data Staleness**
- Cached data can be up to 5 minutes old (configurable)
- Perfect for categories, brands, settings (change infrequently)
- Not suitable for real-time chat or live counters

### 2. **Cache Invalidation**
- Clear cache after admin updates
- Background refresh every 5 minutes ensures freshness
- Homepage cache should be updated by scheduled function

### 3. **Memory Usage**
- In-memory cache is reset on page refresh
- Typical cache size: 100-500KB (negligible)
- Consider localStorage for longer persistence

### 4. **Admin Pages**
- Admin pages still need write capabilities
- Cache reads only, writes go directly to Firestore
- Invalidate cache immediately after writes

---

## 📋 Quick Checklist

- [ ] Add CacheProvider to root layout
- [ ] Replace Footer with FooterCached in all pages
- [ ] Update admin components to invalidate cache after changes
- [ ] Test cache hit/miss in console
- [ ] Monitor Firestore usage for 24 hours
- [ ] Verify data freshness (should update within 5 min)
- [ ] Confirm cost reduction in Firebase billing

---

## 🎓 Best Practices Going Forward

### ✅ DO:
- Use cached data for categories, brands, settings, static content
- Invalidate cache after admin updates
- Monitor cache stats regularly
- Extend caching to other frequently-read collections

### ❌ DON'T:
- Use real-time listeners (`onSnapshot`) for static data
- Fetch same data multiple times per page
- Forget to invalidate cache after updates
- Cache user-specific data (saved deals, profiles)

---

## 🆘 Troubleshooting

### Cache not updating?
```typescript
// Force refresh cache
import { invalidateCache } from '@/lib/firebase/cache';
invalidateCache(); // Clear all
```

### Getting stale data?
- Reduce TTL in `lib/firebase/cache.ts`
- Ensure admin components invalidate cache after updates

### Still seeing high reads?
- Check Network tab for duplicate fetches
- Verify CacheProvider is at root level
- Look for components still using old hooks with `onSnapshot`

---

## 📚 Additional Resources

- [Firebase Firestore Pricing](https://firebase.google.com/pricing)
- [Next.js Caching Strategies](https://nextjs.org/docs/app/building-your-application/caching)
- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)

---

**Questions or Issues?** Check the implementation files:
- `lib/firebase/cache.ts`
- `components/CacheProvider.tsx`
- `components/footer-cached.tsx`
