"use client";

import { useState, Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { Shield, BarChart3, Users, ShoppingBag, Tag, Settings, FileText, File, Grid2X2, ChevronRight } from "lucide-react";
import NavigationLite from "@/components/NavigationLite";
import Footer from "@/components/footer";
import Preloader from "@/components/loaders/preloader";
import Link from "next/link";

import {
  useAuth,
  useBrands,
  useCategories,
  useDeals,
  useDynamicLinks,
  useSettings,
} from "@/lib/firebase/hooks";

// Lazy load the heavy admin tab components with loading states
const AnalyticsOverview = dynamic(() => import("@/components/admin/AnalyticsOverview"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});
const DealManagement = dynamic(() => import("@/components/admin/DealManagement"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});
const CategoryManagement = dynamic(() => import("@/components/admin/CategoryManagement"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});
const UserManagement = dynamic(() => import("@/components/admin/UserManagement"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});
const ContentManagement = dynamic(() => import("@/components/admin/ContentManagement"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});
const BrandManagement = dynamic(() => import("@/components/admin/BrandManagement"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});
const BlogManagement = dynamic(() => import("@/components/admin/BlogManagement"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});
const MediaManagement = dynamic(() => import("@/components/admin/MediaManagement"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});
const SettingsManagement = dynamic(() => import("@/components/admin/SettingsManagement"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState("analytics");

  const { user, isAdmin, loading: userLoading } = useAuth();
  const { settings: settings__, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories } = useCategories();
  const { allBrands, featuredBrands, loading: loadingBrands } = useBrands({ limit: 20 });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  const tabs = [
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "deals", label: "Deals", icon: Tag },
    { id: "categories", label: "Categories", icon: Grid2X2 },
    { id: "brands", label: "Brands", icon: ShoppingBag },
    { id: "blog", label: "Blog", icon: FileText },
    { id: "users", label: "Users", icon: Users },
    { id: "content", label: "Content", icon: ShoppingBag },
    { id: "media", label: "Media", icon: File },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  if (userLoading) return <Preloader text="Loading profile..." />;

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-800 dark:text-gray-400 mb-6">Please sign in to view your dashboard</p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors"
          >
            Sign In
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (loadingCategories || loadingBrands || loadingDeals || settLoading || loadingDynamicLinks) {
    return <Preloader text="Loading..." />;
  }

  return (
    <>
      <NavigationLite />
      <main className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold text-primary dark:text-white">Admin Dashboard</h1>
            </div>
            <p className="text-gray-800 dark:text-gray-400">Manage your platform and monitor performance</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto space-x-4 mb-8 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/100 dark:bg-primary/20 border border-primary/30"
                    : "bg-primary/20 dark:bg-white/10 border border-white/20 hover:bg-white/20"
                }`}
              >
                <tab.icon
                  className={`h-4 w-4 ${
                    activeTab === tab.id ? "text-white" : "text-primary dark:text-white"
                  }`}
                />
                <span className={`${activeTab === tab.id ? "text-white" : "text-primary"} dark:text-white ms-1`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          {/* Lazy Loaded Content Area */}
          <div className="bg-primary/100 dark:bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6">
            <Suspense fallback={<Preloader text="Loading tab..." />}>
              {activeTab === "analytics" && <AnalyticsOverview />}
              {activeTab === "categories" && <CategoryManagement />}
              {activeTab === "deals" && <DealManagement />}
              {activeTab === "brands" && <BrandManagement />}
              {activeTab === "blog" && <BlogManagement />}
              {activeTab === "users" && <UserManagement />}
              {activeTab === "content" && <ContentManagement />}
              {activeTab === "media" && <MediaManagement />}
              {activeTab === "settings" && <SettingsManagement />}
            </Suspense>
          </div>
        </div>
      </main>

      {/* ✅ Fixed Footer props */}
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