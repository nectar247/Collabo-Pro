# Firebase Cloud Functions - Setup & Deployment Guide

## Overview
This directory contains all Firebase Cloud Functions for the Vouched4Vouchers project. These functions sync deals and brands from the AWIN API and perform automated cleanup tasks.

## Functions

### 1. `syncAwinPromotions` (Every 5 hours)
- Fetches promotions from AWIN API
- Syncs to `deals_fresh` collection
- **NEW**: Automatically cleans up expired deals after sync
- Preserves manually added deals
- Handles pagination (200 deals per page)

### 2. `syncAwinBrands` (Every 1 hour)
- Fetches brand/programme data from AWIN API
- Syncs to `brands` collection
- Skips existing brands

### 3. `scheduledBrandsDealCountUpdate` (Every 5 hours)
- Updates `activeDeals` count for each brand
- Filters by active status and expiry date
- Uses `deals_fresh` collection

### 4. `scheduledCategoriesDealCountUpdate` (Every 5 hours)
- Updates `dealCount` for each category
- Filters by active status and expiry date
- Uses `deals_fresh` collection

## Recent Changes (Dec 11, 2025)

### ✅ Bugs Fixed
1. **Line 189-190 Bug**: Fixed `TypeError: Cannot read properties of undefined (reading 'toString')`
   - Added safe optional chaining: `promo.advertiser?.logoUrl?.toString()`
   - Fixed self-referencing `brandDetails.status` bug

2. **Line 177 Bug**: Fixed accessing `brandDetails.rawData` before brand existence check

3. **Collection Names**: Changed from `deals` to `deals_fresh` in count update functions

### 🆕 New Feature: Auto Cleanup
Added `cleanupExpiredDeals()` function that:
- Runs automatically after each `syncAwinPromotions` execution
- Queries for active deals with `expiresAt < now`
- Batch updates them to `inactive` status
- Adds metadata: `deactivatedAt`, `deactivationReason`, `previousStatus`
- Doesn't throw errors (won't break main sync if cleanup fails)

## Local Development

### Setup
```bash
cd functions
npm install
```

### Build
```bash
npm run build
```

### Deploy
```bash
# From project root
firebase deploy --only functions

# Or from functions directory
npm run deploy
```

### Logs
```bash
npm run logs
# Or
firebase functions:log
```

## File Structure
```
functions/
├── src/
│   ├── index.ts          # Main functions (TypeScript source)
│   └── helpers/          # Helper functions
├── lib/
│   └── index.js          # Compiled JavaScript (auto-generated)
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── README.md            # This file
```

## Important Notes

1. **Always edit `/functions/src/index.ts`** - NOT `/functions/lib/index.js`
2. The `lib/` folder is auto-generated on build
3. Run `npm run build` before deploying
4. Functions use Node.js 22
5. All functions have 540s (9 min) timeout and 1GB memory

## Deployment Workflow

1. Edit code in `functions/src/index.ts`
2. Build: `npm run build`
3. Deploy: `firebase deploy --only functions`
4. Monitor logs: `firebase functions:log`

## Environment Variables
- Managed via `.runtimeconfig.json` (not tracked in git)
- Access token stored in code (TODO: move to environment)

## Next Steps / TODOs
- [ ] Move API access tokens to environment variables
- [ ] Add unit tests
- [ ] Set up staging environment
- [ ] Add error notifications (email/Slack)
- [ ] Monitor function execution times and optimize
