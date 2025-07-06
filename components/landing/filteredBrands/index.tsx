import BrandsGridSkeleton from '@/components/skeleton';
import { truncateText } from '@/helper';
import { Brand } from '@/lib/firebase/collections';
import { motion } from 'framer-motion';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { toast } from 'sonner'; // Add toast notifications

const FilteredBrands = ({
    brands,
    loadingBrands,
}: {
    brands: Brand[];
    loadingBrands: boolean;
}) => {
    const filteredBrands = brands
        .sort(() => Math.random() - 0.5)
        .slice(0, 8);

    // Handle brand click with toast feedback
    const handleBrandClick = (brandName: string, activeDeals?: number) => {
        const dealText = activeDeals ? `${activeDeals} active deals` : 'deals and offers';
        toast.info(`Loading ${brandName}`, {
            description: `Checking out ${dealText} available now`,
        });
    };

    // Handle "View All" click
    const handleViewAllClick = () => {
        toast.info('Loading all brands', {
            description: 'Browse our complete collection of partner brands',
        });
    };

    return (
        <div>
            {loadingBrands && <BrandsGridSkeleton />}

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

                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filteredBrands.map((brand) => (
                                <Link
                                    key={brand.id}
                                    href={`/brands/${brand.slug}`}
                                    className="group block bg-white dark:bg-white/5 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                    onClick={() => handleBrandClick(brand.name, brand.activeDeals)}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
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
                                                    className="object-contain w-auto h-auto transition-transform duration-500 group-hover:scale-110"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-4 pt-2 text-right">
                                            <div className="flex items-start justify-between mb-3">
                                                <h2 className="text-sm font-semibold text-primary dark:text-white">{brand.name}</h2>
                                                {brand.activeDeals && (
                                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm clip-star font-bold">
                                                        {brand.activeDeals}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="inline-flex items-center text-sm text-primary transition-transform font-medium">
                                                View Deals
                                                <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            ))}
                        </div>
                        <div className="mt-5 flex justify-end">
                            <Link
                                href="/brands" 
                                className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-2 group"
                                >
                                View all brands
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>                        
                    </div>
                </section>
            )}
        </div>
    );
};

export default FilteredBrands;