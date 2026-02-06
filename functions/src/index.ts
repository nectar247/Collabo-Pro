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
  .onRun(async () => {
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

      // 3️⃣ OPTIMIZATION: Load all brands ONCE before processing promotions
      console.log("📦 Loading all brands into memory...");
      const allBrandsSnapshot = await firestore.collection("brands").get();
      const brandsMap = new Map<string, any>();

      allBrandsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.name) {
          brandsMap.set(data.name, {
            id: doc.id,
            ...data
          });
        }
      });

      console.log(`✅ Loaded ${brandsMap.size} brands into memory`);

      // 4️⃣ Process in batch (no transaction needed for better performance)
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

        // 2️⃣ OPTIMIZATION: Get brand from memory instead of querying
        let brandDetails: any = brandsMap.get(brandName);

        if (!brandDetails) {
          // Brand doesn't exist - create minimal placeholder
          const cate = "General";
          brandDetails = {
            name: brandName,
            programmeId: promo.advertiser?.id?.toString() || "",
            primarySector: cate,
            logo: promo.advertiser?.logoUrl?.toString() || "",
            status: "active",
            activeDeals: 0,
          };

          // Add to our in-memory map so we don't recreate it for other deals
          brandsMap.set(brandName, brandDetails);

          // Create the brand document (will be properly synced by syncAwinBrands later)
          const newBrandRef = firestore.collection("brands").doc();
          batch.set(newBrandRef, {
            ...brandDetails,
            id: newBrandRef.id,
            createdAt: now,
            updatedAt: now,
          });
        }

        const docRef = firestore.collection("deals_fresh").doc(promotionId);
        const category = brandDetails.rawData?.primarySector?.toString() || "General";

        const payload: any = {
          promotionId,
          title: promo.title || "",
          description: promo.description || "",
          brand: brandName,
          brandDetails, // EMBEDDED: Brand data is stored in the deal
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

        if (addedCount % 100 === 0) {
          console.log(`⏩ Processed ${addedCount} promotions so far...`);
        }
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
  .pubsub.schedule("every 12 hours")
  .timeZone("UTC")
  .onRun(async () => {
    // 📊 Brand count updater - Optimized: fetch all deals ONCE, then count per brand
    const db = admin.firestore();
    const bulkWriter = db.bulkWriter();
    const now = new Date();

    bulkWriter.onWriteError((error) => {
      console.error("BulkWriter Error:", error.message);
      return error.code === 13 || error.code === 14;
    });

    // Fetch ALL active deals in one query instead of per-brand queries
    const [brandsSnapshot, dealsSnapshot] = await Promise.all([
      db.collection("brands").get(),
      db.collection("deals_fresh")
        .where("status", "==", "active")
        .get()
    ]);

    // Count deals per brand in memory
    const brandDealCounts = new Map<string, number>();
    dealsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.expiresAt?.toDate() > now) {
        const brand = data.brand;
        brandDealCounts.set(brand, (brandDealCounts.get(brand) || 0) + 1);
      }
    });

    // Update each brand with its count
    for (const brandDoc of brandsSnapshot.docs) {
      const brandName = brandDoc.data().name;
      const count = brandDealCounts.get(brandName) || 0;

      bulkWriter.update(brandDoc.ref, {
        activeDeals: count,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await bulkWriter.close();
    console.log(`✔️ BulkWriter: All ${brandsSnapshot.size} brands updated. Reads: ${brandsSnapshot.size + dealsSnapshot.size} (was ${brandsSnapshot.size * 2}+)`);
    return null;
  });

export const scheduledCategoriesDealCountUpdate = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .pubsub.schedule("every 12 hours")
  .timeZone("UTC")
  .onRun(async () => {
    // 🏷️ Category count updater - Optimized: fetch all deals ONCE, then count per category
    const db = admin.firestore();
    const bulkWriter = db.bulkWriter();
    const now = new Date();

    bulkWriter.onWriteError((error) => {
      console.error("BulkWriter Error:", error.message);
      return error.code === 13 || error.code === 14;
    });

    // Fetch ALL active deals in one query instead of per-category queries
    const [categoriesSnapshot, dealsSnapshot] = await Promise.all([
      db.collection("categories").get(),
      db.collection("deals_fresh")
        .where("status", "==", "active")
        .get()
    ]);

    // Count deals per category in memory
    const categoryDealCounts = new Map<string, number>();
    dealsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.expiresAt?.toDate() > now) {
        const category = data.category;
        categoryDealCounts.set(category, (categoryDealCounts.get(category) || 0) + 1);
      }
    });

    // Update each category with its count
    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryName = categoryDoc.data().name;
      const count = categoryDealCounts.get(categoryName) || 0;

      bulkWriter.update(categoryDoc.ref, {
        dealCount: count,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await bulkWriter.close();
    console.log(`✔️ BulkWriter: All ${categoriesSnapshot.size} categories updated. Reads: ${categoriesSnapshot.size + dealsSnapshot.size} (was ${categoriesSnapshot.size * 2}+)`);
    return null;
  });

