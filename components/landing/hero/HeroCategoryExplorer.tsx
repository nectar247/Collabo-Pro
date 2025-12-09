"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, Utensils, Plane, Laptop, Home as HomeIcon, Sparkles, Heart, Gift, Star, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { handleSearchClick } from '@/helper';

interface HeroCategoryExplorerProps {
    popularSearches: string[];
    setPopularSearches: React.Dispatch<React.SetStateAction<string[]>>;
    loadingSearches: boolean;
    onOpenSearch?: () => void;
}

const HeroCategoryExplorer = ({
    popularSearches,
    setPopularSearches,
    loadingSearches,
    onOpenSearch,
}: HeroCategoryExplorerProps) => {
    const router = useRouter();
    const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const handleExploreDealsClick = () => {
        if (onOpenSearch) {
            onOpenSearch();
        } else {
            router.push('/deals');
        }
    };

    const categories = [
        {
            name: "Fashion & Beauty",
            icon: ShoppingBag,
            gradient: "from-pink-500 via-rose-500 to-purple-500",
            deals: 450,
            topBrands: ["ASOS", "Zara", "Boots"],
            savings: "Up to 70% off"
        },
        {
            name: "Electronics",
            icon: Laptop,
            gradient: "from-blue-500 via-cyan-500 to-teal-500",
            deals: 320,
            topBrands: ["Apple", "Samsung", "Currys"],
            savings: "Save £200+"
        },
        {
            name: "Food & Dining",
            icon: Utensils,
            gradient: "from-orange-500 via-amber-500 to-yellow-500",
            deals: 280,
            topBrands: ["Uber Eats", "Deliveroo", "Pizza Hut"],
            savings: "£15 off orders"
        },
        {
            name: "Travel",
            icon: Plane,
            gradient: "from-indigo-500 via-purple-500 to-pink-500",
            deals: 200,
            topBrands: ["Booking.com", "Expedia", "Airbnb"],
            savings: "15% off trips"
        },
        {
            name: "Home & Garden",
            icon: HomeIcon,
            gradient: "from-green-500 via-emerald-500 to-teal-500",
            deals: 180,
            topBrands: ["IKEA", "B&Q", "Dunelm"],
            savings: "Up to 50% off"
        },
        {
            name: "Health & Wellness",
            icon: Heart,
            gradient: "from-red-500 via-rose-500 to-pink-500",
            deals: 150,
            topBrands: ["Holland & Barrett", "Gymshark", "MyProtein"],
            savings: "Save 40%+"
        }
    ];

    return (
        <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-primary via-indigo-900 to-primary overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute top-0 left-0 w-96 h-96 bg-secondary rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.1, 0.15, 0.1],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute bottom-0 right-0 w-96 h-96 bg-tertiary rounded-full blur-3xl"
                />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                {/* Header Content */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full mb-8 border border-white/20"
                    >
                        <Sparkles className="h-5 w-5 text-alternate" fill="currentColor" />
                        <span className="text-white font-semibold">Explore by Category</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-4xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight"
                    >
                        Find Deals for{' '}
                        <span className="relative inline-block">
                            <span className="bg-gradient-to-r from-tertiary via-alternate to-secondary bg-clip-text text-transparent">
                                Everything
                            </span>
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto"
                    >
                        Browse by category or search across 500+ brands to find your perfect deal
                    </motion.p>

                    {/* Search Bar with Category Filter */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="max-w-4xl mx-auto mb-12"
                    >
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-tertiary to-secondary rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                                <div className="flex items-center p-2">
                                    <div className="flex-1 flex items-center">
                                        <Search className="absolute left-6 h-6 w-6 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search for brands, products, or deals..."
                                            onClick={handleExploreDealsClick}
                                            className="w-full pl-16 pr-6 py-4 text-lg text-gray-800 focus:outline-none bg-transparent"
                                        />
                                    </div>
                                    {selectedCategory && (
                                        <div className="flex items-center gap-2 bg-gradient-to-r from-secondary to-tertiary text-white px-4 py-2 rounded-lg mr-2">
                                            <span className="text-sm font-medium">{selectedCategory}</span>
                                            <button
                                                onClick={() => setSelectedCategory(null)}
                                                className="hover:bg-white/20 rounded-full p-0.5"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleExploreDealsClick}
                                        className="px-8 py-4 bg-gradient-to-r from-tertiary to-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Interactive Category Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto"
                >
                    {categories.map((category, index) => (
                        <motion.div
                            key={category.name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                            onHoverStart={() => setHoveredCategory(index)}
                            onHoverEnd={() => setHoveredCategory(null)}
                            className="relative group cursor-pointer"
                        >
                            {/* Glow effect */}
                            <div className={`absolute inset-0 bg-gradient-to-r ${category.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />

                            {/* Card */}
                            <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 h-full group-hover:transform group-hover:scale-105">
                                {/* Icon & Title */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-4 bg-gradient-to-br ${category.gradient} rounded-xl group-hover:scale-110 transition-transform`}>
                                        <category.icon className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-white">{category.deals}</div>
                                        <div className="text-xs text-gray-400">deals</div>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-white group-hover:to-gray-300 transition-all">
                                    {category.name}
                                </h3>

                                <p className="text-sm text-gray-400 mb-4">
                                    {category.savings}
                                </p>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {hoveredCategory === index && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-4 border-t border-white/10">
                                                <p className="text-xs text-gray-400 mb-2">Top brands:</p>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {category.topBrands.map((brand) => (
                                                        <span
                                                            key={brand}
                                                            className="text-xs bg-white/10 text-white px-2 py-1 rounded-md"
                                                        >
                                                            {brand}
                                                        </span>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedCategory(category.name);
                                                        router.push(`/categories/${category.name.toLowerCase().replace(/\s+/g, '-')}`);
                                                    }}
                                                    className="flex items-center gap-2 text-sm font-semibold text-white hover:text-tertiary transition-colors"
                                                >
                                                    View all deals
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Star badge for popular categories */}
                                {index < 3 && (
                                    <div className="absolute top-4 right-4">
                                        <div className="bg-alternate text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                            <Star className="h-3 w-3" fill="white" />
                                            Popular
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1 }}
                    className="text-center mt-12"
                >
                    <button
                        onClick={handleExploreDealsClick}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-xl font-bold hover:shadow-2xl hover:scale-105 transition-all"
                    >
                        Browse All Deals
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </motion.div>
            </div>
        </section>
    );
};

export default HeroCategoryExplorer;
