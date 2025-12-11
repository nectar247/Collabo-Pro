import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { truncateText } from '@/helper';
import { useDeals } from '@/lib/firebase/hooks';
import { Deal } from '@/lib/firebase/collections';
import { toast } from 'sonner';

function CategoryCard1({category, index}: {category: any, index?: number}) {
    const { deals, loading } = useDeals();
    const [categoryDeals, setCategoryDeals] = useState<Deal[]>([]);
    const [isHovered, setIsHovered] = useState(false);

    // 3D transform values
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);
    const springConfig = { damping: 20, stiffness: 300 };
    const rotateXSpring = useSpring(rotateX, springConfig);
    const rotateYSpring = useSpring(rotateY, springConfig);

    useEffect(() => {
        if (!loading && deals) {
            const filteredDeals = deals.filter(deal =>
                deal.category.toLowerCase() === category.name.toLowerCase()
            );
            setCategoryDeals(filteredDeals);
        }
    }, [deals, loading, category.name]);

    const handleCategoryClick = () => {
        const dealCount = category.count || categoryDeals.length;
        toast.info(`Loading ${category.name} deals`, {
            description: `Browsing ${dealCount}+ available deals in this category`,
        });
    };

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

    // Use deal count instead of discount
    const dealCount = category.count || categoryDeals.length || 0;
    const badge = category.badge || (category.count > 50 ? "Hot" : category.count > 20 ? "Popular" : "New");

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
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
                rotateX: rotateXSpring,
                rotateY: rotateYSpring,
                transformStyle: "preserve-3d",
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className="relative cursor-pointer perspective-1000"
        >
            <Link
                href={`/categories/${encodeURIComponent(category.name.toLowerCase())}`}
                className="group block"
                onClick={handleCategoryClick}
            >
                <div
                    className={`relative bg-gradient-to-br ${gradient} rounded-2xl p-6 shadow-2xl border border-white/20 transition-all duration-300 ${
                        isHovered ? 'shadow-3xl scale-105' : ''
                    }`}
                    style={{ transform: "translateZ(50px)" }}
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
                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>
        </motion.div>
    );
}

export {
    CategoryCard1,
};