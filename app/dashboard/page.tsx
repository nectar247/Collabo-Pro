"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Heart, 
  Bell, 
  Settings, 
  Clock, 
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  DollarSign,
  Users,
  ShoppingBag,
  Wallet,
  CreditCard,
  BarChart3,
  MessageSquare,
  Shield
} from "lucide-react";
import Link from "next/link";
import { useAuth, useProfile } from "@/lib/firebase/hooks";
import Preloader from "@/components/loaders/preloader";
import SavedDeals from "@/components/users/SavedDeals";

import Navigation from "@/components/navigation";

export default function Dashboard() {
  const { user, isAdmin, loading: userLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [activeTab, setActiveTab] = useState("overview");

  const navigationTabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "saved", label: "Saved Deals", icon: Heart },
    // { id: "orders", label: "My Orders", icon: ShoppingBag },
    // { id: "history", label: "History", icon: Clock },
    // { id: "settings", label: "Profile Settings", icon: Settings }
  ];



  if (profileLoading || userLoading) {
    return <Preloader text="Loading profile..." />;
  }
  
  if (!user) {
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

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black">
        <div className="container mx-auto px-4 py-8">

          {/* Profile Header */}
          <div className="bg-primary/100 dark:bg-white/10 dark:backdrop-blur-xl rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between flex-wrap">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-secondary to-secondary-dark rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="max-[400px]:text-xl text-3xl font-bold text-white mb-2">
                      {profile?.name || 'Welcome back!'}
                    </h1>
                    {isAdmin && (
                      <span className="px-3 py-1 bg-tertiary/50 text-white rounded-full text-sm flex items-center gap-2 max-sm:mt-0">
                        <Shield className="w-4 h-4" />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 hidden sm:block">
                    {profile?.email || user.email}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary-dark text-white rounded-lg transition-colors mt-1 group max-sm:mt-5 max-md:mt-2"
                >
                  <Shield className="w-5 h-5" />
                  Admin Dashboard
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {navigationTabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-xl backdrop-blur-xl transition-all duration-300 flex flex-col items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-primary dark:bg-primary/20 border border-primary/30'
                    : 'bg-primary/20 dark:bg-white/10 border border-white/20 hover:bg-primary/10 hover:border-primary/20'
                }`}
              >
                <tab.icon className={`h-6 w-6 ${
                  activeTab === tab.id ? 'text-white' : 'text-gray-800 dark:text-white'
                }`} />
                <span className={`text-sm ${activeTab === tab.id ? `text-white` : `text-gray-800`} dark:text-white`}>{tab.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Content Area */}
          <div className="border border-primary/20 border-1 dark:bg-white/10 backdrop-blur-xl rounded-xl p-6">
          
            {/* Content based on active tab */}
            {activeTab === "overview" && (
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-medium text-primary mb-2">Overview Coming Soon</h3>
                <p className="text-gray-500">Dashboard features will be available soon.</p>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-secondary hover:bg-secondary-dark text-white rounded-lg transition-colors group"
                  >
                    <Shield className="w-5 h-5" />
                    Go to Admin Dashboard
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                )}
              </div>
            )}

            {/* Add other tab content here */}
            {activeTab === 'saved' && <SavedDeals />}

          </div>
        </div>
      </div>
    </>
  );
}