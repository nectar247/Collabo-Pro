// app/categories/[slug]/CategoryPageClient.tsx
"use client";

import { Tag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DealCard1 } from '@/components/deals/card';
import NavigationLite from "@/components/NavigationLite";
import FooterCached from "@/components/footer-cached";
import { useBrands, useCategories, useSettings, useDynamicLinks } from '@/lib/firebase/hooks';

// Type for serialized deals from server
interface SerializedDeal {
  id: string;
  category?: string;
  title?: string;
  status?: string;
  createdAt?: { seconds: number; nanoseconds: number };
  updatedAt?: { seconds: number; nanoseconds: number };
  expiresAt?: { seconds: number; nanoseconds: number };
  startsAt?: { seconds: number; nanoseconds: number };
  [key: string]: any;
}

interface CategoryPageClientProps {
  slug: string;
  initialDeals: SerializedDeal[];
  categoryName: string;
}

export default function CategoryPageClient({ 
  slug, 
  initialDeals, 
  categoryName 
}: CategoryPageClientProps) {
  
  // Hooks for footer/navigation only
  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories } = useCategories();
  const { featuredBrands, footerBrands, loading: loadingBrands } = useBrands({ limit: null });
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  // Format category name for display - replace dashes with spaces and capitalize properly
  const formatCategoryName = (name: string) => {
    return name
      .replace(/-/g, ' ') // Replace dashes with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
  };

  const displayCategoryName = formatCategoryName(categoryName);

  // Convert serialized deals back to proper format for DealCard1
  const categoryDeals = initialDeals.map(deal => {
    // Since we're now passing plain timestamp objects from server,
    // we can use them directly without conversion
    return { ...deal } as any; // Type assertion for DealCard1 compatibility
  });

  // Calculate deal statistics
  const activeDeals = categoryDeals.filter((d: any) => d.status === 'active').length;
  const validDeals = categoryDeals.filter((d: any) => {
    if (!d.expiresAt || !d.expiresAt.seconds) return true;
    const expireDate = new Date(d.expiresAt.seconds * 1000);
    return expireDate > new Date();
  }).length;

  return (
    <>
      <NavigationLite />
      <main className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black py-6">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="w-full mb-12">
            {/* Breadcrumb navigation - aligned with deals grid */}
            <div className="max-w-7xl mx-auto px-4">
              <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <Link href="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
                <span>/</span>
                <Link href="/categories" className="hover:text-primary transition-colors">
                  Categories
                </Link>
                <span>/</span>
                <span className="text-gray-700 dark:text-gray-300">{displayCategoryName}</span>
              </nav>
            </div>

            {/* Main header content - full width centering */}
            <div className="w-full text-center space-y-3">
              <div className="mx-auto">
                <h1 className="text-4xl font-bold text-primary dark:text-white mb-2">
                  {displayCategoryName} Deals
                </h1>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                  Discover the best {displayCategoryName} deals and discounts
                </p>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    {categoryDeals.length} deal{categoryDeals.length !== 1 ? 's' : ''} available
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Updated recently
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Deals Grid */}
          {categoryDeals.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
                {categoryDeals.map((deal) => (
                  <DealCard1 deal={deal} key={deal.id} />
                ))}
              </div>
              
              {/* Deal status summary */}
              <div className="mt-12 text-center">
                <div className="inline-flex gap-3 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Active: {activeDeals}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Valid: {validDeals}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Total: {categoryDeals.length}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Tag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-primary dark:text-white mb-2">
                No deals found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                We couldn&apos;t find any deals in the {displayCategoryName.toLowerCase()} category at the moment.
              </p>
              <Link
                href="/deals"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Browse All Deals
              </Link>
            </div>
          )}
        </div>
      </main>
      <FooterCached />
    </>
  );
}