import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import BlogPostContent from './BlogPostContent';
import { notFound } from 'next/navigation';

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return <BlogPostContent id={id} />;
  } catch (error) {
    console.error('Error fetching content:', error);
    notFound(); // Redirect to 404 page on error
  }
}
