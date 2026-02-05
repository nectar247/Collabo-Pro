"use client";

import { CategoryCard1 } from "@/components/deals/categories";
import ErrorLoader from "@/components/loaders/ErrorLoader";
import Preloader from "@/components/loaders/preloader";
import NavigationLite from "@/components/NavigationLite";
import FooterCached from "@/components/footer-cached";
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';
import { DynamicIcon, getCategoryColor } from "@/helper";

interface CategoriesPageClientProps {
  categories?: any[];
  featuredBrands?: any[];
  footerBrands?: any[];
  trendingDeals?: any[];
  dynamicLinks?: any[];
  settings?: any;
}

export default function CategoriesPageClient({
  categories: serverCategories,
  featuredBrands: serverFeaturedBrands,
  footerBrands: serverFooterBrands,
  trendingDeals: serverTrendingDeals,
  dynamicLinks: serverDynamicLinks,
  settings: serverSettings,
}: CategoriesPageClientProps = {}) {

  // Only fetch client-side if server data not provided
  const { settings: clientSettings, loading: settLoading } = useSettings();
  const { categories: clientCategories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { featuredBrands: clientFeaturedBrands, footerBrands: clientFooterBrands, loading: loadingBrands } = useBrands();
  const { trendingDeals: clientTrendingDeals, loading: loadingDeals } = useDeals();
  const { links: clientDynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  // Use server data if available, otherwise use client data
  const categories = serverCategories && serverCategories.length > 0 ? serverCategories : clientCategories;
  const featuredBrands = serverFeaturedBrands && serverFeaturedBrands.length > 0 ? serverFeaturedBrands : clientFeaturedBrands;
  const footerBrands = serverFooterBrands && serverFooterBrands.length > 0 ? serverFooterBrands : clientFooterBrands;
  const trendingDeals = serverTrendingDeals && serverTrendingDeals.length > 0 ? serverTrendingDeals : clientTrendingDeals;
  const dynamicLinks = serverDynamicLinks && serverDynamicLinks.length > 0 ? serverDynamicLinks : clientDynamicLinks;
  const settings = serverSettings || clientSettings;

  // Loading is false if we have server data, otherwise use client loading state
  const loading = serverCategories ? false : loadingCategories;

  if (loading) {
    return <Preloader text="Loading categories..." />;
  }

  if (CategoriesError) {
    return <ErrorLoader text="Error Loading Categories" message={CategoriesError.message} />;
  }

  return (
    <>
      <NavigationLite />
      <main className="min-h-screen py-12 bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold text-primary dark:text-white mb-4">Browse Categories</h1>
            <p className="text-gray-800 dark:text-gray-400 mb-8">Discover amazing deals across all categories</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((data, index) => ({
            ...data,
            icon: <DynamicIcon name={data.icon} /> as any,
            color: getCategoryColor(data.name),
            count: data.dealCount || 0,
          })).map((category, index) => (
            <CategoryCard1 category={category} index={index} key={category.name} />
          ))}

          </div>
        </div>
      </main>
      <FooterCached />
    </>
  );
}