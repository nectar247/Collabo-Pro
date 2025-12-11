// Test script to verify active deals count
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';

// Firebase config (use your actual config)
const firebaseConfig = {
  // Add your config here from lib/firebase/index.ts
};

async function testDealsCount() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Testing deals count methods...\n');

    // Method 1: getCountFromServer (efficient)
    console.log('Method 1: getCountFromServer');
    const dealsQuery1 = query(
      collection(db, 'deals_fresh'),
      where('status', '==', 'active')
    );
    const countResult = await getCountFromServer(dealsQuery1);
    console.log('Count from server:', countResult.data().count);

    // Method 2: getDocs then count (less efficient but guaranteed)
    console.log('\nMethod 2: getDocs then count');
    const dealsQuery2 = query(
      collection(db, 'deals_fresh'),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(dealsQuery2);
    console.log('Count from snapshot:', snapshot.size);

    // Method 3: Get all deals and check status manually
    console.log('\nMethod 3: All deals with status check');
    const allDealsQuery = query(collection(db, 'deals_fresh'));
    const allSnapshot = await getDocs(allDealsQuery);
    const activeCount = allSnapshot.docs.filter(doc => doc.data().status === 'active').length;
    const totalCount = allSnapshot.size;
    console.log('Active deals:', activeCount);
    console.log('Total deals:', totalCount);
    console.log('Inactive deals:', totalCount - activeCount);

    // Sample some deals to see their status
    console.log('\nSample deals (first 5):');
    allSnapshot.docs.slice(0, 5).forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.title || data.brand || 'Untitled'}: status="${data.status}"`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

testDealsCount();
