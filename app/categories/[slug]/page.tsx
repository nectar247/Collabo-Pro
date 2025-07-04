// app/categories/[slug]/page.tsx
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import CategoryPageClient from './CategoryPageClient';

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

export default async function DynamicPage({ params }: { params: { slug: string } }) {
  try {
    const decodedSlug = decodeURIComponent(params.slug);
    
    console.log('Server-side: Fetching deals for category:', decodedSlug);
    
    // Option 1: Try exact category match first (most efficient)
    let categoryDeals: any[] = [];
    
    try {
      const exactQuery = query(
        collection(db, 'deals_fresh'),
        where('category', '==', decodedSlug)
      );
      const exactSnapshot = await getDocs(exactQuery);
      categoryDeals = exactSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Server-side: Exact match found', categoryDeals.length, 'deals');
    } catch (exactError) {
      console.log('Server-side: Exact match failed, trying flexible matching');
    }
    
    // Option 2: If no exact matches, fall back to flexible matching
    // Only do this if exact match returned no results
    if (categoryDeals.length === 0) {
      console.log('Server-side: No exact matches, fetching all deals for flexible matching');
      
      // Get all deals and filter (only as fallback)
      const allDealsSnapshot = await getDocs(collection(db, 'deals_fresh'));
      const allDeals = allDealsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as any; // Type assertion for Firestore data
      });
      
      // Filter with flexible matching
      categoryDeals = allDeals.filter(deal => 
        doesCategoryMatch(deal.category, decodedSlug)
      );
      
      console.log('Server-side: Flexible matching found', categoryDeals.length, 'deals');
    }

    // If still no deals found, check if category exists in categories collection
    if (categoryDeals.length === 0) {
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categoryExists = categoriesSnapshot.docs.some(doc => {
        const categoryName = doc.data().name;
        return doesCategoryMatch(categoryName, decodedSlug);
      });
      
      if (!categoryExists) {
        console.log('Server-side: Category does not exist');
        notFound();
      }
      
      console.log('Server-side: Category exists but no deals found');
    }

    // Convert Firestore timestamps to serializable format
    const serializedDeals = categoryDeals.map(deal => {
      const serializedDeal: any = { ...deal };
      
      // Handle Firestore timestamps - convert to ISO strings for serialization
      if (deal.createdAt && typeof deal.createdAt === 'object' && 'seconds' in deal.createdAt) {
        serializedDeal.createdAt = new Date(deal.createdAt.seconds * 1000).toISOString();
      }
      if (deal.updatedAt && typeof deal.updatedAt === 'object' && 'seconds' in deal.updatedAt) {
        serializedDeal.updatedAt = new Date(deal.updatedAt.seconds * 1000).toISOString();
      }
      if (deal.expiresAt && typeof deal.expiresAt === 'object' && 'seconds' in deal.expiresAt) {
        serializedDeal.expiresAt = new Date(deal.expiresAt.seconds * 1000).toISOString();
      }
      
      return serializedDeal;
    });

    console.log('Server-side: Returning', serializedDeals.length, 'serialized deals');

    return (
      <CategoryPageClient 
        slug={params.slug} 
        initialDeals={serializedDeals}
        categoryName={decodedSlug}
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
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    const categories = categoriesSnapshot.docs
      .map(doc => doc.data().name)
      .filter(Boolean)
      .slice(0, 20); // Limit to top 20 categories
    
    return categories.map(category => ({
      slug: encodeURIComponent(category.toLowerCase())
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}