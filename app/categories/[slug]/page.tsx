// app/categories/[slug]/page.tsx
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import CategoryPageClient from './CategoryPageClient';
import { slugToCategory, categoryToSlug } from '@/helper';

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    // Step 1: Find the actual category name from the categories collection
    // slugToCategory returns lowercase, but Firestore is case-sensitive
    // So we fetch categories and match by regenerating slugs
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    const matchedCategory = categoriesSnapshot.docs.find(doc => {
      const name = doc.data().name;
      return name && categoryToSlug(name) === slug;
    });

    if (!matchedCategory) {
      notFound();
    }

    const categoryName = matchedCategory.data().name;

    // Step 2: Fetch deals for this category using the exact name from Firestore
    let categoryDeals: any[] = [];

    try {
      const exactQuery = query(
        collection(db, 'deals_fresh'),
        where('category', '==', categoryName)
      );
      const exactSnapshot = await getDocs(exactQuery);
      categoryDeals = exactSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (exactError) {
      // Category exists but query failed - render empty state
    }

    // Convert Firestore timestamps to serializable format
    const serializedDeals = categoryDeals.map(deal => {
      // Use JSON.parse(JSON.stringify()) to completely strip all methods and convert to plain objects
      const fullySerializedDeal = JSON.parse(JSON.stringify(deal));
      
      // Function to safely convert Firestore timestamps to plain objects
      const convertTimestamp = (timestamp: any) => {
        if (!timestamp) return null;
        if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
          return {
            seconds: Number(timestamp.seconds),
            nanoseconds: Number(timestamp.nanoseconds || 0)
          };
        }
        return timestamp;
      };
      
      // Recursively find and convert all timestamp-like objects
      const convertTimestampsRecursively = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
          return obj.map(convertTimestampsRecursively);
        }
        
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value && typeof value === 'object') {
            // Check if this looks like a Firestore timestamp
            if ('seconds' in value && typeof value.seconds === 'number') {
              result[key] = convertTimestamp(value);
            } else {
              result[key] = convertTimestampsRecursively(value);
            }
          } else {
            result[key] = value;
          }
        }
        return result;
      };
      
      // Apply timestamp conversion to the fully serialized deal
      return convertTimestampsRecursively(fullySerializedDeal);
    });

    console.log('Server-side: Returning', serializedDeals.length, 'serialized deals');

    return (
      <CategoryPageClient
        slug={slug}
        initialDeals={serializedDeals}
        categoryName={categoryName}
      />
    );
    
  } catch (error) {
    console.error('Server-side error fetching category deals:', error);
    notFound();
  }
}

// Generate static params for popular categories (optional optimization)
export async function generateStaticParams() {
  try {
    const { categoryToSlug } = await import('@/helper');
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    const categories = categoriesSnapshot.docs
      .map(doc => doc.data().name)
      .filter(Boolean)
      .slice(0, 20); // Limit to top 20 categories

    return categories.map(category => ({
      slug: categoryToSlug(category)
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}