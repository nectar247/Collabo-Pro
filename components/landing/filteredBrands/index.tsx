import BrandsGridSkeleton from '@/components/skeleton';
import { truncateText } from '@/helper';
import { Brand } from '@/lib/firebase/collections';
import { motion } from 'framer-motion';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react'

const FilteredBrands = ({
    brands,
    loadingBrands,
}: {
    brands: Brand[],
    loadingBrands: boolean
}) => {

    const filteredBrands = brands
        // .filter(brand => brand.brandimg && brand.logo)
        .sort(() => Math.random() - 0.5)
        .slice(0, 8);

    return (
        <div>
            {loadingBrands ? <BrandsGridSkeleton /> : null}
            {filteredBrands.length > 0 && (
                <section className="py-12 bg-bgPrimary dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-800">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-xl light:border shadow-lg">
                                    <ShoppingBag className="h-5 w-5 text-tertiary" />
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold text-primary dark:text-white">Brands For You</h2>
                            </div>
                            <Link
                                href="/brands" 
                                className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-2 group"
                            >
                                View All
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filteredBrands.map((brand) => (
                            <motion.div
                                key={brand.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="group bg-white dark:bg-white/5 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="relative h-40 overflow-hidden border-b-2 border-tertiary/80">
                                    <Image
                                        src={brand.brandimg}
                                        alt={`${brand.name} banner`}
                                        className="w-full h-full object-cover"
                                        width={500}
                                        height={240}
                                        priority
                                    />
                                </div>
                                
                                <div className="relative -mt-8 ml-4">
                                    <div className="w-[64px] h-[64px] flex items-center justify-center rounded-md border bg-white/90 overflow-hidden">
                                        <Image
                                        src={brand.logo}
                                        alt={`${brand.name} logo`}
                                        width={58}
                                        height={58}
                                        className="object-contain transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>
                                </div>
                                
                                <div className="p-4 pt-2">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                    <h2 className="text-sm font-semibold text-primary dark:text-white">{brand.name}</h2>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs">
                                        {truncateText(brand.description, 20)}
                                    </p>
                                    </div>
                                    {brand.activeDeals && (
                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm clip-star p-2 font-bold">
                                        {brand.activeDeals}
                                    </span>
                                    )}
                                </div>

                                <Link
                                    href={`/brands/${encodeURIComponent(brand.name)}`}
                                    className="inline-flex items-center text-sm text-primary hover:text-primary-dark transition-colors group/link font-medium"
                                >
                                    View Deals
                                    <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover/link:translate-x-1" />
                                </Link>
                                </div>
                            </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}

export default FilteredBrands;