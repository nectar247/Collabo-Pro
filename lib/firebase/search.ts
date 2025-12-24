import { doc, getDoc, setDoc, increment, serverTimestamp, query, collection, orderBy, getDocs, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeInput } from '@/lib/utils/sanitize';

/**
 * Search type enumeration
 */
export type SearchType = 'general' | 'brand' | 'category';

/**
 * Get all active brands
 */
async function getActiveBrands() {
  const brandsQuery = query(
    collection(db, 'brands'),
    where('status', '==', 'active')
  );

  const snapshot = await getDocs(brandsQuery);
  return snapshot.docs.map(doc => doc.data().name.toLowerCase());
}

/**
 * Get all active categories
 */
async function getActiveCategories() {
  const categoriesQuery = query(
    collection(db, 'categories'),
    where('status', '==', 'active')
  );

  const snapshot = await getDocs(categoriesQuery);
  return snapshot.docs.map(doc => doc.data().name.toLowerCase());
}

/**
 * Determine the type of search based on the search term
 */
async function determineSearchType(searchTerm: string): Promise<SearchType> {
  const term = searchTerm.toLowerCase();

  // Check if it matches a brand
  const activeBrands = await getActiveBrands();
  if (activeBrands.includes(term)) {
    return 'brand';
  }

  // Check if it matches a category
  const activeCategories = await getActiveCategories();
  if (activeCategories.includes(term)) {
    return 'category';
  }

  // Default to general search
  return 'general';
}

/**
 * Record a search with enhanced tracking
 */
export async function recordSearch(searchTerm: string, resultsCount?: number, userId?: string) {
  try {
    // Sanitize the search term
    const term = sanitizeInput(searchTerm.toLowerCase().trim());
    if (!term) return;

    // Determine search type
    const searchType = await determineSearchType(term);

    // Create a document ID from the search term
    const searchId = term.replace(/[^a-z0-9]/g, '-');
    const searchRef = doc(db, 'search_history', searchId);

    // Get the existing document
    const searchDoc = await getDoc(searchRef);

    const searchData = {
      count: increment(1),
      lastSearchedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(resultsCount !== undefined && { lastResultsCount: resultsCount }),
      ...(userId && { lastUserId: userId }),
    };

    if (searchDoc.exists()) {
      // Update existing search term
      await setDoc(searchRef, searchData, { merge: true });
    } else {
      // Create new search term with full data
      await setDoc(searchRef, {
        term,
        searchType,
        count: 1,
        lastSearchedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(resultsCount !== undefined && { lastResultsCount: resultsCount }),
        ...(userId && { lastUserId: userId }),
      });
    }
  } catch (error) {
    console.error('Error recording search:', error);
    // Don't throw - search recording failures shouldn't break user experience
  }
}

export async function getPopularSearches(limit__ = 10) {
  try {
    // Sanitize the limit to ensure it's a number and within a reasonable range
    limit__ = Math.max(1, Math.min(100, parseInt(limit__.toString(), 10)));   
    const searchesQuery = query(
      collection(db, 'search_history'),
      orderBy('count', 'desc'),
      limit(limit__) // Get more than needed in case some are filtered out
    );
    const snapshot = await getDocs(searchesQuery);
    const searches = snapshot.docs
      .map(doc => ({
        id: doc.id,
        term: doc.data().term,
        ...doc.data()
      }))
      .slice(0, limit__); // Limit to requested number
      
    return searches;
  } catch (error) {
    console.error('Error getting popular searches:', error);
    throw error;
  }
}