// Note: shuffleDealsAvoidConsecutiveBrands removed - now using brand-grouped selection
// which ensures exactly 1 deal per brand for better diversity

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

      // 3️⃣ Fetch Trending Deals - 20 deals from 20 different brands
      console.log("📦 [HomepageCache] Fetching trending deals...");
      const now = admin.firestore.Timestamp.now();
      const trendingDealsSnapshot = await firestore
        .collection("deals_fresh")
        .where("status", "==", "active")
        .where("expiresAt", ">", now)
        .orderBy("expiresAt", "asc")
        .orderBy("createdAt", "desc")
        .limit(200) // Fetch more to ensure we have 20 different brands
        .get();

      // Group deals by brand to ensure diversity
      const dealsByBrand = new Map<string, any[]>();
      trendingDealsSnapshot.docs.forEach(doc => {
        const deal = { id: doc.id, ...doc.data() };
        const brand = (deal as any).brand;
        if (!dealsByBrand.has(brand)) {
          dealsByBrand.set(brand, []);
        }
        dealsByBrand.get(brand)!.push(deal);
      });

      // Get 1 deal from each brand (up to 20 different brands)
      const brandsWithDeals = Array.from(dealsByBrand.keys());
      const shuffledBrands = brandsWithDeals
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

      const trendingDeals: any[] = [];
      shuffledBrands.forEach(brandName => {
        const brandDeals = dealsByBrand.get(brandName)!;
        // Pick a random deal from this brand for variety
        const randomDeal = brandDeals[Math.floor(Math.random() * brandDeals.length)];
        trendingDeals.push(randomDeal);
      });

      console.log(`✅ [HomepageCache] Found ${trendingDeals.length} trending deals from ${shuffledBrands.length} different brands`);

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

      // 6️⃣ Fetch Dynamic Links (legal and help content)
      console.log("📦 [HomepageCache] Fetching dynamic links...");
      const dynamicLinksSnapshot = await firestore
        .collection("content")
        .where("status", "==", "published")
        .where("type", "in", ["legal", "help"])
        .orderBy("order", "asc")
        .get();

      const dynamicLinks = dynamicLinksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`✅ [HomepageCache] Found ${dynamicLinks.length} dynamic links`);

      // 7️⃣ Write to homepageCache collection
      const cacheData = {
        categories,
        featuredBrands,
        trendingDeals,
        popularSearches,
        footerBrands,
        dynamicLinks,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        version: 1
      };

      await firestore.collection("homepageCache").doc("current").set(cacheData);

      const duration = Date.now() - startTime;
      console.log(`🎉 [HomepageCache] Cache refreshed successfully in ${duration}ms`);
      console.log(`📊 [HomepageCache] Stats: ${categories.length} cats, ${featuredBrands.length} brands, ${trendingDeals.length} deals, ${dynamicLinks.length} links`);

      return null;
    } catch (error) {
      console.error("❌ [HomepageCache] Error refreshing cache:", error instanceof Error ? error.message : error);
      return null;
    }
  });

/**
 * Manual HTTP trigger for refreshing homepage cache
 * Call this to immediately refresh the cache without waiting for the schedule
 */
export const triggerHomepageCacheRefresh = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    try {
      console.log("🔄 [Manual Trigger] Starting homepage cache refresh...");
      await refreshHomepageCacheLogic();
      res.status(200).send({ success: true, message: "Homepage cache refreshed successfully!" });
    } catch (error) {
      console.error("❌ [Manual Trigger] Error:", error);
      res.status(500).send({ success: false, error: String(error) });
    }
  });

