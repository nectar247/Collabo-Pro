/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import Preloader from "@/components/loaders/preloader";
import ErrorLoader from "@/components/loaders/ErrorLoader";
import Navigation from "@/components/navigation";
import Footer from '@/components/footer';
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

export default function BrandsDirectoryClient() {
  
  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: null
  });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredBrands = useMemo(() => {
    if (!allBrands) return [];
    return searchQuery.trim()
      ? allBrands.filter(brand => brand.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : allBrands;
  }, [allBrands, searchQuery]);

  // Define a type for the brand object - updated to include slug
  interface Brand {
    id: string;
    name: string;
    slug: string; // Added slug field
  }

  // Define a type for the alphabetical groups
  interface AlphabeticalGroups {
    [key: string]: Brand[];
  }

  // Then use this type in your useMemo
  const alphabeticalGroups = useMemo<AlphabeticalGroups>(() => {
    if (!filteredBrands.length) return {};

    // Sort brands alphabetically by name
    const sortedBrands = [...filteredBrands].sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    // Group brands by their first letter
    return sortedBrands.reduce<AlphabeticalGroups>((groups, brand) => {
      const firstLetter = brand.name.charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(brand);
      return groups;
    }, {});
  }, [filteredBrands]);

  const availableLetters = useMemo(() => Object.keys(alphabeticalGroups).sort(), [alphabeticalGroups]);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  if (loadingBrands) return <Preloader text="Loading brands..." />;
  if (errorBrands) return <ErrorLoader text="Error Loading Brands" message={errorBrands.message} />;

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="relative bg-white dark:bg-gray-800 border-b py-6 text-center">
          <h1 className="text-4xl font-bold text-primary dark:text-white mb-4">Featured Brands</h1>
          <p className="text-gray-800 dark:text-gray-400 mb-8">Discover amazing deals from your favorite brands</p>
        </header>

        <div className={`sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm transition-all ${scrolled ? 'py-2' : 'py-4'}`}>
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 hidden md:block">FILTER:</div>
            <div className="hidden md:flex items-center justify-center flex-1 overflow-x-auto py-1 hide-scrollbar space-x-1">

              <button
                onClick={() => setActiveFilter("all")}
                className={`min-w-8 h-8 px-3 rounded transition-colors ${activeFilter === "all" ? "bg-primary text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              >
                A-Z
              </button>
              {alphabet.map((letter) => (
                <button
                  key={letter}
                  onClick={() => {
                    setActiveFilter(letter);
                    const element = document.getElementById(`section-${letter}`);
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className={`min-w-8 h-8 px-2 rounded text-sm font-medium transition-colors ${
                    activeFilter === letter
                      ? "bg-secondary text-white"
                      : alphabeticalGroups[letter]
                      ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      : "text-gray-300 dark:text-gray-600 opacity-40 cursor-not-allowed"
                  }`}
                  disabled={!alphabeticalGroups[letter]}
                >
                  {letter}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-64 mt-2 md:mt-0">
              <input
                type="search"
                placeholder="Search brands"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-sm bg-gray-100 dark:bg-gray-700 border rounded-full focus:outline-none"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {(searchQuery && filteredBrands.length === 0) ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h2 className="text-xl font-medium">No brands found for &quot;{searchQuery}&quot;</h2>
              <p className="mt-2 text-gray-600">Try another search term.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {availableLetters.map((letter) => (
                <section key={letter} id={`section-${letter}`} className="scroll-mt-20">
                  <div className="flex items-center mb-4">
                    <h2 className="text-2xl font-bold">{letter}</h2>
                    <div className="ml-4 h-px bg-gray-200 flex-grow"></div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y">
                      {alphabeticalGroups[letter].map((brand) => (
                        <li key={brand.id} className="p-4 border-gray-200">
                          <Link 
                            href={`/brands/${brand.slug}`} 
                            className="block hover:underline"
                          >
                            {brand.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer 
        categories={categories} 
        loadingCategories={loadingCategories}
        brands={featuredBrands} 
        loadingBrands={loadingBrands}
        settings={settings} 
        settLoading={settLoading}
        dynamicLinks={dynamicLinks}
        loadingDynamicLinks={loadingDynamicLinks}
      />
    </>
  );
}