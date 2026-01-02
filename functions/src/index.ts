import * as functions from "firebase-functions/v1";
import admin from "firebase-admin";
import axios from "axios";
import { determineLabel, extractCode, extractDiscount } from "./helpers/index.js";

admin.initializeApp();

export const syncAwinBrands = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .pubsub.schedule("every 1 hours")
  .onRun(async () => {
    // 🔄 Deployed from local /functions - Dec 11, 2025
    const accessToken = "336a9ae4-df0b-4fab-9a83-a6f3c7736b6f";
    const endpoint = "https://api.awin.com/publishers/1822416/programmes";

    try {
      const firestore = admin.firestore();
      const now = admin.firestore.FieldValue.serverTimestamp();

      // 1️⃣ Load all existing programmeIds once
      const existingSnapshot = await firestore.collection("brands").get();
      const existingMap = new Map<string, FirebaseFirestore.DocumentReference>();

      existingSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.programmeId != null) {
          existingMap.set(data.programmeId.toString(), doc.ref);
        }
      });

      console.log(`✅ Loaded ${existingMap.size} existing programmeIds`);

      // 2️⃣ Call the Awin API
      const { data } = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!Array.isArray(data)) {
        console.error("❌ Unexpected API response format");
        return null;
      }

      console.log(`📦 Retrieved ${data.length} programmes from Awin`);

      // 3️⃣ Use BulkWriter for high-performance writes
      const writer = firestore.bulkWriter();
      let count = 0;

      writer.onWriteResult(() => {
        count++;
        if (count % 500 === 0) {
          console.log(`🔁 ${count} written so far...`);
        }
      });

      for (const programme of data) {
        const programmeId = programme.id.toString();
        const docRef = existingMap.get(programmeId) || firestore.collection("brands").doc();

        const payload: any = {
          programmeId, // Save for future lookup
          id: docRef.id,
          name: programme.name,
          description: programme.description,
          activeDeals: 0,
          status: programme.status?.toLowerCase() || "inactive",
          updatedAt: now,
          rawData: programme,
          logo: programme.logoUrl,
          source: "awin-api",
        };

        if (!existingMap.has(programmeId)) {
          payload.createdAt = now;
        }

        if (!existingMap.has(programmeId)) {
          writer.set(docRef, payload, { merge: true });
        } else {
          console.log(`Skipped existing brand(${programme.name}) ProgramId: ${programmeId}`)
        }
      }

      await writer.close();
      console.log(`🎉 Finished writing ${count} records`);
      return null;

    } catch (error) {
      console.error("❌ Sync error:", error instanceof Error ? error.message : error);
      return null;
    }
  });

