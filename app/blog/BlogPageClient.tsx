/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, Clock, Tag, ArrowRight, FileText } from "lucide-react";
import { useBlogPosts } from "@/lib/firebase/hooks";
import Preloader from "@/components/loaders/preloader";
import ErrorLoader from "@/components/loaders/ErrorLoader";

import NavigationLite from "@/components/NavigationLite";
import FooterCached from "@/components/footer-cached";
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

export default function BlogPageClient() {
  const { posts, loading, error } = useBlogPosts();

  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, footerBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: null
  });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();
  
  if (loading) {
    return <Preloader text="Loading posts..." />;
  }

  if (error) {
    return <ErrorLoader text="Error Loading Posts" message={error.message} />;
  }

  return (
    <>
      <NavigationLite />
      <main className="min-h-screen py-12 bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold text-primary dark:text-white mb-4">Latest Articles</h1>
            <p className="text-gray-800 dark:text-gray-400 mb-8">Stay updated with the latest deals and money-saving tips</p>
          </div>

          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.filter((post) => post.status === 'publish')
              .map((post) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="group bg-gray-200 dark:bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20 hover:border-primary/20 transition-colors shadow-lg"
                >
                  <div className="relative h-48">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" /> */}
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-primary text-white dark:bg-primary/20 dark:text-primary rounded-full text-sm backdrop-blur-xl">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <h2 className="text-xl font-bold text-primary dark:text-white mb-3 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-gray-800 dark:text-gray-400 text-sm mb-4">{post.excerpt}</p>

                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(post.date).toLocaleDateString(
                          'en-GB',
                                  {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                  }
                        )}
                      </div>
                      <div className="flex items-center ml-4">
                        <Clock className="w-4 h-4 mr-2" />
                        {post.readTime}
                      </div>
                    </div>

                    <Link
                      href={`/blog/${post.id}`}
                      className="inline-flex items-center text-primary hover:text-primary-dark transition-colors group/link"
                    >
                      Read More
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">No Articles Yet</h2>
              <p className="text-gray-400 mb-8">
                We&apos;re working on creating amazing content for you. Check back soon!
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors"
              >
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </main>
      <FooterCached />
    </>
  );
}