/**
 * Shared logic for homepage cache refresh
 */
async function refreshHomepageCacheLogic() {
  const firestore = admin.firestore();
  const startTime = Date.now();

  // Copy the entire logic from refreshHomepageCache
  // (We'll extract this to avoid duplication)
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

  console.log("📦 [HomepageCache] Fetching trending deals...");
  const now = admin.firestore.Timestamp.now();
  const trendingDealsSnapshot = await firestore
    .collection("deals_fresh")
    .where("status", "==", "active")
    .where("expiresAt", ">", now)
    .orderBy("expiresAt", "asc")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const dealsByBrand = new Map<string, any[]>();
  trendingDealsSnapshot.docs.forEach(doc => {
    const deal = { id: doc.id, ...doc.data() };
    const brand = (deal as any).brand;
    if (!dealsByBrand.has(brand)) {
      dealsByBrand.set(brand, []);
    }
    dealsByBrand.get(brand)!.push(deal);
  });

  const brandsWithDeals = Array.from(dealsByBrand.keys());
  const shuffledBrands = brandsWithDeals
    .sort(() => Math.random() - 0.5)
    .slice(0, 20);

  const trendingDeals: any[] = [];
  shuffledBrands.forEach(brandName => {
    const brandDeals = dealsByBrand.get(brandName)!;
    const randomDeal = brandDeals[Math.floor(Math.random() * brandDeals.length)];
    trendingDeals.push(randomDeal);
  });

  console.log(`✅ [HomepageCache] Found ${trendingDeals.length} trending deals from ${shuffledBrands.length} different brands`);

  console.log("📦 [HomepageCache] Fetching popular searches...");
  const searchesSnapshot = await firestore
    .collection("search_history")
    .orderBy("count", "desc")
    .limit(10)
    .get();

  const popularSearches = searchesSnapshot.docs.map(doc => doc.data().term as string);
  console.log(`✅ [HomepageCache] Found ${popularSearches.length} popular searches`);

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

  console.log("📦 [HomepageCache] Fetching dynamic links...");
  const dynamicLinksSnapshot = await firestore
    .collection("content")
    .where("status", "==", "published")
    .where("type", "in", ["legal", "help"])
    .orderBy("order", "asc")
    .get();

  const dynamicLinks = dynamicLinksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  console.log(`✅ [HomepageCache] Found ${dynamicLinks.length} dynamic links`);

  const cacheData = {
    categories,
    featuredBrands,
    trendingDeals,
    popularSearches,
    footerBrands,
    dynamicLinks,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    version: 1
  };

  await firestore.collection("homepageCache").doc("current").set(cacheData);

  const duration = Date.now() - startTime;
  console.log(`🎉 [HomepageCache] Cache refreshed successfully in ${duration}ms`);
  console.log(`📊 [HomepageCache] Stats: ${categories.length} cats, ${featuredBrands.length} brands, ${trendingDeals.length} deals, ${dynamicLinks.length} links`);
}

/**
 * Deals Page Cache Refresh Function
 * Runs every 6 hours to pre-calculate and cache deals page data
 * This dramatically improves deals page performance by reducing client-side queries
 */
