# Expired Deals - Brand Analysis

## Top 30 Brands with Expired Active Deals

| Rank | Brand | Expired Deals | % of Total |
|------|-------|---------------|------------|
| 1 | GhostBikes.com | 66 | 14.7% |
| 2 | Xiaomi UK | 32 | 7.1% |
| 3 | Flower Station Ltd | 24 | 5.3% |
| 4 | The Jewel Hut | 21 | 4.7% |
| 5 | Stylevana UK | 18 | 4.0% |
| 6 | T. H. Baker | 17 | 3.8% |
| 7 | The Towel Shop | 13 | 2.9% |
| 8 | Honor UK | 13 | 2.9% |
| 9 | Stamp Design 4U | 11 | 2.4% |
| 10 | CASO Design | 10 | 2.2% |
| 11 | Argento | 10 | 2.2% |
| 12 | Vinyl Castle | 9 | 2.0% |
| 13 | Road Angel | 9 | 2.0% |
| 14 | Voghion Global | 8 | 1.8% |
| 15 | ID Mobile | 8 | 1.8% |
| 16 | Buy Sheds Direct | 8 | 1.8% |
| 17 | Medela UK | 7 | 1.6% |
| 18 | Workout For Less | 6 | 1.3% |
| 19 | Voghion UK | 6 | 1.3% |
| 20 | Shedstore | 6 | 1.3% |
| 21 | Pure Beauty | 6 | 1.3% |
| 22 | Boody | 6 | 1.3% |
| 23 | AATU Dog and Cat Food | 5 | 1.1% |
| 24 | boohoo.com UK & IE | 4 | 0.9% |
| 25 | Vapoholic | 4 | 0.9% |
| 26 | Momcozy UK | 4 | 0.9% |
| 27 | Lakeland Fashion | 4 | 0.9% |
| 28 | Appliance City | 4 | 0.9% |
| 29 | Vivo Life (UK) | 3 | 0.7% |
| 30 | Sunshine Diamonds | 3 | 0.7% |

## Key Insights

### High-Impact Brands (>10 expired deals)
- **GhostBikes.com** is the biggest offender with 66 expired deals (14.7% of all expired deals)
- **Xiaomi UK** has 32 expired deals
- **Flower Station Ltd** has 24 expired deals
- **The Jewel Hut** has 21 expired deals
- **Stylevana UK** has 18 expired deals

### Recommended Prioritization

#### Priority 1: High Volume Brands (50+ expired deals)
Focus on these first as they have the most impact:
1. **GhostBikes.com** - 66 deals to review

#### Priority 2: Medium Volume Brands (15-50 expired deals)
2. **Xiaomi UK** - 32 deals
3. **Flower Station Ltd** - 24 deals
4. **The Jewel Hut** - 21 deals
5. **Stylevana UK** - 18 deals
6. **T. H. Baker** - 17 deals

#### Priority 3: Lower Volume Brands (5-15 expired deals)
Handle these in batches by category or source

#### Priority 4: Individual Cases (1-4 expired deals)
These can be handled during routine maintenance

## Action Plan

### For Each Brand, You Should:

1. **Check API Source**
   - Are these deals still available from the API?
   - Have they been updated with new expiry dates?
   - Should they be refreshed or permanently removed?

2. **Inspect Deal Quality**
   - Were these one-time promotional deals (Black Friday, etc.)?
   - Are these recurring deals that should be renewed?
   - Are the deals from an affiliate network?

3. **Decide Action**
   - **Refresh**: If deal is still valid from API with new expiry
   - **Deactivate**: If deal is genuinely expired
   - **Delete**: If deal is no longer offered by brand

### Example: GhostBikes.com (66 expired deals)

Most of these appear to be FMF exhaust deals that expired on 09/12/2025. Check:
- Is there a new FMF promotion?
- Should these deals be refreshed from the API?
- Or should they all be marked as inactive?

## Files for Manual Inspection

1. **Full JSON Export**: `scripts/expired-active-deals.json`
   - Contains all 450 expired deals with complete metadata
   - Includes `rawData` field with original API response

2. **CSV Export**: `scripts/expired-active-deals.csv`
   - Easy to open in Excel/Sheets
   - Sortable by brand, expiry date, category

3. **Summary Report**: `scripts/EXPIRED_DEALS_SUMMARY.md`
   - Overview and recommendations

## Next Steps

Once you've inspected the deals manually:

1. Create a cleanup script to bulk update deals by brand
2. Set up automated expiry checking (Cloud Function/cron)
3. Implement deal refresh workflow from API sources
4. Add expiry warnings in admin dashboard
