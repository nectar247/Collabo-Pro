import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { truncateText } from '@/helper';
import { useDeals } from '@/lib/firebase/hooks';
import { Deal } from '@/lib/firebase/collections';
import { toast } from 'sonner'; // Add toast notifications

function CategoryCard1({category}: {category: any}) {
    const { deals, loading } = useDeals();
    const [categoryDeals, setCategoryDeals] = useState<Deal[]>([]);
    
    useEffect(() => {
        if (!loading && deals) {
            const filteredDeals = deals.filter(deal => 
                deal.category.toLowerCase() === category.name.toLowerCase()
            );
            setCategoryDeals(filteredDeals);
        }
    }, [deals, loading, category.name]);

    // Handle category click with toast feedback
    const handleCategoryClick = () => {
        const dealCount = category.count || categoryDeals.length;
        toast.info(`Loading ${category.name} deals`, {
            description: `Browsing ${dealCount}+ available deals in this category`,
        });
    };

    return (
        <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
        >
            <Link
                href={`/categories/${encodeURIComponent(category.name.toLowerCase())}`}
                className="group block"
                onClick={handleCategoryClick}
            >
                <div className="relative overflow-hidden rounded-2xl bg-secondary/100 dark:bg-secondary/50 backdrop-blur-xl p-3 px-4 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5">
                    <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-10 group-hover:opacity-20 transition-opacity duration-500`} />
                    <div className="relative z-10">
                        <div className={`w-5 h-5 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center m-2 transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                            {category.icon}
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">{truncateText(category.name, 20)}</h3>
                        <p className="text-white mb-0 text-sm">{truncateText(category.description, 35)}</p>
                        <p className="text-white text-sm">{category.count}+ deals</p>
                        <div className="mt-2 inline-flex items-center text-gray-200 group-hover:text-white transition-colors">
                            <span className="mr-2">View Deals</span>
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

export {
    CategoryCard1,
};