export const refreshDealsPageCache = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .pubsub.schedule("every 6 hours")
  .onRun(async () => {
    console.log("🔄 [DealsPageCache] Starting deals page cache refresh...");
    const firestore = admin.firestore();
    const startTime = Date.now();

    try {
      const now = admin.firestore.Timestamp.now();

      // 1️⃣ Fetch initial deals (first page - 24 deals)
      console.log("📦 [DealsPageCache] Fetching initial deals...");
      const dealsSnapshot = await firestore
        .collection("deals_fresh")
        .where("status", "==", "active")
        .where("expiresAt", ">", now)
        .orderBy("expiresAt", "asc")
        .orderBy("createdAt", "desc")
        .limit(48) // Fetch 2 pages worth initially
        .get();

      const initialDeals = dealsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`✅ [DealsPageCache] Found ${initialDeals.length} initial deals`);

      // 2️⃣ Get total count (approximate)
      console.log("📦 [DealsPageCache] Getting total count...");
      const countSnapshot = await firestore
        .collection("deals_fresh")
        .where("status", "==", "active")
        .where("expiresAt", ">", now)
        .select() // Only fetch document IDs for counting
        .get();

      const totalCount = countSnapshot.size;
      console.log(`✅ [DealsPageCache] Total active deals: ${totalCount}`);

      // 3️⃣ Fetch categories, brands, and dynamic links (for footer)
      console.log("📦 [DealsPageCache] Fetching metadata...");
      const [categoriesSnap, brandsSnap, dynamicLinksSnap] = await Promise.all([
        firestore
          .collection("categories")
          .where("status", "==", "active")
          .where("dealCount", ">", 0)
          .orderBy("dealCount", "desc")
          .limit(20)
          .get(),
        firestore
          .collection("brands")
          .where("status", "==", "active")
          .where("activeDeals", ">", 0)
          .orderBy("activeDeals", "desc")
          .limit(20)
          .get(),
        firestore
          .collection("content")
          .where("status", "==", "published")
          .where("type", "in", ["legal", "help"])
          .orderBy("order", "asc")
          .get()
      ]);

      const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const brands = brandsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const dynamicLinks = dynamicLinksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      console.log(`✅ [DealsPageCache] Metadata: ${categories.length} cats, ${brands.length} brands, ${dynamicLinks.length} links`);

      // 4️⃣ Write to cache
      const cacheData = {
        initialDeals,
        totalCount,
        categories,
        brands,
        dynamicLinks,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        version: 1
      };

      await firestore.collection("dealsPageCache").doc("current").set(cacheData);

      const duration = Date.now() - startTime;
      console.log(`🎉 [DealsPageCache] Cache refreshed successfully in ${duration}ms`);
      console.log(`📊 [DealsPageCache] Stats: ${initialDeals.length} deals, ${totalCount} total, ${categories.length} cats, ${brands.length} brands`);

      return null;
    } catch (error) {
      console.error("❌ [DealsPageCache] Error refreshing cache:", error instanceof Error ? error.message : error);
      return null;
    }
  });

/**
 * Refresh Brands Page Cache Function
 * Pre-computes and caches all data needed for the brands directory page
 * Runs every 60 minutes to keep data fresh
 */
export const refreshBrandsPageCache = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .pubsub.schedule("every 6 hours")
  .onRun(async () => {
    console.log("🔄 [BrandsPageCache] Starting brands page cache refresh...");
    const firestore = admin.firestore();
    const startTime = Date.now();

    try {
      // 1️⃣ Fetch ALL active brands (for directory listing)
      console.log("📦 [BrandsPageCache] Fetching all brands...");
      const brandsSnapshot = await firestore
        .collection("brands")
        .where("status", "==", "active")
        .orderBy("name", "asc")
        .get();

      const allBrands = brandsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((brand: any) => brand.activeDeals > 0); // Only brands with deals

      console.log(`✅ [BrandsPageCache] Found ${allBrands.length} active brands with deals`);

      // 2️⃣ Fetch footer brands (top 15 by activeDeals)
      console.log("📦 [BrandsPageCache] Fetching footer brands...");
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

      // 3️⃣ Fetch categories and dynamic links (for footer)
      console.log("📦 [BrandsPageCache] Fetching metadata...");
      const [categoriesSnap, dynamicLinksSnap, settingsSnap] = await Promise.all([
        firestore
          .collection("categories")
          .where("status", "==", "active")
          .where("dealCount", ">", 0)
          .orderBy("dealCount", "desc")
          .limit(20)
          .get(),
        firestore
          .collection("content")
          .where("status", "==", "published")
          .where("type", "in", ["legal", "help"])
          .orderBy("order", "asc")
          .get(),
        firestore
          .collection("settings")
          .doc("general")
          .get()
      ]);

      const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const dynamicLinks = dynamicLinksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const settings = settingsSnap.exists ? { id: settingsSnap.id, ...settingsSnap.data() } : null;

      console.log(`✅ [BrandsPageCache] Metadata: ${categories.length} cats, ${dynamicLinks.length} links`);

      // 4️⃣ Write to cache
      const cacheData = {
        allBrands,
        footerBrands,
        categories,
        dynamicLinks,
        settings,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        version: 1
      };

      await firestore.collection("brandsPageCache").doc("current").set(cacheData);

      const duration = Date.now() - startTime;
      console.log(`🎉 [BrandsPageCache] Cache refreshed successfully in ${duration}ms`);
      console.log(`📊 [BrandsPageCache] Stats: ${allBrands.length} brands, ${footerBrands.length} footer brands`);

      return null;
    } catch (error) {
      console.error("❌ [BrandsPageCache] Error refreshing cache:", error instanceof Error ? error.message : error);
      return null;
    }
  });

