import { Deal } from '@/lib/firebase/collections';
import { optimizeFirebaseImage, IMAGE_PRESETS, shouldDisableOptimization } from '@/lib/utils/imageOptimization';
import Image from 'next/image';
import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Heart, ArrowRight, Check, ChevronDownCircle, ChevronRightCircle, Copy, LucideChevronsDown, LucideChevronsRight } from "lucide-react";
import ShadowScale from '../shadow';
import { DealsLabel, reformatDate, truncateText } from '@/helper';
import DiscountModal from '../modal/DiscountModal';
import { useAuth, useProfile } from '@/lib/firebase/hooks';
import { toast } from 'sonner';

function DealButton({ deal }: { deal: Deal }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {deal.label !== 'GetCode' ?
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full mt-1 bg-gradient-to-r from-secondary to-secondary-dark hover:from-secondary-dark hover:to-secondary text-white py-3 px-4 min-h-[44px] rounded-lg font-medium transition-all duration-300"
        >
          {DealsLabel[deal.label]}
        </button>
        :
        <div>
          <div className="flex mt-[-16px]">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full mt-4 bg-gradient-to-r from-secondary to-secondary-dark hover:from-secondary-dark hover:to-secondary text-white py-3 px-4 min-h-[44px] rounded-lg rounded-tr-none rounded-br-none font-medium transition-all duration-300"
            >
              {DealsLabel[deal.label]}
            </button>
            <div className='relative'>
              <div className='fold-corner-1 fixed right-[-22px] bottom-[-2px] shadow-xl'></div>
            </div>
            <div className="w-[70px] mt-4 text-dark-700 py-2 rounded-lg rounded-tl-none rounded-bl-none font-medium ps-1 bg-secondary/10 border-secondary border-dashed border-2">
              {deal.code.slice(-2)}
            </div>
          </div>
        </div>
      }
      {/* Modal */}
      <DiscountModal deal={deal} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
    </>
  );
}

