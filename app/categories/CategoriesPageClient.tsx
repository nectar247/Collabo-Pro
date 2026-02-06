"use client";

import { CategoryCard1 } from "@/components/deals/categories";
import NavigationLite from "@/components/NavigationLite";
import FooterCached from "@/components/footer-cached";
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
}: CategoriesPageClientProps = {}) {

  // Use server data directly - provided by ISR server component
  const categories = serverCategories || [];

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