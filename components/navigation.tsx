"use client";

import { useState, useEffect, memo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Menu,
  X,
  TagsIcon,
  ShoppingCart,
  User,
  LogIn,
  UserPlus,
  LogOut,
  Heart,
  Shield
} from "lucide-react";
import { useAuth, useSiteSettings } from "@/lib/firebase/hooks";
import { signOut } from "@/lib/auth";
import { ThemeToggle } from "./theme/theme-toggle";
import SearchDialog from "./search/SearchDialog";
import { toast } from "sonner";

interface NavigationProps {
  onOpenSearch?: () => void;
  skipAuth?: boolean; // Allow skipping auth on homepage
}

function Navigation({ onOpenSearch, skipAuth = false }: NavigationProps) {

  // Skip expensive Firestore hooks on homepage for performance
  const settingsResult = skipAuth ? { settings: null, loading: false } : useSiteSettings();
  const { settings } = settingsResult;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  // Skip Firebase Auth on homepage - defer until user interaction
  const authResult = skipAuth ? { user: null, isAdmin: false, loading: false } : useAuth();
  const { user, isAdmin, loading: authLoading } = authResult;
  const [cartItemCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show welcome toast when user signs in
  useEffect(() => {
    if (user && mounted && !authLoading) {
      // Only show welcome toast if user just signed in (not on every page load)
      const hasShownWelcome = sessionStorage.getItem('welcomeToastShown');
      if (!hasShownWelcome) {
        toast.success(`Welcome back!`, {
          description: `Good to see you again, ${user.displayName || user.email}`,
          action: {
            label: 'View Profile',
            onClick: () => router.push('/dashboard'),
          },
        });
        sessionStorage.setItem('welcomeToastShown', 'true');
      }
    }
  }, [user, mounted, authLoading, router]);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks
    
    try {
      setIsSigningOut(true);
      const loadingToast = toast.loading('Signing out...');
      
      await signOut();
      
      // Clear welcome toast flag
      sessionStorage.removeItem('welcomeToastShown');
      
      toast.dismiss(loadingToast);
      toast.success('Signed out successfully', {
        description: 'You have been logged out of your account',
        action: {
          label: 'Sign In Again',
          onClick: () => router.push('/sign-in'),
        },
      });
      
      router.refresh();
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Sign out failed', {
        description: 'There was an error signing you out. Please try again.',
        action: {
          label: 'Retry',
          onClick: () => handleSignOut(),
        },
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSearchClick = () => {
    if (onOpenSearch) {
      // If external control is provided, use it (for home page)
      onOpenSearch();
    } else {
      // Otherwise, use internal state (for all other pages)
      setIsSearchOpen(true);
    }
  };

  const handleSavedDealsClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast.info('Login required', {
        description: 'Please sign in to view your saved deals',
        action: {
          label: 'Sign In',
          onClick: () => router.push('/sign-in'),
        },
      });
    }
  };

  const handleDashboardClick = () => {
    toast.info('Loading dashboard...', {
      description: 'Taking you to your personal dashboard',
    });
  };

  const handleNavigationClick = (page: string) => {
    toast.info(`Loading ${page}...`, {
      description: `Browsing ${page.toLowerCase()} for you`,
    });
  };

  if (!mounted) {
    return null;
  }

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
                  <TagsIcon className="h-5 w-5 text-secondary transform transition-transform duration-300 group-hover:rotate-12" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-secondary to-secondary-dark bg-clip-text text-transparent">
                  {settings?.siteName}
                </span>
                <span className="text-[10px] -mt-1 text-gray-500 dark:text-gray-400">Best Deals Daily</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link 
                href="/deals" 
                className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
                onClick={() => handleNavigationClick('Deals')}
              >
                Deals
              </Link>
              <Link 
                href="/categories" 
                className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
                onClick={() => handleNavigationClick('Categories')}
              >
                Categories
              </Link>
              <Link 
                href="/brands" 
                className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
                onClick={() => handleNavigationClick('Brands')}
              >
                Brands
              </Link>
              <Link 
                href="/blog" 
                className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
                onClick={() => handleNavigationClick('Blog')}
              >
                Blog
              </Link>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => {
                  handleSearchClick();
                  toast.info('Search opened', {
                    description: 'Start typing to find amazing deals',
                  });
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Search"
              >
                <Search className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>

              <Link
                href={user ? "/saved" : "/sign-in"}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Saved items"
                onClick={handleSavedDealsClick}
              >
                <Heart className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </Link>

              <ThemeToggle />

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="User menu"
                >
                  <User className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                      {!user ? (
                        <div className="py-2">
                          <Link
                            href="/sign-in"
                            className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              toast.info('Redirecting to sign in', {
                                description: 'Please enter your credentials to continue',
                              });
                            }}
                          >
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                          </Link>
                          <Link
                            href="/sign-up"
                            className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              toast.info('Create new account', {
                                description: 'Join us to save deals and get personalized recommendations',
                              });
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Sign Up
                          </Link>
                        </div>
                      ) : (
                        <div className="py-2">
                          <Link
                            href="/dashboard"
                            className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              handleDashboardClick();
                            }}
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
                            className="w-full flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden overflow-hidden border-t border-gray-200 dark:border-gray-700"
              >
                <div className="py-4 space-y-4">
                  {/* Mobile Search */}
                  <div className="px-4">
                    <button
                      onClick={() => {
                        handleSearchClick();
                        setIsMenuOpen(false);
                        toast.info('Search opened', {
                          description: 'Start typing to find amazing deals',
                        });
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300"
                    >
                      <Search className="h-5 w-5" />
                      <span>Search deals...</span>
                    </button>
                  </div>

                  {/* Mobile Navigation Links */}
                  <nav className="space-y-1 px-4">
                    <Link
                      href="/deals"
                      className="block px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleNavigationClick('Deals');
                      }}
                    >
                      Deals
                    </Link>
                    <Link
                      href="/categories"
                      className="block px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleNavigationClick('Categories');
                      }}
                    >
                      Categories
                    </Link>
                    <Link
                      href="/brands"
                      className="block px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleNavigationClick('Brands');
                      }}
                    >
                      Brands
                    </Link>
                    <Link
                      href="/blog"
                      className="block px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleNavigationClick('Blog');
                      }}
                    >
                      Blog
                    </Link>
                  </nav>

                  {/* Mobile Actions */}
                  <div className="px-4 py-2 space-y-1">
                    <Link
                      href={user ? "/saved" : "/sign-in"}
                      className="flex items-center gap-2 w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      onClick={(e) => {
                        setIsMenuOpen(false);
                        handleSavedDealsClick(e);
                      }}
                    >
                      <Heart className="h-5 w-5" />
                      Saved Deals
                    </Link>
                    
                    {user ? (
                      <>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2 w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleDashboardClick();
                          }}
                        >
                          <User className="h-5 w-5" />
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
                          className="flex items-center gap-2 w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <LogOut className="h-5 w-5" />
                          {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/sign-in"
                          className="flex items-center gap-2 w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          onClick={() => {
                            setIsMenuOpen(false);
                            toast.info('Redirecting to sign in', {
                              description: 'Please enter your credentials to continue',
                            });
                          }}
                        >
                          <LogIn className="h-5 w-5" />
                          Sign In
                        </Link>
                        <Link
                          href="/sign-up"
                          className="flex items-center gap-2 w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          onClick={() => {
                            setIsMenuOpen(false);
                            toast.info('Create new account', {
                              description: 'Join us to save deals and get personalized recommendations',
                            });
                          }}
                        >
                          <UserPlus className="h-5 w-5" />
                          Sign Up
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Search Modal - Always present in Navigation */}
      <SearchDialog 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}

export default memo(Navigation);