"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, BarChart3, Users, ShoppingBag, Tag, Settings, FileText, File, Grid2X2, ChevronRight } from "lucide-react";
import AnalyticsOverview from "@/components/admin/AnalyticsOverview";
import DealManagement from "@/components/admin/DealManagement";
import CategoryManagement from "@/components/admin/CategoryManagement";
import UserManagement from "@/components/admin/UserManagement";
import ContentManagement from "@/components/admin/ContentManagement";
import BrandManagement from "@/components/admin/BrandManagement";
import BlogManagement from "@/components/admin/BlogManagement";
import MediaManagement from "@/components/admin/MediaManagement";
import SettingsManagement from "@/components/admin/SettingsManagement";


import Navigation from "@/components/navigation";
import Footer from '@/components/footer';
import { useAuth, useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';
import Preloader from "@/components/loaders/preloader";
import Link from "next/link";

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState("analytics");

  const { user, isAdmin, loading: userLoading } = useAuth();

  const { settings: settings__, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: 20
  });
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

  if (userLoading) {
    return <Preloader text="Loading profile..." />;
  }
  
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
    return (
      <Preloader text="Loading..." />
    );
  }

  return (
    <>
      <Navigation />
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
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/100 dark:bg-primary/20 border border-primary/30'
                    : 'bg-primary/20 dark:bg-white/10 border border-white/20 hover:bg-white/20'
                }`}
              >
                <tab.icon className={`h-4 w-4 ${
                  activeTab === tab.id ? 'text-white' : 'text-primary dark:text-white'
                }`} />
                <span className={`${activeTab === tab.id ? `text-white` : `text-primary`} dark:text-white ms-1`}>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="bg-primary/100 dark:bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-6">
            {activeTab === 'analytics' && <AnalyticsOverview />}
            {activeTab === 'categories' && <CategoryManagement />}
            {activeTab === 'deals' && <DealManagement />}
            {activeTab === 'brands' && <BrandManagement />}
            {activeTab === 'blog' && <BlogManagement />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'content' && <ContentManagement />}
            {activeTab === 'media' && <MediaManagement />}
            {activeTab === 'settings' && <SettingsManagement />}
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
