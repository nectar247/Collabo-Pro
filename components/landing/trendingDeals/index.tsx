import { DealCard1 } from '@/components/deals/card';
import { Deal } from '@/lib/firebase/collections';
import { ArrowRight, Flame } from 'lucide-react';
import Link from 'next/link';
import React from 'react'

const TrendingDeals = ({
    trendingDeals,
    loadingDeals
}: {
    trendingDeals: Deal[];
    loadingDeals: boolean;
}) => {
    
    return (
        <section className="py-16 bg-bgPrimary dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-xl light:border shadow-lg">
                            <Flame className="h-5 w-5 text-tertiary" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-primary dark:text-white">Hot Trending Deals</h2>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {trendingDeals.map((deal) => (
                        <DealCard1 deal={deal} key={deal.id} />
                    ))}
                </div>
                <div className="mt-5 flex justify-end">
                    <Link
                        href="/deals" 
                        className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-2 group"
                        >
                        View all deals
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default TrendingDeals;