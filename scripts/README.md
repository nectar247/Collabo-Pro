# Expired Active Deals - Investigation Results

## 📊 Quick Summary

- **Total Active Deals**: 1,473
- **Actually Active**: 1,023 (69.4%)
- **Expired but Still Active**: 450 (30.6%)

**Verdict**: The count of 1,473 is CORRECT. The issue is that 450 of these deals have expired but haven't been marked as inactive.

---

## 📁 Generated Files

### 1. Main Data Files
- **`expired-active-deals.json`** (737 KB)
  - Complete export of all 450 expired deals
  - Includes full metadata, codes, links, and API source data
  - Use for programmatic processing

- **`expired-active-deals.csv`** (151 KB)
  - Same data in spreadsheet format
  - Open with Excel, Google Sheets, or Numbers
  - Easy filtering and sorting

### 2. Analysis Reports
- **`EXPIRED_DEALS_SUMMARY.md`**
  - Overview of the problem
  - Sample expired deals
  - Recommended actions

- **`BRAND_ANALYSIS.md`**
  - Breakdown by brand
  - Top 30 brands with most expired deals
  - Prioritized action plan

### 3. Scripts
- **`checkActiveDeals.ts`**
  - Main verification script
  - Run: `npx tsx scripts/checkActiveDeals.ts`
  - Generates JSON export and console output

- **`exportExpiredToCSV.ts`**
  - Convert JSON to CSV
  - Run: `npx tsx scripts/exportExpiredToCSV.ts`

---

## 🔍 How to Inspect the Deals

### Open CSV in Excel/Sheets
```bash
# Mac
open scripts/expired-active-deals.csv

# Windows
start scripts/expired-active-deals.csv

# Linux
xdg-open scripts/expired-active-deals.csv
```

### View in Terminal
```bash
# View first 10 deals
cat scripts/expired-active-deals.json | jq '.[:10]'

# Search for specific brand
cat scripts/expired-active-deals.json | jq '.[] | select(.brand == "GhostBikes.com")'

# Count by brand (sorted)
cat scripts/expired-active-deals.json | jq -r '.[].brand' | sort | uniq -c | sort -rn

# Find deals with specific code
cat scripts/expired-active-deals.json | jq '.[] | select(.code != "")'

# Filter by category
cat scripts/expired-active-deals.json | jq '.[] | select(.category == "Automotive")'
```

### Quick Stats
```bash
# Total expired deals
jq '. | length' scripts/expired-active-deals.json

# Average days expired
jq '[.[].daysExpired] | add / length' scripts/expired-active-deals.json

# Deals expired in last 7 days
jq '[.[] | select(.daysExpired <= 7)] | length' scripts/expired-active-deals.json
```

---

## 🎯 Top Brands to Review

Based on volume of expired deals:

1. **GhostBikes.com** - 66 deals (mostly FMF exhaust products)
2. **Xiaomi UK** - 32 deals
3. **Flower Station Ltd** - 24 deals
4. **The Jewel Hut** - 21 deals
5. **Stylevana UK** - 18 deals

See `BRAND_ANALYSIS.md` for complete list.

---

## 💡 Example Expired Deals

### Recent (Expired 0-1 days ago)
- GhostBikes.com: "29% Off FMF Factory Fatty Front Pipe" - Expired 09/12/2025
- Pure Beauty: "25% Off ELEMIS" - Expired 09/12/2025
- Stylevana UK: "Cyber Week! Extra 24% off" - Expired 08/12/2025 (Code: AFF25CYBER)

### Pattern Observed
Most expired deals are:
- Black Friday / Cyber Monday promotions
- Seasonal sales (expired Dec 8-9, 2025)
- Time-limited affiliate promotions

---

## 🛠️ Next Steps

### Immediate Actions
1. Open `expired-active-deals.csv` in Excel
2. Sort by brand to group similar deals
3. Check 2-3 brands against their API source
4. Decide cleanup strategy

### For Each Deal, Choose One:
- **Refresh**: Update with new expiry date from API
- **Deactivate**: Mark as `status: 'inactive'`
- **Delete**: Remove from database completely

### Long-term Solution
Consider implementing:
- Automated expiry checker (runs daily)
- Cloud Function to mark expired deals as inactive
- Dashboard warnings for deals expiring soon
- API refresh workflow before deals expire

---

## 📞 Questions?

If you need help with:
- Bulk updating deals
- Creating cleanup scripts
- Setting up automation
- Analyzing specific brands

Just let me know! I can create additional scripts or help with the cleanup process.

---

**Generated**: December 9, 2025
**Total Investigation Time**: ~5 minutes
**Files Generated**: 5 files (1.4 MB total)
