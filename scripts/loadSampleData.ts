import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper functions
const getFutureDate = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

// Sample data
const sampleDeals = [
  {
    title: "50% off Nike Air Max",
    description: "Get amazing discounts on Nike Air Max sneakers. Limited time offer!",
    discount: "50%",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    brand: "Nike",
    category: "Fashion",
    price: 120,
    code: "NIKEMAX50",
    expiresAt: getFutureDate(30),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    title: "MacBook Pro Student Discount",
    description: "Special student pricing on MacBook Pro. Save up to $200!",
    discount: "$200",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
    brand: "Apple",
    category: "Electronics",
    price: 1299,
    code: "STUDENT200",
    expiresAt: getFutureDate(60),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    title: "BOGO Pizza Deal",
    description: "Buy one pizza, get one free at Domino's",
    discount: "BOGO",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
    brand: "Domino's",
    category: "Food",
    price: 15,
    code: "BOGOPIZZA",
    expiresAt: getFutureDate(7),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

const sampleBrands = [
  {
    name: "Nike",
    logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    category: "Fashion",
    description: "Just Do It",
    activeDeals: 5,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "Apple",
    logo: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
    category: "Electronics",
    description: "Think Different",
    activeDeals: 3,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "Domino's",
    logo: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
    category: "Food",
    description: "It's what we do",
    activeDeals: 4,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

const sampleCategories = [
  {
    name: "Fashion",
    description: "Clothing, shoes, and accessories",
    icon: "shopping-bag",
    dealCount: 150,
    featuredImage: "https://images.unsplash.com/photo-1483985988355-763728e1935b",
    subcategories: ["Shoes", "Clothing", "Accessories", "Watches", "Bags"],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "Electronics",
    description: "Latest gadgets and tech deals",
    icon: "smartphone",
    dealCount: 120,
    featuredImage: "https://images.unsplash.com/photo-1498049794561-7780e7231661",
    subcategories: ["Phones", "Laptops", "Tablets", "Accessories", "Gaming"],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "Food",
    description: "Restaurant and food delivery deals",
    icon: "utensils",
    dealCount: 200,
    featuredImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
    subcategories: ["Restaurants", "Delivery", "Groceries", "Fast Food", "Cafes"],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

async function loadSampleData() {
  try {
    console.log('Starting data load...');

    // Load deals
    console.log('Loading deals...');
    for (const deal of sampleDeals) {
      await addDoc(collection(db, 'deals'), deal);
    }
    console.log('Deals loaded successfully!');

    // Load brands
    console.log('Loading brands...');
    for (const brand of sampleBrands) {
      await addDoc(collection(db, 'brands'), brand);
    }
    console.log('Brands loaded successfully!');

    // Load categories
    console.log('Loading categories...');
    for (const category of sampleCategories) {
      await addDoc(collection(db, 'categories'), category);
    }
    console.log('Categories loaded successfully!');

    console.log('All sample data loaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error loading sample data:', error);
    process.exit(1);
  }
}

// Execute the loader with error handling
loadSampleData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});