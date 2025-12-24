"use client";

import { motion } from "framer-motion";
import { Shield, Users, Award, Heart, Target, Eye } from "lucide-react";
import * as LucideIcons from 'lucide-react';
import { useAboutContent, useSiteSettings } from "@/lib/firebase/hooks";
import Preloader from "@/components/loaders/preloader";
import ErrorLoader from "@/components/loaders/ErrorLoader";

import NavigationLite from "@/components/NavigationLite";
import Footer from '@/components/footer';
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

// Helper function to get icon component
function DynamicIcon({ name }: { name: string }) {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) {
    console.warn(`Icon ${name} not found`);
    return null;
  }
  return <IconComponent className="h-6 w-6 text-secondary" />;
}

export default function AboutPageClient() {

  const { settings } = useSiteSettings();
  const { content, loading, error } = useAboutContent();

  const { settings: settings__, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: null
  });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  if (loading) {
    return <Preloader text="Loading..." />;
  }

  if (error) {
    return <ErrorLoader text="Error Loading Content" message={error.message} />;
  }

  return (
    <>
      <NavigationLite />
      <main className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold text-secondary dark:text-white mb-4">About {settings?.siteName}</h1>
            <p className="text-gray-800 dark:text-gray-400">Your trusted destination for verified deals and savings</p>
          </div>

          {/* Mission & Vision Section */}
          <div className="max-w-4xl mx-auto mb-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gray-800/100 dark:bg-white/10 backdrop-blur-xl rounded-xl p-8 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-4">
                  {content?.vision?.icon && <DynamicIcon name={content.vision.icon} />}
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Our Vision</h2>
                <div 
                  className="prose prose-invert"
                  dangerouslySetInnerHTML={{ __html: content?.vision?.content || '' }}
                />
              </div>
            </motion.div>

            {/* Mission */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-gray-800/100 dark:bg-white/10 backdrop-blur-xl rounded-xl p-8 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-4">
                    {content?.mission?.icon && <DynamicIcon name={content.mission.icon} />}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
                  <div 
                    className="prose prose-invert"
                    dangerouslySetInnerHTML={{ __html: content?.mission?.content || '' }}
                  />
                </div>
              </motion.div>
          </div>

          {/* Values Section */}
          {content?.values && content.values.length > 0 && (
            <div className="max-w-4xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-secondary dark:text-white text-center mb-8">Our Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {content.values.map((value, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-800/100 dark:bg-white/10 backdrop-blur-xl rounded-xl p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                        <DynamicIcon name={value.icon} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">{value.title}</h3>
                        <p className="text-gray-400">{value.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Why Choose Us Section */}
          {content?.whyChooseUs && content.whyChooseUs.length > 0 && (
            <div className="max-w-4xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-secondary dark:text-white text-center mb-8">Why Choose Us</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {content.whyChooseUs.map((reason, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-800/100 dark:bg-white/10 backdrop-blur-xl p-6 rounded-xl text-center"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/20 flex items-center justify-center">
                      <DynamicIcon name={reason.icon} />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{reason.title}</h3>
                    <p className="text-gray-400">{reason.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Our Story Section */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/100 dark:bg-white/10 backdrop-blur-xl rounded-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Our Story</h2>
              <div 
                className="prose prose-invert"
                dangerouslySetInnerHTML={{ __html: content?.story?.content || '' }}
              />
            </div>

            {/* Additional Content */}
            {content?.additionalContent && (
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content.additionalContent }}
              />
            )}
          </div>

        </div>
      </main>
      <Footer 
        categories={categories} 
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