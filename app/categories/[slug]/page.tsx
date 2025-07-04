import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import CategoryPage from './CategoryPage';

export default async function DynamicPage({ params }: { params: { slug: string } }) {
  try {
    const contentSnapshot = await getDocs(collection(db, 'deals_fresh'));
    const content = contentSnapshot.docs
    .find(doc => doc.data().category.toLowerCase() === decodeURIComponent(params.slug).toLowerCase())?.data() || null;
    if (!content) {
      notFound(); // Show 404 page if content is missing
    }

    content.createdAt = new Date(content.createdAt.seconds * 1000);
    content.updatedAt = new Date(content.updatedAt.seconds * 1000);
    content.expiresAt = new Date(content.expiresAt.seconds * 1000);

    return <CategoryPage slug={params.slug} content_={content} />;
  } catch (error) {
    console.error('Error fetching content:', error);
    notFound(); // Redirect to 404 page on error
  }
}
