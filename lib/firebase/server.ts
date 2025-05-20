import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Brand, Deal } from './collections';

// Function to get brand details
const getBrandDetails = async (name: string): Promise<Brand | null> => {
  try {
    const brandsRef = collection(db, "brands"); // Reference to the collection
    const q = query(brandsRef, where("name", "==", name));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null; // No matching documents

    const brandDoc = querySnapshot.docs[0]; // Assuming name is unique, take the first match
    return {
      id: brandDoc.id,
      ...brandDoc.data(),
    } as Brand;
  } catch (err) {
    console.error("Error fetching brand:", err);
    return null;
  }
};

export async function getDeal(id: string): Promise<Deal | null> {
  try {
    const dealDoc = await getDoc(doc(db, 'deals', id));
    if (!dealDoc.exists()) return null;
    let brandDetails = await getBrandDetails(dealDoc.data().brand);
    return { id: dealDoc.id, brandDetails, ...dealDoc.data() } as Deal;
  } catch (error) {
    console.error('Error fetching deal:', error);
    return null;
  }
}