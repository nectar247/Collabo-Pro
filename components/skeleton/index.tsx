import { ShoppingBag } from 'lucide-react';
import React from 'react';

const SkeletonNavBar = () => {
    return (
        <div className="flex justify-between items-center p-4 animate-pulse mx-20 max-[400px]:mx-5 max-[400px]:items-start">

            {/* Logo section */}
            <div className="flex items-center space-x-2">
                <div className="h-10 w-10 bg-gray-300 rounded-xl"></div>
                <div>
                    <div className="h-4 w-24 bg-gray-300 rounded"></div>
                    <div className="h-3 w-20 bg-gray-200 rounded mt-1"></div>
                </div>
            </div>
    
            {/* Navigation links */}
            <div className="hidden md:flex space-x-6">
                <div className="h-4 w-12 bg-gray-300 rounded"></div>
                <div className="h-4 w-16 bg-gray-300 rounded"></div>
                <div className="h-4 w-14 bg-gray-300 rounded"></div>
                <div className="h-4 w-10 bg-gray-300 rounded"></div>
            </div>
    
            {/* Icons */}
            <div className="hidden md:flex space-x-4">
                <div className="h-6 w-6 bg-gray-300 rounded-full"></div>
                <div className="h-6 w-6 bg-gray-300 rounded-full"></div>
                <div className="h-6 w-6 bg-gray-300 rounded-full"></div>
                <div className="h-6 w-6 bg-gray-300 rounded-full"></div>
            </div>

        </div>
    );
};

const SkeletonHeroSection = () => {
    return (
        <div className='relative min-h-[60vh] bg-gradient-to-br from-primary via-primary to-black'>
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            <div className="flex flex-col items-center justify-center text-center p-8 animate-pulse space-y-6 py-20 hidden">
                {/* Top Tag */}
                <div className="h-8 w-64 bg-gray-700 rounded-full"></div>

                {/* Heading */}
                <div className="space-y-3">
                <div className="h-6 w-80 bg-gray-600 rounded"></div>
                <div className="h-6 w-72 bg-gray-600 rounded mx-auto"></div>
                </div>

                {/* Subheading */}
                <div className="h-4 w-48 bg-gray-500 rounded"></div>

                {/* CTA Button */}
                <div className="h-10 w-40 bg-secondary rounded-full"></div>

                {/* Trending Tags */}
                <div className="flex flex-wrap justify-center gap-2 pt-4">
                <div className="h-6 w-20 bg-primary rounded-full"></div>
                <div className="h-6 w-20 bg-primary rounded-full"></div>
                <div className="h-6 w-24 bg-primary rounded-full"></div>
                <div className="h-6 w-24 bg-primary rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

const SkeletonFooter = () => (
    <footer className="animate-pulse bg-[#0f172a] text-gray-400 p-8 lg:p-12">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
            {/* Four link columns */}
            {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-3">
                    <div className="h-4 w-24 bg-gray-600 rounded mb-5"></div> {/* column title */}
                    {[...Array(6)].map((__, j) => (
                    <div
                        key={j}
                        className="h-3 w-28 bg-gray-700 rounded"
                        style={{ width: `${70 + (j % 3) * 20}px` }}
                    ></div>
                    ))}
                </div>
            ))}

            {/* Newsletter column */}
            <div className="space-y-4">
                <div className="h-4 w-24 bg-gray-600 rounded mb-5"></div>      {/* “Newsletter” */}
                <div className="h-8 w-48 bg-gray-700 rounded-md"></div>   {/* input */}
                <div className="flex space-x-3 pt-2">
                    {[...Array(4)].map((_, k) => (
                    <div key={k} className="h-6 w-6 bg-gray-700 rounded-full"></div>
                    ))}
                </div>
            </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gray-700 mb-8"></div>

        {/* Fine‑print text blocks */}
        <div className="space-y-2 text-center">
            <div className="h-3 w-80 mx-auto bg-gray-700 rounded"></div>
            <div className="h-3 w-96 mx-auto bg-gray-700 rounded"></div>
            <div className="h-3 w-64 mx-auto bg-gray-700 rounded"></div>
        </div>
    </footer>
);
  
export default function BrandsGridSkeleton() {
    const skeletons = Array.from({ length: 8 }); // display 8 placeholders

    return (
        <div className="px-4 py-6">
            <div className="flex items-left mb-4 items-center">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-xl light:border shadow-lg">
                    <ShoppingBag className="h-5 w-5 text-tertiary" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-primary dark:text-white mx-2">Brands For You</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {skeletons.map((_, i) => (
                    <div
                        key={i}
                        className="bg-white shadow rounded-lg p-4 animate-pulse flex flex-col"
                    >
                    <div className="h-32 bg-gray-200 rounded mb-3" />
                        <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded mb-4" />
                        <div className="mt-auto h-3 w-1/3 bg-gray-300 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
  
const SkeletonLanding = () => {
    return (
        <section>
            <SkeletonNavBar />
            <SkeletonHeroSection />
            <SkeletonFooter />
        </section>
    )
}

const FooterSingleLoading = () => {
  return (
    <>
        <li className="animate-pulse bg-gray-700 h-3 w-1/2 rounded"></li>
        <li className="animate-pulse bg-gray-700 h-3 w-1/4 rounded"></li>
        <li className="animate-pulse bg-gray-700 h-3 w-1/2 rounded"></li>
        <li className="animate-pulse bg-gray-700 h-3 w-1/3 rounded"></li>
        <li className="animate-pulse bg-gray-700 h-3 w-1/2 rounded"></li>
        <li className="animate-pulse bg-gray-700 h-3 w-1/2 rounded"></li>
        <li className="animate-pulse bg-gray-700 h-3 w-1/4 rounded"></li>
        <li className="animate-pulse bg-gray-700 h-3 w-1/2 rounded"></li>
        <li className="animate-pulse bg-gray-700 h-3 w-1/3 rounded"></li>
        <li className="animate-pulse bg-gray-700 h-3 w-1/2 rounded"></li>
    </>
  )
}

export {
    SkeletonLanding,
    FooterSingleLoading
}