"use client";

import { motion } from 'framer-motion';
import { ArrowRight, Search, TrendingUp, Users, Tag, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { recordSearch } from '@/lib/firebase/search';
import { handleSearchClick } from '@/helper';

interface HeroSplitScreenProps {
    popularSearches: string[];
    setPopularSearches: React.Dispatch<React.SetStateAction<string[]>>;
    loadingSearches: boolean;
    onOpenSearch?: () => void;
    brandsCount?: number;
    dealsCount?: number;
}

const HeroSplitScreen = ({
    popularSearches,
    setPopularSearches,
    loadingSearches,
    onOpenSearch,
    brandsCount = 500,
    dealsCount = 1473
}: HeroSplitScreenProps) => {
    const router = useRouter();
    const [displayedDeals, setDisplayedDeals] = useState(0);
    const [displayedBrands, setDisplayedBrands] = useState(0);

    // Animated counter effect
    useEffect(() => {
        const dealInterval = setInterval(() => {
            setDisplayedDeals(prev => {
                if (prev >= dealsCount) {
                    clearInterval(dealInterval);
                    return dealsCount;
                }
                return prev + Math.ceil(dealsCount / 50);
            });
        }, 30);

        const brandInterval = setInterval(() => {
            setDisplayedBrands(prev => {
                if (prev >= brandsCount) {
                    clearInterval(brandInterval);
                    return brandsCount;
                }
                return prev + Math.ceil(brandsCount / 50);
            });
        }, 30);

        return () => {
            clearInterval(dealInterval);
            clearInterval(brandInterval);
        };
    }, [dealsCount, brandsCount]);

    const handleExploreDealsClick = () => {
        if (onOpenSearch) {
            onOpenSearch();
        } else {
            router.push('/deals');
        }
    };

    const stats = [
        { icon: Tag, label: 'Active Deals', value: displayedDeals.toLocaleString(), color: 'text-tertiary' },
        { icon: Users, label: 'Trusted Brands', value: displayedBrands.toLocaleString(), color: 'text-secondary' },
        { icon: TrendingUp, label: 'Avg. Savings', value: '45%', color: 'text-alternate' }
    ];

    return (
        <section className="relative min-h-[70vh] flex items-center bg-gradient-to-br from-primary via-primary/95 to-black overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-20 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-tertiary rounded-full blur-3xl animate-pulse delay-700" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">

                    {/* Left Side - Content */}
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-6 border border-white/20"
                        >
                            <Zap className="h-4 w-4 text-alternate" fill="currentColor" />
                            <span className="text-sm text-white font-medium">Live Deal Updates</span>
                        </motion.div>

                        <motion.h1
                            className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            Save More on <br />
                            <span className="bg-gradient-to-r from-tertiary via-alternate to-secondary bg-clip-text text-transparent">
                                Every Purchase
                            </span>
                        </motion.h1>

                        <motion.p
                            className="text-lg lg:text-xl text-gray-300 mb-8 max-w-lg"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            Discover exclusive discount codes and vouchers from top UK brands. Start saving today!
                        </motion.p>

                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 mb-12"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            <div className="relative flex-1 max-w-md">
                                <input
                                    type="text"
                                    placeholder="Search for deals, brands, categories..."
                                    onClick={handleExploreDealsClick}
                                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-gray-800 font-medium shadow-xl hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-tertiary text-base"
                                />
                                <Search className="absolute left-4 top-4 h-6 w-6 text-gray-400" />
                            </div>
                            <button
                                onClick={handleExploreDealsClick}
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-tertiary to-alternate text-white rounded-xl font-semibold hover:shadow-2xl hover:shadow-tertiary/50 transition-all duration-300 group"
                            >
                                Browse All
                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>

                        {/* Trending searches */}
                        {popularSearches.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.4 }}
                                className="flex flex-wrap gap-3 items-center"
                            >
                                <span className="text-gray-400 text-sm">Trending:</span>
                                {popularSearches.slice(0, 4).map((search, index) => (
                                    <button
                                        key={search}
                                        onClick={() => handleSearchClick(router, search)}
                                        className="text-sm text-white/90 hover:text-white px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 hover:border-white/30 transition-all duration-300"
                                    >
                                        {search}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </div>

                    {/* Right Side - Stats Cards */}
                    <div className="relative">
                        <div className="grid grid-cols-1 gap-6">
                            {stats.map((stat, index) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, x: 50, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                                    className="group relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-tertiary/20 to-secondary/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                                    <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-gray-300 text-sm mb-2">{stat.label}</p>
                                                <p className={`text-4xl lg:text-5xl font-bold ${stat.color}`}>
                                                    {stat.value}
                                                    {stat.label === 'Avg. Savings' && <span className="text-2xl">+</span>}
                                                </p>
                                            </div>
                                            <div className={`p-4 ${stat.color} bg-white/10 rounded-xl`}>
                                                <stat.icon className="h-8 w-8" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Floating badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="absolute -top-6 -right-6 bg-gradient-to-br from-tertiary to-alternate text-white px-6 py-3 rounded-full font-bold shadow-2xl rotate-12 hover:rotate-0 transition-transform duration-300"
                        >
                            🔥 Hot Deals
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSplitScreen;
