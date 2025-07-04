/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Tag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Preloader from '@/components/loaders/preloader';
import ErrorLoader from '@/components/loaders/ErrorLoader';
import { DealCard1 } from '@/components/deals/card';

import Navigation from "@/components/navigation";
import Footer from '@/components/footer';
import { useBrands, useCategories, useCategoryDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';


export default function CategoryPage({ slug, content_ }: { slug: string | string[], content_: any }) {
  const params = useParams();
  
  // Ensure category is always a string (take first item if array)
  const category = Array.isArray(params.slug) 
    ? params.slug[0] 
    : params.slug;

  // Decode the category name
  const decodedCategory = decodeURIComponent(category);

  // Consistent loading text for both SSR and client-side
  const loadingText = "Loading deals...";

  // Use the new useCategoryDeals hook
  const { deals: categoryDeals, loading, error } = useCategoryDeals({
    category: decodedCategory,
    limit: 100
  });

  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: null
  });
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  // Handle both SSR and client-side loading states consistently
  if (typeof window === 'undefined' || loading) {
    return <Preloader text={loadingText} />;
  }

  if (error) {
    return <ErrorLoader text="Error Loading Deals" message={error.message} />;
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-4xl w-full mb-12">
            <div className="flex items-center gap-4 mb-6">
              <Link
                href="/categories"
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="h-6 w-6 text-gray-400" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-primary dark:text-white capitalize">
                  {decodedCategory} Deals
                </h1>
                <p className="text-gray-800 dark:text-gray-400 mt-2">
                  Discover the best {decodedCategory.toLowerCase()} deals and discounts
                </p>
              </div>
            </div>
          </div>

          {/* Deals Grid */}
          {categoryDeals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
              {categoryDeals.map((deal) => (
                <DealCard1 deal={deal} key={deal.id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Tag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-primary dark:text-white mb-2">No deals found</h2>
              <p className="text-gray-400 mb-8">
                We couldn&apos;t find any deals in the {decodedCategory.toLowerCase()} category at the moment.
              </p>
              <Link
                href="/deals"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors"
              >
                Browse All Deals
              </Link>
            </div>
          )}
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