/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, Timestamp, setDoc, startAfter, QueryDocumentSnapshot, Query, getCountFromServer } from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import type { Deal, Profile, Brand, BlogPost, Review, SystemSettings, ContentSection, FAQ, AboutContent, MediaFile, Category } from './collections';
import { recordSearch } from './search';
import { signOut } from '../auth';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { getRegionFromHost } from '../utils/getRegionFromHost';

// Update the useAuth hook to include status checking
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = auth.onAuthStateChanged(async (user) => {
      // Clean up previous profile listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }
      
      if (user) {
        // Set up real-time listener for profile changes
        profileUnsubscribe = onSnapshot(
          doc(db, 'profiles', user.uid),
          async (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              // Check if user is inactive
              if (data.status === 'inactive') {
                try {
                  await signOut();
                  setUser(null);
                  setIsAdmin(false);
                  setError(new Error('Your account has been deactivated. Please contact support.'));
                } catch (err) {
                  console.error('Error signing out inactive user:', err);
                }
              } else {
                setUser(user);
                setIsAdmin(data.isAdmin || false);
                setError(null);
              }
            } else {
              setUser(user);
              setIsAdmin(false);
              setError(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching profile:', error);
            setIsAdmin(false);
            setLoading(false);
            setError(error as Error);
          }
        );
      } else {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  return { user, isAdmin, loading, error };
}

// Profile hook
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedDeals, setSavedDeals] = useState<[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'profiles', user.uid),
      (doc) => {
        if (doc.exists()) {
          setProfile({ id: doc.id, ...doc.data() } as Profile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching profile:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'deals_saved'),
        where('profileId', '==', user.uid) // Filter by user UID
      ),
      async (snapshot) => {
        try {
          if (!snapshot.empty) {
            const savedDeals = await Promise.all(
              snapshot.docs.map(async (doc) => {
                if(!doc.data().dealId)
                    return null;
                const dealData = await getDeal(doc.data().dealId);
                return { id: doc.id, ...doc.data(), dealData };
              })
            ) as any;
            setSavedDeals(savedDeals.filter((deal: any)=>deal));
          } else {
            setSavedDeals([]);
          }
        } catch (error) {
          console.error('Error processing deals:', error);
          setError(error as Error);
        }
      },
      (err) => {
        console.error('Error fetching saved deals:', err);
        setError(err as Error);
      }
    );

    return unsubscribe;
  }, [user]);

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
      setError(err as Error);
      return null;
    }
  };
  
  // Function to get a single deal
  const getDeal = async (id: string): Promise<Deal | null> => {
    try {
      const dealDoc = await getDoc(doc(db, 'deals', id));
      if (!dealDoc.exists()) return null;
      let brandDetails = await getBrandDetails(dealDoc.data().brand);
      return { id: dealDoc.id, brandDetails, ...dealDoc.data() } as Deal;
    } catch (err) {
      console.error('Error fetching deal:', err);
      setError(err as Error);
      return null;
    }
  };

  const savedUnsaveDeals = async (dealData: any, type: boolean): Promise<boolean> => {
    try {
      if (type === true) {
        // Save the deal to Firestore
        await addDoc(collection(db, 'deals_saved'), {
          ...dealData,
          profileId: user?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return type;
      } else if (type === false) {
        // Unsave the deal by updating its status or deleting the document
        const querySnapshot = await getDocs(
          query(
            collection(db, 'deals_saved'),
            where('profileId', '==', user?.uid),
            where('dealId', '==', dealData.dealId) // Assuming dealData contains dealId
          )
        );
        if (!querySnapshot.empty) {
          querySnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
          });
          return type;
        } else {
          throw new Error('No matching deal found to unsave.');
        }
      } else {
        throw new Error('Invalid operation type.');
      }
    } catch (error) {
      console.error('Error handling deals:', error);
      return type;
    }
  };
  

  return { profile, savedDeals, savedUnsaveDeals, loading, error };
}

