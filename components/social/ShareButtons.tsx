"use client";

import { Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, Check } from 'lucide-react';
import { FaXTwitter } from "react-icons/fa6";
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
}

export default function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || '');

  const shareButtons = [
    {
      name: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'bg-[#1877F2] dark:bg-[#1877F2]/80',
      hoverColor: 'hover:bg-[#0C63D4] dark:hover:bg-[#1877F2]'
    },
    {
      name: 'Twitter',
      // icon: Twitter,
      icon: FaXTwitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'bg-[#1DA1F2] dark:bg-[#1DA1F2]/80',
      hoverColor: 'hover:bg-[#0C85D0] dark:hover:bg-[#1DA1F2]'
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
      color: 'bg-[#0A66C2] dark:bg-[#0A66C2]/80',
      hoverColor: 'hover:bg-[#084D94] dark:hover:bg-[#0A66C2]'
    }
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-primary dark:text-white dark:text-white flex items-center gap-2">
        <Share2 className="h-5 w-5 " />
        Share:
      </span>
      
      <div className="flex items-center gap-2">
        {shareButtons.map((button) => (
          <motion.a
            key={button.name}
            href={button.href}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`${button.color} ${button.hoverColor} p-2 rounded-lg text-white transition-all duration-300 shadow-lg hover:shadow-xl`}
            aria-label={`Share on ${button.name}`}
          >
            <button.icon className="h-5 w-5" />
          </motion.a>
        ))}

        <motion.button
          onClick={handleCopyLink}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative rounded-lg text-white transition-all duration-300 shadow-lg hover:shadow-xl p-4 ${
            copied
              ? 'bg-green-500 dark:bg-green-500/80 hover:bg-green-600 dark:hover:bg-green-500'
              : 'bg-gray-600 dark:bg-gray-600/80 hover:bg-gray-700 dark:hover:bg-gray-600'
          }`}
          aria-label="Copy link"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Check className="h-5 w-5" />
              </motion.span>
            ) : (
              <motion.span
                key="link"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <LinkIcon className="h-5 w-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-sm text-green-600 dark:text-green-400"
          >
            Link copied!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}