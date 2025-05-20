"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { useSiteSettings } from "@/lib/firebase/hooks";

import Navigation from "@/components/navigation";
import Footer from '@/components/footer';
import { useBrands, useCategories, useDeals, useDynamicLinks, useSettings } from '@/lib/firebase/hooks';

export default function ContactPage() {

  const { settings } = useSiteSettings();

  const { settings: settings__, loading: settLoading } = useSettings();
  const { categories, loading: loadingCategories, error: CategoriesError } = useCategories();
  const { allBrands, featuredBrands, loading: loadingBrands, error: errorBrands } = useBrands({
    limit: null
  });
  const { trendingDeals, loading: loadingDeals } = useDeals();
  const { links: dynamicLinks, loading: loadingDynamicLinks } = useDynamicLinks();

  const [ isSending, setIsSending ] = useState(false);
  const [ error, setError ] = useState('');
  const [ success, setSuccess ] = useState('');
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(formData.name && formData.email && formData.subject && formData.message){
      setIsSending(true);
      let response: any = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      response = await response.json();
      setIsSending(false);
      if(response.status){
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: ""
        })
        setSuccess(response.message);
      } else {
        setSuccess(response.message);
      }
      
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold text-secondary dark:text-white mb-4">Contact Us</h1>
            <p className="text-gray-800 dark:text-gray-400">Get in touch with our team for any questions or support</p>
          </div>

          <div className={`grid grid-cols-1 
            ${(!settings?.supportEmail && !settings?.supportPhone && !settings?.supportAddress?'lg:grid-cols-1':'lg:grid-cols-2')}
            gap-8 max-w-6xl mx-auto`}>

            {!settings?.supportEmail && !settings?.supportPhone && !settings?.supportAddress ?
            '':
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {settings?.supportEmail ?
              <div className="bg-gray-800/100 dark:bg-white/10 backdrop-blur-xl rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Email Us</h3>
                    <p className="text-gray-400">Our team will respond within 24 hours</p>
                    <a href={`mailto:${settings?.supportEmail}`} className="text-secondary hover:text-secondary-dark transition-colors">
                      {settings?.supportEmail}
                    </a>
                  </div>
                </div>
              </div>:''}

              {settings?.supportPhone ?
              <div className="bg-gray-800/100 dark:bg-white/10 backdrop-blur-xl rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Call Us</h3>
                    <p className="text-gray-400">Available 24/7</p>
                    <a href={`tel:${settings?.supportPhone}`} className="text-secondary hover:text-secondary-dark transition-colors">
                      {settings?.supportPhone}
                    </a>
                  </div>
                </div>
              </div>:''}

              {settings?.supportAddress ?
              <div className="bg-gray-800/100 dark:bg-white/10 backdrop-blur-xl rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Visit Us</h3>
                    <p className="text-gray-400">{settings?.supportAddress}</p>
                  </div>
                </div>
              </div>:''}
            </motion.div>}

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800/100 dark:bg-white/10 backdrop-blur-xl rounded-xl p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                    placeholder="How can we help?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                    placeholder="Your message..."
                    rows={4}
                    required
                  />
                </div>

                {error ?
                <div>
                  <div className="text-red-500 text-center">{error}</div>
                </div> : ''}
                {success ?
                <div>
                  <div className="text-green-500 text-center">{success}</div>
                </div> : ''}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-secondary to-secondary-dark text-white py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-secondary/50 transition-all duration-300 flex items-center justify-center gap-2"
                  disabled={isSending}
                >
                  {!isSending?
                  <>
                    <Send className="h-5 w-5" />
                    Send Message
                  </>:
                  <>
                    <Loader2 className="h-5 w-5" />
                    Please wait..
                  </>}
                </button>
              </form>
            </motion.div>
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