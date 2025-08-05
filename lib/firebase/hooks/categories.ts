/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Category } from '../collections';

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
        const dealsQuery = query(collection(db, "deals_fresh"), where("category", "==", existingCategory.name));
        const dealsSnapshot = await getDocs(dealsQuery);

        // Update category name in all associated deals
        const updatePromises = dealsSnapshot.docs.map((dealDoc) =>
          updateDoc(doc(db, "deals_fresh", dealDoc.id), {
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