"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";

import Navigation from "@/components/navigation";

export default function ContactPage() {

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

          <div className="max-w-2xl mx-auto">
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
    </>
  );
}