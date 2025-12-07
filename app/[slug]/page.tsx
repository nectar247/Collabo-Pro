import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DynamicPageContent from './DynamicPageContent';
import { notFound } from 'next/navigation';

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const contentSnapshot = await getDocs(collection(db, 'content'));
    const content = contentSnapshot.docs
      .find(doc => doc.data().slug === slug)?.data() || null;

    if (!content) {
      notFound(); // Show 404 page if content is missing
    }

    content.createdAt = new Date(content.createdAt.seconds * 1000);
    content.updatedAt = new Date(content.updatedAt.seconds * 1000);

    return <DynamicPageContent slug={slug} content_={content} />;
  } catch (error) {
    // Only log error in development to reduce console noise in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching content:', error);
    }
    notFound(); // Redirect to 404 page on error
  }
}
