"use client";

import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Search, Sparkles, Tag, Percent, Gift, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { handleSearchClick } from '@/helper';

interface Hero3DCardsProps {
    popularSearches: string[];
    setPopularSearches: React.Dispatch<React.SetStateAction<string[]>>;
    loadingSearches: boolean;
    onOpenSearch?: () => void;
}

const DealCard = ({ deal, index }: { deal: any; index: number }) => {
    const [isHovered, setIsHovered] = useState(false);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);

    const springConfig = { damping: 20, stiffness: 300 };
    const rotateXSpring = useSpring(rotateX, springConfig);
    const rotateYSpring = useSpring(rotateY, springConfig);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set(e.clientX - centerX);
        y.set(e.clientY - centerY);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        setIsHovered(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            style={{
                rotateX: rotateXSpring,
                rotateY: rotateYSpring,
                transformStyle: "preserve-3d",
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className="relative cursor-pointer"
        >
            <div
                className={`relative bg-gradient-to-br ${deal.gradient} rounded-2xl p-6 shadow-2xl border border-white/20 transition-all duration-300 ${
                    isHovered ? 'shadow-3xl scale-105' : ''
                }`}
                style={{ transform: "translateZ(50px)" }}
            >
                {/* Shine effect */}
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-2xl"
                        style={{
                            backgroundSize: "200% 100%",
                            animation: "shine 1.5s infinite",
                        }}
                    />
                )}

                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 ${deal.iconBg} rounded-xl`}>
                        <deal.icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-white">{deal.discount}</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{deal.title}</h3>
                <p className="text-white/80 text-sm">{deal.description}</p>

                {deal.badge && (
                    <div className="mt-4 inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        <Star className="h-3 w-3 text-white" fill="white" />
                        <span className="text-xs text-white font-medium">{deal.badge}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const Hero3DCards = ({
    popularSearches,
    setPopularSearches,
    loadingSearches,
    onOpenSearch,
}: Hero3DCardsProps) => {
    const router = useRouter();

    const handleExploreDealsClick = () => {
        if (onOpenSearch) {
            onOpenSearch();
        } else {
            router.push('/deals');
        }
    };

    const dealCards = [
        {
            icon: Tag,
            title: "Fashion Deals",
            discount: "70%",
            description: "Up to 70% off on top fashion brands",
            gradient: "from-pink-500 to-rose-500",
            iconBg: "bg-white/20",
            badge: "Hot"
        },
        {
            icon: Percent,
            title: "Tech Savings",
            discount: "50%",
            description: "Save big on electronics & gadgets",
            gradient: "from-blue-500 to-cyan-500",
            iconBg: "bg-white/20",
            badge: "New"
        },
        {
            icon: Gift,
            title: "Food & Dining",
            discount: "40%",
            description: "Exclusive restaurant vouchers",
            gradient: "from-orange-500 to-amber-500",
            iconBg: "bg-white/20",
            badge: "Popular"
        }
    ];

    return (
        <section className="relative min-h-[80vh] flex items-center bg-gradient-to-br from-primary via-indigo-900 to-black overflow-hidden">
            {/* Animated background grid */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

                {/* Floating orbs */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute top-20 left-20 w-96 h-96 bg-secondary rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1,
                    }}
                    className="absolute bottom-20 right-20 w-96 h-96 bg-tertiary rounded-full blur-3xl"
                />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                {/* Main Content */}
                <div className="max-w-5xl mx-auto text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl px-5 py-2.5 rounded-full mb-8 border border-white/20"
                    >
                        <Sparkles className="h-5 w-5 text-alternate" fill="currentColor" />
                        <span className="text-white font-semibold">Discover Amazing Deals</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight"
                    >
                        Your Gateway to{' '}
                        <span className="relative inline-block">
                            <span className="bg-gradient-to-r from-tertiary via-alternate to-secondary bg-clip-text text-transparent">
                                Savings
                            </span>
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.8, delay: 0.8 }}
                                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-tertiary to-secondary rounded-full"
                            />
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto"
                    >
                        Explore thousands of verified discount codes, vouchers, and exclusive deals from your favorite brands
                    </motion.p>

                    {/* Search Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="relative max-w-2xl mx-auto mb-8"
                    >
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-tertiary via-secondary to-tertiary rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
                            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                                <div className="flex items-center">
                                    <Search className="absolute left-6 h-6 w-6 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search for brands, categories, or deals..."
                                        onClick={handleExploreDealsClick}
                                        className="w-full pl-16 pr-6 py-5 text-lg text-gray-800 focus:outline-none bg-transparent"
                                    />
                                    <button
                                        onClick={handleExploreDealsClick}
                                        className="absolute right-2 px-6 py-3 bg-gradient-to-r from-tertiary to-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Trending searches */}
                    {popularSearches.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="flex flex-wrap justify-center gap-3 items-center"
                        >
                            <span className="text-gray-400">Popular:</span>
                            {popularSearches.slice(0, 5).map((search) => (
                                <button
                                    key={search}
                                    onClick={() => handleSearchClick(router, search)}
                                    className="text-sm text-white px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all duration-300"
                                >
                                    {search}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </div>

                {/* 3D Deal Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto perspective-1000">
                    {dealCards.map((deal, index) => (
                        <DealCard key={index} deal={deal} index={index} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes shine {
                    0% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: 200% 0;
                    }
                }
                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>
        </section>
    );
};

export default Hero3DCards;
