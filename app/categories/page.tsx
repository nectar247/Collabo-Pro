// app/categories/page.tsx
export const revalidate = 3600; // ← Enables ISR: rebuilds page every 1 hour

import { generateMetadata as createMetadata } from '@/lib/metadata';
import CategoriesPageClient from './CategoriesPageClient';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Export metadata for the categories page
export const metadata = createMetadata({
  title: 'Shop by Categories - Find Deals Across All Product Categories',
  description: 'Browse deals and vouchers by category. Find discounts in electronics, fashion, travel, food, beauty, home & garden, and more product categories.',
  keywords: ['categories', 'shop by category', 'product categories', 'deals by category', 'electronics deals', 'fashion vouchers', 'travel discounts', 'category discounts'],
});

export default async function CategoriesPage() {
  try {
    // Fetch cached categories page data from Firebase
    const cacheRef = doc(db, 'categoriesPageCache', 'current');
    const cacheSnap = await getDoc(cacheRef);

    console.log('[CategoriesPage] Cache exists:', cacheSnap.exists());

    if (!cacheSnap.exists()) {
      console.warn('[CategoriesPage] Cache not found, fetching data directly as fallback...');

      // Fallback: fetch data directly
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('status', '==', 'active'),
        where('dealCount', '>', 0),
        orderBy('dealCount', 'desc'),
        limit(20)
      );
      const categoriesSnap = await getDocs(categoriesQuery);
      const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const featuredBrandsQuery = query(
        collection(db, 'brands'),
        where('status', '==', 'active'),
        where('hasImage', '==', true),
        where('activeDeals', '>', 0),
        orderBy('activeDeals', 'desc'),
        limit(12)
      );
      const featuredBrandsSnap = await getDocs(featuredBrandsQuery);
      const featuredBrands = featuredBrandsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const footerBrandsQuery = query(
        collection(db, 'brands'),
        where('status', '==', 'active'),
        where('activeDeals', '>', 0),
        orderBy('activeDeals', 'desc'),
        limit(15)
      );
      const footerBrandsSnap = await getDocs(footerBrandsQuery);
      const footerBrands = footerBrandsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const dynamicLinksQuery = query(
        collection(db, 'content'),
        where('status', '==', 'published'),
        where('type', 'in', ['legal', 'help']),
        orderBy('order', 'asc')
      );
      const dynamicLinksSnap = await getDocs(dynamicLinksQuery);
      const dynamicLinks = dynamicLinksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const serializeData = (data: any) => JSON.parse(JSON.stringify(data));

      return <CategoriesPageClient
        categories={serializeData(categories)}
        featuredBrands={serializeData(featuredBrands)}
        footerBrands={serializeData(footerBrands)}
        dynamicLinks={serializeData(dynamicLinks)}
      />;
    }

    const cacheData = cacheSnap.data();
    const serializeData = (data: any) => JSON.parse(JSON.stringify(data));

    console.log('[CategoriesPage] Cache data stats:', {
      categories: cacheData.categories?.length || 0,
      featuredBrands: cacheData.featuredBrands?.length || 0,
      footerBrands: cacheData.footerBrands?.length || 0,
      trendingDeals: cacheData.trendingDeals?.length || 0,
      dynamicLinks: cacheData.dynamicLinks?.length || 0,
    });

    return <CategoriesPageClient
      categories={serializeData(cacheData.categories || [])}
      featuredBrands={serializeData(cacheData.featuredBrands || [])}
      footerBrands={serializeData(cacheData.footerBrands || [])}
      trendingDeals={serializeData(cacheData.trendingDeals || [])}
      dynamicLinks={serializeData(cacheData.dynamicLinks || [])}
      settings={serializeData(cacheData.settings || null)}
    />;
  } catch (error) {
    console.error('Error fetching categories page cache:', error);
    // Fallback to empty data if cache fetch fails
    return <CategoriesPageClient
      categories={[]}
      featuredBrands={[]}
      footerBrands={[]}
      trendingDeals={[]}
      dynamicLinks={[]}
    />;
  }
}