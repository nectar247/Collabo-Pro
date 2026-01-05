// app/deals/page.tsx
export const revalidate = 300; // ← Enables ISR: rebuilds page every 5 minutes

import { generateMetadata as createMetadata } from '@/lib/metadata';
import DealsPageClient from './DealsPageClient';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Add metadata export for this page
export const metadata = createMetadata({
  title: 'Great Deals', // This will become "Deals | Shop4Vouchers"
  description: 'Browse our latest deals and vouchers. Find amazing discounts from top brands and save money on your purchases.',
  keywords: ['deals', 'vouchers', 'discounts', 'offers', 'promotions', 'savings'],
});

export default async function DealsPage() {
  try {
    // Fetch cached deals page data from Firebase
    const cacheRef = doc(db, 'dealsPageCache', 'current');
    const cacheSnap = await getDoc(cacheRef);

    console.log('[DealsPage] Cache exists:', cacheSnap.exists());

    if (!cacheSnap.exists()) {
      console.warn('[DealsPage] Cache not found, fetching data directly as fallback...');

      // Fallback: fetch data directly
      const now = Timestamp.now();
      const dealsQuery = query(
        collection(db, 'deals_fresh'),
        where('status', '==', 'active'),
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'asc'),
        orderBy('createdAt', 'desc'),
        limit(48)
      );
      const dealsSnap = await getDocs(dealsQuery);
      const initialDeals = dealsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const categoriesQuery = query(
        collection(db, 'categories'),
        where('status', '==', 'active'),
        where('dealCount', '>', 0),
        orderBy('dealCount', 'desc'),
        limit(20)
      );
      const categoriesSnap = await getDocs(categoriesQuery);
      const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const brandsQuery = query(
        collection(db, 'brands'),
        where('status', '==', 'active'),
        where('activeDeals', '>', 0),
        orderBy('activeDeals', 'desc'),
        limit(20)
      );
      const brandsSnap = await getDocs(brandsQuery);
      const brands = brandsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const dynamicLinksQuery = query(
        collection(db, 'content'),
        where('status', '==', 'published'),
        where('type', 'in', ['legal', 'help']),
        orderBy('order', 'asc')
      );
      const dynamicLinksSnap = await getDocs(dynamicLinksQuery);
      const dynamicLinks = dynamicLinksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const serializeData = (data: any) => JSON.parse(JSON.stringify(data));

      return <DealsPageClient
        initialDeals={serializeData(initialDeals)}
        totalCount={initialDeals.length}
        categories={serializeData(categories)}
        brands={serializeData(brands)}
        dynamicLinks={serializeData(dynamicLinks)}
      />;
    }

    const cacheData = cacheSnap.data();
    const serializeData = (data: any) => JSON.parse(JSON.stringify(data));

    // Debug: Check cache data
    console.log('[DealsPage] Cache data stats:', {
      deals: cacheData.initialDeals?.length || 0,
      categories: cacheData.categories?.length || 0,
      brands: cacheData.brands?.length || 0,
      dynamicLinks: cacheData.dynamicLinks?.length || 0,
      categoriesSample: cacheData.categories?.[0],
      brandsSample: cacheData.brands?.[0],
      dynamicLinksSample: cacheData.dynamicLinks?.[0]
    });

    return <DealsPageClient
      initialDeals={serializeData(cacheData.initialDeals || [])}
      totalCount={cacheData.totalCount || 0}
      categories={serializeData(cacheData.categories || [])}
      brands={serializeData(cacheData.brands || [])}
      dynamicLinks={serializeData(cacheData.dynamicLinks || [])}
    />;
  } catch (error) {
    console.error('Error fetching deals page cache:', error);
    // Fallback to empty data if cache fetch fails
    return <DealsPageClient
      initialDeals={[]}
      totalCount={0}
      categories={[]}
      brands={[]}
      dynamicLinks={[]}
    />;
  }
}