function DealCard1({ deal }: { deal: any }) {
  const [showTerms, setShowTerms] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Get auth and profile hooks
  const { user } = useAuth();
  const { savedDeals, savedUnsaveDeals } = useProfile();

  // Memoize expensive operations
  const formattedDate = useMemo(() => {
    return reformatDate((deal.expiresAt as any).seconds * 1000);
  }, [deal.expiresAt]);

  const truncatedDescription = useMemo(() => {
    return truncateText(deal.description, 200);
  }, [deal.description]);

  // Check if deal is saved when component mounts or savedDeals changes
  useEffect(() => {
    if (user && savedDeals && savedDeals.length && deal) {
      const isCurrentDealSaved = savedDeals.some((element: any) => element.dealId === deal.id);
      setIsSaved(isCurrentDealSaved);
    } else {
      setIsSaved(false);
    }
  }, [deal, savedDeals, user]);

  // Handle save/unsave deal with Sonner toast notifications
  const handleSaveDeal = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any parent link navigation
    e.stopPropagation(); // Stop event bubbling
    
    try {
      if (!user) {
        toast.error('Please log in to save deals', {
          description: 'You need to be logged in to save deals to your account',
          action: {
            label: 'Login',
            onClick: () => {
              // You can add navigation to login page here
              console.log('Navigate to login');
            },
          },
        });
        return false;
      }
      
      // Show loading toast
      const loadingToastId = toast.loading(
        isSaved ? 'Removing from saved deals...' : 'Saving deal...'
      );
      
      const response = await savedUnsaveDeals({
        dealId: deal.id
      }, !isSaved);
      
      setIsSaved(response);
      
      // Dismiss loading toast
      toast.dismiss(loadingToastId);
      
      // Show success toast with appropriate message
      if (response) {
        toast.success('Deal saved successfully!', {
          description: `${deal.brand} deal has been added to your saved deals`,
          action: {
            label: 'View',
            onClick: () => {
              // Navigate to saved deals page
              window.location.href = '/profile/saved';
            },
          },
        });
      } else {
        toast.success('Deal removed from saved list', {
          description: 'The deal has been removed from your saved deals',
        });
      }
      
    } catch (err) {
      console.error('Failed to save/unsave deal:', err);
      toast.error('Something went wrong!', {
        description: 'Failed to save deal. Please try again.',
        action: {
          label: 'Retry',
          onClick: () => handleSaveDeal(e),
        },
      });
    }
  }, [user, savedUnsaveDeals, isSaved, deal]);

  return (
    <div className="bg-white shadow-g dark:bg-white/10 backdrop-blur-xl p-1 rounded-xl overflow-hidden border border-white/20 group hover:border-primary/20 transition-colors w-[100%] md:w-[100%] relative">
      <div className="h-24 md:h-24 m-5 flex items-center space-x-4">
        <div className="flex-shrink-0">
          <Image
            src={optimizeFirebaseImage(deal.image || deal.brandDetails?.logo, IMAGE_PRESETS.dealCard.thumbnail)}
            alt={deal.brand}
            width={80}
            height={80}
            sizes="80px"
            unoptimized={shouldDisableOptimization(deal.image || deal.brandDetails?.logo || '')}
            className="object-contain border aspect-square transition-transform duration-500 group-hover:scale-110 w-[80px] h-[80px] rounded-md bg-white/50"
          />
        </div>
        <div className="flex flex-col mt-3 flex-grow min-w-0 pr-16">
            <h3 className="md:text-md text-xs font-semibold text-primary dark:text-white group-hover:text-gray-500 transition-colors line-clamp-2 leading-tight max-w-full">
              {truncatedDescription}
            </h3>
          <span className="text-tertiary dark:text-white text-xs md:text-sm mt-1 text-left">{deal.brand}</span>
          <Link
            href={`/brands/${encodeURIComponent(deal.brand)}`}
            className="mt-2 text-sm min-h-[44px] flex items-center text-primary hover:text-primary-dark transition-colors gap-1 group py-2"
          >
            <span>See all <span className='font-semibold underline'>{deal.brand} deals </span></span>
          </Link>
        </div>
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-10">
          {deal.discount && (
            <div className="bg-alternate text-white px-[5px] py-[3px] rounded-sm text-xs backdrop-blur-xl">
              {deal.discount}
            </div>
          )}
        </div>
      </div>

      <div className="px-5">
        <DealButton deal={deal} />
        <div className="min-h-[20px] mt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-800 dark:text-gray-100">Expires:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {formattedDate}
              </span>
            </div>
            {deal.code ?
              <div className="flex items-center justify-between text-sm hidden">
                <span className="text-gray-800 dark:text-gray-500">Code:</span>
                <code className="bg-white/5 px-2 py-1 font-bold rounded text-primary relative">
                  {deal.code.slice(0, 3)}
                  <span className="blur-sm">****</span>
                  {deal.code.slice(-3)}
                </code>
              </div> : <></>}
          </div>
        </div>
        <div className="flex justify-between items-start">
          {deal.terms ?
            <>
              {/* Toggle Terms & Conditions */}
              <button
                onClick={() => setShowTerms(!showTerms)}
                className="text-gray-600 dark:text-gray-300 text-xs mt-1 py-2 underline hover:text-gray-800 flex items-center"
              >
                View Terms
              </button>
              {/* Terms & Conditions Section */}
              {showTerms && (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-100/20 dark:bg-gray-700 p-1 rounded">
                  <div className="overflow-y-auto max-h-[400px]">
                    <p>{deal.terms}</p>
                  </div>
                </div>
              )}
            </> : ''}
                      {/* Enhanced Heart Icon with Save Functionality */}
          {user ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSaveDeal}
              className="p-1 rounded-full hover:bg-white/10 transition-all duration-200 relative"
              title={isSaved ? "Remove from saved deals" : "Save deal"}
            >
              <Heart 
                className={`h-5 w-5 transition-all duration-200 ${
                  isSaved 
                    ? 'text-tertiary fill-tertiary drop-shadow-sm' 
                    : 'text-gray-400 hover:text-red-400 hover:scale-105'
                }`} 
              />
              {/* Small indicator when saved */}
              {isSaved && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
                />
              )}
            </motion.button>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toast.info('Login required', {
                  description: 'Please log in to save deals to your account',
                });
              }}
              className="p-1 rounded-full hover:bg-white/10 transition-all duration-200"
              title="Login to save deals"
            >
              <Heart className="h-5 w-5 text-gray-400 hover:text-red-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const MemoizedDealCard1 = memo(DealCard1);
const MemoizedDealButton = memo(DealButton);

export {
  MemoizedDealCard1 as DealCard1,
  MemoizedDealButton as DealButton,
};