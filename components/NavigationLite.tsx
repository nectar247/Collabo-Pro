"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Menu,
  X,
  TagsIcon,
  LogIn,
  UserPlus,
  Sun,
  Moon,
  Heart,
  User,
  LogOut,
  Shield,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/firebase/hooks";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";
import SearchDialog from "./search/SearchDialog";

interface NavigationLiteProps {
  onOpenSearch?: () => void;
  skipAuth?: boolean;
}

/**
 * Navigation component with optional auth support
 * When skipAuth is true, it skips Firebase hooks for better homepage performance
 */
export default function NavigationLite({ onOpenSearch, skipAuth = false }: NavigationLiteProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Skip Firebase Auth on homepage for performance, but use it on other pages
  const authResult = skipAuth ? { user: null, isAdmin: false, loading: false } : useAuth();
  const { user, isAdmin, loading: authLoading } = authResult;

  const handleSearchClick = () => {
    if (onOpenSearch) {
      // If external control is provided, use it (for pages with custom SearchDialog)
      onOpenSearch();
    } else {
      // Otherwise, use internal state
      setIsSearchOpen(true);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
      await signOut();
      toast.success('Signed out successfully');
      router.refresh();
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Sign out failed');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSavedDealsClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast.info('Login required', {
        description: 'Please sign in to view your saved deals',
      });
      router.push('/sign-in');
    }
  };

  return (
    <>
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
            <Link
              href="/blog"
              className="text-sm font-medium text-gray-700 hover:text-secondary dark:text-gray-300 dark:hover:text-secondary transition-colors"
            >
              Blog
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

            <Link
              href={user ? "/saved" : "/sign-in"}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              aria-label="Saved deals"
              onClick={handleSavedDealsClick}
            >
              <Heart className="h-5 w-5" />
            </Link>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              aria-label="Toggle theme"
              suppressHydrationWarning
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute top-2 left-2 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  aria-label="User menu"
                >
                  <User className="h-5 w-5" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="py-2">
                      <Link
                        href="/dashboard"
                        className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Dashboard
                        {isAdmin && (
                          <span className="ml-2 px-1.5 py-0.5 bg-primary/20 text-primary rounded-full text-xs flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                      </Link>
                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="w-full flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}
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
            <Link
              href="/blog"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Blog
            </Link>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 space-y-2">
              <Link
                href={user ? "/saved" : "/sign-in"}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
                onClick={(e) => {
                  setIsMenuOpen(false);
                  handleSavedDealsClick(e);
                }}
              >
                <Heart className="h-4 w-4 inline mr-2" />
                Saved Deals
              </Link>

              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4 inline mr-2" />
                    Dashboard
                    {isAdmin && (
                      <span className="ml-auto px-2 py-1 bg-primary/20 text-primary rounded-full text-xs flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    disabled={isSigningOut}
                    className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4 inline mr-2" />
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                  </button>
                </>
              ) : (
                <>
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
                    className="block px-4 py-2 text-sm font-medium bg-gradient-to-r from-secondary to-tertiary text-white rounded-lg text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UserPlus className="h-4 w-4 inline mr-2" />
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>

    {/* Search Modal - Only render if not using external search control */}
    {!onOpenSearch && (
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    )}
    </>
  );
}
