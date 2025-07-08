// @/lib/firebase/deals.ts (or deals.js if not using TypeScript)
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Match your existing import path

export const disableAllDealsForBrand = async (brandId: string): Promise<number> => {
  try {
    // Query all active deals for this brand
    const dealsQuery = query(
      collection(db, 'deals'),
      where('brandId', '==', brandId),
      where('status', '==', 'active') // Only update currently active deals
    );
    
    const dealsSnapshot = await getDocs(dealsQuery);
    
    if (dealsSnapshot.empty) {
      console.log('No active deals found for brand:', brandId);
      return 0;
    }

    // Use batch write for better performance with multiple updates
    const batch = writeBatch(db);
    
    dealsSnapshot.docs.forEach((dealDoc) => {
      const dealRef = doc(db, 'deals', dealDoc.id);
      batch.update(dealRef, { 
        status: 'inactive',
        updatedAt: Timestamp.now(),
        deactivatedBy: 'brand_deactivation' // Optional: track reason
      });
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log(`Successfully deactivated ${dealsSnapshot.docs.length} deals for brand:`, brandId);
    return dealsSnapshot.docs.length;
    
  } catch (error) {
    console.error('Error disabling deals for brand:', brandId, error);
    throw new Error(`Failed to disable deals: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Optional: Enable all deals for a brand (for reactivation)
export const enableAllDealsForBrand = async (brandId: string): Promise<number> => {
  try {
    const dealsQuery = query(
      collection(db, 'deals'),
      where('brandId', '==', brandId),
      where('status', '==', 'inactive'),
      where('deactivatedBy', '==', 'brand_deactivation') // Only reactivate deals disabled by brand deactivation
    );
    
    const dealsSnapshot = await getDocs(dealsQuery);
    
    if (dealsSnapshot.empty) {
      console.log('No deals to reactivate for brand:', brandId);
      return 0;
    }

    const batch = writeBatch(db);
    
    dealsSnapshot.docs.forEach((dealDoc) => {
      const dealRef = doc(db, 'deals', dealDoc.id);
      batch.update(dealRef, { 
        status: 'active',
        updatedAt: Timestamp.now(),
        deactivatedBy: null // Clear the deactivation reason
      });
    });
    
    await batch.commit();
    
    console.log(`Successfully reactivated ${dealsSnapshot.docs.length} deals for brand:`, brandId);
    return dealsSnapshot.docs.length;
    
  } catch (error) {
    console.error('Error enabling deals for brand:', brandId, error);
    throw new Error(`Failed to enable deals: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Get all deals for a brand (for verification/debugging)
export const getDealsForBrand = async (brandId: string) => {
  try {
    const dealsQuery = query(
      collection(db, 'deals'),
      where('brandId', '==', brandId)
    );
    
    const dealsSnapshot = await getDocs(dealsQuery);
    return dealsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching deals for brand:', brandId, error);
    throw new Error(`Failed to fetch deals: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Get deal counts by status for a brand
export const getDealCountsForBrand = async (brandId: string) => {
  try {
    const dealsQuery = query(
      collection(db, 'deals'),
      where('brandId', '==', brandId)
    );
    
    const dealsSnapshot = await getDocs(dealsQuery);
    const deals = dealsSnapshot.docs.map(doc => doc.data());
    
    const counts = {
      total: deals.length,
      active: deals.filter(deal => deal.status === 'active').length,
      inactive: deals.filter(deal => deal.status === 'inactive').length
    };
    
    return counts;
  } catch (error) {
    console.error('Error getting deal counts for brand:', brandId, error);
    throw new Error(`Failed to get deal counts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};