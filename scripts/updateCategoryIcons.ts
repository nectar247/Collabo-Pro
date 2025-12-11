import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Recommended icon mappings based on category names
const iconMappings: Record<string, string> = {
  // Fashion & Clothing
  'fashion': 'Shirt',
  'clothing': 'Shirt',
  'shoes': 'Footprints',
  'watches': 'Watch',
  'accessories': 'Glasses',
  'jewelry': 'Gem',

  // Technology
  'electronics': 'Smartphone',
  'computers': 'Laptop',
  'phones': 'Smartphone',
  'gaming': 'Gamepad2',
  'audio': 'Headphones',
  'tech': 'Monitor',
  'technology': 'Smartphone',

  // Food & Dining
  'food': 'Utensils',
  'restaurants': 'Utensils',
  'dining': 'Utensils',
  'pizza': 'Pizza',
  'coffee': 'Coffee',
  'drinks': 'Wine',

  // Travel & Leisure
  'travel': 'Plane',
  'hotels': 'Home',
  'entertainment': 'Ticket',
  'movies': 'Film',
  'music': 'Music',

  // Health & Fitness
  'fitness': 'Dumbbell',
  'health': 'Heart',
  'sports': 'Target',
  'beauty': 'Sparkles',

  // Home & Garden
  'home': 'Sofa',
  'furniture': 'Sofa',
  'garden': 'Trees',
  'flowers': 'Flower2',

  // Kids & Pets
  'kids': 'Baby',
  'children': 'Baby',
  'pets': 'PawPrint',
  'toys': 'Gift',

  // Other
  'books': 'Book',
  'education': 'GraduationCap',
  'business': 'Briefcase',
  'automotive': 'Car',
  'cars': 'Car',
  'art': 'Palette',
  'gifts': 'Gift',
};

function getSuggestedIcon(categoryName: string): string {
  const lowerName = categoryName.toLowerCase();

  // Direct match
  if (iconMappings[lowerName]) {
    return iconMappings[lowerName];
  }

  // Partial match
  for (const [key, icon] of Object.entries(iconMappings)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return icon;
    }
  }

  // Default
  return 'Tag';
}

async function updateCategoryIcons(dryRun: boolean = true) {
  console.log('🔄 Fetching categories...\n');

  const categoriesRef = collection(db, 'categories');
  const snapshot = await getDocs(categoriesRef);

  console.log(`Found ${snapshot.docs.length} categories\n`);
  console.log('═'.repeat(80));

  for (const document of snapshot.docs) {
    const data = document.data();
    const categoryName = data.name || 'Unknown';
    const currentIcon = data.icon || 'None';
    const suggestedIcon = getSuggestedIcon(categoryName);

    console.log(`\n📦 Category: ${categoryName}`);
    console.log(`   Current Icon:   ${currentIcon}`);
    console.log(`   Suggested Icon: ${suggestedIcon}`);

    if (currentIcon !== suggestedIcon && !dryRun) {
      try {
        await updateDoc(doc(db, 'categories', document.id), {
          icon: suggestedIcon
        });
        console.log(`   ✅ Updated to: ${suggestedIcon}`);
      } catch (error) {
        console.log(`   ❌ Error updating: ${error}`);
      }
    } else if (dryRun && currentIcon !== suggestedIcon) {
      console.log(`   🔸 Would update to: ${suggestedIcon}`);
    } else {
      console.log(`   ℹ️  No change needed`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes were made');
    console.log('Run with UPDATE=true to apply changes: UPDATE=true npx tsx scripts/updateCategoryIcons.ts\n');
  } else {
    console.log('\n✅ Category icons updated successfully!\n');
  }
}

// Check if UPDATE environment variable is set
const shouldUpdate = process.env.UPDATE === 'true';

updateCategoryIcons(!shouldUpdate)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
