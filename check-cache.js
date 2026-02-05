const admin = require('firebase-admin');
const serviceAccount = require('./functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCache() {
  const cacheDoc = await db.collection('homepageCache').doc('current').get();
  
  if (!cacheDoc.exists) {
    console.log('❌ Cache does not exist!');
    return;
  }
  
  const data = cacheDoc.data();
  console.log('✅ Cache exists');
  console.log('Last updated:', data.lastUpdated?.toDate());
  console.log('Trending deals count:', data.trendingDeals?.length || 0);
  
  if (data.trendingDeals && data.trendingDeals.length > 0) {
    // Check for duplicate brands
    const brands = data.trendingDeals.map(d => d.brand);
    const uniqueBrands = [...new Set(brands)];
    
    console.log('\n📊 Brand Analysis:');
    console.log('Total deals:', brands.length);
    console.log('Unique brands:', uniqueBrands.length);
    console.log('Duplicate brands:', brands.length - uniqueBrands.length);
    
    // Show brand counts
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

checkCache().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
