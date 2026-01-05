import * as functions from "firebase-functions/v1";
import admin from "firebase-admin";
import axios from "axios";
import { determineLabel, extractCode, extractDiscount } from "./helpers/index.js";
admin.initializeApp();
export const syncAwinBrands = functions
    .runWith({ timeoutSeconds: 540, memory: "1GB" })
    .pubsub.schedule("every 1 hours")
    .onRun(async () => {
    var _a;
    // 🔄 Deployed from local /functions - Dec 11, 2025
    const accessToken = "336a9ae4-df0b-4fab-9a83-a6f3c7736b6f";
    const endpoint = "https://api.awin.com/publishers/1822416/programmes";
    try {
        const firestore = admin.firestore();
        const now = admin.firestore.FieldValue.serverTimestamp();
        // 1️⃣ Load all existing programmeIds once
        const existingSnapshot = await firestore.collection("brands").get();
        const existingMap = new Map();
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
            const payload = {
                programmeId, // Save for future lookup
                id: docRef.id,
                name: programme.name,
                description: programme.description,
                activeDeals: 0,
                status: ((_a = programme.status) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "inactive",
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
            }
            else {
                console.log(`Skipped existing brand(${programme.name}) ProgramId: ${programmeId}`);
            }
        }
        await writer.close();
        console.log(`🎉 Finished writing ${count} records`);
        return null;
    }
    catch (error) {
        console.error("❌ Sync error:", error instanceof Error ? error.message : error);
        return null;
    }
});
export const syncAwinPromotions = functions
    .runWith({ timeoutSeconds: 540, memory: "1GB" })
    .pubsub.schedule("every 5 hours")
    .onRun(async () => {
    var _a;
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
        let promotions = [];
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
            if (!Array.isArray((_a = resp.data) === null || _a === void 0 ? void 0 : _a.data)) {
                throw new Error("Invalid API response structure");
            }
            promotions.push(...resp.data.data);
            if (resp.data.data.length < pageSize)
                break;
            page++;
        }
        // 3️⃣ Process in transaction
        await firestore.runTransaction(async (transaction) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            const batch = firestore.batch();
            let skippedCount = 0;
            let updatedCount = 0;
            let addedCount = 0;
            for (const promo of promotions) {
                const promotionId = (_a = promo.promotionId) === null || _a === void 0 ? void 0 : _a.toString();
                if (!promotionId)
                    continue;
                const brandName = (_b = promo.advertiser) === null || _b === void 0 ? void 0 : _b.name;
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
                let brandDetails = {};
                const brandQuery = await transaction.get(firestore.collection("brands")
                    .where("name", "==", brandName)
                    .limit(1));
                // FIX: Check if brand exists BEFORE using brandDetails
                if (!brandQuery.empty) {
                    brandDetails = brandQuery.docs[0].data();
                }
                else {
                    // FIX: Create new brand without self-referencing bugs
                    const cate = "General"; // Default category for new brands
                    brandDetails = {
                        name: brandName,
                        programmeId: ((_d = (_c = promo.advertiser) === null || _c === void 0 ? void 0 : _c.id) === null || _d === void 0 ? void 0 : _d.toString()) || "",
                        primarySector: cate,
                        createdAt: now,
                        updatedAt: now,
                        id: ((_f = (_e = promo.advertiser) === null || _e === void 0 ? void 0 : _e.id) === null || _f === void 0 ? void 0 : _f.toString()) || "",
                        logo: ((_h = (_g = promo.advertiser) === null || _g === void 0 ? void 0 : _g.logoUrl) === null || _h === void 0 ? void 0 : _h.toString()) || "", // FIX: Safe optional chaining
                        status: "active", // FIX: Don't reference brandDetails.status
                        activeDeals: 0,
                    };
                }
                const docRef = firestore.collection("deals_fresh").doc(promotionId);
                // FIX: Use brandDetails.rawData safely after checking if brand exists
                const category = ((_k = (_j = brandDetails.rawData) === null || _j === void 0 ? void 0 : _j.primarySector) === null || _k === void 0 ? void 0 : _k.toString()) || "General";
                const payload = Object.assign({ promotionId, title: promo.title || "", description: promo.description || "", brand: brandName, brandDetails,
                    category, discount: extractDiscount(promo.title || "", promo.description || ""), code: extractCode(promo), label: determineLabel(promo), link: promo.urlTracking || "", terms: promo.terms || "See website for details", status: /(active|expiringsoon)/i.test(promo.status || "") ? "active" : "inactive", startsAt: promo.startDate
                        ? admin.firestore.Timestamp.fromDate(new Date(promo.startDate))
                        : admin.firestore.Timestamp.now(), expiresAt: promo.endDate
                        ? admin.firestore.Timestamp.fromDate(new Date(promo.endDate))
                        : admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), source: "awin-api-promotions", joined: ((_l = promo.advertiser) === null || _l === void 0 ? void 0 : _l.joined) === true, rawData: promo, updatedAt: now, manuallyAdded: false }, (!existingDocs.has(promotionId) && { createdAt: now }) // Only set for new docs
                );
                batch.set(docRef, payload);
                existingDocs.has(promotionId) ? updatedCount++ : addedCount++;
                console.log(`⏩ written promotion: ${promotionId}`);
            }
            // Delete stale promotions (not in new fetch) - BUT PRESERVE MANUALLY ADDED DEALS
            const fetchedIds = new Set(promotions.map(p => { var _a; return (_a = p.promotionId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean));
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
    }
    catch (error) {
        console.error("❌ Sync failed:", {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
});
// 🆕 NEW FUNCTION: Cleanup expired deals
async function cleanupExpiredDeals(firestore) {
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
    }
    catch (error) {
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
            var _a;
            const data = doc.data();
            return ((_a = data.expiresAt) === null || _a === void 0 ? void 0 : _a.toDate()) > new Date();
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
            var _a;
            const data = doc.data();
            return ((_a = data.expiresAt) === null || _a === void 0 ? void 0 : _a.toDate()) > new Date();
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
function shuffleDealsAvoidConsecutiveBrands(deals) {
    if (deals.length <= 1)
        return deals;
    const result = [];
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
        }
        else {
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
        const categories = categoriesSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
        const featuredBrands = featuredBrandsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
            .map(doc => (Object.assign({ id: doc.id }, doc.data())))
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
        const popularSearches = searchesSnapshot.docs.map(doc => doc.data().term);
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
        const footerBrands = footerBrandsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        console.log(`✅ [HomepageCache] Found ${footerBrands.length} footer brands`);
        // 6️⃣ Fetch Dynamic Links (legal and help content)
        console.log("📦 [HomepageCache] Fetching dynamic links...");
        const dynamicLinksSnapshot = await firestore
            .collection("content")
            .where("status", "==", "published")
            .where("type", "in", ["legal", "help"])
            .orderBy("order", "asc")
            .get();
        const dynamicLinks = dynamicLinksSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
    }
    catch (error) {
        console.error("❌ [HomepageCache] Error refreshing cache:", error instanceof Error ? error.message : error);
        return null;
    }
});
/**
 * Deals Page Cache Refresh Function
 * Runs every 30 minutes to pre-calculate and cache deals page data
 * This dramatically improves deals page performance by reducing client-side queries
 */
export const refreshDealsPageCache = functions
    .runWith({ timeoutSeconds: 300, memory: "512MB" })
    .pubsub.schedule("every 30 minutes")
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
        const initialDeals = dealsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
        const categories = categoriesSnap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const brands = brandsSnap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const dynamicLinks = dynamicLinksSnap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
    }
    catch (error) {
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
    .pubsub.schedule("every 60 minutes")
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
            .map(doc => (Object.assign({ id: doc.id }, doc.data())))
            .filter((brand) => brand.activeDeals > 0); // Only brands with deals
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
        const footerBrands = footerBrandsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
        const categories = categoriesSnap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const dynamicLinks = dynamicLinksSnap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const settings = settingsSnap.exists ? Object.assign({ id: settingsSnap.id }, settingsSnap.data()) : null;
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
    }
    catch (error) {
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
    .pubsub.schedule("every 60 minutes")
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
        const categories = categoriesSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
        const featuredBrands = featuredBrandsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // 3️⃣ Fetch footer brands
        console.log("📦 [CategoriesPageCache] Fetching footer brands...");
        const footerBrandsSnapshot = await firestore
            .collection("brands")
            .where("status", "==", "active")
            .where("activeDeals", ">", 0)
            .orderBy("activeDeals", "desc")
            .limit(15)
            .get();
        const footerBrands = footerBrandsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
            const deal = Object.assign({ id: doc.id }, doc.data());
            const brand = deal.brand;
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
        const dynamicLinks = dynamicLinksSnap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const settings = settingsSnap.exists ? Object.assign({ id: settingsSnap.id }, settingsSnap.data()) : null;
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
    }
    catch (error) {
        console.error("❌ [CategoriesPageCache] Error refreshing cache:", error instanceof Error ? error.message : error);
        return null;
    }
});
/**
 * Build Search Index Function
 * Creates an inverted index for fast text search across deals
 * Runs every 1 hour to keep search index updated
 */
