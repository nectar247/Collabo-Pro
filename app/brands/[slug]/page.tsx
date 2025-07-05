// app/brands/[slug]/page.tsx
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound, redirect } from 'next/navigation';
import { generateMetadata as createMetadata } from '@/lib/metadata';
import { Metadata } from 'next';
import BrandPageClient from './BrandPageClient';

// Generate metadata dynamically for each brand
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  let brandName = '';
  
  try {
    const isEncodedName = params.slug.includes('%') || params.slug.includes(' ');
    
    if (isEncodedName) {
      // Old format: decode the brand name directly
      brandName = decodeURIComponent(params.slug);
    } else {
      // New format: find the brand by slug
      const brandsSnapshot = await getDocs(
        query(
          collection(db, 'brands'),
          where('slug', '==', params.slug)
        )
      );

      if (!brandsSnapshot.empty) {
        const brandData = brandsSnapshot.docs[0].data();
        brandName = brandData.name;
      }
    }

    // If we found a brand name, generate proper metadata
    if (brandName) {
      return createMetadata({
        title: `${brandName} Deals & Vouchers - Latest Discount Codes`,
        description: `Find the best ${brandName} deals, discount codes, and vouchers. Save money with exclusive ${brandName} offers and promotional codes.`,
        keywords: [`${brandName} deals`, `${brandName} vouchers`, `${brandName} discount codes`, `${brandName} offers`, `${brandName} coupons`, 'brand deals', 'discount codes'],
      });
    }
  } catch (error) {
    console.error('Error generating metadata:', error);
  }

  // Fallback metadata if brand not found
  return createMetadata({
    title: 'Brand Deals & Vouchers - Discount Codes',
    description: 'Find the best brand deals, discount codes, and vouchers. Save money with exclusive offers and promotional codes.',
    keywords: ['brand deals', 'vouchers', 'discount codes', 'offers', 'coupons'],
  });
}

export default async function DynamicBrandPage({ params }: { params: { slug: string } }) {
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
      // If redirect fails, continue to BrandPageClient which will handle both formats
    }
  }

  return <BrandPageClient />;
}