#!/usr/bin/env tsx
/**
 * Backend script to verify the actual active deals count in Firestore
 * Run with: npx tsx scripts/checkActiveDeals.ts
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

// Import Firebase config from the main app
// This ensures we use the same config as the running application
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate config
if (!firebaseConfig.projectId) {
  console.error('❌ Firebase config is missing! Please ensure environment variables are set.');
  console.error('   Required: NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  console.error('   Run with: NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id npx tsx scripts/checkActiveDeals.ts');
  process.exit(1);
}

async function checkActiveDeals() {
  console.log('🔍 Verifying Active Deals Count\n');
  console.log('='.repeat(60));

  try {
    // Initialize Firebase
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getFirestore(app);

    console.log('✅ Connected to Firebase');
    console.log(`📊 Project ID: ${firebaseConfig.projectId}\n`);

    // Method 1: Using getCountFromServer (efficient)
    console.log('Method 1: getCountFromServer (Efficient Query)');
    console.log('-'.repeat(60));
    const startTime1 = Date.now();

    const activeDealsQuery = query(
      collection(db, 'deals_fresh'),
      where('status', '==', 'active')
    );

    const countSnapshot = await getCountFromServer(activeDealsQuery);
    const activeCount = countSnapshot.data().count;
    const time1 = Date.now() - startTime1;

    console.log(`✅ Active deals (server count): ${activeCount}`);
    console.log(`⏱️  Query time: ${time1}ms\n`);

    // Method 2: Using getDocs then counting (guaranteed accurate)
    console.log('Method 2: getDocs then count (Full Document Fetch)');
    console.log('-'.repeat(60));
    const startTime2 = Date.now();

    const snapshot = await getDocs(activeDealsQuery);
    const activeCountDocs = snapshot.size;
    const time2 = Date.now() - startTime2;

    console.log(`✅ Active deals (document count): ${activeCountDocs}`);
    console.log(`⏱️  Query time: ${time2}ms\n`);

    // Method 3: Get all deals and filter by status
    console.log('Method 3: All Deals Analysis');
    console.log('-'.repeat(60));
    const startTime3 = Date.now();

    const allDealsSnapshot = await getDocs(collection(db, 'deals_fresh'));
    const allDeals = allDealsSnapshot.docs;

    const statusCounts: Record<string, number> = {};
    const expiryAnalysis = {
      active: 0,
      expired: 0,
      noExpiry: 0,
    };

    allDeals.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Check expiry
      if (data.status === 'active') {
        if (data.expiresAt) {
          const expiryDate = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt.seconds * 1000);
          if (expiryDate > new Date()) {
            expiryAnalysis.active++;
          } else {
            expiryAnalysis.expired++;
          }
        } else {
          expiryAnalysis.noExpiry++;
        }
      }
    });

    const time3 = Date.now() - startTime3;

    console.log(`📊 Total deals in collection: ${allDeals.length}`);
    console.log(`📊 Status breakdown:`);
    Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
      const percentage = ((count / allDeals.length) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / 50));
      console.log(`   - ${status.padEnd(15)}: ${count.toString().padStart(5)} (${percentage}%) ${bar}`);
    });
    console.log(`\n📊 Expiry analysis for active deals:`);
    console.log(`   - Not expired: ${expiryAnalysis.active}`);
    console.log(`   - Expired: ${expiryAnalysis.expired}`);
    console.log(`   - No expiry date: ${expiryAnalysis.noExpiry}`);
    console.log(`⏱️  Query time: ${time3}ms\n`);

    // Compare with expected count
    console.log('='.repeat(60));
    console.log('📝 Summary:');
    console.log('-'.repeat(60));
    console.log(`Expected count (from UI): 1473`);
    console.log(`Actual count (Method 1):  ${activeCount}`);
    console.log(`Actual count (Method 2):  ${activeCountDocs}`);
    console.log(`Actual count (Method 3):  ${statusCounts['active'] || 0}`);

    if (activeCount === 1473) {
      console.log(`\n✅ Count matches expected value (1473)`);
    } else {
      console.log(`\n⚠️  Count DOES NOT match expected value!`);
      console.log(`   Difference: ${Math.abs(activeCount - 1473)} deals`);
      if (activeCount < 1473) {
        console.log(`   ${1473 - activeCount} deals may have been deactivated or expired`);
      } else {
        console.log(`   ${activeCount - 1473} new deals may have been added`);
      }
    }

    // Sample some active deals
    console.log('\n📋 Sample Active Deals (first 5):');
    console.log('-'.repeat(60));
    const activeDealsDocs = allDeals.filter(doc => doc.data().status === 'active').slice(0, 5);
    activeDealsDocs.forEach((doc, idx) => {
      const data = doc.data();
      const title = data.title || data.brand || 'Untitled';
      const brand = data.brand || 'Unknown';
      const expiryDate = data.expiresAt ? (data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt.seconds * 1000)) : null;
      console.log(`${idx + 1}. ${title}`);
      console.log(`   Brand: ${brand}`);
      console.log(`   Expires: ${expiryDate ? expiryDate.toLocaleDateString() : 'No expiry'}`);
      console.log(`   Created: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}`);
    });

    // Export expired deals to a file for manual inspection
    console.log('\n📝 Exporting expired deals for manual inspection...');
    const expiredActiveDeals = allDeals.filter(doc => {
      const data = doc.data();
      if (data.status !== 'active') return false;
      if (!data.expiresAt) return false;
      const expiryDate = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt.seconds * 1000);
      return expiryDate < new Date();
    });

    const expiredDealsData = expiredActiveDeals.map(doc => {
      const data = doc.data();
      const expiryDate = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt.seconds * 1000);
      const createdDate = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt.seconds * 1000)) : null;

      return {
        id: doc.id,
        title: data.title || 'Untitled',
        brand: data.brand || 'Unknown',
        status: data.status,
        expiresAt: expiryDate.toISOString(),
        expiresAtReadable: expiryDate.toLocaleDateString('en-GB'),
        createdAt: createdDate ? createdDate.toISOString() : null,
        createdAtReadable: createdDate ? createdDate.toLocaleDateString('en-GB') : 'Unknown',
        daysExpired: Math.floor((new Date().getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24)),
        category: data.category || 'Unknown',
        code: data.code || '',
        link: data.link || '',
        description: data.description || '',
        // Include raw data for API inspection
        rawData: data.rawData || null,
      };
    });

    // Sort by most recently expired first
    expiredDealsData.sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime());

    // Write to JSON file
    const fs = require('fs');
    const outputPath = './scripts/expired-active-deals.json';
    fs.writeFileSync(outputPath, JSON.stringify(expiredDealsData, null, 2));
    console.log(`✅ Exported ${expiredDealsData.length} expired deals to: ${outputPath}`);

    // Show first 20 expired deals in console
    console.log('\n🔴 Sample Expired Active Deals (first 20):');
    console.log('-'.repeat(60));
    expiredDealsData.slice(0, 20).forEach((deal, idx) => {
      console.log(`${idx + 1}. ${deal.title}`);
      console.log(`   ID: ${deal.id}`);
      console.log(`   Brand: ${deal.brand}`);
      console.log(`   Category: ${deal.category}`);
      console.log(`   Expired: ${deal.expiresAtReadable} (${deal.daysExpired} days ago)`);
      console.log(`   Created: ${deal.createdAtReadable}`);
      if (deal.code) console.log(`   Code: ${deal.code}`);
      if (deal.link) console.log(`   Link: ${deal.link.substring(0, 80)}...`);
      console.log('');
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the check
checkActiveDeals().then(() => {
  console.log('👋 Exiting...');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
