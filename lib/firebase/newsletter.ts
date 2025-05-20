import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NewsletterPreferences {
  dailyDeals: boolean;
  weeklyNewsletter: boolean;
  specialOffers: boolean;
}

export async function subscribeToNewsletter(email: string, preferences: NewsletterPreferences) {
  try {
    // Check if email already exists
    const q = query(
      collection(db, 'newsletter_subscribers'),
      where('email', '==', email.toLowerCase())
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new Error('Email already subscribed');
    }

    // Add new subscriber
    await addDoc(collection(db, 'newsletter_subscribers'), {
      email,
      preferences,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active'
    });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    throw error;
  }
}