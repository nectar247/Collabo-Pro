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

import NavigationLite from "@/components/NavigationLite";
import FooterCached from "@/components/footer-cached";
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

export default function BrandPageClient() {
  const params = useParams();
  const slug = params.slug as string;
  const { getBrandDetails } = useDeals();
  const [deals, setDeals] = useState([]);
  const [brandName, setBrandName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, footerBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: null
  });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();
  

  useEffect(() => {
    const fetchBrandDeals = async () => {
      try {
        let brand: string;
        
        // Check if this is an encoded brand name (contains % or spaces) or a clean slug
        const isEncodedName = slug.includes('%') || slug.includes(' ');
        
        if (isEncodedName) {
          // Old format: decode the brand name directly
          brand = decodeURIComponent(slug);
          setBrandName(brand);
        } else {
          // New format: find the brand by slug
          const brandsSnapshot = await getDocs(
            query(
              collection(db, 'brands'),
              where('slug', '==', slug)
            )
          );

          if (brandsSnapshot.empty) {
            setError(new Error(`Brand not found for slug: ${slug}`) as any);
            setLoading(false);
            return;
          }

          const brandData = brandsSnapshot.docs[0].data();
          brand = brandData.name;
          setBrandName(brand);
        }

        // Step 2: Fetch deals for this brand
        let dealsQuery = query(
          collection(db, "deals_fresh"),
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
  }, [slug, getBrandDetails]);

  if (loading) {
    return <Preloader text="Loading deals..." />;
  }

  if (error) {
    return <ErrorLoader text="Error Loading Deals" message={(error as any).message} />;
  }

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
                <Link href="/brands" className="hover:text-primary transition-colors">
                  Brands
                </Link>
                <span>/</span>
                <span className="text-gray-700 dark:text-gray-300">{brandName}</span>
              </nav>
            </div>

            {/* Main header content - full width centering */}
            <div className="w-full text-center space-y-3">
              <div className="mx-auto">
                <h1 className="text-4xl font-bold text-primary dark:text-white mb-2">
                  {brandName} Deals
                </h1>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                  Discover the best {brandName} deals and discounts
                </p>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    {deals.length} deal{deals.length !== 1 ? 's' : ''} available
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Updated recently
                  </span>
                </div>
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
                Sorry, we currently do not have any deals on {brandName.toLowerCase()}.
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
      <FooterCached />
    </>
  );
}