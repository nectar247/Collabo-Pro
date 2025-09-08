import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useBrandLogo(brandName: string, existingLogo?: string) {
  const [logo, setLogo] = useState<string | null>(existingLogo || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBrandLogo = async () => {
      // If we already have a logo, don't fetch
      if (existingLogo) {
        setLogo(existingLogo);
        return;
      }

      // Only fetch if we don't have a logo and have a brand name
      if (!brandName) return;

      setLoading(true);
      try {
        const brandsRef = collection(db, "brands");
        const q = query(brandsRef, where("name", "==", brandName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const brandDoc = querySnapshot.docs[0];
          const brandData = brandDoc.data();
          if (brandData.logo) {
            setLogo(brandData.logo);
          }
        }
      } catch (error) {
        console.error('Error fetching brand logo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrandLogo();
  }, [brandName, existingLogo]);

  return { logo, loading };
}