export const syncAwinPromotions = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .pubsub.schedule("every 5 hours")
  .onRun(async (context) => {
    try {
      // 🧹 Auto-cleanup enabled - Deployed from local /functions - Dec 11, 2025
      const accessToken = "336a9ae4-df0b-4fab-9a83-a6f3c7736b6f";
      const endpoint = "https://api.awin.com/publisher/1822416/promotions";
      const firestore = admin.firestore();
      const now = admin.firestore.FieldValue.serverTimestamp();

      // 1️⃣ Fetch existing promotions
      const existingSnap = await firestore.collection("deals_fresh").get();
      const existingDocs = new Map(existingSnap.docs.map(d => [d.id, d.data()]));

      // 2️⃣ Fetch new data
      let promotions: any[] = [];
      let page = 1;
      const pageSize = 200;

      while (true) {
        const resp = await axios.post(endpoint, {
          filters: { membership: "joined" },
          pagination: { page, pageSize }
        }, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        });

        if (!Array.isArray(resp.data?.data)) {
          throw new Error("Invalid API response structure");
        }

        promotions.push(...resp.data.data);
        if (resp.data.data.length < pageSize) break;
        page++;
      }

      // 3️⃣ Process in transaction
      await firestore.runTransaction(async (transaction) => {
        const batch = firestore.batch();
        let skippedCount = 0;
        let updatedCount = 0;
        let addedCount = 0;

        for (const promo of promotions) {
          const promotionId = promo.promotionId?.toString();
          if (!promotionId) continue;

          const brandName = promo.advertiser?.name;
          if (!brandName) {
            console.warn(`Skipping promotion ${promotionId} - missing brand name`);
            continue;
          }

          // 1️⃣ Skip if document exists and hasn't changed
          if (existingDocs.has(promotionId)) {
            console.log(`⏩ Skipping unchanged promotion: ${promotionId}`);
            skippedCount++;
            continue;
          }

          // 2️⃣ Get brand details with primary sector
          let brandDetails: any = {};
          const brandQuery = await transaction.get(
            firestore.collection("brands")
              .where("name", "==", brandName)
              .limit(1)
          );

          // FIX: Check if brand exists BEFORE using brandDetails
          if (!brandQuery.empty) {
            brandDetails = brandQuery.docs[0].data();
          } else {
            // FIX: Create new brand without self-referencing bugs
            const cate = "General"; // Default category for new brands
            brandDetails = {
              name: brandName,
              programmeId: promo.advertiser?.id?.toString() || "",
              primarySector: cate,
              createdAt: now,
              updatedAt: now,
              id: promo.advertiser?.id?.toString() || "",
              logo: promo.advertiser?.logoUrl?.toString() || "", // FIX: Safe optional chaining
              status: "active", // FIX: Don't reference brandDetails.status
              activeDeals: 0,
            };
          }

          const docRef = firestore.collection("deals_fresh").doc(promotionId);
          // FIX: Use brandDetails.rawData safely after checking if brand exists
          const category = brandDetails.rawData?.primarySector?.toString() || "General";

          const payload: any = {
            promotionId,
            title: promo.title || "",
            description: promo.description || "",
            brand: brandName,
            brandDetails,
            category,
            discount: extractDiscount(promo.title || "", promo.description || ""),
            code: extractCode(promo),
            label: determineLabel(promo),
            link: promo.urlTracking || "",
            terms: promo.terms || "See website for details",
            status: /(active|expiringsoon)/i.test(promo.status || "") ? "active" : "inactive",
            startsAt: promo.startDate
              ? admin.firestore.Timestamp.fromDate(new Date(promo.startDate))
              : admin.firestore.Timestamp.now(),
            expiresAt: promo.endDate
              ? admin.firestore.Timestamp.fromDate(new Date(promo.endDate))
              : admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            source: "awin-api-promotions",
            joined: promo.advertiser?.joined === true,
            rawData: promo,
            updatedAt: now,
            manuallyAdded: false,
            ...(!existingDocs.has(promotionId) && { createdAt: now }) // Only set for new docs
          };

          batch.set(docRef, payload);
          existingDocs.has(promotionId) ? updatedCount++ : addedCount++;
          console.log(`⏩ written promotion: ${promotionId}`);
        }

        // Delete stale promotions (not in new fetch) - BUT PRESERVE MANUALLY ADDED DEALS
        const fetchedIds = new Set(promotions.map(p => p.promotionId?.toString()).filter(Boolean));
        let deletedCount = 0;

        existingDocs.forEach((docData, id) => {
          // Skip deletion if this is a manually added deal
          if (docData.manuallyAdded === true) {
            console.log(`⏩ Preserving manually added deal: ${id}`);
            return;
          }

          // Delete only non-manually-added deals that weren't fetched from API
          if (!fetchedIds.has(id)) {
            batch.delete(firestore.collection("deals_fresh").doc(id));
            deletedCount++;
          }
        });

        await batch.commit();
        console.log(`
          📊 Sync Report:
          Added: ${addedCount}
          Updated: ${updatedCount}
          Skipped: ${skippedCount}
          Deleted: ${deletedCount}
        `);
      });

      // 🆕 CLEANUP EXPIRED DEALS - Auto cleanup after sync
      console.log("🧹 Starting expired deals cleanup...");
      await cleanupExpiredDeals(firestore);

      return null;

    } catch (error: any) {
      console.error("❌ Sync failed:", {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });

// 🆕 NEW FUNCTION: Cleanup expired deals
async function cleanupExpiredDeals(firestore: admin.firestore.Firestore) {
  try {
    const now = new Date();
    const batch = firestore.batch();

    // Query for expired active deals
    const expiredDealsQuery = firestore.collection("deals_fresh")
      .where("status", "==", "active")
      .where("expiresAt", "<", admin.firestore.Timestamp.fromDate(now));

    const expiredSnapshot = await expiredDealsQuery.get();

    if (expiredSnapshot.empty) {
      console.log("✅ No expired deals to clean up");
      return;
    }

    console.log(`🔍 Found ${expiredSnapshot.size} expired deals to deactivate`);

    // Batch update expired deals
    expiredSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: "inactive",
        deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        deactivationReason: "expired",
        previousStatus: "active"
      });
    });

    await batch.commit();
    console.log(`✅ Successfully deactivated ${expiredSnapshot.size} expired deals`);

  } catch (error: any) {
    console.error("❌ Cleanup failed:", error.message);
    // Don't throw - let the main sync continue even if cleanup fails
  }
}

