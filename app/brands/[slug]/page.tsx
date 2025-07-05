import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound, redirect } from 'next/navigation';
import BrandPage from './BrandPage';

export default async function DynamicPage({ params }: { params: { slug: string } }) {
  // Check if this is an encoded brand name and redirect to clean slug
  const isEncodedName = params.slug.includes('%') || params.slug.includes(' ');
  
  if (isEncodedName) {
    try {
      const brandName = decodeURIComponent(params.slug);
      
      // Find the brand's slug by name
      const brandsSnapshot = await getDocs(
        query(
          collection(db, 'brands'),
          where('name', '==', brandName)
        )
      );

      if (!brandsSnapshot.empty) {
        const brandData = brandsSnapshot.docs[0].data();
        // Redirect to the clean slug URL
        redirect(`/brands/${brandData.slug}`);
      }
    } catch (error) {
      // If redirect fails, continue to BrandPage which will handle both formats
    }
  }

  return <BrandPage />;
}