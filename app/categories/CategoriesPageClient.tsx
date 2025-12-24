"use client";

import { CategoryCard1 } from "@/components/deals/categories";
import ErrorLoader from "@/components/loaders/ErrorLoader";
import Preloader from "@/components/loaders/preloader";
import NavigationLite from "@/components/NavigationLite";
import Footer from '@/components/footer';
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';
import { DynamicIcon, getCategoryColor } from "@/helper";

export default function CategoriesPageClient() {

  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { featuredBrands, loading: loadingBrands } = useBrands();
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  if (loadingCategories) {
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
      <Footer 
        categories={categories} 
        loadingCategories={loadingCategories}
        brands={featuredBrands} 
        loadingBrands={loadingBrands}
        settings={settings} 
        settLoading={settLoading}
        dynamicLinks={dynamicLinks}
        loadingDynamicLinks={loadingDynamicLinks}
      />
    </>
  );
}