export const buildSearchIndex = functions
    .runWith({ timeoutSeconds: 540, memory: "1GB" })
    .pubsub.schedule("every 1 hours")
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
        const index = {};
        const dealData = {};
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
                if (!index[brandKey])
                    index[brandKey] = [];
                if (!index[brandKey].includes(dealId))
                    index[brandKey].push(dealId);
            }
            if (deal.category) {
                const categoryKey = `category:${deal.category.toLowerCase()}`;
                if (!index[categoryKey])
                    index[categoryKey] = [];
                if (!index[categoryKey].includes(dealId))
                    index[categoryKey].push(dealId);
            }
        });
        // Split large index into chunks (Firestore has 1MB document limit)
        const termsArray = Object.keys(index);
        const chunkSize = 500; // Terms per chunk
        const chunks = [];
        for (let i = 0; i < termsArray.length; i += chunkSize) {
            const chunkTerms = termsArray.slice(i, i + chunkSize);
            const chunkIndex = {};
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
        const dealDataChunks = [];
        const dealIds = Object.keys(dealData);
        const dealChunkSize = 100;
        for (let i = 0; i < dealIds.length; i += dealChunkSize) {
            const chunkDealIds = dealIds.slice(i, i + dealChunkSize);
            const chunkData = {};
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
    }
    catch (error) {
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
        const fullIndex = {};
        indexSnapshot.docs
            .filter(doc => doc.id.startsWith('chunk_'))
            .forEach(doc => {
            const chunkData = doc.data();
            Object.assign(fullIndex, chunkData.index);
        });
        // Find matching deal IDs with scoring
        const dealScores = {};
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
        const allDealsData = {};
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
    }
    catch (error) {
        console.error("❌ [Search] Error:", error.message);
        throw new functions.https.HttpsError('internal', 'Search failed');
    }
});
// EOF functions/src/index.ts - signed Dcsn
//# sourceMappingURL=index.js.map