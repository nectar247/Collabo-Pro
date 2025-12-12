// scripts/populate-homepage-cache.js
// Run this script once to populate the homepage cache manually
// Usage: node scripts/populate-homepage-cache.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You'll need this file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

async function populateHomepageCache() {
  console.log('🔄 Starting homepage cache population...');
  const startTime = Date.now();

  try {
    // 1️⃣ Fetch Top 8 Active Categories
    console.log('📦 Fetching categories...');
    const categoriesSnapshot = await firestore
      .collection('categories')
      .where('status', '==', 'active')
      .where('dealCount', '>', 0)
      .orderBy('dealCount', 'desc')
      .limit(8)
      .get();

    const categories = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ Found ${categories.length} categories`);

    // 2️⃣ Fetch Featured Brands
    console.log('📦 Fetching featured brands...');
    const featuredBrandsSnapshot = await firestore
      .collection('brands')
      .where('status', '==', 'active')
      .where('brandimg', '!=', '')
      .where('activeDeals', '>', 0)
      .orderBy('brandimg', 'asc')
      .orderBy('activeDeals', 'desc')
      .limit(50)
      .get();

    const featuredBrands = featuredBrandsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ Found ${featuredBrands.length} featured brands`);

    // 3️⃣ Fetch Trending Deals
    console.log('📦 Fetching trending deals...');
    const trendingDealsSnapshot = await firestore
      .collection('deals_fresh')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const trendingDeals = trendingDealsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ Found ${trendingDeals.length} trending deals`);

    // 4️⃣ Fetch Popular Searches
    console.log('📦 Fetching popular searches...');
    const searchesSnapshot = await firestore
      .collection('search_history')
      .orderBy('count', 'desc')
      .limit(10)
      .get();

    const popularSearches = searchesSnapshot.docs.map(doc => doc.data().term);
    console.log(`✅ Found ${popularSearches.length} popular searches`);

    // 5️⃣ Fetch Footer Brands
    console.log('📦 Fetching footer brands...');
    const footerBrandsSnapshot = await firestore
      .collection('brands')
      .where('status', '==', 'active')
      .where('activeDeals', '>', 0)
      .orderBy('activeDeals', 'desc')
      .limit(15)
      .get();

    const footerBrands = footerBrandsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ Found ${footerBrands.length} footer brands`);

    // 6️⃣ Write to homepageCache
    const cacheData = {
      categories,
      featuredBrands,
      trendingDeals,
      popularSearches,
      footerBrands,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      version: 1
    };

    await firestore.collection('homepageCache').doc('current').set(cacheData);

    const duration = Date.now() - startTime;
    console.log(`🎉 Homepage cache populated successfully in ${duration}ms`);
    console.log(`📊 Stats: ${categories.length} cats, ${featuredBrands.length} brands, ${trendingDeals.length} deals`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating cache:', error);
    process.exit(1);
  }
}

populateHomepageCache();
