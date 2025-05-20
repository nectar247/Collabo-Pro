import { doc, getDoc, setDoc, increment, serverTimestamp, query, collection, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeInput } from '@/lib/utils/sanitize';


// Get all active brands
async function getActiveBrands() {
  const brandsQuery = query(
    collection(db, 'brands'),
    where('status', '==', 'active')
  );
  
  const snapshot = await getDocs(brandsQuery);
  return snapshot.docs.map(doc => doc.data().name.toLowerCase());
}

export async function recordSearch(searchTerm: string) {
  try {
    // Sanitize the search term
    const term = sanitizeInput(searchTerm.toLowerCase().trim());
    if (!term) return;

    // Get list of active brands
    const activeBrands = await getActiveBrands();
    
    // Only record if search term matches an active brand
    if (!activeBrands.includes(term)) {
      return;
    }

    // Create a document ID from the search term
    const searchId = term.replace(/[^a-z0-9]/g, '-');
    const searchRef = doc(db, 'search_history', searchId);

    // Get the existing document
    const searchDoc = await getDoc(searchRef);

    if (searchDoc.exists()) {
      // Update existing search term
      await setDoc(searchRef, {
        count: increment(1),
        lastSearchedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      // Create new search term
      await setDoc(searchRef, {
        term,
        count: 1,
        lastSearchedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error recording search:', error);
    throw error;
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