// Categories hook
interface UseCategoriesOptions {
  name?: string;
  limit?: number;
  orderByField?: keyof Category;
  orderDirection?: 'asc' | 'desc';
}
export function useCategories(options: UseCategoriesOptions = {}) {
  const [featuredCategories, setFeaturedCategories] = useState<Category[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const {
      name,
      limit: queryLimit = 50,
      orderByField = 'createdAt',
      orderDirection = 'desc'
    } = options;

    // Build query
    let categoriesQuery = query(collection(db, 'categories'));

    // Add filters
    if (name) {
      categoriesQuery = query(categoriesQuery, where('name', '==', name));
    }

    // Add ordering and limit
    categoriesQuery = query(
      categoriesQuery,
      orderBy(orderByField, orderDirection),
      limit(queryLimit)
    );

    const unsubscribe = onSnapshot(
      categoriesQuery,
      async (snapshot) => {
        try {
          // Map snapshot.docs and resolve promises
          const categoriesData = await Promise.all(
            snapshot.docs.map(async (doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
          );
          setCategories(
            (categoriesData as any)
            .filter((e: any)=>
              e.status == 'active' && e.dealCount > 0
            )
            .sort((a: any, b: any)=>b.dealCount - a.dealCount)
          );
          setAllCategories(categoriesData as any);
          setLoading(false);
        } catch (error) {
          console.error('Error processing categories:', error);
          setError(error as Error);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching categories:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [options.name, options.limit, options.orderByField, options.orderDirection]);

  // Function to get a single category
  const getCategory = async (id: string): Promise<Category | null> => {
    try {
      const categoryDoc = await getDoc(doc(db, 'categories', id));
      if (!categoryDoc.exists()) return null;
      return { 
        id: categoryDoc.id, 
        ...categoryDoc.data(),
      } as Category;
    } catch (err) {
      console.error('Error fetching category:', err);
      setError(err as Error);
      return null;
    }
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    try {
      // Check if category with the same name already exists
      const categoriesRef = collection(db, 'categories');
      const categoryQuery = query(categoriesRef, where('name', '==', categoryData.name));
      const querySnapshot = await getDocs(categoryQuery);

      if (!querySnapshot.empty) {
        throw new Error("Category name already exists.");
      }

      // Add new category
      const docRef = await addDoc(collection(db, 'categories'), {
        ...categoryData,
        status: 'active',
        dealCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };

  const updateCategory = async (categoryId: string, data: Partial<Category>) => {
    try {

      // Fetch the current category details
      const existingCategory = await getCategory(categoryId);

      if (!existingCategory) {
        throw new Error("Category not found.");
      }

      // Check if category name is being changed and ensure it does not exist already
      if (data.name && data.name !== existingCategory.name) {
        const categoriesRef = collection(db, 'categories');
        const nameQuery = query(categoriesRef, where('name', '==', data.name));
        const nameSnapshot = await getDocs(nameQuery);

        if (!nameSnapshot.empty) {
          throw new Error("Category name already exists. Choose a different name.");
        }

        // Query all deals associated with the category
        const dealsQuery = query(collection(db, "deals"), where("category", "==", existingCategory.name));
        const dealsSnapshot = await getDocs(dealsQuery);

        // Update category name in all associated deals
        const updatePromises = dealsSnapshot.docs.map((dealDoc) =>
          updateDoc(doc(db, "deals", dealDoc.id), {
            category: data.name, // Update category name in deals
            updatedAt: serverTimestamp(),
          })
        );
        await Promise.all(updatePromises);
      }
      
      await updateDoc(doc(db, 'categories', categoryId), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const toggleCategoryStatus = async (categoryId: string, currentStatus: 'active' | 'inactive') => {
    try {
      await updateDoc(doc(db, 'categories', categoryId), {
        status: currentStatus === 'active' ? 'inactive' : 'active',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling category status:', error);
      throw error;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {

      let categoryDealsExist = await getCategory(categoryId);
      // console.log(categoryDealsExist?.dealCount);
      if(!categoryDealsExist?.dealCount)
        await deleteDoc(doc(db, 'categories', categoryId));
      else {
        throw ('Category cannot be deleted as deals exist for category!');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  return {
    categories,
    allCategories,
    loading,
    error,
    getCategory,
    addCategory,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory
  };
}

// Deals hook
interface UseDealsOptions {
  category?: string;
  brand?: string;
  limit?: number;
  orderByField?: keyof Deal;
  orderDirection?: 'asc' | 'desc';
}
type FetchAdminDealsOptions = {
  searchTerm?: string;
  countryCode?: string;
  activeDealsOnly?: string;
  page?: number;
  pageSize?: number;
  dealFilters?: any,
};
export function useDeals(options: UseDealsOptions = {}) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [allAdminDeals, setAdminDeals] = useState<Deal[]>([]);
  const [allPublicDeals, setPublicDeals] = useState<Deal[]>([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const limit__ = 10; // Number of deals to load per request
  

  const [totalDealsCount, setTotalDealsCount] = useState(0);
  
  const [trendingDeals, setTrendingDeals] = useState<Deal[]>([]);
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const {
      category,
      brand,
      limit: queryLimit = 50,
      orderByField = 'createdAt',
      orderDirection = 'desc'
    } = options;

    const countryCode = getRegionFromHost(window.location.hostname);

    // Build query
    let dealsQuery = query(collection(db, 'deals'));

    // Add filters
    if (category) {
      dealsQuery = query(dealsQuery, where('category', '==', category));
    }
    if (brand) {
      dealsQuery = query(dealsQuery, where('brand', '==', brand));
    }

    // Add ordering and limit
    dealsQuery = query(
      dealsQuery,
      orderBy(orderByField, orderDirection),
      limit(queryLimit)
    );

    const unsubscribe = onSnapshot(
      dealsQuery,
      async (snapshot) => {
        try {
          const dealsData = await Promise.all(
            snapshot.docs.map(async (doc) => ({
              id: doc.id,
              ...doc.data(),
              brandDetails: await getBrandDetails(doc.data().brand),
            } as unknown as Deal))
          );
    
          await fetchDeals();

          setTrendingDeals(
            dealsData
            .filter((e: any) => 
              e.expiresAt?.seconds && new Date(e.expiresAt.seconds * 1000) > new Date() 
              && e.status === 'active'
            )
            .filter((item: any) => 
              item.rawData?.regions?.all === true ||
              item.rawData?.regions?.list?.some((region: any) => region.countryCode === countryCode)
            )
            .sort(() => Math.random() - 0.5) // Shuffle array randomly
            .slice(0, 12) // Select first 3 random deals
          );
          // console.log(dealsData
          //   .filter((e: any) => 
          //     e.expiresAt?.seconds && new Date(e.expiresAt.seconds * 1000) > new Date() 
          //     && e.status === 'active'
          //   ));
          setAllDeals(dealsData);

          const countryFiltered = dealsData.filter((item: any) => 
            // item.rawData?.regions?.all === true ||
            item.rawData?.regions?.list?.some((region: any) => region.countryCode === countryCode)
          );

          setPublicDeals(
            countryFiltered
            .filter((e: any) => 
              e.expiresAt?.seconds && new Date(e.expiresAt.seconds * 1000) > new Date() 
              && e.status === 'active'
            )
          );
          setLoading(false);
        } catch (err) {
          console.error("Error processing deals:", err);
          setError(err as Error);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error fetching deals:", err);
        setError(err as Error);
        setLoading(false);
      }
    );
    
    return unsubscribe;
    
  }, [options.category, options.brand, options.limit, options.orderByField, options.orderDirection]);
















  const fetchAdminDeals = useCallback(
    async (options: FetchAdminDealsOptions = {}) => {
      const {
        searchTerm = '',
        countryCode,
        page = 1,
        pageSize = 10,
        dealFilters = {},
      } = options;

      // console.log(options);

      try {
        setLoading(true);
  
        let dealQuery: Query = collection(db, 'deals');
  
        const filters: any[] = [];
  
        if (status && status != 'all') {
          filters.push(where('status', '==', status));
        }
  
        if (searchTerm) {
          filters.push(
            where('title', '>=', searchTerm),
            where('title', '<=', searchTerm + '\uf8ff')
          );
        }

        dealQuery = query(
          dealQuery,
          ...filters,
          orderBy('title'),
          limit(page * pageSize)
        );
  
        const snapshot = await getDocs(dealQuery);
  
        const startIdx = (page - 1) * pageSize;
        const pagedDocs = snapshot.docs.slice(startIdx, startIdx + pageSize);
  
        const all = pagedDocs.map((doc) => {
          const data = doc.data();
          return { id: doc.id, ...data };
        });
  








        let filtered = all;
        if (dealFilters.status && dealFilters.status !== 'all') {
          filtered = filtered.filter((b: any) => b.status === dealFilters.status);
        }
        if (countryCode && countryCode !== 'all') {
          filtered = filtered.filter((b: any) => 
            // b.rawData?.regions?.all === true ||
            b.rawData?.regions?.list?.some((region: any) => region.countryCode === countryCode)
          );
        }
        filtered = filtered.sort((a: any, b: any) => b.activeDeals - a.activeDeals);










  
        const countSnap = await getCountFromServer(query(collection(db, 'deals'), ...filters));
        const total = countSnap.data().count;

        // console.log(filtered);
  
        setAdminDeals(filtered as any);
        setTotalDealsCount(total);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    []
  );
  useEffect(() => {
    fetchAdminDeals();
  }, []);














  // Function to fetch deals with pagination
  const fetchDeals = async () => {
    if(!deals.length)
      setLoading(true);
    try {
      let dealsQuery = query(
          collection(db, "deals"),
          where("status", "==", "active"),
          where("expiresAt", ">", Timestamp.now()),
          orderBy("expiresAt"),
          orderBy("createdAt", "desc"),
          limit(50)
      );

      const countryCode = getRegionFromHost(window.location.hostname);

      if (lastVisibleDoc) {
        dealsQuery = query(dealsQuery, startAfter(lastVisibleDoc));
      }

      const snapshot = await getDocs(dealsQuery);
      
      if (snapshot.empty) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      const newDeals = await Promise.all(
        snapshot.docs.map(async (doc) => ({
          id: doc.id,
          ...doc.data(),
          brandDetails: await getBrandDetails(doc.data().brand),
        })) as unknown as Deal[]
      );

      setDeals((prevDeals) => 
        ([
          ...prevDeals, 
          ...(newDeals
            .filter((e: any) => 
              e.expiresAt?.seconds && new Date(e.expiresAt.seconds * 1000) > new Date() 
              && e.status === 'active'
            )
            .filter((item: any) => 
              item.rawData?.regions?.all === true ||
              item.rawData?.regions?.list?.some((region: any) => region.countryCode === countryCode)
            )
            .sort(() => Math.random() - 0.5)) // Shuffle array randomly
        ])
      ); // Append new deals
      setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]); // Track last doc

      setLoading(false);
    } catch (error) {
      console.error("Error fetching deals:", error);
      setLoading(false);
    }
  };

  const loadMoreDeals = async () => {
    await fetchDeals();
  }

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
      setError(err as Error);
      return null;
    }
  };
  
  const getDeal = async (id: string): Promise<Deal | null> => {
    try {
      const dealDoc = await getDoc(doc(db, 'deals', id));
      if (!dealDoc.exists()) return null;
      let brandDetails = await getBrandDetails(dealDoc.data().brand);
      return { id: dealDoc.id, brandDetails, ...dealDoc.data() } as Deal;
    } catch (err) {
      console.error('Error fetching deal:', err);
      setError(err as Error);
      return null;
    }
  };

  const addDeal = async (dealData: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    try {
      const docRef = await addDoc(collection(db, 'deals'), {
        ...dealData,
        // status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding deal:', error);
      throw error;
    }
  };

  const updateDeal = async (dealId: string, data: Partial<Deal>) => {
    try {
      await updateDoc(doc(db, 'deals', dealId), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating deal:', error);
      throw error;
    }
  };

  const toggleDealStatus = async (dealId: string, currentStatus: 'active' | 'inactive') => {
    try {
      await updateDoc(doc(db, 'deals', dealId), {
        status: currentStatus === 'active' ? 'inactive' : 'active',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling deal status:', error);
      throw error;
    }
  };

  const deleteDeal = async (dealId: string) => {
    try {
      await deleteDoc(doc(db, 'deals', dealId));
    } catch (error) {
      console.error('Error deleting deal:', error);
      throw error;
    }
  };

  return {
    deals,
    allPublicDeals,
    trendingDeals,
    allDeals,
    getBrandDetails,
    loadMoreDeals,
    loading,
    error,
    getDeal,
    addDeal,
    updateDeal,
    toggleDealStatus,
    deleteDeal,

    allAdminDeals,
    totalDealsCount,
    fetchAdminDeals
  };
}

// Individual Deal hook
export function useDeal(dealId: string) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!dealId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'deals', dealId),
      (doc) => {
        if (doc.exists()) {
          setDeal({ id: doc.id, ...doc.data() } as Deal);
        } else {
          setDeal(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching deal:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [dealId]);

  return { deal, loading, error };
}

// Reviews hook
export function useReviews(itemId: string) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('itemId', '==', itemId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const reviewsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Review));
        setReviews(reviewsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching reviews:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [itemId]);

  const addReview = async (reviewData: { rating: number; comment: string }) => {
    if (!user) throw new Error('Must be logged in to add a review');
    if (!itemId) throw new Error('Item ID is required');

    try {
      const review = {
        itemId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        rating: reviewData.rating,
        comment: reviewData.comment,
        helpful: 0,
        date: new Date(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'reviews'), review);
    } catch (err) {
      console.error('Error adding review:', err);
      throw err;
    }
  };

  const markHelpful = async (reviewId: string) => {
    if (!user) throw new Error('Must be logged in to mark review as helpful');

    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      const reviewDoc = await getDoc(reviewRef);
      
      if (!reviewDoc.exists()) throw new Error('Review not found');

      await updateDoc(reviewRef, {
        helpful: (reviewDoc.data().helpful || 0) + 1,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error marking review as helpful:', err);
      throw err;
    }
  };

  const reportReview = async (reviewId: string) => {
    if (!user) throw new Error('Must be logged in to report a review');

    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      await updateDoc(reviewRef, {
        reported: true,
        reportedBy: user.uid,
        reportedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error reporting review:', err);
      throw err;
    }
  };

  return {
    reviews,
    loading,
    error,
    addReview,
    markHelpful,
    reportReview
  };
}

// Cart hook
interface CartItem {
  id: string;
  dealId: string;
  userId: string;
  quantity: number;
  deal: Deal;
}

export function useCart() {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    const cartQuery = query(
      collection(db, 'cart'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      cartQuery,
      async (snapshot) => {
        try {
          const items = await Promise.all(
            snapshot.docs.map(async (doc__) => {
              const data = doc__.data();
              const dealDoc = await getDoc(doc(db, 'deals', data.dealId));
              return {
                id: doc__.id,
                ...data,
                deal: { id: dealDoc.id, ...dealDoc.data() } as Deal
              } as CartItem;
            })
          );
          setCartItems(items);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching cart items:', err);
          setError(err as Error);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error in cart subscription:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const updateQuantity = async (itemId: string, change: number) => {
    if (!user) return;

    const item = cartItems.find(item => item.id === itemId);
    if (!item) return;

    const newQuantity = item.quantity + change;
    if (newQuantity < 1) {
      await removeItem(itemId);
      return;
    }

    try {
      await updateDoc(doc(db, 'cart', itemId), {
        quantity: newQuantity,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError(err as Error);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'cart', itemId));
    } catch (err) {
      console.error('Error removing item:', err);
      setError(err as Error);
    }
  };

  const addItem = async (dealId: string, quantity: number = 1) => {
    if (!user) return;

    try {
      // Check if item already exists in cart
      const existingItem = cartItems.find(item => item.dealId === dealId);
      if (existingItem) {
        await updateQuantity(existingItem.id, quantity);
        return;
      }

      // Add new item
      await addDoc(collection(db, 'cart'), {
        userId: user.uid,
        dealId,
        quantity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error adding item to cart:', err);
      setError(err as Error);
    }
  };

  return {
    cartItems,
    loading,
    error,
    updateQuantity,
    removeItem,
    addItem
  };
}

// Search History hook
export function useSearchHistory() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Fetch recent and popular searches
    async function fetchSearchHistory() {
      try {
        // Get recent searches
        const recentQuery = query(
          collection(db, 'search_history'),
          orderBy('lastSearchedAt', 'desc'),
          limit(5)
        );
        const recentSnapshot = await getDocs(recentQuery);
        const recentTerms = recentSnapshot.docs.map(doc => doc.data().term);

        // Get popular searches
        const popularQuery = query(
          collection(db, 'search_history'),
          orderBy('count', 'desc'),
          limit(10)
        );
        const popularSnapshot = await getDocs(popularQuery);
        const popularTerms = popularSnapshot.docs.map(doc => doc.data().term);

        setRecentSearches(recentTerms);
        setPopularSearches(popularTerms);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching search history:', err);
        setError(err as Error);
        setLoading(false);
      }
    }

    fetchSearchHistory();
  }, []);

  const addSearchTerm = async (term: string) => {
    try {
      await recordSearch(term);
      // Update recent searches locally
      setRecentSearches(prev => [term, ...prev.slice(0, 4)]);
    } catch (err) {
      console.error('Error adding search term:', err);
      throw err;
    }
  };

  return {
    recentSearches,
    popularSearches,
    loading,
    error,
    addSearchTerm
  };
}

// Brands hook
interface UseBrandsOptions {
  limit?: number | null;
  orderByField?: keyof Brand;
  orderDirection?: 'asc' | 'desc';
}
type FetchAdminBrandsOptions = {
  searchTerm?: string;
  status?: string;
  countryCode?: string;
  activeDealsOnly?: string;
  selectedStatus?: string;
  page?: number;
  pageSize?: number;
};

export function useBrands(options: UseBrandsOptions = {}) {
  const [featuredBrands, setFeaturedBrands] = useState<Brand[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const [adminBrands, setAdminBrands] = useState<Brand[]>([]);
  const [totalBrandsCount, setTotalBrandsCount] = useState<number>(0);

  const fetchFeaturedBrands = useCallback(async () => {
    try {
      setLoading(true);
      const countryCode = getRegionFromHost(window.location.hostname);

      // console.log("got here", true);
      const snapshot = await getDocs(query(
        collection(db, 'brands'),
        where('brandimg', '!=', ''),
        orderBy('brandimg', 'asc'),
        limit(50)
      ));

      const all = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, ...data, 
        };
      });

      const activeFiltered = all
        .filter((b: any) => b.status === 'active' && b.activeDeals > 0)
        .sort((a: any, b: any) => b.activeDeals - a.activeDeals) as any;

      const countryFiltered = activeFiltered
            .filter((b: any) => 
              ! b.rawData?.primaryRegion?.countryCode || 
              b.rawData?.primaryRegion?.countryCode === countryCode
            )

      setFeaturedBrands(countryFiltered as any);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);
  const fetchAllBrands = useCallback(async () => {
    try {
      setLoading(true);
      const countryCode = getRegionFromHost(window.location.hostname);

      const snapshot = await getDocs(query(
        collection(db, 'brands'),
        where('status', '==', 'active')
      ));

      const all = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, ...data, 
        };
      });

      const activeFiltered = all
        .filter((b: any) => b.status === 'active' && b.activeDeals > 0)
        .sort((a: any, b: any) => b.activeDeals - a.activeDeals) as any;

      const countryFiltered = activeFiltered
            .filter((b: any) => !b.rawData?.primaryRegion?.countryCode || b.rawData?.primaryRegion?.countryCode === countryCode)

      setAllBrands(countryFiltered as any);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);
  const fetchAdminBrands = useCallback(
    async (options: FetchAdminBrandsOptions = {}) => {
      const {
        searchTerm = '',
        status,
        countryCode,
        activeDealsOnly,
        selectedStatus,
        page = 1,
        pageSize = 10,
      } = options;

      try {
        setLoading(true);
  
        let brandQuery: Query = collection(db, 'brands');
  
        const filters: any[] = [];
  
        if (status && status != 'all') {
          filters.push(where('status', '==', status));
        }
  
        if (searchTerm) {
          filters.push(
            where('name', '>=', searchTerm),
            where('name', '<=', searchTerm + '\uf8ff')
          );
        }

        brandQuery = query(
          brandQuery,
          ...filters,
          orderBy('name'),
          limit(page * pageSize)
        );
  
        const snapshot = await getDocs(brandQuery);
  
        const startIdx = (page - 1) * pageSize;
        const pagedDocs = snapshot.docs.slice(startIdx, startIdx + pageSize);
  
        const all = pagedDocs.map((doc) => {
          const data = doc.data();
          return { id: doc.id, ...data };
        });
  








        let filtered = all;
        if (activeDealsOnly && activeDealsOnly !== 'all') {
          if(activeDealsOnly === 'active')
            filtered = filtered.filter((b: any) => b.activeDeals > 0);
          if(activeDealsOnly === 'inactive')
            filtered = filtered.filter((b: any) => b.activeDeals == 0);
        }
        if (selectedStatus && selectedStatus !== 'all') {
          filtered = filtered.filter((b: any) => b.status === selectedStatus);
        }
        if (countryCode && countryCode !== 'all') {
          filtered = filtered.filter((b: any) => 
            !b.rawData?.primaryRegion?.countryCode || 
            b.rawData?.primaryRegion?.countryCode === countryCode
          );
        }
        filtered = filtered.sort((a: any, b: any) => b.activeDeals - a.activeDeals);










  
        const countSnap = await getCountFromServer(query(collection(db, 'brands'), ...filters));
        const total = countSnap.data().count;
  
        setAdminBrands(filtered as any);
        setTotalBrandsCount(total);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchFeaturedBrands();
  }, []);
  useEffect(() => {
    fetchAllBrands();
  }, []);
  useEffect(() => {
    fetchAdminBrands();
  }, []);

  // Function to get a single brand
  const getBrand = async (id: string): Promise<Brand | null> => {
    try {
      const brandDoc = await getDoc(doc(db, 'brands', id));
      if (!brandDoc.exists()) return null;
      return { 
        id: brandDoc.id, 
        ...brandDoc.data(),
      } as Brand;
    } catch (err) {
      console.error('Error fetching brand:', err);
      setError(err as Error);
      return null;
    }
  };
  const addBrand = async (brandData: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Check if brand with the same name exists
      const brandsRef = collection(db, 'brands');
      const brandQuery = query(brandsRef, where('name', '==', brandData.name));
      const querySnapshot = await getDocs(brandQuery);

      if (!querySnapshot.empty) {
        throw new Error('Brand name already exists.');
      }

      // Add new brand if it doesn't exist
      const docRef = await addDoc(collection(db, 'brands'), {
        ...brandData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // status: 'active'
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding brand:', error);
      throw error;
    }
  };
  const updateBrand = async (brandId: string, data: Partial<Brand>) => {
    try {
      // Fetch the brand details
      let brandDealsExist = await getBrand(brandId);
      
      if (!brandDealsExist) {
        throw new Error("Brand not found.");
      }
  
      // If the brand name is being changed, check if the new name already exists
      if (data.name && data.name !== brandDealsExist.name) {
        const brandsRef = collection(db, "brands");
        const nameQuery = query(brandsRef, where("name", "==", data.name));
        const nameSnapshot = await getDocs(nameQuery);

        if (!nameSnapshot.empty) {
          throw new Error("Brand name already exists. Choose a different name.");
        }
      }
  
      // Query all deals associated with the brand
      const dealsQuery = query(collection(db, "deals"), where("brand", "==", brandDealsExist.name));
      const dealsSnapshot = await getDocs(dealsQuery);
  
      // Update each matching deal
      const updatePromises = dealsSnapshot.docs.map((dealDoc) =>
        updateDoc(doc(db, "deals", dealDoc.id), {
          brand: data.name, // Update brand name in deals
          updatedAt: serverTimestamp(),
        })
      );
  
      await Promise.all(updatePromises);
  
      // Update the brand document
      await updateDoc(doc(db, "brands", brandId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
  
      // console.log("Brand and associated deals updated successfully.");
    } catch (error) {
      console.error("Error updating brand:", error);
      throw error;
    }
  };
  const deleteBrand = async (brandId: string) => {
    try {
      let brandDealsExist = await getBrand(brandId);
      // console.log(brandDealsExist?.activeDeals);
      if(!brandDealsExist?.activeDeals)
        await deleteDoc(doc(db, 'brands', brandId));
      else {
        throw ('Brand cannot be deleted as deals exist for brand!');
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
      throw error;
    }
  };
  const toggleBrandStatus = async (brandId: string, currentStatus: 'active' | 'inactive') => {
    try {
      await updateDoc(doc(db, 'brands', brandId), {
        status: currentStatus === 'active' ? 'inactive' : 'active',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling brand status:', error);
      throw error;
    }
  };

  return {
    featuredBrands,
    allBrands,
    loading,
    error,
    getBrand,
    addBrand,
    updateBrand,
    deleteBrand,
    toggleBrandStatus,

    adminBrands,
    totalBrandsCount,
    fetchAdminBrands
  };
}

// Blog Posts hook
export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const postsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as BlogPost;
        });
        setPosts(postsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching blog posts:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addPost = async (post: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'blog_posts'), {
        ...post,
        date: Timestamp.fromDate(post.date),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding post:', error);
      throw error;
    }
  };

  const updatePost = async (id: string, data: Partial<BlogPost>) => {
    try {
      const docRef = doc(db, 'blog_posts', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  };

  const deletePost = async (id: string) => {
    try {
      const docRef = doc(db, 'blog_posts', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  };

  return {
    posts,
    loading,
    error,
    addPost,
    updatePost,
    deletePost
  };
}
export interface UserInterface {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  joinDate: Date;
  lastLogin: Date;
  dealsRedeemed: number;
  isAdmin?: boolean;
}
// User Management hook
export function useUsers() {
  const [users, setUsers] = useState<UserInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'profiles'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Anonymous',
            email: data.email,
            status: data.status || 'active',
            joinDate: data.createdAt?.toDate() || new Date(),
            lastLogin: data.lastLogin?.toDate() || new Date(),
            dealsRedeemed: data.dealsRedeemed || 0,
            isAdmin: data.isAdmin || false
          } as UserInterface;
        });
        setUsers(usersData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching users:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateUserStatus = async (userId: string, status: 'active' | 'inactive') => {
    try {
      const userRef = doc(db, 'profiles', userId);
      await updateDoc(userRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  };

  const sendEmailToUser = async (userId: string, subject: string, message: string) => {
    try {
      await addDoc(collection(db, 'mail'), {
        to: users.find(u => u.id === userId)?.email,
        subject,
        message,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  };

  const updateUser = async (userId: string, data: Partial<Profile>) => {
    try {
      const userRef = doc(db, 'profiles', userId);
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const updateUserRole = async (userId: string, isAdmin: boolean) => {
    try {
      const userRef = doc(db, 'profiles', userId);
      await updateDoc(userRef, {
        isAdmin,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  return {
    users,
    loading,
    error,
    updateUserStatus,
    sendEmailToUser,
    updateUser,
    updateUserRole,
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'system'),
      (doc) => {
        if (doc.exists()) {
          setSettings(doc.data() as SystemSettings);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching settings:', error);
        setError(error as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      await setDoc(
        doc(db, 'settings', 'system'),
        {
          ...newSettings,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings
  };
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<{
    siteName: string;
    siteUrl: string;
    supportEmail: string;
    supportPhone: string;
    supportAddress: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'system'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setSettings({
            siteName: data.general?.siteName || '',
            siteUrl: data.general?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '',
            supportEmail: data.general?.supportEmail || '',
            supportPhone: data.general?.supportPhone || '',
            supportAddress: data.general?.supportAddress || ''
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching site settings:', error);
        setError(error as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { settings, loading, error };
}

export function useContent() {
  const [content, setContent] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'content'),
      (snapshot) => {
        const contentData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ContentSection[];
        setContent(contentData.sort((a, b) => a.order - b.order));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching content:', error);
        setError(error as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addContent = async (newContent: Omit<ContentSection, 'id'>) => {
    try {
      await addDoc(collection(db, 'content'), {
        ...newContent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding content:', error);
      throw error;
    }
  };

  const updateContent = async (id: string, updates: Partial<ContentSection>) => {
    try {
      const docRef = doc(db, 'content', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating content:', error);
      throw error;
    }
  };

  const deleteContent = async (id: string) => {
    try {
      // console.log(id);
      const docRef = doc(db, 'content', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  };

  return {
    content,
    loading,
    error,
    addContent,
    updateContent,
    deleteContent
  };
}

export function useDynamicLinks() {
  const [links, setLinks] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const linksQuery = query(
      collection(db, 'content'),
      where('status', '==', 'published'),
      orderBy('order', 'asc')
    );
    
    const unsubscribe = onSnapshot(
      linksQuery,
      (snapshot) => {
        const linksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ContentSection[];
        setLinks(linksData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching dynamic links:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { links, loading, error };
}

export function useFAQs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const faqQuery = query(
      collection(db, 'faqs'),
      orderBy('category'),
      orderBy('order')
    );

    const unsubscribe = onSnapshot(
      faqQuery,
      (snapshot) => {
        const faqData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        })) as FAQ[];
        setFaqs(faqData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching FAQs:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addFAQ = async (faq: Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addDoc(collection(db, 'faqs'), {
        ...faq,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding FAQ:', error);
      throw error;
    }
  };

  const updateFAQ = async (id: string, updates: Partial<FAQ>) => {
    try {
      const docRef = doc(db, 'faqs', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating FAQ:', error);
      throw error;
    }
  };

  const deleteFAQ = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'faqs', id));
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      throw error;
    }
  };

  return {
    faqs,
    loading,
    error,
    addFAQ,
    updateFAQ,
    deleteFAQ
  };
}

export function useAboutContent() {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const aboutDoc = doc(db, 'about', 'main');
    
    const unsubscribe = onSnapshot(
      aboutDoc,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setContent({
            ...data,
            updatedAt: data.updatedAt?.toDate()
          } as AboutContent | any);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching about content:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateAboutContent = async (updates: Partial<AboutContent>) => {
    try {
      const aboutDoc = doc(db, 'about', 'main');
      await setDoc(aboutDoc, {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating about content:', error);
      throw error;
    }
  };

  return {
    content,
    loading,
    error,
    updateAboutContent
  };
}

export function useMediaFiles() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const filesRef = collection(db, 'media_files');
    const q = query(filesRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const mediaFiles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MediaFile[];
        setFiles(mediaFiles);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching media files:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const uploadFile = async (file: File, onProgress?: (progress: number) => void) => {
    try {
      // Create a storage reference
      const storageRef = ref(storage, `media/${file.name}`);
      
      // Upload file with progress monitoring
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          throw error;
        }
      );

      // Wait for upload to complete
      await uploadTask;

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Add file metadata to Firestore
      await addDoc(collection(db, 'media_files'), {
        name: file.name,
        type: file.type,
        size: file.size,
        url: downloadURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      // Get file data
      const fileDoc = await getDoc(doc(db, 'media_files', fileId));
      if (!fileDoc.exists()) throw new Error('File not found');

      const fileData = fileDoc.data();
      
      // Delete from storage
      const storageRef = ref(storage, fileData.url);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, 'media_files', fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  };

  return {
    files,
    loading,
    error,
    uploadFile,
    deleteFile
  };
}

// Rest of the hooks remain the same...