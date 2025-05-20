"use client";

import { Share2, Facebook, Twitter, Linkedin, Link as LinkIcon } from 'lucide-react';
import { FaXTwitter } from "react-icons/fa6";
import { motion } from 'framer-motion';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const shareButtons = [
    {
      name: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'bg-[#1877F2]'
    },
    {
      name: 'Twitter',
      // icon: Twitter,
      icon: FaXTwitter ,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'bg-[#1DA1F2]'
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
      color: 'bg-[#0A66C2]'
    }
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-white flex items-center gap-2">
        <Share2 className="h-5 w-5" />
        Share:
      </span>
      
      {shareButtons.map((button) => (
        <motion.a
          key={button.name}
          href={button.href}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`${button.color} p-2 rounded-lg text-white hover:opacity-90 transition-opacity`}
        >
          <button.icon className="h-5 w-5" />
        </motion.a>
      ))}

      <motion.button
        onClick={handleCopyLink}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="bg-gray-600 p-2 rounded-lg text-white hover:opacity-90 transition-opacity"
      >
        <LinkIcon className="h-5 w-5" />
      </motion.button>
    </div>
  );
}