import { collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Plus, Edit2, Trash2, Search, Filter, Eye, ChevronDown, Save, 
  AlertCircle, CheckCircle, Bold, Italic, Link as LinkIcon,
  User, Settings, Shield, Heart, Star, Trophy, Target,
  LucideIcon,
  ShieldAlert,
  Lock
} from 'lucide-react';

// Collection references
export const dealsCollection = collection(db, 'deals_fresh');
export const profilesCollection = collection(db, 'profiles');
export const savedDealsCollection = collection(db, 'deals_saved');
export const brandsCollection = collection(db, 'brands');
export const blogPostsCollection = collection(db, 'blog_posts');
export const reviewsCollection = collection(db, 'reviews');
export const searchHistoryCollection = collection(db, 'search_history');
export const contentCollection = collection(db, 'content');
export const settingsCollection = collection(db, 'settings');
export const faqCollection = collection(db, 'faqs');
export const mediaCollection = collection(db, 'media_files');
export const aboutCollection = collection(db, 'about');

// Type definitions
export interface MediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  isAdmin?: boolean;
  savedDeals?: Array<{
    dealId: string;
    savedAt: Date;
  }>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  dealCount: number;
  icon: string;
  createdAt: Date | any;
  updatedAt: Date;
  status: "active" | "inactive";
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  discount: string;
  image: string;
  brand: string;
  category: string;
  price?: number;
  code: string;
  startsAt: Date | any;
  expiresAt: Date | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  label: string;
  terms: any;
  brandDetails: any;
  status: "active" | "inactive";
  rawData: any;
  joined: boolean;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  brandimg:  string;
  category: string;
  description: string;
  activeDeals: number;
  createdAt: Date;
  updatedAt: Date;
  slug: string;
  status: 'active' | 'inactive'
}

export interface SavedDeal {
  id: string;
  userId: string;
  dealId: string;
  createdAt: Date;
}

export interface BlogPost {
  id: string;
  title: string;
  status: 'publish' | 'draft';
  content: string;
  excerpt: string;
  image: string;
  author: string;
  category: string;
  readTime: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  helpful: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchHistory {
  id: string;
  term: string;
  count: number;
  lastSearchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemSettings {
  emailNotifications: {
    dealAlerts: boolean;
    weeklyNewsletter: boolean;
    adminNotifications: boolean;
  };
  apiKeys: {
    stripePublicKey: string;
    stripeSecretKey: string;
    googleAnalyticsId: string;
  };
  general: {
    siteName: string;
    siteUrl: string;
    supportEmail: string;
    supportPhone: string;
    supportAddress: string;
    maintenanceMode: boolean;
  };
  security: {
    requireEmailVerification: boolean;
    maxLoginAttempts: number;
    sessionTimeout: number;
  };
}

interface ContentContent {
  icon: string;
  title: string;
  content: string; // WYSIWYG content
}

export interface ContentSection {
  id: string | null | undefined;
  title: string;
  slug: string; // Add slug field
  type: 'page' | 'section' | 'legal' | 'help';
  order: number;
  lastModified: string;
  status: 'published' | 'draft';
  content: string | ContentContent[];
}

interface SaveStatus {
  type: 'idle' | 'saving' | 'success' | 'error' | null;
  message: string | null;
}

// Map of icon names to icon components
const iconComponents: Record<string, LucideIcon> = {
  User,
  Settings,
  Shield,
  Heart,
  Star,
  Trophy,
  Target,
  Lock,
  // Add more icons as needed
};

export {
  iconComponents
};
export type {
  ContentContent,
  SaveStatus
};

export interface FAQ {
  id: string | undefined | null;
  question: string;
  answer: string;
  category: string;
  order: number;
  status: 'published' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

export interface AboutContent {
  vision: {
    icon: string;
    content: string;
  };
  mission: {
    icon: string;
    content: string;
  };
  story: {
    content: string;
  };
  values: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  whyChooseUs: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  additionalContent: string;
}
