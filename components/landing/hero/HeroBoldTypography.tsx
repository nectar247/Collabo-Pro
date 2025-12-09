"use client";

import { motion } from 'framer-motion';
import { Search, ArrowRight, Flame, Zap, TrendingUp, ShoppingBag, Utensils, Laptop } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { handleSearchClick } from '@/helper';

interface HeroBoldTypographyProps {
    popularSearches: string[];
    setPopularSearches: React.Dispatch<React.SetStateAction<string[]>>;
    loadingSearches: boolean;
    onOpenSearch?: () => void;
}

const HeroBoldTypography = ({
    popularSearches,
    setPopularSearches,
    loadingSearches,
    onOpenSearch,
}: HeroBoldTypographyProps) => {
    const router = useRouter();

    const handleExploreDealsClick = () => {
        if (onOpenSearch) {
            onOpenSearch();
        } else {
            router.push('/deals');
        }
    };

    const quickCategories = [
        { name: "Fashion", icon: ShoppingBag, color: "from-pink-500 to-rose-500", count: "350+" },
        { name: "Tech", icon: Laptop, color: "from-blue-500 to-cyan-500", count: "200+" },
        { name: "Food", icon: Utensils, color: "from-orange-500 to-amber-500", count: "180+" }
    ];

    const trendingDeals = [
        { brand: "ASOS", discount: "20% OFF", tag: "Hot" },
        { brand: "Nike", discount: "30% OFF", tag: "New" },
        { brand: "Uber Eats", discount: "£10 OFF", tag: "Popular" },
        { brand: "Booking.com", discount: "15% OFF", tag: "Travel" },
    ];

    return (
        <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-black">
            {/* Animated gradient mesh background */}
            <div className="absolute inset-0">
                <motion.div
                    animate={{
                        background: [
                            "radial-gradient(circle at 20% 50%, rgba(133, 32, 247, 0.3) 0%, transparent 50%)",
                            "radial-gradient(circle at 80% 50%, rgba(255, 143, 0, 0.3) 0%, transparent 50%)",
                            "radial-gradient(circle at 50% 80%, rgba(133, 32, 247, 0.3) 0%, transparent 50%)",
                            "radial-gradient(circle at 20% 50%, rgba(133, 32, 247, 0.3) 0%, transparent 50%)",
                        ],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-0"
                />
                <motion.div
                    animate={{
                        background: [
                            "radial-gradient(circle at 80% 20%, rgba(255, 143, 0, 0.25) 0%, transparent 50%)",
                            "radial-gradient(circle at 20% 80%, rgba(38, 53, 93, 0.25) 0%, transparent 50%)",
                            "radial-gradient(circle at 50% 20%, rgba(255, 143, 0, 0.25) 0%, transparent 50%)",
                            "radial-gradient(circle at 80% 20%, rgba(255, 143, 0, 0.25) 0%, transparent 50%)",
                        ],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-0"
                />

                {/* Grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-6xl mx-auto">

                    {/* Main Hero Content */}
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-tertiary to-secondary px-5 py-2.5 rounded-full mb-8 shadow-lg shadow-tertiary/50"
                        >
                            <Flame className="h-5 w-5 text-white" fill="white" />
                            <span className="text-white font-bold text-sm">LIVE NOW: Today's Hottest Deals</span>
                        </motion.div>

                        {/* Kinetic Typography */}
                        <div className="relative mb-8">
                            <motion.h1
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.1 }}
                                className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black leading-none mb-6"
                            >
                                <motion.span
                                    className="block bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent"
                                    animate={{
                                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                                    }}
                                    transition={{
                                        duration: 5,
                                        repeat: Infinity,
                                        ease: "linear",
                                    }}
                                    style={{ backgroundSize: "200% auto" }}
                                >
                                    SAVE
                                </motion.span>
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.8, delay: 0.3 }}
                                    className="block bg-gradient-to-r from-tertiary via-alternate to-secondary bg-clip-text text-transparent"
                                    style={{
                                        backgroundSize: "200% auto",
                                        animation: "gradient 3s linear infinite",
                                    }}
                                >
                                    BIG
                                </motion.span>
                                <motion.span
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.5 }}
                                    className="block text-white"
                                >
                                    TODAY
                                </motion.span>
                            </motion.h1>
                        </div>

                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="text-xl lg:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto font-medium"
                        >
                            Unlock exclusive discount codes from 500+ top UK brands.
                            <br />
                            <span className="text-tertiary font-bold">Start saving in seconds.</span>
                        </motion.p>

                        {/* Search Bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.7 }}
                            className="max-w-3xl mx-auto mb-10"
                        >
                            <div className="relative group">
                                <motion.div
                                    animate={{
                                        opacity: [0.5, 1, 0.5],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                    className="absolute -inset-1 bg-gradient-to-r from-tertiary via-secondary to-tertiary rounded-3xl blur-lg"
                                />
                                <div className="relative flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden">
                                    <Search className="absolute left-6 h-7 w-7 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by brand, category, or product..."
                                        onClick={handleExploreDealsClick}
                                        className="w-full pl-16 pr-48 py-6 text-lg text-gray-800 focus:outline-none bg-transparent font-medium"
                                    />
                                    <button
                                        onClick={handleExploreDealsClick}
                                        className="absolute right-2 px-8 py-4 bg-gradient-to-r from-tertiary to-secondary text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2 group"
                                    >
                                        Explore Deals
                                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Quick Categories */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                            className="flex flex-wrap justify-center gap-4 mb-12"
                        >
                            {quickCategories.map((category, index) => (
                                <button
                                    key={category.name}
                                    onClick={() => router.push(`/categories/${category.name.toLowerCase()}`)}
                                    className="group relative overflow-hidden bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-xl px-6 py-4 transition-all duration-300 hover:scale-105"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 bg-gradient-to-br ${category.color} rounded-lg group-hover:scale-110 transition-transform`}>
                                            <category.icon className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-white font-bold text-sm">{category.name}</div>
                                            <div className="text-gray-400 text-xs">{category.count} deals</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    </div>

                    {/* Trending Deals Ticker */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.9 }}
                        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-tertiary" />
                                <span className="text-white font-bold">Trending Now</span>
                            </div>
                            <button
                                onClick={handleExploreDealsClick}
                                className="text-secondary hover:text-tertiary text-sm font-semibold transition-colors flex items-center gap-1"
                            >
                                View All
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {trendingDeals.map((deal, index) => (
                                <motion.div
                                    key={deal.brand}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                                    className="relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/30 transition-all cursor-pointer group"
                                >
                                    <div className="absolute top-2 right-2">
                                        <span className="text-xs bg-tertiary text-white px-2 py-1 rounded-full font-bold">
                                            {deal.tag}
                                        </span>
                                    </div>
                                    <div className="text-white font-bold text-lg mb-1 group-hover:text-tertiary transition-colors">
                                        {deal.brand}
                                    </div>
                                    <div className="text-secondary font-bold text-xl">
                                        {deal.discount}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            <style jsx>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
        </section>
    );
};

export default HeroBoldTypography;
