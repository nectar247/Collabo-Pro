import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "vouched4vouchers"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verifyCache() {
  try {
    const cacheRef = doc(db, 'homepageCache', 'current');
    const cacheSnap = await getDoc(cacheRef);
    
    if (!cacheSnap.exists()) {
      console.log('❌ Cache does not exist!');
      return;
    }
    
    const data = cacheSnap.data();
    console.log('✅ Cache exists');
    console.log('Last updated:', data.lastUpdated?.toDate());
    console.log('Trending deals count:', data.trendingDeals?.length || 0);
    
    if (data.trendingDeals && data.trendingDeals.length > 0) {
      const brands = data.trendingDeals.map(d => d.brand);
      const uniqueBrands = [...new Set(brands)];
      
      console.log('\n📊 Brand Analysis:');
      console.log('Total deals:', brands.length);
      console.log('Unique brands:', uniqueBrands.length);
      
      if (brands.length === uniqueBrands.length) {
        console.log('✅ SUCCESS! Each deal is from a different brand!');
      } else {
        console.log('❌ ISSUE: Some brands appear multiple times');
        
        const brandCounts = {};
        brands.forEach(b => {
          brandCounts[b] = (brandCounts[b] || 0) + 1;
        });
        
        const duplicates = Object.entries(brandCounts).filter(([b, count]) => count > 1);
        if (duplicates.length > 0) {
          console.log('\n🔍 Brands appearing multiple times:');
          duplicates.forEach(([brand, count]) => {
            console.log(`  - ${brand}: ${count} times`);
          });
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyCache();
