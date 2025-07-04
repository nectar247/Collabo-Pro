import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import CategoryPage from './CategoryPage';

export default async function DynamicPage({ params }: { params: { slug: string } }) {
  try {
    const decodedSlug = decodeURIComponent(params.slug);
    
    // Use the correct collection name that matches your hooks
    const contentSnapshot = await getDocs(collection(db, 'deals_fresh'));
    
    // More flexible category matching
    const content = contentSnapshot.docs.find(doc => {
      const dealCategory = doc.data().category;
      if (!dealCategory) return false;
      
      const normalizeString = (str: string) => 
        str.replace(/[\s\-_]+/g, '').toLowerCase().trim();
      
      // Try multiple matching methods
      return (
        dealCategory.toLowerCase() === decodedSlug.toLowerCase() ||
        normalizeString(dealCategory) === normalizeString(decodedSlug) ||
        dealCategory.toLowerCase().includes(decodedSlug.toLowerCase()) ||
        decodedSlug.toLowerCase().includes(dealCategory.toLowerCase())
      );
    })?.data() || null;

    // Alternative: Check if category exists in categories collection
    if (!content) {
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categoryExists = categoriesSnapshot.docs.some(doc => {
        const categoryName = doc.data().name;
        if (!categoryName) return false;
        
        const normalizeString = (str: string) => 
          str.replace(/[\s\-_]+/g, '').toLowerCase().trim();
        
        return (
          categoryName.toLowerCase() === decodedSlug.toLowerCase() ||
          normalizeString(categoryName) === normalizeString(decodedSlug)
        );
      });
      
      // If category exists but no deals, still show the page
      if (categoryExists) {
        return <CategoryPage slug={params.slug} content_={null} />;
      }
      
      notFound(); // Show 404 page if category doesn't exist
    }

    // Handle timestamp conversion safely
    if (content) {
      if (content.createdAt?.seconds) {
        content.createdAt = new Date(content.createdAt.seconds * 1000);
      }
      if (content.updatedAt?.seconds) {
        content.updatedAt = new Date(content.updatedAt.seconds * 1000);
      }
      if (content.expiresAt?.seconds) {
        content.expiresAt = new Date(content.expiresAt.seconds * 1000);
      }
    }

    return <CategoryPage slug={params.slug} content_={content} />;
  } catch (error) {
    console.error('Error fetching content:', error);
    notFound(); // Redirect to 404 page on error
  }
}