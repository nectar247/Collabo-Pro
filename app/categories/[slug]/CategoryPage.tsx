/* eslint-disable @next/next/no-img-element */
"use client";

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Preloader from '@/components/loaders/preloader';
import ErrorLoader from '@/components/loaders/ErrorLoader';
import { DealCard1 } from '@/components/deals/card';

import Navigation from "@/components/navigation";
import Footer from '@/components/footer';
import { useBrands, useCategories, useSettings, useDynamicLinks } from '@/lib/firebase/hooks';

export default function CategoryPage({ slug, content_ }: { slug: string, content_: any }) {
  const params = useParams();
  const category = decodeURIComponent(params.slug as string);
  
  // Direct state management for category deals
  const [categoryDeals, setCategoryDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Other hooks for footer/navigation
  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories } = useCategories();
  const { featuredBrands, loading: loadingBrands } = useBrands({ limit: null });
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  // Enhanced category matching function
  const doesCategoryMatch = (dealCategory: any, searchCategory: string) => {
    if (!dealCategory) return false;
    
    // Convert to string and handle various data types
    let dealCat = '';
    if (typeof dealCategory === 'string') {
      dealCat = dealCategory;
    } else if (typeof dealCategory === 'object' && dealCategory.toString) {
      dealCat = dealCategory.toString();
    } else {
      dealCat = String(dealCategory);
    }
    
    const searchCat = String(searchCategory);
    
    // Clean and normalize strings
    const cleanString = (str: string) => {
      return str
        .toString()
        .trim()
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
        .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
        .replace(/\s+/g, ' ') // Normalize multiple spaces
        .toLowerCase();
    };
    
    const cleanDealCat = cleanString(dealCat);
    const cleanSearchCat = cleanString(searchCat);
    
    // Multiple matching strategies
    return (
      cleanDealCat === cleanSearchCat ||
      cleanDealCat.startsWith(cleanSearchCat) ||
      cleanDealCat.endsWith(cleanSearchCat) ||
      cleanDealCat.includes(cleanSearchCat) ||
      cleanSearchCat.includes(cleanDealCat) ||
      cleanDealCat.replace(/\s/g, '') === cleanSearchCat.replace(/\s/g, '') ||
      cleanDealCat.split(' ').some(word => 
        cleanSearchCat.split(' ').some(searchWord => 
          word === searchWord && word.length > 2
        )
      )
    );
  };

  // Direct Firestore query for category deals - bypasses all hook filters
  useEffect(() => {
    const fetchCategoryDeals = async () => {
      try {
        setLoading(true);
        
        // Get all deals from the collection
        const dealsRef = collection(db, 'deals_fresh');
        const snapshot = await getDocs(dealsRef);
        
        const allDeals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter for the specific category with enhanced matching
        const filtered = allDeals.filter(deal => 
          doesCategoryMatch(deal.category, category)
        );

        setCategoryDeals(filtered);
        setError(null);
      } catch (err) {
        console.error('Error fetching category deals:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryDeals();
  }, [category]);

  if (loading) {
    return <Preloader text="Loading deals..." />;
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
                  {category} Deals
                </h1>
                <p className="text-gray-800 dark:text-gray-400 mt-2">
                  Discover the best {category.toLowerCase()} deals and discounts
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-500 mt-1">
                  {categoryDeals.length} deal{categoryDeals.length !== 1 ? 's' : ''} available
                </p>
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
              {/* <div className="mt-12 text-center">
                <div className="inline-flex gap-3 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Active: {categoryDeals.filter(d => d.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Valid: {categoryDeals.filter(d => {
                        if (!d.expiresAt?.seconds) return true;
                        return new Date(d.expiresAt.seconds * 1000) > new Date();
                      }).length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Total: {categoryDeals.length}
                    </span>
                  </div>
                </div>
              </div> */}
            </>
          ) : (
            <div className="text-center py-12">
              <Tag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-primary dark:text-white mb-2">
                No deals found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                We couldn&apos;t find any deals in the {category.toLowerCase()} category at the moment.
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