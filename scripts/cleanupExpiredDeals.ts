#!/usr/bin/env tsx
/**
 * Cleanup Script for Expired Active Deals
 *
 * This script marks expired deals as inactive in Firestore.
 *
 * Usage:
 *   npx tsx scripts/cleanupExpiredDeals.ts [options]
 *
 * Options:
 *   --dry-run          Show what would be updated without making changes (default)
 *   --execute          Actually perform the cleanup
 *   --brand <name>     Only clean up deals from specific brand
 *   --days <number>    Only clean up deals expired for X+ days (default: 0)
 *   --batch <number>   Batch size for updates (default: 50)
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const specificBrand = args.includes('--brand') ? args[args.indexOf('--brand') + 1] : null;
const minExpiredDays = args.includes('--days') ? parseInt(args[args.indexOf('--days') + 1]) : 0;
const batchSize = args.includes('--batch') ? parseInt(args[args.indexOf('--batch') + 1]) : 50;

interface ExpiredDeal {
  id: string;
  brand: string;
  title: string;
  expiresAt: Date;
  daysExpired: number;
}

async function cleanupExpiredDeals() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CLEANUP SCRIPT: Expired Active Deals');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (isDryRun) {
    console.log('🔍 MODE: DRY RUN (no changes will be made)');
    console.log('   Use --execute to actually perform the cleanup\n');
  } else {
    console.log('⚠️  MODE: EXECUTE (changes will be made to Firestore)');
    console.log('   Press Ctrl+C now to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  if (specificBrand) {
    console.log(`🎯 FILTER: Brand = "${specificBrand}"`);
  }
  if (minExpiredDays > 0) {
    console.log(`🎯 FILTER: Expired for ${minExpiredDays}+ days`);
  }
  console.log(`📦 BATCH SIZE: ${batchSize} deals per batch\n`);

  try {
    // Initialize Firebase
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getFirestore(app);

    console.log('✅ Connected to Firestore');
    console.log(`📊 Project: ${firebaseConfig.projectId}\n`);

    // Fetch all active deals (with expiry filter to reduce data transfer)
    console.log('🔍 Fetching active deals that might be expired...');
    const today = new Date();
    const activeDealsQuery = query(
      collection(db, 'deals_fresh'),
      where('status', '==', 'active'),
      where('expiresAt', '<', Timestamp.fromDate(today))
    );

    const snapshot = await getDocs(activeDealsQuery);
    console.log(`✅ Found ${snapshot.size} expired active deals\n`);

    // Process expired deals
    console.log('🔍 Processing expired deals...');
    const now = new Date();
    const expiredDeals: ExpiredDeal[] = [];

    snapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();

      // Skip if brand filter doesn't match
      if (specificBrand && data.brand !== specificBrand) {
        return;
      }

      const expiryDate = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt.seconds * 1000);
      const daysExpired = Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));

      // Apply days filter
      if (daysExpired >= minExpiredDays) {
        expiredDeals.push({
          id: docSnapshot.id,
          brand: data.brand || 'Unknown',
          title: data.title || data.brand || 'Untitled',
          expiresAt: expiryDate,
          daysExpired
        });
      }
    });

    console.log(`✅ Found ${expiredDeals.length} expired deals matching criteria\n`);

    if (expiredDeals.length === 0) {
      console.log('✨ No expired deals to clean up. All done!');
      return;
    }

    // Show summary by brand
    const brandCounts = new Map<string, number>();
    expiredDeals.forEach(deal => {
      brandCounts.set(deal.brand, (brandCounts.get(deal.brand) || 0) + 1);
    });

    console.log('📊 Breakdown by Brand:');
    console.log('─'.repeat(60));
    Array.from(brandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([brand, count]) => {
        const percentage = ((count / expiredDeals.length) * 100).toFixed(1);
        console.log(`   ${brand.padEnd(30)} ${count.toString().padStart(5)} (${percentage}%)`);
      });
    if (brandCounts.size > 10) {
      console.log(`   ... and ${brandCounts.size - 10} more brands`);
    }
    console.log('');

    // Show sample deals
    console.log('📋 Sample Deals to be Deactivated (first 10):');
    console.log('─'.repeat(60));
    expiredDeals.slice(0, 10).forEach((deal, idx) => {
      console.log(`${idx + 1}. ${deal.title}`);
      console.log(`   Brand: ${deal.brand}`);
      console.log(`   Expired: ${deal.expiresAt.toLocaleDateString()} (${deal.daysExpired} days ago)`);
      console.log('');
    });

    if (isDryRun) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('🔍 DRY RUN COMPLETE - No changes made');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`\n✨ Summary: ${expiredDeals.length} deals would be marked as inactive\n`);
      console.log('To execute the cleanup, run:');
      console.log('   npx tsx scripts/cleanupExpiredDeals.ts --execute\n');
      return;
    }

    // Execute cleanup
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('⚙️  EXECUTING CLEANUP...');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let processedCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Process in batches
    for (let i = 0; i < expiredDeals.length; i += batchSize) {
      const batch = writeBatch(db);
      const currentBatch = expiredDeals.slice(i, Math.min(i + batchSize, expiredDeals.length));

      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(expiredDeals.length / batchSize)}...`);

      try {
        currentBatch.forEach(deal => {
          const dealRef = doc(db, 'deals_fresh', deal.id);
          batch.update(dealRef, {
            status: 'inactive',
            deactivatedAt: Timestamp.now(),
            deactivationReason: 'expired',
            previousStatus: 'active'
          });
        });

        await batch.commit();
        processedCount += currentBatch.length;
        console.log(`   ✅ Updated ${currentBatch.length} deals (Total: ${processedCount}/${expiredDeals.length})`);
      } catch (error) {
        errorCount += currentBatch.length;
        console.log(`   ❌ Batch failed: ${error}`);
        currentBatch.forEach(deal => {
          errors.push({ id: deal.id, error: String(error) });
        });
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ CLEANUP COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📊 Results:');
    console.log(`   ✅ Successfully updated: ${processedCount} deals`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed: ${errorCount} deals`);
    }
    console.log('');

    if (errors.length > 0) {
      console.log('⚠️  Errors encountered:');
      errors.slice(0, 5).forEach(err => {
        console.log(`   - Deal ${err.id}: ${err.error}`);
      });
      if (errors.length > 5) {
        console.log(`   ... and ${errors.length - 5} more errors`);
      }
      console.log('');
    }

    // Verify new count
    console.log('🔍 Verifying new active deals count...');
    const newActiveQuery = query(
      collection(db, 'deals_fresh'),
      where('status', '==', 'active')
    );
    const newSnapshot = await getDocs(newActiveQuery);
    const newCount = newSnapshot.size;

    // Get old count (all active before cleanup)
    const oldCount = newCount + processedCount;

    console.log(`\n📊 Before: ${oldCount} active deals`);
    console.log(`📊 After:  ${newCount} active deals`);
    console.log(`📊 Removed: ${oldCount - newCount} expired deals\n`);

    if (oldCount - newCount === processedCount) {
      console.log('✅ Count matches expected reduction!');
    } else {
      console.log('⚠️  Count mismatch - some deals may need manual review');
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  }
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Cleanup Script for Expired Active Deals

Usage:
  npx tsx scripts/cleanupExpiredDeals.ts [options]

Options:
  --dry-run          Show what would be updated without making changes (default)
  --execute          Actually perform the cleanup
  --brand <name>     Only clean up deals from specific brand
  --days <number>    Only clean up deals expired for X+ days (default: 0)
  --batch <number>   Batch size for updates (default: 50)
  --help, -h         Show this help message

Examples:
  # Dry run to see what would be cleaned up
  npx tsx scripts/cleanupExpiredDeals.ts

  # Execute cleanup of all expired deals
  npx tsx scripts/cleanupExpiredDeals.ts --execute

  # Clean up only GhostBikes.com deals
  npx tsx scripts/cleanupExpiredDeals.ts --execute --brand "GhostBikes.com"

  # Clean up only deals expired for 7+ days
  npx tsx scripts/cleanupExpiredDeals.ts --execute --days 7

  # Clean up in smaller batches of 10
  npx tsx scripts/cleanupExpiredDeals.ts --execute --batch 10
  `);
  process.exit(0);
}

// Run the cleanup
cleanupExpiredDeals().then(() => {
  console.log('👋 Done!\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
