import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { getPopularSearches, recordSearch } from '@/lib/firebase/search';
import { handleSearchClick } from '@/helper';
import { useRouter } from 'next/navigation';
import Preloader from '@/components/loaders/preloader';

const HeroSection = ({
    popularSearches,
    setPopularSearches,
    loadingSearches,
    onOpenSearch // Make this optional
}:{
    popularSearches: string[],
    setPopularSearches: React.Dispatch<React.SetStateAction<string[]>>,
    loadingSearches: boolean,
    onOpenSearch?: () => void // Make optional with ?
}) => {

    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const handleSearch = async (e: any) => {
        e.preventDefault();
        let search = e.target.elements.searchTerm?.value;
        await recordSearch(search);
        handleSearchClick(router, search);
    }

    const handleExploreDealsClick = () => {
        if (onOpenSearch) {
            onOpenSearch(); // Open the search modal if function exists
        } else {
            // Fallback: navigate to deals page
            router.push('/deals');
        }
    }

    return (
        <section className="relative min-h-[60vh] flex items-center bg-gradient-to-br from-primary via-primary to-black">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            
            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-3xl mx-auto text-center">
                    <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
                    >
                    <Sparkles className="h-5 w-5 text-secondary" />
                    <span className="text-white/90">Discover the future of savings</span>
                    </motion.div>

                    <motion.h1 
                    className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300 mb-3"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    style={{ lineHeight: 1.2 }}
                    >
                    Smart deals with savings personalised just for you
                    </motion.h1>
                    
                    <motion.p 
                    className="text-lg text-gray-300 mb-7"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    >
                    AI-powered savings.
                    </motion.p>

                    <motion.div 
                    className="flex flex-col sm:flex-row gap-4 justify-center mb-7"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    >
                    {/* Changed from Link to button with onClick handler */}
                    <button
                        onClick={handleExploreDealsClick}
                        className="inline-flex text-sm items-center justify-center px-12 py-2 rounded-full bg-gradient-to-r from-secondary to-secondary-dark text-white font-medium hover:shadow-lg hover:shadow-secondary/50 transition-all duration-300 relative group"
                    >
                        <span className="relative z-10">
                        Explore Deals
                        </span>
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </button>
                    </motion.div>

                    <div className="flex flex-wrap justify-center gap-3 items-center">
                    <span className="text-gray-400">Trending:</span>
                    {popularSearches.slice(0, 4).map((search) => (
                        <Link
                        key={search}
                        href={`/search?q=${encodeURIComponent(search)}`}
                        className="text-sm text-white/80 hover:text-white px-4 py-1.5 rounded-full bg-defaultPurple/25 hover:bg-defaultPurple/10 backdrop-blur-md border border-defaultPurple/10 hover:border-defaultPurple/20 transition-all duration-300"
                        >
                            {search}
                        </Link>
                    ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default HeroSection;