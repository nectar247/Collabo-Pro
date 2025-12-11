# Firebase Functions - Deployment Guide

## ✅ Confirmed Setup

All **4 Cloud Functions** are now managed locally in `/functions` and can be edited and deployed from here.

### Functions Available:

1. **`syncAwinBrands`** (Every 1 hour)
   - Syncs brands/programmes from AWIN API
   - Location: `/functions/src/index.ts` line 8

2. **`syncAwinPromotions`** (Every 5 hours)
   - Syncs promotions/deals from AWIN API
   - **Includes auto-cleanup of expired deals**
   - Location: `/functions/src/index.ts` line 93

3. **`scheduledBrandsDealCountUpdate`** (Every 5 hours)
   - Updates active deal counts for brands
   - Location: `/functions/src/index.ts` line 302

4. **`scheduledCategoriesDealCountUpdate`** (Every 5 hours)
   - Updates active deal counts for categories
   - Location: `/functions/src/index.ts` line 343

## 📝 Edit & Deploy Workflow

### 1. Edit Functions
```bash
# Edit the TypeScript source
code functions/src/index.ts

# Or use any editor
nano functions/src/index.ts
```

### 2. Build TypeScript to JavaScript
```bash
cd functions
npm run build
```

### 3. Deploy to Firebase
```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:syncAwinPromotions
```

### 4. Verify Deployment
```bash
# List deployed functions
firebase functions:list

# View logs
firebase functions:log
```

## 🔧 Quick Commands

```bash
# From project root
cd /Users/dcsn/shop4vouchers

# Build functions
npm --prefix functions run build

# Deploy
firebase deploy --only functions

# View logs
firebase functions:log --limit 50

# View specific function logs
firebase functions:log --only syncAwinPromotions

# Test locally (optional)
cd functions && npm run serve
```

## 📁 File Structure

```
/functions
├── src/
│   ├── index.ts          ← EDIT THIS FILE (TypeScript source)
│   ├── helpers/          ← Helper functions
│   └── utils/            ← Type definitions
├── lib/
│   ├── index.js          ← Auto-generated (DO NOT EDIT)
│   └── index.js.map      ← Source map
├── package.json          ← Dependencies
├── tsconfig.json         ← TypeScript config
├── README.md             ← Function documentation
└── DEPLOYMENT.md         ← This file
```

## ⚠️ Important Rules

1. **ALWAYS edit `/functions/src/index.ts`** - NEVER edit `/functions/lib/index.js`
2. **ALWAYS run `npm run build`** before deploying
3. The `lib/` folder is auto-generated from `src/`
4. Test changes locally first when possible

## 🚀 Last Deployment

- **Date**: December 11, 2025 06:15 UTC
- **Version**:
  - syncAwinPromotions: v60
  - syncAwinBrands: v41
  - scheduledBrandsDealCountUpdate: v7
  - scheduledCategoriesDealCountUpdate: v7
- **Status**: All functions deployed successfully ✅

## 📊 Function Status

All functions are:
- ✅ Using `deals_fresh` collection
- ✅ Bug-free (logoUrl, brandDetails fixes applied)
- ✅ Auto-cleanup enabled (syncAwinPromotions)
- ✅ Running on Node.js 22
- ✅ 9-minute timeout, 1GB memory

## 🔍 Monitoring

### View Logs in Firebase Console
https://console.firebase.google.com/project/vouched4vouchers/functions/logs

### View Logs in Terminal
```bash
# Real-time logs
firebase functions:log --limit 50

# Filter by function
firebase functions:log --only syncAwinPromotions

# Filter by severity
firebase functions:log --level error
```

## 🆘 Troubleshooting

### Build fails
```bash
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deployment fails
```bash
# Check Firebase login
firebase login --reauth

# Check project
firebase use vouched4vouchers

# Try deploying one function at a time
firebase deploy --only functions:syncAwinPromotions
```

### Function errors
```bash
# Check logs
firebase functions:log --only syncAwinPromotions --limit 100

# Check function status
firebase functions:list
```

## 📝 Next Time You Need to Update

1. Open `/functions/src/index.ts`
2. Make your changes
3. Run `npm run build` from `/functions`
4. Run `firebase deploy --only functions`
5. Check logs to verify: `firebase functions:log`

That's it! 🎉
