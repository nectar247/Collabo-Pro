// scripts/populate-cache-simple.mjs
// Quick script to populate homepage cache using Firebase client SDK
// Run: node scripts/populate-cache-simple.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Read Firebase config from .env file
const envContent = readFileSync('.env', 'utf-8');
const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.+)`));
  return match ? match[1].trim().replace(/['"]/g, '') : '';
};

const firebaseConfig = {
  apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID'),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function populateHomepageCache() {
  console.log('🔄 Starting homepage cache population...');
  const startTime = Date.now();

  try {
    // 1️⃣ Fetch Top 8 Active Categories
    console.log('📦 Fetching categories...');
    const categoriesQuery = query(
      collection(db, 'categories'),
      where('status', '==', 'active'),
      where('dealCount', '>', 0),
      orderBy('dealCount', 'desc'),
      limit(8)
    );
    const categoriesSnapshot = await getDocs(categoriesQuery);
    const categories = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ Found ${categories.length} categories`);

    // 2️⃣ Fetch Featured Brands
    console.log('📦 Fetching featured brands...');
    const featuredBrandsQuery = query(
      collection(db, 'brands'),
      where('status', '==', 'active'),
      where('brandimg', '!=', ''),
      where('activeDeals', '>', 0),
      orderBy('brandimg', 'asc'),
      orderBy('activeDeals', 'desc'),
      limit(50)
    );
    const featuredBrandsSnapshot = await getDocs(featuredBrandsQuery);
    const featuredBrands = featuredBrandsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ Found ${featuredBrands.length} featured brands`);

    // 3️⃣ Fetch Trending Deals
    console.log('📦 Fetching trending deals...');
    const trendingDealsQuery = query(
      collection(db, 'deals_fresh'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const trendingDealsSnapshot = await getDocs(trendingDealsQuery);
    const trendingDeals = trendingDealsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ Found ${trendingDeals.length} trending deals`);

    // 4️⃣ Fetch Popular Searches
    console.log('📦 Fetching popular searches...');
    const searchesQuery = query(
      collection(db, 'search_history'),
      orderBy('count', 'desc'),
      limit(10)
    );
    const searchesSnapshot = await getDocs(searchesQuery);
    const popularSearches = searchesSnapshot.docs.map(doc => doc.data().term);
    console.log(`✅ Found ${popularSearches.length} popular searches`);

    // 5️⃣ Fetch Footer Brands
    console.log('📦 Fetching footer brands...');
    const footerBrandsQuery = query(
      collection(db, 'brands'),
      where('status', '==', 'active'),
      where('activeDeals', '>', 0),
      orderBy('activeDeals', 'desc'),
      limit(15)
    );
    const footerBrandsSnapshot = await getDocs(footerBrandsQuery);
    const footerBrands = footerBrandsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ Found ${footerBrands.length} footer brands`);

    // 6️⃣ Write to homepageCache
    console.log('💾 Writing cache to Firestore...');
    const cacheData = {
      categories,
      featuredBrands,
      trendingDeals,
      popularSearches,
      footerBrands,
      lastUpdated: serverTimestamp(),
      version: 1
    };

    const cacheRef = doc(db, 'homepageCache', 'current');
    await setDoc(cacheRef, cacheData);

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