/**
 * Refresh Categories Page Cache Function
 * Pre-computes and caches all data needed for the categories page
 * Runs every 60 minutes to keep data fresh
 */
export const refreshCategoriesPageCache = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .pubsub.schedule("every 6 hours")
  .onRun(async () => {
    console.log("🔄 [CategoriesPageCache] Starting categories page cache refresh...");
    const firestore = admin.firestore();
    const startTime = Date.now();

    try {
      // 1️⃣ Fetch active categories with deals
      console.log("📦 [CategoriesPageCache] Fetching categories...");
      const categoriesSnapshot = await firestore
        .collection("categories")
        .where("status", "==", "active")
        .where("dealCount", ">", 0)
        .orderBy("dealCount", "desc")
        .get();

      const categories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ [CategoriesPageCache] Found ${categories.length} active categories`);

      // 2️⃣ Fetch featured brands (with images)
      console.log("📦 [CategoriesPageCache] Fetching featured brands...");
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

      // 3️⃣ Fetch footer brands
      console.log("📦 [CategoriesPageCache] Fetching footer brands...");
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

      // 4️⃣ Fetch trending deals (12 deals from different brands)
      console.log("📦 [CategoriesPageCache] Fetching trending deals...");
      const now = admin.firestore.Timestamp.now();
      const dealsSnapshot = await firestore
        .collection("deals_fresh")
        .where("status", "==", "active")
        .where("expiresAt", ">", now)
        .orderBy("expiresAt", "asc")
        .orderBy("createdAt", "desc")
        .limit(200) // Fetch extra to filter for diversity
        .get();

      // Select deals from different brands
      const brandSet = new Set();
      const trendingDeals = [];
      for (const doc of dealsSnapshot.docs) {
        const deal = { id: doc.id, ...doc.data() };
        const brand = (deal as any).brand;
        if (!brandSet.has(brand) && trendingDeals.length < 12) {
          brandSet.add(brand);
          trendingDeals.push(deal);
        }
      }

      console.log(`✅ [CategoriesPageCache] Selected ${trendingDeals.length} trending deals from ${brandSet.size} brands`);

      // 5️⃣ Fetch dynamic links and settings
      console.log("📦 [CategoriesPageCache] Fetching metadata...");
      const [dynamicLinksSnap, settingsSnap] = await Promise.all([
        firestore
          .collection("content")
          .where("status", "==", "published")
          .where("type", "in", ["legal", "help"])
          .orderBy("order", "asc")
          .get(),
        firestore
          .collection("settings")
          .doc("general")
          .get()
      ]);

      const dynamicLinks = dynamicLinksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const settings = settingsSnap.exists ? { id: settingsSnap.id, ...settingsSnap.data() } : null;

      // 6️⃣ Write to cache
      const cacheData = {
        categories,
        featuredBrands,
        footerBrands,
        trendingDeals,
        dynamicLinks,
        settings,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        version: 1
      };

      await firestore.collection("categoriesPageCache").doc("current").set(cacheData);

      const duration = Date.now() - startTime;
      console.log(`🎉 [CategoriesPageCache] Cache refreshed successfully in ${duration}ms`);
      console.log(`📊 [CategoriesPageCache] Stats: ${categories.length} cats, ${featuredBrands.length} featured brands, ${trendingDeals.length} deals`);

      return null;
    } catch (error) {
      console.error("❌ [CategoriesPageCache] Error refreshing cache:", error instanceof Error ? error.message : error);
      return null;
    }
  });

/**
 * Build Search Index Function
 * Creates an inverted index for fast text search across deals
 * Runs every 6 hours to keep search index updated
 */
export const buildSearchIndex = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .pubsub.schedule("every 6 hours")
  .onRun(async () => {
    console.log("🔍 [SearchIndex] Starting search index build...");
    const firestore = admin.firestore();
    const startTime = Date.now();

    try {
      const now = admin.firestore.Timestamp.now();

      // Fetch all active, non-expired deals
      const dealsSnapshot = await firestore
        .collection("deals_fresh")
        .where("status", "==", "active")
        .where("expiresAt", ">", now)
        .get();

      console.log(`📦 [SearchIndex] Processing ${dealsSnapshot.size} active deals`);

      // Build inverted index: { term -> [dealIds] }
      const index: Record<string, string[]> = {};
      const dealData: Record<string, any> = {};

      // Common stop words to ignore
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'it', 'as', 'by']);

      dealsSnapshot.docs.forEach(doc => {
        const deal = doc.data();
        const dealId = doc.id;

        // Store deal data (filter out undefined values)
        dealData[dealId] = {
          id: dealId,
          title: deal.title || '',
          description: deal.description || '',
          brand: deal.brand || '',
          category: deal.category || '',
          discount: deal.discount || '',
          code: deal.code || '',
          label: deal.label || '',
          expiresAt: deal.expiresAt || null,
          createdAt: deal.createdAt || null,
          brandDetails: deal.brandDetails || null
        };

        // Extract searchable terms
        const searchableText = [
          deal.title || '',
          deal.description || '',
          deal.brand || '',
          deal.category || '',
          ...(deal.tags || [])
        ].join(' ').toLowerCase();

        // Tokenize and normalize
        const terms = searchableText
          .replace(/[^\w\s]/g, ' ') // Remove punctuation
          .split(/\s+/)
          .filter(term => term.length > 2 && !stopWords.has(term)) // Filter short terms and stop words
          .map(term => term.substring(0, 50)); // Limit term length

        // Add to inverted index
        terms.forEach(term => {
          if (!index[term]) {
            index[term] = [];
          }
          if (!index[term].includes(dealId)) {
            index[term].push(dealId);
          }
        });

        // Also index brand and category as exact matches
        if (deal.brand) {
          const brandKey = `brand:${deal.brand.toLowerCase()}`;
          if (!index[brandKey]) index[brandKey] = [];
          if (!index[brandKey].includes(dealId)) index[brandKey].push(dealId);
        }
        if (deal.category) {
          const categoryKey = `category:${deal.category.toLowerCase()}`;
          if (!index[categoryKey]) index[categoryKey] = [];
          if (!index[categoryKey].includes(dealId)) index[categoryKey].push(dealId);
        }
      });

      // Split large index into chunks (Firestore has 1MB document limit)
      const termsArray = Object.keys(index);
      const chunkSize = 500; // Terms per chunk
      const chunks: Record<string, any>[] = [];

      for (let i = 0; i < termsArray.length; i += chunkSize) {
        const chunkTerms = termsArray.slice(i, i + chunkSize);
        const chunkIndex: Record<string, string[]> = {};
        chunkTerms.forEach(term => {
          chunkIndex[term] = index[term];
        });
        chunks.push(chunkIndex);
      }

      console.log(`📊 [SearchIndex] Built index with ${termsArray.length} terms in ${chunks.length} chunks`);

      // Store in Firestore using batch writes
      const batch = firestore.batch();

      // Store metadata
      batch.set(firestore.collection("searchIndex").doc("_metadata"), {
        totalDeals: dealsSnapshot.size,
        totalTerms: termsArray.length,
        chunksCount: chunks.length,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        version: 1
      });

      // Store chunks
      chunks.forEach((chunk, idx) => {
        batch.set(firestore.collection("searchIndex").doc(`chunk_${idx}`), {
          index: chunk,
          chunkNumber: idx
        });
      });

      // Store deal data in separate collection for quick retrieval
      const dealDataChunks: Record<string, any>[] = [];
      const dealIds = Object.keys(dealData);
      const dealChunkSize = 100;

      for (let i = 0; i < dealIds.length; i += dealChunkSize) {
        const chunkDealIds = dealIds.slice(i, i + dealChunkSize);
        const chunkData: Record<string, any> = {};
        chunkDealIds.forEach(id => {
          chunkData[id] = dealData[id];
        });
        dealDataChunks.push(chunkData);
      }

      dealDataChunks.forEach((chunk, idx) => {
        batch.set(firestore.collection("searchIndex").doc(`deals_${idx}`), {
          deals: chunk,
          chunkNumber: idx
        });
      });

      await batch.commit();

      const duration = Date.now() - startTime;
      console.log(`🎉 [SearchIndex] Index built successfully in ${duration}ms`);
      console.log(`📊 [SearchIndex] Stats: ${dealsSnapshot.size} deals, ${termsArray.length} terms, ${chunks.length} index chunks, ${dealDataChunks.length} deal chunks`);

      return null;
    } catch (error) {
      console.error("❌ [SearchIndex] Error building index:", error instanceof Error ? error.message : error);
      return null;
    }
  });

/**
 * Server-side Search API
 * Fast search using pre-built inverted index
 */
export const searchDeals = functions
  .runWith({ timeoutSeconds: 30, memory: "512MB" })
  .https.onCall(async (data) => {
    const { query: searchQuery, limit: resultLimit = 50 } = data;

    if (!searchQuery || typeof searchQuery !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Search query is required');
    }

    console.log(`🔍 [Search] Searching for: "${searchQuery}"`);
    const firestore = admin.firestore();

    try {
      // Normalize search query
      const terms = searchQuery
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(term => term.length > 2)
        .map(term => term.substring(0, 50));

      if (terms.length === 0) {
        return { results: [], total: 0 };
      }

      console.log(`📝 [Search] Normalized terms: ${terms.join(', ')}`);

      // Fetch all index chunks
      const indexSnapshot = await firestore
        .collection("searchIndex")
        .where("chunkNumber", ">=", 0)
        .get();

      // Merge all index chunks
      const fullIndex: Record<string, string[]> = {};
      indexSnapshot.docs
        .filter(doc => doc.id.startsWith('chunk_'))
        .forEach(doc => {
          const chunkData = doc.data();
          Object.assign(fullIndex, chunkData.index);
        });

      // Find matching deal IDs with scoring
      const dealScores: Record<string, number> = {};

      terms.forEach(term => {
        // Check exact term
        if (fullIndex[term]) {
          fullIndex[term].forEach(dealId => {
            dealScores[dealId] = (dealScores[dealId] || 0) + 2; // Exact match gets higher score
          });
        }

        // Check brand/category exact matches
        const brandKey = `brand:${term}`;
        const categoryKey = `category:${term}`;

        if (fullIndex[brandKey]) {
          fullIndex[brandKey].forEach(dealId => {
            dealScores[dealId] = (dealScores[dealId] || 0) + 5; // Brand match gets highest score
          });
        }

        if (fullIndex[categoryKey]) {
          fullIndex[categoryKey].forEach(dealId => {
            dealScores[dealId] = (dealScores[dealId] || 0) + 3; // Category match gets high score
          });
        }

        // Fuzzy match (prefix search)
        Object.keys(fullIndex).forEach(indexTerm => {
          if (indexTerm.startsWith(term) && indexTerm !== term) {
            fullIndex[indexTerm].forEach(dealId => {
              dealScores[dealId] = (dealScores[dealId] || 0) + 1; // Prefix match gets lower score
            });
          }
        });
      });

      // Sort by score and get top results
      const sortedDealIds = Object.entries(dealScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, resultLimit)
        .map(([dealId]) => dealId);

      console.log(`✅ [Search] Found ${sortedDealIds.length} matching deals`);

      // Fetch deal data
      const dealsDataSnapshot = await firestore
        .collection("searchIndex")
        .where("chunkNumber", ">=", 0)
        .get();

      const allDealsData: Record<string, any> = {};
      dealsDataSnapshot.docs
        .filter(doc => doc.id.startsWith('deals_'))
        .forEach(doc => {
          const chunkData = doc.data();
          Object.assign(allDealsData, chunkData.deals);
        });

      // Return matched deals in order
      const results = sortedDealIds
        .map(dealId => allDealsData[dealId])
        .filter(Boolean);

      console.log(`🎉 [Search] Returning ${results.length} results`);

      return {
        results,
        total: results.length,
        query: searchQuery
      };

    } catch (error: any) {
      console.error("❌ [Search] Error:", error.message);
      throw new functions.https.HttpsError('internal', 'Search failed');
    }
  });

// EOF functions/src/index.ts - signed Dcsn