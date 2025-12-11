# Expired Active Deals Report
**Generated:** December 9, 2025

## Summary

- **Total "Active" Deals:** 1,473
- **Actually Active (Not Expired):** 1,023 (69.4%)
- **Expired but Still Active:** 450 (30.6%)
- **Total Deals in Collection:** 1,478

## Key Findings

### Problem
Out of 1,473 deals marked as `status: 'active'`, **450 deals have already expired** but are still showing as active in the system. This means:

1. Users are seeing deals that no longer work
2. The "active deals" count is inflated
3. The count appears stuck at 1,473 because expired deals aren't being cleaned up

### Affected Brands (Top 10)
The expired deals are distributed across multiple brands. Sample from the export shows:

1. **GhostBikes.com** - Multiple expired deals (Automotive)
2. **Stylevana UK** - Multiple expired deals (Health & Beauty)
3. **XY London** - Expired shoe deals
4. **Pure Beauty** - ELEMIS deals
5. **Box.co.uk** - Cyber week deals
6. **boohoo.com** - Black Friday deals
7. **Belleek UK** - Black November deals
8. **Laptop Outlet** - Electronics deals
9. **Scribbler** - Card deals
10. And many more...

### Expiry Pattern
- Most expired within the last **0-2 days** (recent expired deals)
- Many are Black Friday/Cyber Monday deals that just expired
- Some are seasonal promotions that ended

## Files Generated

1. **expired-active-deals.json** (737 KB)
   - Full detailed export of all 450 expired deals
   - Includes all metadata, links, codes, and raw API data
   - Location: `scripts/expired-active-deals.json`

2. **expired-active-deals.csv** (151 KB)
   - Easier to inspect in Excel/Google Sheets
   - Columns: ID, Brand, Title, Category, Expired Date, Days Expired, Created Date, Code, Link, Description
   - Location: `scripts/expired-active-deals.csv`

## Recommended Actions

### Immediate Actions
1. **Review the CSV file** to identify patterns in expired deals
2. **Check API source** to see if these deals should be refreshed or removed
3. **Decide on cleanup strategy:**
   - Option A: Mark all expired deals as inactive
   - Option B: Re-check with API source and update/remove accordingly
   - Option C: Set up automated expiry checks

### Long-term Solutions
1. **Create a scheduled job** (Cloud Function or cron) to automatically mark expired deals as inactive
2. **Add expiry warnings** in admin dashboard (e.g., "expires in 3 days")
3. **Implement deal refresh** from API sources before expiry
4. **Add analytics** to track when deals expire vs. when they're removed

## Sample Expired Deals

Here are some recent expired deals for inspection:

| Brand | Title | Expired | Days Ago | Code |
|-------|-------|---------|----------|------|
| GhostBikes.com | 29% Off FMF Factory Fatty Front Pipe | 09/12/2025 | 0 | - |
| Pure Beauty | 25% Off ELEMIS | 09/12/2025 | 0 | - |
| Box.co.uk | Shop cyber week deals | 09/12/2025 | 0 | - |
| XY London | 12% Off When You Spend Over £45 | 08/12/2025 | 1 | BFSEASON12 |
| Stylevana UK | Mary&May Sale: 24% off | 08/12/2025 | 1 | AFF24MMCREAM |
| Stylevana UK | Cyber Week! Extra 24% off | 08/12/2025 | 1 | AFF25CYBER |

## How to Inspect

### Open JSON file:
```bash
cat scripts/expired-active-deals.json | jq '.[:5]'  # View first 5 deals
```

### Open CSV in Excel:
```bash
open scripts/expired-active-deals.csv
```

### Search for specific brand:
```bash
cat scripts/expired-active-deals.json | jq '.[] | select(.brand == "GhostBikes.com")'
```

### Count by brand:
```bash
cat scripts/expired-active-deals.json | jq -r '.[].brand' | sort | uniq -c | sort -rn | head -20
```

---

**Note:** The count of 1,473 is technically correct—these deals ARE marked as active in Firestore. The issue is that they shouldn't be active anymore because they've expired.