export const scheduledBrandsDealCountUpdate = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .pubsub.schedule("every 5 hours")
  .timeZone("UTC")
  .onRun(async () => {
    // 📊 Brand count updater - Deployed from local /functions - Dec 11, 2025
    const db = admin.firestore();
    const bulkWriter = db.bulkWriter();

    // Optional: Error handler
    bulkWriter.onWriteError((error) => {
      console.error("BulkWriter Error:", error.message);
      // Retry on internal errors or UNAVAILABLE
      return error.code === 13 || error.code === 14;
    });

    const brandsSnapshot = await db.collection("brands").get();

    for (const brandDoc of brandsSnapshot.docs) {
      const brandName = brandDoc.data().name;

      const dealsSnapshot = await db.collection("deals_fresh") // FIX: Changed from "deals" to "deals_fresh"
        .where("brand", "==", brandName)
        .where("status", "==", "active")
        .get();

      const validDeals = dealsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.expiresAt?.toDate() > new Date();
      });

      bulkWriter.update(brandDoc.ref, {
        activeDeals: validDeals.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await bulkWriter.close(); // Finish and flush all writes
    console.log("✔️ BulkWriter: All brands updated.");
    return null;
  });

export const scheduledCategoriesDealCountUpdate = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .pubsub.schedule("every 5 hours")
  .timeZone("UTC")
  .onRun(async () => {
    // 🏷️ Category count updater - Deployed from local /functions - Dec 11, 2025
    const db = admin.firestore();
    const bulkWriter = db.bulkWriter();

    bulkWriter.onWriteError((error) => {
      console.error("BulkWriter Error:", error.message);
      // Retry on internal errors or UNAVAILABLE
      return error.code === 13 || error.code === 14;
    });

    const categoriesSnapshot = await db.collection("categories").get();

    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryName = categoryDoc.data().name;

      const dealsSnapshot = await db.collection("deals_fresh") // FIX: Changed from "deals" to "deals_fresh"
        .where("category", "==", categoryName)
        .where("status", "==", "active")
        .get();

      const validDeals = dealsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.expiresAt?.toDate() > new Date();
      });

      bulkWriter.update(categoryDoc.ref, {
        dealCount: validDeals.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await bulkWriter.close(); // Finish and flush all writes
    console.log("✔️ BulkWriter: All categories updated.");
    return null;
  });

/**
 * Shuffle deals to avoid consecutive deals from the same brand
 * Uses a greedy algorithm to maximize brand diversity
 */
function shuffleDealsAvoidConsecutiveBrands(deals: any[]): any[] {
  if (deals.length <= 1) return deals;

  const result: any[] = [];
  const remaining = [...deals];

  // Pick first deal randomly
  const firstIndex = Math.floor(Math.random() * remaining.length);
  result.push(remaining.splice(firstIndex, 1)[0]);

  // For each subsequent position, try to pick a deal from a different brand
  while (remaining.length > 0) {
    const lastBrand = result[result.length - 1].brand;

    // Find deals from different brands
    const differentBrandDeals = remaining.filter(deal => deal.brand !== lastBrand);

    if (differentBrandDeals.length > 0) {
      // Pick randomly from deals with different brands
      const randomIndex = Math.floor(Math.random() * differentBrandDeals.length);
      const selectedDeal = differentBrandDeals[randomIndex];
      const indexInRemaining = remaining.indexOf(selectedDeal);
      result.push(remaining.splice(indexInRemaining, 1)[0]);
    } else {
      // All remaining deals are from the same brand, just pick the first one
      result.push(remaining.splice(0, 1)[0]);
    }
  }

  return result;
}

/**
 * Homepage Cache Refresh Function
 * Runs every 6 hours to pre-calculate and cache homepage data
 * This dramatically improves homepage performance by eliminating multiple Firebase queries
 */
export const refreshHomepageCache = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .pubsub.schedule("every 6 hours")
  .onRun(async () => {
    console.log("🔄 [HomepageCache] Starting homepage cache refresh...");
    const firestore = admin.firestore();
    const startTime = Date.now();

    try {
      // 1️⃣ Fetch Top 8 Active Categories (with deals, sorted by dealCount)
      console.log("📦 [HomepageCache] Fetching categories...");
      const categoriesSnapshot = await firestore
        .collection("categories")
        .where("status", "==", "active")
        .where("dealCount", ">", 0)
        .orderBy("dealCount", "desc")
        .limit(8)
        .get();

      const categories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`✅ [HomepageCache] Found ${categories.length} categories`);

      // 2️⃣ Fetch Featured Brands (with images, active deals > 0)
      console.log("📦 [HomepageCache] Fetching featured brands...");
      const featuredBrandsSnapshot = await firestore
        .collection("brands")
        .where("status", "==", "active")
        .where("brandimg", "!=", "")
        .where("activeDeals", ">", 0)
        .orderBy("brandimg", "asc")
        .orderBy("activeDeals", "desc")
        .limit(50)
        .get();

      const featuredBrands = featuredBrandsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`✅ [HomepageCache] Found ${featuredBrands.length} featured brands`);

      // 3️⃣ Fetch Trending Deals (top 20, excluding expired)
      console.log("📦 [HomepageCache] Fetching trending deals...");
      const now = admin.firestore.Timestamp.now();
      const trendingDealsSnapshot = await firestore
        .collection("deals_fresh")
        .where("status", "==", "active")
        .where("expiresAt", ">", now)
        .orderBy("expiresAt", "asc")
        .orderBy("createdAt", "desc")
        .limit(30)
        .get();

      const trendingDealsRaw = trendingDealsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .slice(0, 20);

      // Shuffle deals to avoid consecutive deals from the same brand
      const trendingDeals = shuffleDealsAvoidConsecutiveBrands(trendingDealsRaw);
      console.log(`✅ [HomepageCache] Found ${trendingDeals.length} trending deals (shuffled, non-expired)`);

      // 4️⃣ Fetch Popular Searches (top 10 from search history)
      console.log("📦 [HomepageCache] Fetching popular searches...");
      const searchesSnapshot = await firestore
        .collection("search_history")
        .orderBy("count", "desc")
        .limit(10)
        .get();

      const popularSearches = searchesSnapshot.docs.map(doc => doc.data().term as string);
      console.log(`✅ [HomepageCache] Found ${popularSearches.length} popular searches`);

      // 5️⃣ Fetch Footer Brands (top 15 by activeDeals)
      console.log("📦 [HomepageCache] Fetching footer brands...");
      const footerBrandsSnapshot = await firestore
        .collection("brands")
        .where("status", "==", "active")
        .where("activeDeals", ">", 0)
        .orderBy("activeDeals", "desc")
        .limit(15)
        .get();

      const footerBrands = footerBrandsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`✅ [HomepageCache] Found ${footerBrands.length} footer brands`);

      // 6️⃣ Write to homepageCache collection
      const cacheData = {
        categories,
        featuredBrands,
        trendingDeals,
        popularSearches,
        footerBrands,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        version: 1
      };

      await firestore.collection("homepageCache").doc("current").set(cacheData);

      const duration = Date.now() - startTime;
      console.log(`🎉 [HomepageCache] Cache refreshed successfully in ${duration}ms`);
      console.log(`📊 [HomepageCache] Stats: ${categories.length} cats, ${featuredBrands.length} brands, ${trendingDeals.length} deals`);

      return null;
    } catch (error) {
      console.error("❌ [HomepageCache] Error refreshing cache:", error instanceof Error ? error.message : error);
      return null;
    }
  });

// EOF functions/src/index.ts - signed Dcsn