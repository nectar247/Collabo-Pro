"use client";

import { useAuth, useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';
import { SkeletonLanding } from '@/components/skeleton';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import HeroBoldTypography from '@/components/landing/hero/HeroBoldTypography';
import { useEffect, useState } from 'react';
import { getPopularSearches } from '@/lib/firebase/search';
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function HeroPreview4() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { settings, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories } = useCategories();
  const { featuredBrands, loading: loadingBrands } = useBrands();
  const { loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [loadingSearches, setLoadingSearches] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const searchesQuery = await getPopularSearches();
        const searchTerms = searchesQuery.map((doc: any) => doc.term);
        setPopularSearches(searchTerms);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingSearches(false);
      }
    }
    fetchData();
  }, []);

  if (authLoading || settLoading) return <SkeletonLanding />;

  return (
    <>
      <Navigation onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Preview Banner */}
      <div className="bg-gradient-to-r from-secondary to-tertiary text-white py-3">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
                Preview Mode
              </span>
              <p className="text-sm">Hero Concept 4: Bold Typography & Gradient Mesh</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all"
              >
                <Home className="h-4 w-4" />
                Home
              </Link>
              <Link
                href="/hero-preview-3"
                className="inline-flex items-center gap-2 text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all"
              >
                ← Previous
              </Link>
              <Link
                href="/hero-preview-5"
                className="inline-flex items-center gap-2 text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all"
              >
                Next →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden">
        <HeroBoldTypography
          popularSearches={popularSearches}
          setPopularSearches={setPopularSearches}
          loadingSearches={loadingSearches}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Preview Info Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-primary mb-6">Concept 4: Bold Typography & Gradient Mesh</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <h3 className="text-xl font-semibold text-primary mb-3">Key Features</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ Massive kinetic typography</li>
                    <li>✓ Animated gradient mesh background</li>
                    <li>✓ Trending deals ticker</li>
                    <li>✓ Quick category access</li>
                    <li>✓ Glowing search with pulse effect</li>
                    <li>✓ Modern, energetic vibe</li>
                  </ul>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <h3 className="text-xl font-semibold text-primary mb-3">Design Benefits</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>→ Bold, attention-grabbing</li>
                    <li>→ Creates excitement & urgency</li>
                    <li>→ Showcases trending deals</li>
                    <li>→ Young, dynamic audience appeal</li>
                    <li>→ Highly memorable</li>
                    <li>→ Fast category navigation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

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
