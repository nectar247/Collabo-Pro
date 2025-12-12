import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { truncateText, categoryToSlug } from '@/helper';
import { toast } from 'sonner';

function CategoryCard1({category, index}: {category: any, index?: number}) {
    const [isHovered, setIsHovered] = useState(false);

    const handleCategoryClick = () => {
        const dealCount = category.count || category.dealCount || 0;
        toast.info(`Loading ${category.name} deals`, {
            description: `Browsing ${dealCount}+ available deals in this category`,
        });
    };

    // Use deal count from category data
    const dealCount = category.count || category.dealCount || 0;
    const badge = category.badge || (dealCount > 50 ? "Hot" : dealCount > 20 ? "Popular" : "New");

    // Array of 8 unique vibrant gradients
    const gradients = [
        'from-pink-500 to-rose-500',      // Pink
        'from-blue-500 to-cyan-500',      // Blue
        'from-orange-500 to-amber-500',   // Orange
        'from-purple-500 to-indigo-500',  // Purple
        'from-green-500 to-emerald-500',  // Green
        'from-red-500 to-pink-500',       // Red
        'from-teal-500 to-cyan-500',      // Teal
        'from-fuchsia-500 to-purple-500', // Fuchsia
    ];

    // Use index to assign gradient, or fallback to name-based detection
    const getGradientByIndex = () => {
        if (typeof index === 'number') {
            return gradients[index % gradients.length];
        }

        // Fallback: name-based detection
        const name = category.name.toLowerCase();
        if (name.includes('fashion') || name.includes('clothing')) return gradients[0];
        if (name.includes('tech') || name.includes('electronic')) return gradients[1];
        if (name.includes('food') || name.includes('dining')) return gradients[2];
        if (name.includes('travel') || name.includes('hotel')) return gradients[3];
        if (name.includes('health') || name.includes('fitness')) return gradients[4];
        if (name.includes('entertainment') || name.includes('game')) return gradients[5];
        if (name.includes('home') || name.includes('garden')) return gradients[6];
        if (name.includes('beauty') || name.includes('sport')) return gradients[7];

        // Default: cycle through gradients based on category name hash
        const hash = category.name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        return gradients[hash % gradients.length];
    };

    const gradient = getGradientByIndex();

    return (
        <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative cursor-pointer"
        >
            <Link
                href={`/categories/${categoryToSlug(category.name)}`}
                className="group block"
                onClick={handleCategoryClick}
            >
                <div
                    className={`relative bg-gradient-to-br ${gradient} rounded-2xl p-6 shadow-2xl border border-white/20 transition-all duration-300`}
                >
                    {/* Shine effect */}
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-2xl shine-effect"
                        />
                    )}

                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            {category.icon}
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-white leading-none">{dealCount}+</div>
                            <div className="text-sm text-white/90 font-medium">deals</div>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{truncateText(category.name, 20)}</h3>
                    <p className="text-white/80 text-sm mb-3">{truncateText(category.description, 35)}</p>

                    {badge && (
                        <div className="mt-4 inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                            <Star className="h-3 w-3 text-white" fill="white" />
                            <span className="text-xs text-white font-medium">{badge}</span>
                        </div>
                    )}
                </div>
            </Link>

            <style jsx>{`
                .shine-effect {
                    background-size: 200% 100%;
                    animation: shine 1.5s infinite;
                }
                @keyframes shine {
                    0% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: 200% 0;
                    }
                }
            `}</style>
        </motion.div>
    );
}

export {
    CategoryCard1,
};