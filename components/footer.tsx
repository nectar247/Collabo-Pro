"use client";

import Link from "next/link";
import { Facebook, Instagram, Twitter, Mail, X, Linkedin } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { useState } from "react";
import { motion } from "framer-motion";
import { subscribeToNewsletter } from "@/lib/firebase/newsletter";
import { validateEmail } from "@/lib/utils/sanitize";
import { useDynamicLinks } from "@/lib/firebase/hooks";
import { Brand, Category, ContentSection, SystemSettings } from "@/lib/firebase/collections";
import { FooterSingleLoading } from "./skeleton";
import { toast } from "sonner"; // Add Sonner toast

export default function Footer(
  {categories, brands, settings, dynamicLinks, loadingCategories, loadingBrands, loadingDynamicLinks, settLoading}: 
  {categories: Category[], brands: Brand[], settings: SystemSettings | null, dynamicLinks: ContentSection[],
  loadingCategories: boolean, loadingBrands: boolean, loadingDynamicLinks: boolean, settLoading: boolean
  }
) {
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      toast.error("Invalid email address", {
        description: "Please enter a valid email address to subscribe to our newsletter",
        action: {
          label: "Try Again",
          onClick: () => {
            // Focus back on input
            const input = document.querySelector('input[type="email"]') as HTMLInputElement;
            input?.focus();
          },
        },
      });
      setSubscribeStatus("error");
      setTimeout(() => setSubscribeStatus("idle"), 3000);
      return;
    }

    setSubscribeStatus("loading");
    
    // Show loading toast
    const loadingToast = toast.loading("Subscribing to newsletter...", {
      description: "Please wait while we add you to our mailing list",
    });

    try {
      await subscribeToNewsletter(email, {
        dailyDeals: true,
        weeklyNewsletter: true,
        specialOffers: true
      });
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Show success toast
      toast.success("Successfully subscribed!", {
        description: `Welcome aboard! You'll receive the latest deals at ${email}`,
        action: {
          label: "Manage Preferences",
          onClick: () => {
            // You can add a link to subscription management page
            window.open('/newsletter-preferences', '_blank');
          },
        },
      });
      
      setSubscribeStatus("success");
      setEmail("");
      setTimeout(() => setSubscribeStatus("idle"), 3000);
    } catch (error) {
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Show error toast
      toast.error("Subscription failed", {
        description: "There was an error subscribing you to our newsletter. Please try again.",
        action: {
          label: "Retry",
          onClick: () => handleSubscribe(e),
        },
      });
      
      setSubscribeStatus("error");
      setTimeout(() => setSubscribeStatus("idle"), 3000);
    }
  };

  const handleSocialClick = (platform: string, url: string) => {
    toast.info(`Opening ${platform}`, {
      description: `Redirecting you to our ${platform} page`,
      action: {
        label: "Follow Us",
        onClick: () => window.open(url, '_blank'),
      },
    });
  };

  const handleNavigationClick = (section: string, destination?: string) => {
    toast.info(`Loading ${section}`, {
      description: destination ? `Taking you to ${destination}` : `Browsing ${section.toLowerCase()} section`,
    });
  };

  const handleCategoryClick = (categoryName: string) => {
    toast.info("Loading category", {
      description: `Browsing ${categoryName} deals and offers`,
    });
  };

  const handleBrandClick = (brandName: string) => {
    toast.info("Loading brand", {
      description: `Checking out ${brandName} deals and vouchers`,
    });
  };

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            <ul className="space-y-2">
              {categories.length === 0 && loadingCategories ? (
                  <FooterSingleLoading />
              ) : null}
              {categories.slice(0, 10).map((category, i) => (
                <li key={i}>
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    className="text-gray-400 hover:text-secondary transition-colors"
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Top Brands</h3>
            <ul className="space-y-2">
              {brands.length === 0 && loadingBrands ? (
                  <FooterSingleLoading />
              ) : null}
              {brands.slice(0, 10).map((brand, i) => (
                <li key={i}>
                  <Link 
                    key={i}
                    href={`/brands/${brand.slug}`}
                    className="text-gray-400 hover:text-secondary transition-colors"
                    onClick={() => handleBrandClick(brand.name)}
                  >
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Help</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/about" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                  onClick={() => handleNavigationClick("Help", "About Us page")}
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/faq" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                  onClick={() => handleNavigationClick("Help", "FAQ page")}
                >
                  FAQs
                </Link>
              </li>
              {dynamicLinks.filter((e)=>e.type == 'help').map((link) => (
                <motion.li
                  key={link.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Link
                    href={`/${link.slug}`}
                    className="text-gray-400 hover:text-secondary transition-colors"
                    onClick={() => handleNavigationClick("Help", link.title)}
                  >
                    {link.title}
                  </Link>
                </motion.li>
              ))}
              <li>
                <Link 
                  href="/contact" 
                  className="text-gray-400 hover:text-secondary transition-colors"
                  onClick={() => handleNavigationClick("Help", "Contact Us page")}
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {dynamicLinks.filter((e)=>e.type == 'legal').map((link) => (
                <motion.li
                  key={link.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Link
                    href={`/${link.slug}`}
                    className="text-gray-400 hover:text-secondary transition-colors"
                    onClick={() => handleNavigationClick("Legal", link.title)}
                  >
                    {link.title}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Newsletter</h3>
            <p className="text-gray-400 mb-4">
              Subscribe to get the latest deals and offers.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                  onFocus={() => {
                    toast.info("Newsletter signup", {
                      description: "Get daily deals and exclusive offers delivered to your inbox",
                    });
                  }}
                />
                <button
                  type="submit"
                  disabled={subscribeStatus === "loading"}
                  className="absolute right-2 top-2 p-1 rounded-lg bg-secondary hover:bg-secondary-dark disabled:opacity-50 transition-colors"
                  title="Subscribe to newsletter"
                >
                  <Mail className="h-4 w-4 text-white" />
                </button>
              </div>
              
              {subscribeStatus !== "idle" && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm ${
                    subscribeStatus === "success"
                      ? "text-green-500"
                      : subscribeStatus === "error"
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}
                >
                  {subscribeStatus === "loading" && "Subscribing..."}
                  {subscribeStatus === "success" && "Successfully subscribed!"}
                  {subscribeStatus === "error" && "Please enter a valid email."}
                </motion.p>
              )}
            </form>

            <div className="flex space-x-3 mt-6">
              <Link 
                href="https://www.linkedin.com/company/shop4vouchers/?viewAsMember=true" 
                className="text-gray-400 hover:text-secondary transition-colors"
                aria-label="Follow us on Linkedin"
                target="_blank"
                onClick={(e) => {
                  e.preventDefault();
                  handleSocialClick("LinkedIn", "https://www.linkedin.com/company/shop4vouchers/?viewAsMember=true");
                  setTimeout(() => {
                    window.open("https://www.linkedin.com/company/shop4vouchers/?viewAsMember=true", "_blank");
                  }, 1000);
                }}
              >
                <Linkedin className="h-7 w-7" />
              </Link>
              <Link 
                href="https://www.instagram.com/shop4vouchers.co.uk/" 
                className="text-gray-400 hover:text-secondary transition-colors"
                aria-label="Follow us on Instagram"
                target="_blank"
                onClick={(e) => {
                  e.preventDefault();
                  handleSocialClick("Instagram", "https://www.instagram.com/shop4vouchers.co.uk/");
                  setTimeout(() => {
                    window.open("https://www.instagram.com/shop4vouchers.co.uk/", "_blank");
                  }, 1000);
                }}
              >
                <Instagram className="h-7 w-7" />
              </Link>
              <Link 
                href="https://x.com/Shop4Vouchersuk" 
                className="text-gray-400 hover:text-secondary transition-colors"
                aria-label="Follow us on Twitter"
                target="_blank"
                onClick={(e) => {
                  e.preventDefault();
                  handleSocialClick("X (Twitter)", "https://x.com/Shop4Vouchersuk");
                  setTimeout(() => {
                    window.open("https://x.com/Shop4Vouchersuk", "_blank");
                  }, 1000);
                }}
              >
                <FaXTwitter className="h-7 w-7"/>
              </Link>
              <Link 
                href="https://www.facebook.com/61573543566850/" 
                className="text-gray-400 hover:text-secondary transition-colors"
                aria-label="Follow us on Facebook"
                target="_blank"
                onClick={(e) => {
                  e.preventDefault();
                  handleSocialClick("Facebook", "https://www.facebook.com/61573543566850/");
                  setTimeout(() => {
                    window.open("https://www.facebook.com/61573543566850/", "_blank");
                  }, 1000);
                }}
              >
                <Facebook className="h-7 w-7" />
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-800 text-xs text-center">
          <div className="w-[50%] mx-auto text-gray-400">
            <p className="mb-2">
              {settings?.general.siteName || 'Shop4Vouchers'} is a voucher, coupon, and discount deals website in the UK.
            </p>
            <p>
              Shop4Vouchers.co.uk is operated by Transecure Consulting Limited, a company registered in England and Wales
              (Company registration number 15101385). Registered office: 124 City Road, London. EC1V 2NX.
            </p>
          </div>
          <p className="text-gray-400 mt-4">
            © {new Date().getFullYear()} {settings?.general.siteName || 'Shop4Vouchers'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}