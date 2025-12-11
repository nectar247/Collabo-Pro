import { CategoryCard1 } from '@/components/deals/categories';
import { DynamicIcon, getCategoryColor } from '@/helper';
import { Category } from '@/lib/firebase/collections';
import { useCategories } from '@/lib/firebase/hooks';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Tag } from 'lucide-react';
import React from 'react'

const CategoriesSection = ({
    categories,
    loadingCategories,
}:{
    categories: Category[];
    loadingCategories: boolean;
}) => {
    
    return (
        <section className="py-20 bg-bgPrimary dark:bg-gradient-to-b dark:from-gray-800 dark:to-gray-900">
            <div className="container mx-auto px-4">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-xl light:border shadow-lg">
                    <Tag className="h-5 w-5 text-tertiary" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-primary dark:text-white">Browse Categories</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {categories.slice(0,8).map((data)=>{
                        return {
                            ...data,
                            icon: <DynamicIcon name={data.icon} /> as any,
                            color: getCategoryColor(data.name),
                            count: data.dealCount || 0,
                        };
                    }).map((category, index) => (
                        <CategoryCard1 category={category} index={index} key={category.name} />
                    ))}
                </div>
                <div className="mt-5 flex justify-end">
                    <Link
                        href="/categories" 
                        className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-2 group"
                        >
                        View all categories
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default CategoriesSection