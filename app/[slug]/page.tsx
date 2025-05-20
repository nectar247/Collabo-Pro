import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DynamicPageContent from './DynamicPageContent';
import { notFound } from 'next/navigation';

export default async function DynamicPage({ params }: { params: { slug: string } }) {
  try {
    const contentSnapshot = await getDocs(collection(db, 'content'));
    const content = contentSnapshot.docs
      .find(doc => doc.data().slug === params.slug)?.data() || null;

    if (!content) {
      notFound(); // Show 404 page if content is missing
    }

    content.createdAt = new Date(content.createdAt.seconds * 1000);
    content.updatedAt = new Date(content.updatedAt.seconds * 1000);

    return <DynamicPageContent slug={params.slug} content_={content} />;
  } catch (error) {
    console.error('Error fetching content:', error);
    notFound(); // Redirect to 404 page on error
  }
}
