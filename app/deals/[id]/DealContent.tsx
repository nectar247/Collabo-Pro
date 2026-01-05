/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Share2, Tag, Clock, Copy, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Deal } from '@/lib/firebase/collections';
import ShareButtons from '@/components/social/ShareButtons';
import ReviewSystem from '@/components/social/ReviewSystem';
import { DealsLabel, reformatDate } from '@/helper';
import { useAuth, useProfile } from '@/lib/firebase/hooks';
import DiscountModal from '@/components/modal/DiscountModal';
import { DealButton } from '@/components/deals/card';

import NavigationLite from "@/components/NavigationLite";
import Footer from '@/components/footer';
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

interface DealContentProps {
  deal: Deal | null;
}

export default function DealContent({ deal }: DealContentProps) {

  const {user} = useAuth();
  const {savedDeals, savedUnsaveDeals} = useProfile();
  const [isSaved, setIsSaved] = useState(false);

  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, footerBrands, loading: loadingBrands, error: errorBrands, activeBrands, activeBrandsLoaded } = useBrands({
    limit: null
  });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBrandActive, setIsBrandActive] = useState<boolean | null>(null);

  // Check if the deal's brand is active
  useEffect(() => {
    if (deal && activeBrandsLoaded && activeBrands) {
      const brandIsActive = activeBrands.some(brand => brand.name === deal.brand);
      setIsBrandActive(brandIsActive);
      
      // Log for debugging
      console.log('🔍 Brand check:', {
        dealBrand: deal.brand,
        activeBrands: activeBrands.length,
        isActive: brandIsActive
      });
    }
  }, [deal, activeBrands, activeBrandsLoaded]);

  useEffect(()=>{
    if(user && savedDeals && savedDeals.length && deal){
        savedDeals.forEach((element: any) => {
            if(element.dealId == deal.id){
              setIsSaved(true);
            } else setIsSaved(false);
        });
    }
  },[deal, savedDeals, user])

  // Show loading while checking brand status
  if (!activeBrandsLoaded || isBrandActive === null) {
    return (
      <div className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-800 dark:text-gray-400">Loading deal...</p>
        </div>
      </div>
    );
  }

  // Show not found if deal doesn't exist or brand is inactive
  if (!deal || isBrandActive === false) {
    return (
      <div className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary dark:text-white mb-4">Deal Not Found</h1>
          <p className="text-gray-800 dark:text-gray-400 mb-8">
            {!deal 
              ? "The deal you're looking for doesn't exist or has expired."
              : "This deal is no longer available due to brand status changes."
            }
          </p>
          <Link
            href="/deals"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors"
          >
            Browse Deals
          </Link>
        </div>
      </div>
    );
  }
  
  const handleSaveDeal = async () => {
    try {
      if(!user) return false;
      let response = await savedUnsaveDeals({
        dealId: deal.id
      }, !isSaved);
      setIsSaved(response);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <>
      <NavigationLite />
      <main className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black py-12">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <div className="max-w-6xl mx-auto mb-8">
            <Link
              href="/deals"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Deals
            </Link>
          </div>

          {/* Deal Content */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Deal Image */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative rounded-2xl overflow-hidden aspect-video lg:aspect-square"
              >
                <img
                  src={deal.image ? deal.image : (deal as any).brandDetails?.logo}
                  alt={deal.description}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                
                {/* Action Buttons */}
                {user?
                <div className="absolute top-4 right-4 flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveDeal}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-300"
                  >
                    <Heart className={`h-6 w-6 ${isSaved ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                  </motion.button>
                </div>:''}

                {/* Category Tag */}
                <div className="absolute bottom-4 left-4">
                  <Link
                    href={`/categories/${encodeURIComponent(deal.category).toLowerCase()}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all duration-300"
                  >
                    <Tag className="h-4 w-4" />
                    {deal.category}
                  </Link>
                </div>
              </motion.div>

              {/* Deal Details */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                
                <div>
                  
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h1 className="text-2xl font-bold text-primary dark:text-white">{deal.description}</h1>
                    {deal.discount?<span className="px-[5px] py-[3px] bg-primary text-white rounded-sm text-xs font-bold">
                      {deal.discount}
                    </span>:''}
                  </div>
                  <p className="text-gray-800 dark:text-gray-400">{deal.description}</p>
                </div>

                {/* Brand Info */}
                <Link
                  href={`/brands/${encodeURIComponent(deal.brand).toLowerCase()}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-300 dark:bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden">
                    <img
                      src={deal.image ? deal.image : (deal as any).brandDetails?.logo}
                      alt={deal.brand}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-gray-800 dark:text-white font-semibold group-hover:text-primary transition-colors">
                      {deal.brand}
                    </h3>
                    <p className="text-gray-800 dark:text-gray-400">View all deals from this brand</p>
                    
                  </div>
                </Link>

                {/* Deal Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-400">
                    <Clock className="h-5 w-5" />
                    <span>Expires: {reformatDate(deal.expiresAt as any)}</span>
                  </div>

                  {/* Promo Code */}
                  {/* {deal.code ? 
                  <div className="flex items-center gap-4">
                    <code className="bg-white/5 px-2 py-1 font-bold font-mono flex-1 rounded text-primary relative">
                        {deal.code.slice(0, 3)}
                        <span className="blur-sm">****</span>
                        {deal.code.slice(-3)}
                    </code>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={()=>setIsModalOpen(true)}
                      className="px-4 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white transition-colors flex items-center gap-2"
                    >
                      
                        <Copy className="h-5 w-5" />
                        Copy Code
                    </motion.button>
                  </div> : ''} */}
                </div>

                {/* CTA Button */}
                {/* {deal.label != 'GetCode' ?
                <button
                  onClick={()=>setIsModalOpen(true)}
                className="w-full px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary/50 transition-all duration-300">
                    {DealsLabel[deal.label]}
                </button> : ''} */}
                <DealButton deal={deal} />

                {/* Share Section */}
                <div className="pt-6 border-t border-white/10">
                  <ShareButtons
                    url={typeof window !== 'undefined' ? window.location.href : ''}
                    title={deal.description}
                    description={deal.description}
                  />
                </div>
              </motion.div>
            </div>

            {/* Reviews Section */}
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">Reviews</h2>
              <ReviewSystem itemId={deal.id} />
            </div>

            {/* Modal */}
            {/* <DiscountModal deal={deal} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} /> */}
          </div>
        </div>
      </main>
      <Footer
        categories={categories}
        loadingCategories={loadingCategories}
        brands={footerBrands}
        loadingBrands={loadingBrands}
        settings={settings}
        settLoading={settLoading}
        dynamicLinks={dynamicLinks}
        loadingDynamicLinks={loadingDynamicLinks}
      />
    </>
  );
}