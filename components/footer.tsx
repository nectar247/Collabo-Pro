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

export default function Footer(
  {categories, brands, settings, dynamicLinks, loadingCategories, loadingBrands, loadingDynamicLinks, settLoading}: 
  {categories: Category[], brands: Brand[], settings: SystemSettings | null, dynamicLinks: ContentSection[],
  loadingCategories: boolean, loadingBrands: boolean, loadingDynamicLinks: boolean, settLoading: boolean
  }
) {
  // console.log("🛠️ Footer brands:", brands);
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      setSubscribeStatus("error");
      setTimeout(() => setSubscribeStatus("idle"), 3000);
      return;
    }

    setSubscribeStatus("loading");

    try {
      await subscribeToNewsletter(email, {
        dailyDeals: true,
        weeklyNewsletter: true,
        specialOffers: true
      });
      setSubscribeStatus("success");
      setEmail("");
      setTimeout(() => setSubscribeStatus("idle"), 3000);
    } catch (error) {
      setSubscribeStatus("error");
      setTimeout(() => setSubscribeStatus("idle"), 3000);
    }
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
                    href={`/categories/${category.slug}`} // Use the slug field directly
                    className="text-gray-400 hover:text-secondary transition-colors"
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
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/faq" 
                  className="text-gray-400 hover:text-secondary transition-colors"
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
                  >
                    {link.title}
                  </Link>
                </motion.li>
              ))}
              <li>
                <Link 
                  href="/contact" 
                  className="text-gray-400 hover:text-secondary transition-colors"
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
                />
                <button
                  type="submit"
                  disabled={subscribeStatus === "loading"}
                  className="absolute right-2 top-2 p-1 rounded-lg bg-secondary hover:bg-secondary-dark disabled:opacity-50 transition-colors"
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
              >
                <Linkedin className="h-7 w-7" />
              </Link>
              <Link 
                href="https://www.instagram.com/shop4vouchers.co.uk/" 
                className="text-gray-400 hover:text-secondary transition-colors"
                aria-label="Follow us on Instagram"
                target="_blank"
              >
                <Instagram className="h-7 w-7" />
              </Link>
              <Link 
                href="https://x.com/Shop4Vouchersuk" 
                className="text-gray-400 hover:text-secondary transition-colors"
                aria-label="Follow us on Twitter"
                target="_blank"
              >
                {/* <Twitter className="h-7 w-7" /> */}
                <FaXTwitter className="h-7 w-7"/>
              </Link>
              <Link 
                // href="https://www.facebook.com/share/1BxW7ibeVE/?mibextid=wwXIfr" 
                href="https://www.facebook.com/61573543566850/" 
                className="text-gray-400 hover:text-secondary transition-colors"
                aria-label="Follow us on Twitter"
                target="_blank"
              >
                <Facebook className="h-7 w-7" />
              </Link>
            </div>
          </div>
        </div>
        

        <div className="mt-12 pt-8 border-t border-gray-800 text-xs text-center">
  <div className="w-[50%] mx-auto text-gray-400">
    <p className="mb-2">
      {settings?.general.siteName} is a voucher, coupon, and discount deals website in the UK.
    </p>
    <p>
      Shop4Vouchers.co.uk is operated by Transecure Consulting Limited, a company registered in England and Wales
      (Company registration number 15101385). Registered office: 28 Hornbeam Gardens, CM1 4GH.
    </p>
  </div>
  <p className="text-gray-400 mt-4">
    © {new Date().getFullYear()} {settings?.general.siteName}. All rights reserved.
  </p>
</div>

      </div>
    </footer>
  );
}