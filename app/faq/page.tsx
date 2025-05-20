"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useFAQs } from "@/lib/firebase/hooks";
import Preloader from "@/components/loaders/preloader";
import ErrorLoader from "@/components/loaders/ErrorLoader";

import Navigation from "@/components/navigation";
import Footer from '@/components/footer';
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { faqs, loading, error } = useFAQs();
  const {settings} = useSettings();

  // Get unique categories from FAQs
  const categories = ['all', ...new Set(faqs.map(faq => faq.category))];

  const { settings: settings__, loading: settLoading } = useSettings();
  const { categories: categories__, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: null
  });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <Preloader text="Loading FAQs..." />;
  }

  if (error) {
    return <ErrorLoader text="Error Loading FAQs" message={error.message} />;
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black py-12">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <div className="max-w-4xl mx-auto mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-secondary dark:text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Home
            </Link>
          </div>

          {/* Header */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-secondary/20 mb-4">
              <HelpCircle className="h-8 w-8 text-secondary" />
            </div>
            <h1 className="text-4xl font-bold text-secondary dark:text-white mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-gray-800 dark:text-gray-400">
              Find answers to common questions about {settings?.general.siteName}
            </p>
          </div>

          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto mb-12 space-y-6">
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions..."
                className="w-full pl-12 pr-4 py-3 bg-gray-800/100 dark:bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedCategory === category
                      ? "bg-secondary/20 border-secondary text-secondary"
                      : "border-white/20 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ List */}
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {filteredFaqs.filter((v)=>v.status == 'published').map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-gray-800/100 dark:bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left"
                  >
                    <span className="text-lg font-medium text-white">{faq.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        expandedIndex === index ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {expandedIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-white/10"
                      >
                        <div className="px-6 py-4">
                          <p className="text-gray-400">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {filteredFaqs.length === 0 && (
              <div className="text-center py-12 bg-gray-800/100 rounded-lg">
                <HelpCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-white mb-2">No matching questions found</h2>
                <p className="text-gray-400 mb-8">
                  Try adjusting your search or browse all categories
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="px-6 py-3 bg-secondary hover:bg-secondary-dark text-white rounded-lg transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* Contact Support */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 p-8 bg-gray-800/100 dark:bg-white/5 rounded-xl text-center"
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                Still have questions?
              </h2>
              <p className="text-gray-400 mb-6">
                Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary-dark text-white rounded-lg transition-colors"
              >
                Contact Support
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer 
        categories={categories__} 
        loadingCategories={loadingCategories}
        brands={featuredBrands} 
        loadingBrands={loadingBrands}
        settings={settings__} 
        settLoading={settLoading}
        dynamicLinks={dynamicLinks}
        loadingDynamicLinks={loadingDynamicLinks}
      />
    </>
  );
}