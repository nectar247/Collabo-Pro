/* eslint-disable @next/next/no-img-element */
"use client";

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Tag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Preloader from '@/components/loaders/preloader';
import ErrorLoader from '@/components/loaders/ErrorLoader';
import { DealCard1 } from '@/components/deals/card';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Deal } from '@/lib/firebase/collections';

import Navigation from "@/components/navigation";
import Footer from '@/components/footer';
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

export default function BrandPage() {
  const params = useParams();
  const brand = decodeURIComponent(params.slug as string);
  const { getBrandDetails } = useDeals();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: null
  });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();
  

  useEffect(() => {
    const fetchBrandDeals = async () => {
      try {
        // Simplified query to avoid composite index requirement
        let dealsQuery = query(
          collection(db, "deals"),
          where("brand", "==", brand),
          where("status", "==", "active"),
        );
        
        const snapshot = await getDocs(dealsQuery);
        
        if (snapshot.empty) {
          setDeals([]);
          setLoading(false);
          return;
        }

        // Get all deals and filter out expired ones
      const now = Timestamp.now();
      const brandDealsPromises = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.expiresAt > now; // Filter out expired deals
        })
        .map(async (doc) => ({
          id: doc.id,
          ...doc.data(),
          brandDetails: await getBrandDetails(doc.data().brand),
        }));
  
        const brandDeals = await Promise.all(brandDealsPromises) as unknown as Deal[];

  
        // Sort by createdAt after fetching
        const sortedDeals = brandDeals.sort((a: any, b: any) => 
          b.createdAt.toMillis() - a.createdAt.toMillis()
        );
  
        setDeals(sortedDeals as any);
        setLoading(false);
      } catch (err: any) {
        setError(err);
        setLoading(false);
      }
    };
    
    fetchBrandDeals();
  }, [brand, getBrandDetails]);

  if (loading) {
    return <Preloader text="Loading deals..." />;
  }

  if (error) {
    return <ErrorLoader text="Error Loading Deals" message={(error as any).message} />;
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
                href="/brands"
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="h-6 w-6 text-gray-400" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-primary dark:text-white capitalize">
                  {brand} Deals
                </h1>
                <p className="text-gray-800 dark:text-gray-400 mt-2">
                  Discover the best {brand.toLowerCase()} deals and discounts
                </p>
              </div>
            </div>
          </div>


          {/* Deals Grid */}
          {deals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
              {deals.map((deal: Deal) => (
                <DealCard1 deal={deal} key={deal.id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Tag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-primary dark:text-white mb-2">No deals found</h2>
              <p className="text-gray-400 mb-8">
              Sorry, we currently do not have any deals on {brand.toLowerCase()}.
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