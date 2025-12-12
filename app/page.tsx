// app/page.tsx
import HomePageClient from './HomePageClient';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Metadata } from 'next';

// Export metadata for the home page
export const metadata: Metadata = {
  title: 'Best Deals & Vouchers - Save Money with Exclusive Discount Codes | Shop4Vouchers',
  description: 'Discover the best deals and vouchers from trusted brands. Find amazing discounts, promotional codes, and exclusive offers.',
  keywords: ['deals', 'vouchers', 'discount codes', 'savings', 'coupons', 'promotional codes', 'exclusive offers', 'best deals'],
};

// Enable ISR with 5-minute revalidation
export const revalidate = 300; // 5 minutes

export default async function HomePage() {
  try {
    // Fetch cached homepage data from Firebase
    const cacheRef = doc(db, 'homepageCache', 'current');
    const cacheSnap = await getDoc(cacheRef);

    if (!cacheSnap.exists()) {
      console.warn('Homepage cache not found, fetching data directly as fallback...');

      // Fallback: fetch data directly
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('status', '==', 'active'),
        where('dealCount', '>', 0),
        orderBy('dealCount', 'desc'),
        limit(8)
      );
      const categoriesSnap = await getDocs(categoriesQuery);
      const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const brandsQuery = query(
        collection(db, 'brands'),
        where('status', '==', 'active'),
        where('brandimg', '!=', ''),
        where('activeDeals', '>', 0),
        orderBy('brandimg', 'asc'),
        orderBy('activeDeals', 'desc'),
        limit(50)
      );
      const brandsSnap = await getDocs(brandsQuery);
      const featuredBrands = brandsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const dealsQuery = query(
        collection(db, 'deals_fresh'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const dealsSnap = await getDocs(dealsQuery);
      const trendingDeals = dealsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const serializeData = (data: any) => JSON.parse(JSON.stringify(data));

      return <HomePageClient
        categories={serializeData(categories)}
        featuredBrands={serializeData(featuredBrands)}
        trendingDeals={serializeData(trendingDeals)}
        popularSearches={[]}
        footerBrands={serializeData(featuredBrands.slice(0, 15))}
      />;
    }

    const cacheData = cacheSnap.data();

    // Convert Firestore timestamps to serializable format
    const serializeData = (data: any) => {
      return JSON.parse(JSON.stringify(data));
    };

    return <HomePageClient
      categories={serializeData(cacheData.categories || [])}
      featuredBrands={serializeData(cacheData.featuredBrands || [])}
      trendingDeals={serializeData(cacheData.trendingDeals || [])}
      popularSearches={cacheData.popularSearches || []}
      footerBrands={serializeData(cacheData.footerBrands || [])}
    />;
  } catch (error) {
    console.error('Error fetching homepage cache:', error);
    // Fallback to empty data if cache fetch fails
    return <HomePageClient
      categories={[]}
      featuredBrands={[]}
      trendingDeals={[]}
      popularSearches={[]}
      footerBrands={[]}
    />;
  }
}
