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
        <section className="py-20 bg-bgPrimary dark:bg-gradient-to-b dark:from-gray-900 dark:to-black">
            <div className="container mx-auto px-4">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-xl light:border shadow-lg">
                        <TrendingUp className="h-5 w-5 text-tertiary" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-primary dark:text-white">Popular Searches</h2>
                </div>
                
                <div className="flex flex-wrap gap-4">
                    {popularSearches.slice(0, 15).map((search) => (
                    <motion.div
                        key={search}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <button
                        onClick={async ()=>{
                            await recordSearch(search);
                            handleSearchClick(router, search);
                        }}
                        className="group relative px-6 py-3 rounded-xl bg-secondary/100 dark:bg-secondary/50 backdrop-blur-xl hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex items-center gap-3"
                        >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <Search className="h-4 w-4 text-white group-hover:text-primary transition-colors relative z-10" />
                            <span className="text-white group-hover:text-white transition-colors relative z-10">{search}</span>
                        </button>
                    </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default SearchesSection