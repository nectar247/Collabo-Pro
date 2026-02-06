// app/categories/[slug]/page.tsx
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import CategoryPageClient from './CategoryPageClient';
import { slugToCategory } from '@/helper';

// Enhanced category matching for server-side
function doesCategoryMatch(dealCategory: any, searchCategory: string) {
  if (!dealCategory) return false;
  
  // Convert to string and handle various data types
  let dealCat = '';
  if (typeof dealCategory === 'string') {
    dealCat = dealCategory;
  } else if (typeof dealCategory === 'object' && dealCategory.toString) {
    dealCat = dealCategory.toString();
  } else {
    dealCat = String(dealCategory);
  }
  
  const searchCat = String(searchCategory);
  
  // Clean and normalize strings
  const cleanString = (str: string) => {
    return str
      .toString()
      .trim()
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
      .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .toLowerCase();
  };
  
  const cleanDealCat = cleanString(dealCat);
  const cleanSearchCat = cleanString(searchCat);
  
  // Multiple matching strategies
  return (
    cleanDealCat === cleanSearchCat ||
    cleanDealCat.startsWith(cleanSearchCat) ||
    cleanDealCat.endsWith(cleanSearchCat) ||
    cleanDealCat.includes(cleanSearchCat) ||
    cleanSearchCat.includes(cleanDealCat) ||
    cleanDealCat.replace(/\s/g, '') === cleanSearchCat.replace(/\s/g, '') ||
    cleanDealCat.split(' ').some(word => 
      cleanSearchCat.split(' ').some(searchWord => 
        word === searchWord && word.length > 2
      )
    )
  );
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    // Convert slug back to category name (e.g., "home-and-garden" -> "home & garden")
    const categoryName = slugToCategory(slug);
    
    // Option 1: Try exact category match first (most efficient)
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
      // Silently continue to flexible matching
    }

    // If no exact matches, check if category exists (without fetching ALL deals)
    if (categoryDeals.length === 0) {
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('name', '==', categoryName)
      );
      const categoriesSnapshot = await getDocs(categoriesQuery);

      if (categoriesSnapshot.empty) {
        notFound();
      }
      // Category exists but has no deals - render empty state
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