"use client";

import { useAuth, useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';
import { SkeletonLanding } from '@/components/skeleton';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import HeroCategoryExplorer from '@/components/landing/hero/HeroCategoryExplorer';
import { useEffect, useState } from 'react';
import { getPopularSearches } from '@/lib/firebase/search';
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function HeroPreview5() {
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
              <p className="text-sm">Hero Concept 5: Interactive Category Explorer</p>
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
                href="/hero-preview-4"
                className="inline-flex items-center gap-2 text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all"
              >
                ← Previous
              </Link>
              <Link
                href="/hero-preview-1"
                className="inline-flex items-center gap-2 text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all"
              >
                Start Over
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden">
        <HeroCategoryExplorer
          popularSearches={popularSearches}
          setPopularSearches={setPopularSearches}
          loadingSearches={loadingSearches}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Preview Info Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-primary mb-6">Concept 5: Interactive Category Explorer</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <h3 className="text-xl font-semibold text-primary mb-3">Key Features</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ Interactive category grid</li>
                    <li>✓ Expandable hover details</li>
                    <li>✓ Category-filtered search</li>
                    <li>✓ Quick deal preview</li>
                    <li>✓ Top brands showcase</li>
                    <li>✓ Visual category navigation</li>
                  </ul>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <h3 className="text-xl font-semibold text-primary mb-3">Design Benefits</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>→ Reduces decision paralysis</li>
                    <li>→ Clear navigation path</li>
                    <li>→ Discovery-focused</li>
                    <li>→ Engaging interactions</li>
                    <li>→ Shows content depth</li>
                    <li>→ Category-first approach</li>
                  </ul>
                </div>
              </div>

              {/* Comparison Summary */}
              <div className="mt-12 bg-gradient-to-r from-primary to-indigo-900 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6 text-center">Ready to Choose?</h3>
                <div className="grid md:grid-cols-5 gap-4 text-sm">
                  <Link href="/hero-preview-1" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-all text-center">
                    <div className="font-bold mb-2">Concept 1</div>
                    <div className="text-xs text-gray-300">Split Screen</div>
                  </Link>
                  <Link href="/hero-preview-2" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-all text-center">
                    <div className="font-bold mb-2">Concept 2</div>
                    <div className="text-xs text-gray-300">3D Cards</div>
                  </Link>
                  <Link href="/hero-preview-3" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-all text-center">
                    <div className="font-bold mb-2">Concept 3</div>
                    <div className="text-xs text-gray-300">Minimalist</div>
                  </Link>
                  <Link href="/hero-preview-4" className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-all text-center">
                    <div className="font-bold mb-2">Concept 4</div>
                    <div className="text-xs text-gray-300">Bold Type</div>
                  </Link>
                  <div className="bg-white/20 rounded-lg p-4 text-center border-2 border-white/50">
                    <div className="font-bold mb-2">Concept 5</div>
                    <div className="text-xs">Explorer ←</div>
                  </div>
                </div>
                <div className="text-center mt-6">
                  <p className="text-gray-300">Compare all concepts and choose your favorite to implement!</p>
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
