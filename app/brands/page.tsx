// app/brands/page.tsx
export const revalidate = 3600; // ← Enables ISR: rebuilds page every 1 hour

import { generateMetadata as createMetadata } from '@/lib/metadata';
import BrandsDirectoryClient from './BrandsDirectoryClient';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Export metadata for the brands directory page
export const metadata = createMetadata({
  title: 'All Brands Directory - Shop Top Brands & Find Exclusive Deals',
  description: 'Browse our complete directory of featured brands. Discover amazing deals, vouchers, and discount codes from your favorite retailers and top brands.',
  keywords: ['brands directory', 'top brands', 'featured brands', 'brand deals', 'retailer vouchers', 'brand discounts', 'all brands'],
});

export default async function BrandsPage() {
  try {
    // Fetch cached brands page data from Firebase
    const cacheRef = doc(db, 'brandsPageCache', 'current');
    const cacheSnap = await getDoc(cacheRef);

    console.log('[BrandsPage] Cache exists:', cacheSnap.exists());

    if (!cacheSnap.exists()) {
      console.warn('[BrandsPage] Cache not found, fetching data directly as fallback...');

      // Fallback: fetch data directly
      const brandsQuery = query(
        collection(db, 'brands'),
        where('status', '==', 'active'),
        orderBy('name', 'asc')
      );
      const brandsSnap = await getDocs(brandsQuery);
      const allBrands = brandsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((b: any) => b.activeDeals > 0);

      const footerBrandsQuery = query(
        collection(db, 'brands'),
        where('status', '==', 'active'),
        where('activeDeals', '>', 0),
        orderBy('activeDeals', 'desc'),
        limit(15)
      );
      const footerBrandsSnap = await getDocs(footerBrandsQuery);
      const footerBrands = footerBrandsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const categoriesQuery = query(
        collection(db, 'categories'),
        where('status', '==', 'active'),
        where('dealCount', '>', 0),
        orderBy('dealCount', 'desc'),
        limit(20)
      );
      const categoriesSnap = await getDocs(categoriesQuery);
      const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const dynamicLinksQuery = query(
        collection(db, 'content'),
        where('status', '==', 'published'),
        where('type', 'in', ['legal', 'help']),
        orderBy('order', 'asc')
      );
      const dynamicLinksSnap = await getDocs(dynamicLinksQuery);
      const dynamicLinks = dynamicLinksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const serializeData = (data: any) => JSON.parse(JSON.stringify(data));

      return <BrandsDirectoryClient
        allBrands={serializeData(allBrands)}
        footerBrands={serializeData(footerBrands)}
        categories={serializeData(categories)}
        dynamicLinks={serializeData(dynamicLinks)}
      />;
    }

    const cacheData = cacheSnap.data();
    const serializeData = (data: any) => JSON.parse(JSON.stringify(data));

    console.log('[BrandsPage] Cache data stats:', {
      brands: cacheData.allBrands?.length || 0,
      footerBrands: cacheData.footerBrands?.length || 0,
      categories: cacheData.categories?.length || 0,
      dynamicLinks: cacheData.dynamicLinks?.length || 0,
    });

    return <BrandsDirectoryClient
      allBrands={serializeData(cacheData.allBrands || [])}
      footerBrands={serializeData(cacheData.footerBrands || [])}
      categories={serializeData(cacheData.categories || [])}
      dynamicLinks={serializeData(cacheData.dynamicLinks || [])}
      settings={serializeData(cacheData.settings || null)}
    />;
  } catch (error) {
    console.error('Error fetching brands page cache:', error);
    // Fallback to empty data if cache fetch fails
    return <BrandsDirectoryClient
      allBrands={[]}
      footerBrands={[]}
      categories={[]}
      dynamicLinks={[]}
    />;
  }
}