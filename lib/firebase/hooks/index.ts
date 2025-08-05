// Export all hooks from domain-specific files
export * from './auth';
export * from './categories';

// Re-export from main hooks file for hooks not yet split
// This allows gradual migration without breaking existing imports
export {
  useDeals,
  useDeal,
  useReviews,
  useCart,
  useSearchHistory,
  useBrands,
  useBlogPosts,
  useUsers,
  useSettings,
  useSiteSettings,
  useContent,
  useDynamicLinks,
  useFAQs,
  useAboutContent,
  useMediaFiles
} from '../hooks';

// TODO: Continue splitting remaining hooks into separate files:
// - deals.ts (useDeals, useDeal)
// - brands.ts (useBrands)
// - content.ts (useContent, useBlogPosts, useFAQs, useAboutContent)
// - users.ts (useUsers)
// - settings.ts (useSettings, useSiteSettings)
// - media.ts (useMediaFiles)
// - cart.ts (useCart, useReviews)
// - search.ts (useSearchHistory)
// - links.ts (useDynamicLinks)