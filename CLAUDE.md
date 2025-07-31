# CLAUDE.md - Development Notes

## Project Overview
This is a vouchers/deals aggregation website built with Next.js, Firebase, and TypeScript.

## Key Architecture
- **Frontend**: Next.js with TypeScript
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Styling**: Tailwind CSS with custom components

## Important Files & Locations

### Core Firebase Hooks
- `lib/firebase/hooks.ts` - Main Firebase hooks for data fetching and management
- `lib/firebase/collections.ts` - Type definitions for Firebase collections
- `lib/firebase/index.ts` - Firebase configuration

### Admin Components
- `components/admin/BrandManagement.tsx` - Brand management interface
- `components/admin/DealManagement.tsx` - Deal management interface

### Key Business Logic

#### Brand Filtering System
The application has a sophisticated brand filtering system:
- **Public-facing**: Only shows active brands with active deals
- **Admin interfaces**: Should show ALL brands (active and inactive) for management purposes

#### Collections Structure
- `brands` - Brand information with status field (active/inactive)
- `deals_fresh` - Active deals with brand references
- `categories` - Deal categories with status field
- `profiles` - User profiles with admin flags

## Common Operations

### Brand Management
- Brands can be active/inactive
- When a brand is deactivated, all its deals should also be deactivated
- Admin users need to see all brands regardless of status for management

### Deal Management
- Deals are linked to brands by name (not ID)
- Deals have expiration dates and status fields
- Admin can manage deals from both active and inactive brands

## Development Guidelines

### Testing Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linting
- `npm run typecheck` - Run TypeScript checks

### Firebase Emulator
- Use Firebase emulator for local development
- Configuration in `firebase.json`

## Recent Issues Fixed
- Brand filtering was preventing admin from seeing inactive brands
- Admin interfaces now properly show all brands for management purposes
- Modified `fetchAdminBrands` function to show ALL brands (active/inactive) for admin management
- Modified `fetchAdminDeals` function to show deals from both active and inactive brands for admin management
- Public-facing interfaces still properly filter to show only active brands to end users