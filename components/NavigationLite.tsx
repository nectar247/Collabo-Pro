"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Menu,
  X,
  TagsIcon,
  LogIn,
  UserPlus,
} from "lucide-react";
import { ThemeToggle } from "./theme/theme-toggle";

interface NavigationLiteProps {
  onOpenSearch?: () => void;
}

/**
 * Lightweight navigation for homepage - no Firebase hooks
 * This prevents Firebase Auth iframe and Firestore listeners from loading on initial page load
 */
export default function NavigationLite({ onOpenSearch }: NavigationLiteProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearchClick = () => {
    if (onOpenSearch) {
      onOpenSearch();
    }
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-secondary to-secondary-dark opacity-40 blur transition duration-300 group-hover:opacity-70"></div>
              <div className="relative flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 rounded-lg">
                <TagsIcon className="h-5 w-5 text-secondary" />
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-secondary via-secondary-dark to-tertiary bg-clip-text text-transparent">
              Shop4Vouchers
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/deals"
              className="text-sm font-medium text-gray-700 hover:text-secondary dark:text-gray-300 dark:hover:text-secondary transition-colors"
            >
              Deals
            </Link>
            <Link
              href="/brands"
              className="text-sm font-medium text-gray-700 hover:text-secondary dark:text-gray-300 dark:hover:text-secondary transition-colors"
            >
              Brands
            </Link>
            <Link
              href="/categories"
              className="text-sm font-medium text-gray-700 hover:text-secondary dark:text-gray-300 dark:hover:text-secondary transition-colors"
            >
              Categories
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={handleSearchClick}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <ThemeToggle />

            <Link
              href="/sign-in"
              className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-secondary dark:text-gray-300 dark:hover:text-secondary transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Link>

            <Link
              href="/sign-up"
              className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-gradient-to-r from-secondary to-tertiary text-white text-sm font-medium hover:shadow-lg transition-all duration-300"
            >
              <UserPlus className="h-4 w-4" />
              <span>Sign Up</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/deals"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Deals
            </Link>
            <Link
              href="/brands"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Brands
            </Link>
            <Link
              href="/categories"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Categories
            </Link>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <Link
                href="/sign-in"
                className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <LogIn className="h-4 w-4 inline mr-2" />
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="block px-4 py-2 mt-2 text-sm font-medium bg-gradient-to-r from-secondary to-tertiary text-white rounded-lg text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <UserPlus className="h-4 w-4 inline mr-2" />
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
