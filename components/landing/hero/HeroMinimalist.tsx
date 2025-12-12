"use client";

import { motion } from 'framer-motion';
import { Search, Shield, Users, Sparkles, TrendingUp, CheckCircle2, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface HeroMinimalistProps {
    popularSearches: string[];
    setPopularSearches: React.Dispatch<React.SetStateAction<string[]>>;
    loadingSearches: boolean;
    onOpenSearch?: () => void;
}

const HeroMinimalist = ({
    popularSearches,
    setPopularSearches,
    loadingSearches,
    onOpenSearch,
}: HeroMinimalistProps) => {
    const router = useRouter();
    const [currentTestimonial, setCurrentTestimonial] = useState(0);

    const handleExploreDealsClick = () => {
        if (onOpenSearch) {
            onOpenSearch();
        } else {
            router.push('/deals');
        }
    };

    const trustMetrics = [
        {
            icon: Users,
            value: "50K+",
            label: "Happy Users",
            color: "text-secondary"
        },
        {
            icon: CheckCircle2,
            value: "£2M+",
            label: "Total Savings",
            color: "text-tertiary"
        },
        {
            icon: Shield,
            value: "100%",
            label: "Verified Codes",
            color: "text-primary"
        }
    ];

    const testimonials = [
        {
            text: "Saved over £500 this year! The deals are always up to date and genuine.",
            author: "Sarah M.",
            rating: 5
        },
        {
            text: "Best voucher site in the UK. Simple to use and actually works!",
            author: "James T.",
            rating: 5
        },
        {
            text: "I check here before every purchase now. So many great discounts!",
            author: "Emily R.",
            rating: 5
        }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const benefits = [
        { icon: Shield, text: "Verified codes only" },
        { icon: Sparkles, text: "Updated daily" },
        { icon: TrendingUp, text: "Best deals first" }
    ];

    return (
        <section className="relative min-h-[75vh] flex items-center bg-white overflow-hidden">
            {/* Subtle background patterns */}
            <div className="absolute inset-0 opacity-[0.03]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#26355D,transparent)]" />
            </div>

            {/* Floating shapes */}
            <motion.div
                animate={{
                    y: [0, -20, 0],
                    rotate: [0, 5, 0],
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute top-20 right-20 w-32 h-32 border-2 border-secondary/20 rounded-full"
            />
            <motion.div
                animate={{
                    y: [0, 20, 0],
                    rotate: [0, -5, 0],
                }}
                transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute bottom-32 left-20 w-24 h-24 border-2 border-tertiary/20 rounded-2xl"
            />

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-5xl mx-auto">

                    {/* Main Content */}
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-secondary/10 to-tertiary/10 px-5 py-2.5 rounded-full mb-8 border border-secondary/20"
                        >
                            <Star className="h-4 w-4 text-tertiary" fill="currentColor" />
                            <span className="text-sm font-semibold text-primary">Trusted by online shoppers</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-4xl lg:text-6xl xl:text-7xl font-bold text-primary mb-6 leading-tight"
                        >
                            Find the Best{' '}
                            <span className="relative inline-block">
                                <span className="bg-gradient-to-r from-secondary via-tertiary to-secondary bg-clip-text text-transparent">
                                    Discount Codes
                                </span>
                            </span>
                            <br />
                            in Seconds
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-lg lg:text-xl text-gray-600 mb-12 max-w-2xl mx-auto"
                        >
                            Shop smarter with verified vouchers from your favorite UK brands.
                            All codes tested and working.
                        </motion.p>

                        {/* Search Bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="max-w-3xl mx-auto mb-8"
                        >
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-secondary to-tertiary rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
                                <div className="relative flex items-center bg-white border-2 border-gray-200 rounded-2xl shadow-xl hover:shadow-2xl hover:border-primary/30 transition-all duration-300">
                                    <Search className="absolute left-6 h-6 w-6 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search"
                                        onClick={handleExploreDealsClick}
                                        className="w-full pl-16 pr-40 py-5 text-lg text-gray-800 rounded-2xl focus:outline-none bg-transparent"
                                    />
                                    <button
                                        onClick={handleExploreDealsClick}
                                        className="absolute right-2 px-8 py-3.5 bg-gradient-to-r from-secondary to-tertiary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                                    >
                                        Search Deals
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Benefits */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="flex flex-wrap justify-center gap-6 mb-16"
                        >
                            {benefits.map((benefit, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 text-gray-700"
                                >
                                    <div className="p-2 bg-gradient-to-br from-secondary/10 to-tertiary/10 rounded-lg">
                                        <benefit.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="font-medium">{benefit.text}</span>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Trust Metrics - Hidden for new sites, uncomment when you have real numbers */}
                    {/* <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
                    >
                        {trustMetrics.map((metric, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                                className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 hover:border-primary/30 hover:shadow-xl transition-all duration-300 text-center group"
                            >
                                <div className={`inline-flex p-4 rounded-xl ${metric.color} bg-gradient-to-br from-secondary/5 to-tertiary/5 mb-4 group-hover:scale-110 transition-transform`}>
                                    <metric.icon className="h-8 w-8" />
                                </div>
                                <div className={`text-4xl font-bold ${metric.color} mb-2`}>
                                    {metric.value}
                                </div>
                                <div className="text-gray-600 font-medium">
                                    {metric.label}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div> */}

                    {/* Testimonial Carousel */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="max-w-3xl mx-auto"
                    >
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 shadow-lg">
                            <div className="flex justify-center mb-4">
                                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                                    <Star key={i} className="h-5 w-5 text-amber-400" fill="currentColor" />
                                ))}
                            </div>
                            <p className="text-lg text-gray-700 text-center mb-4 italic">
                                "{testimonials[currentTestimonial].text}"
                            </p>
                            <p className="text-primary font-semibold text-center">
                                — {testimonials[currentTestimonial].author}
                            </p>

                            {/* Dots indicator */}
                            <div className="flex justify-center gap-2 mt-6">
                                {testimonials.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentTestimonial(index)}
                                        className={`w-2 h-2 rounded-full transition-all ${
                                            index === currentTestimonial
                                                ? 'bg-secondary w-8'
                                                : 'bg-gray-300'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default HeroMinimalist;
