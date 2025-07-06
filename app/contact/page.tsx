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

import Navigation from "@/components/navigation";
import Footer from '@/components/footer';
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

interface DealContentProps {
  deal: Deal | null;
}

export default function DealContent({ deal }: DealContentProps) {
  const { user } = useAuth();
  const { savedDeals, savedUnsaveDeals } = useProfile();
  const [ isSaved, setIsSaved ] = useState(false);

  // load global settings/hooks
  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories } = useCategories();
  const { allBrands, featuredBrands, loading: loadingBrands } = useBrands({ limit: null });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();
  const [ isModalOpen, setIsModalOpen ] = useState(false);

  // check if this deal is already saved
  useEffect(() => {
    if (user && savedDeals && deal) {
      const found = savedDeals.some((d: any) => d.dealId === deal.id);
      setIsSaved(found);
    }
  }, [deal, savedDeals, user]);

  // toggle save/unsave
  const handleSaveDeal = async () => {
    if (!user || !deal) return;
    try {
      const result = await savedUnsaveDeals({ dealId: deal.id }, !isSaved);
      setIsSaved(result);
    } catch (err) {
      console.error('Error saving deal:', err);
    }
  };

  if (!deal) {
    return (
      <div className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary dark:text-white mb-4">Deal Not Found</h1>
          <p className="text-gray-800 dark:text-gray-400 mb-8">The deal you&apos;re looking for doesn&apos;t exist or has expired.</p>
          <Link href="/deals" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg">
            Browse Deals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black py-12">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <div className="max-w-6xl mx-auto mb-8">
            <Link href="/deals" className="inline-flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" /> Back to Deals
            </Link>
          </div>

          {/* Deal Content Grid */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Deal Image + Actions */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative rounded-2xl overflow-hidden aspect-video lg:aspect-square"
            >
              <img
                src={deal.image || deal.brandDetails?.logo}
                alt={deal.description}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

              {user && (
                <div className="absolute top-4 right-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveDeal}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-300"
                  >
                    <Heart className={`h-6 w-6 ${isSaved ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                  </motion.button>
                </div>
              )}

              <div className="absolute bottom-4 left-4">
                <Link
                  href={`/categories/${encodeURIComponent(deal.category).toLowerCase()}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all duration-300"
                >
                  <Tag className="h-4 w-4" /> {deal.category}
                </Link>
              </div>
            </motion.div>

            {/* Deal Details */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              {/* Title & Discount */}
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-primary dark:text-white">{deal.description}</h1>
                {deal.discount && (
                  <span className="px-[5px] py-[3px] bg-primary text-white rounded-sm text-xs font-bold">
                    {deal.discount}
                  </span>
                )}
              </div>

              <p className="text-gray-800 dark:text-gray-400">{deal.description}</p>

              {/* Brand Card, Expiry, Button, Share... */}
              {/* ... (rest remains unchanged) */}

            </motion.div>
          </div>

          {/* Reviews etc... */}
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
