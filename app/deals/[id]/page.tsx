import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import { getDeal } from '@/lib/firebase/server';
import { Suspense } from 'react';
import DealContent from './DealContent';

export default async function DealPage({ params }: { params: { id: string } }) {
  try {
    const content = await getDeal(params.id);

    if (!content) {
      notFound(); // Show 404 page if content is missing
    }

    content.createdAt = new Date(content.createdAt.seconds * 1000);
    content.updatedAt = new Date(content.updatedAt.seconds * 1000);
    content.expiresAt = new Date(content.expiresAt.seconds * 1000);

    return <Suspense fallback={<div>Loading deal...</div>}><DealContent deal={content} /></Suspense>;
  } catch (error) {
    console.error('Error fetching content:', error);
    notFound(); // Redirect to 404 page on error
  }
}

