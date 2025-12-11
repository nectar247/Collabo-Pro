import { Search, TrendingUp } from 'lucide-react';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { recordSearch } from '@/lib/firebase/search';
import { handleSearchClick } from '@/helper';
import { useRouter } from 'next/navigation';

const SearchesSection = ({
    popularSearches,
    setPopularSearches,
    loadingSearches
}:{
    popularSearches: string[],
    setPopularSearches: React.Dispatch<React.SetStateAction<string[]>>,
    loadingSearches: boolean
}) => {

    const router = useRouter();

    return (
        <section className="py-20 bg-white dark:bg-gradient-to-b dark:from-gray-900 dark:to-black">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-4xl mx-auto"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-secondary/10 to-tertiary/10 border border-secondary/20">
                            <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-primary dark:text-white">Popular Searches</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        See what other shoppers are searching for
                    </p>

                    <div className="flex flex-wrap justify-center gap-3">
                        {popularSearches.slice(0, 15).map((search, index) => (
                            <motion.button
                                key={search}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                onClick={async ()=>{
                                    await recordSearch(search);
                                    handleSearchClick(router, search);
                                }}
                                className="text-sm text-primary hover:text-secondary px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 hover:border-secondary/30 transition-all duration-300 font-medium"
                            >
                                {search}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default SearchesSection