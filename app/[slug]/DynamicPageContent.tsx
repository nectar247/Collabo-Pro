"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ContentSection } from "@/lib/firebase/collections";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Preloader from "@/components/loaders/preloader";
import { DynamicIcon } from "@/helper";

import NavigationLite from "@/components/NavigationLite";
import FooterCached from "@/components/footer-cached";
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

export default function DynamicPageContent({
  slug,
  content_,
}: {
  slug: string;
  content_: any;
}) {
  const [content, setContent] = useState<ContentSection | null>(content_);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { settings: settings__, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, footerBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: null
  });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  useEffect(() => {
    setLoading(false);
  }, [slug]);

  if (loading) {
    return <Preloader text="Loading content..." />;
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Page Not Found</h1>
          <p className="text-gray-500 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary-dark text-white px-6 py-3 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <NavigationLite />
      <main className="min-h-screen bg-white py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto"
          >
            {/* Back Button */}
            <div className="mb-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-secondary hover:text-secondary-dark transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Home
              </Link>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                  {content.title}
                </h1>

                {/* Render content based on type */}
                {typeof content.content === "string" ? (
                  <div
                    className="prose2 max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: content.content }}
                  />
                ) : Array.isArray(content.content) ? (
                  <div className="space-y-8 rounded-lg">
                    {content.content.map((section, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="hidden w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                          <DynamicIcon name={section.icon} />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            {section.title}
                          </h2>
                          <div
                            className="prose2 max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{ __html: section.content }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 p-6 bg-gray-100 rounded-xl shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have any inquiries, please contact us:
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-secondary hover:text-secondary-dark transition-colors"
            >
              Contact Support
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>
          </motion.div>
        </div>
      </main>
      <FooterCached />
    </>
  );
}
