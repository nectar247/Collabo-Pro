/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Tag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BlogPost } from '@/lib/firebase/collections';
import ShareButtons from '@/components/social/ShareButtons';
import Preloader from '@/components/loaders/preloader';

import NavigationLite from "@/components/NavigationLite";
import FooterCached from "@/components/footer-cached";
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

export default function BlogPostContent({
  id
}: {
  id: string
}) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, footerBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: null
  });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  useEffect(() => {
    async function fetchPost() {
      try {
        const postDoc = await getDoc(doc(db, 'blog_posts', id));
        if (!postDoc.exists()) {
          throw new Error('Post not found');
        }
        
        const data = postDoc.data();
        setPost({
          id: postDoc.id,
          ...data,
          date: data.date?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as BlogPost);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError(err as Error);
        setLoading(false);
      }
    }

    fetchPost();
  }, [id]);

  if (loading) {
    return <Preloader text="Loading posts..." />;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Post Not Found</h1>
          <p className="text-gray-500 mb-8">The blog post you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <NavigationLite />
      <main className="min-h-screen py-12 bg-white">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <div className="max-w-4xl mx-auto mb-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-primary hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Blog
            </Link>
          </div>

          {/* Post Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto mb-12"
          >
            <div className="relative h-[400px] rounded-2xl overflow-hidden mb-8">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
              
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <Link
                  href={`/blog/category/${post.category.toLowerCase()}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white hover:bg-primary/30 transition-all duration-300 mb-4"
                >
                  <Tag className="h-4 w-4" />
                  {post.category}
                </Link>
                <h1 className="text-4xl font-bold text-white mb-4">{post.title}</h1>
                <div className="flex items-center gap-6 text-gray-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {new Date(post.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {post.readTime}
                  </div>
                </div>
              </div>
            </div>

            {/* Author Info */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {post.author.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="text-primary font-semibold">{post.author}</h3>
                <p className="text-gray-800">Author</p>
              </div>
            </div>

            {/* Share Buttons */}
            <ShareButtons
              url={typeof window !== 'undefined' ? window.location.href : ''}
              title={post.title}
              description={post.excerpt}
            />
          </motion.div>

          {/* Post Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto prose2 prose-invert bg-white p-5 rounded-lg border border-gray-200 blog-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </main>
      <FooterCached />
    </>
  );
}
