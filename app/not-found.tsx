"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Search, ArrowRight, Home, Tag, ShoppingBag } from "lucide-react";

import NavigationLite from "@/components/NavigationLite";
export default function NotFound() {
  const quickLinks = [
    {
      name: "Home",
      href: "/",
      icon: Home,
      description: "Return to homepage"
    },
    {
      name: "Deals",
      href: "/deals",
      icon: Tag,
      description: "Browse all deals"
    },
    {
      name: "Categories",
      href: "/categories",
      icon: ShoppingBag,
      description: "Explore by category"
    }
  ];

  // Simplified 404 page without Firebase calls to prevent errors

  return (
    <>
      <NavigationLite />
      <main className="min-h-screen flex items-center justify-center p-4 bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black">
        <div className="w-full max-w-4xl mx-auto text-center">
          {/* 404 Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              type: "spring",
              stiffness: 100
            }}
            className="mb-8"
          >
            <h1 className="text-[150px] font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark leading-none">
              404
            </h1>
          </motion.div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-primary dark:text-white mb-4">Page Not Found</h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              The page you&apos;re looking for doesn&apos;t exist or has been moved. 
              Don&apos;t worry though, you can find plenty of great deals using the search below or checking out our quick links.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-xl mx-auto mb-12"
          >
            <Link
              href="/search"
              className="relative flex items-center group"
            >
              <div className="absolute inset-0 bg-gray-200 dark:bg-gradient-to-r dark:from-primary/20 dark:to-primary-dark/20 rounded-full dark:blur-xl" />
              <div className="relative w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white placeholder-gray-400 focus-within:border-primary/50 transition-colors">
                <Search className="absolute left-4 top-4 h-6 w-6 text-gray-400 group-hover:text-primary transition-colors" />
                <span className="block text-left text-gray-400 dark:text-gray-200 dark:group-hover:text-white transition-colors">
                  Search for deals, brands, or categories...
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Quick Links */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 hidden">
            {quickLinks.map((link, index) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <Link
                  href={link.href}
                  className="block p-6 bg-gray-800/100 shadow-g dark:bg-white/10 dark:backdrop-blur-xl border border-white/20 rounded-xl dark:hover:bg-white/20 transition-all duration-300 group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/20">
                      <link.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary dark:text-white mb-1 dark:group-hover:text-primary transition-colors">
                        {link.name}
                      </h3>
                      <p className="text-sm text-gray-100 dark:text-gray-400">{link.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary transform translate-x-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div> */}
        </div>
      </main>
      <div className="mt-12 text-center">
        <p className="text-gray-400 dark:text-gray-300 text-sm">
          © 2024 Shop4Vouchers. All rights reserved.
        </p>
      </div>
    </>
  );
}