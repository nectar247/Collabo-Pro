import { Deal } from '@/lib/firebase/collections';
import Image from 'next/image';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Check, ChevronDownCircle, ChevronRightCircle, Copy, LucideChevronsDown, LucideChevronsRight } from "lucide-react";
import ShadowScale from '../shadow';
import { DealsLabel, reformatDate, truncateText } from '@/helper';
import DiscountModal from '../modal/DiscountModal';

function DealButton({ deal }: { deal: Deal }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {deal.label !== 'GetCode' ?
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full mt-1 bg-gradient-to-r from-secondary to-secondary-dark hover:from-secondary-dark hover:to-secondary text-white py-2 rounded-lg font-medium transition-all duration-300"
        >
          {DealsLabel[deal.label]}
        </button>
        :
        <div>
          <div className="flex mt-[-16px]">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full mt-4 bg-gradient-to-r from-secondary to-secondary-dark hover:from-secondary-dark hover:to-secondary text-white py-2 rounded-lg rounded-tr-none rounded-br-none font-medium transition-all duration-300"
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

  return (
    <div className="bg-white shadow-g dark:bg-white/10 backdrop-blur-xl p-1 rounded-xl overflow-hidden border border-white/20 group hover:border-primary/20 transition-colors w-[100%] md:w-[100%]">
      <div className="h-24 md:h-24 m-5 flex items-center space-x-4">
        <Image
          src={deal.image || deal.brandDetails?.logo}
          alt={deal.brand}
          width={80}
          height={80}
          className="object-contain border aspect-square transition-transform duration-500 group-hover:scale-110 max-w-[80px] max-h-[80px] rounded-md bg-white/50"
        />
        <div className="flex flex-col mt-3">
          <Link href={`/deals/${deal.id}`} className="font-semibold">
            <h3 className="md:text-md text-xs font-semibold text-primary dark:text-white group-hover:text-gray-500 transition-colors">
              {truncateText(deal.description, 200)}
            </h3>
          </Link>
          <span className="text-tertiary dark:text-white text-xs md:text-sm mt-1 text-left">{deal.brand}</span>
          <Link
            href={`/brands/${encodeURIComponent(deal.brand)}`}
            className="mt-2 text-xs text-primary hover:text-primary-dark transition-colors flex items-center gap-1 group"
          >
            <span>See all <span className='font-semibold underline'>{deal.brand} deals </span></span>
          </Link>
        </div>
        
        {deal.discount ? (
          <div className="absolute top-2 md:top-2 right-7 bg-primary/80 text-white px-[5px] py-[3px] rounded-sm text-xs backdrop-blur-xl">
            {deal.discount}
          </div>
        ) : ''}
      </div>

      <div className="px-5">
        <DealButton deal={deal} />
        <div className="min-h-[20px] mt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-800 dark:text-gray-100">Expires:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {reformatDate((deal.expiresAt as any).seconds * 1000)}
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
        <div>
          {deal.terms ?
            <>
              {/* Toggle Terms & Conditions */}
              <button
                onClick={() => setShowTerms(!showTerms)}
                className="text-gray-600 dark:text-gray-300 text-xs mt-1 py-2 underline hover:text-gray-800 flex items-center"
              >
                {/* {!showTerms ?
                <ChevronRightCircle className="float-left mr-1 w-4" />
                :<ChevronDownCircle className="float-left mr-1 w-4"/>} */}
                View Terms
              </button>
              {/* Terms & Conditions Section */}
              {showTerms && (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-100/20 dark:bg-gray-700 p-1 rounded">
                  <div className="overflow-y-auto max-h-[400px]">
                    {/* <div 
                        className="prose prose-invert max-w-none"
                    /> */}
                    <p>{deal.terms}</p>
                  </div>
                </div>
              )}
            </> : ''}
        </div>
      </div>
    </div>
  );
}

export {
  DealCard1,
  DealButton,
};
