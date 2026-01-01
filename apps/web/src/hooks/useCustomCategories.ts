'use client'

/**
 * useCustomCategories Hook - Story 30.4
 *
 * Manages family custom categories for time limit configuration.
 *
 * Requirements:
 * - AC1: Category name (max 30 chars)
 * - AC2: Apps/sites assigned via search
 * - AC6: Maximum 10 custom categories per family
 */

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import { MAX_CUSTOM_CATEGORIES_PER_FAMILY, type CustomCategory } from '@fledgely/shared'

interface UseCustomCategoriesOptions {
  familyId: string | null
  enabled?: boolean
}

interface UseCustomCategoriesResult {
  categories: CustomCategory[]
  loading: boolean
  error: string | null
  canAddMore: boolean
  createCategory: (
    name: string,
    userId: string,
    apps?: string[]
  ) => Promise<{ success: boolean; error?: string; id?: string }>
  updateCategory: (
    categoryId: string,
    updates: { name?: string; apps?: string[] }
  ) => Promise<{ success: boolean; error?: string }>
  deleteCategory: (categoryId: string) => Promise<{ success: boolean; error?: string }>
}

/**
 * Hook to manage family custom categories.
 */
export function useCustomCategories({
  familyId,
  enabled = true,
}: UseCustomCategoriesOptions): UseCustomCategoriesResult {
  const [categories, setCategories] = useState<CustomCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if more categories can be added - AC6
  const canAddMore = categories.length < MAX_CUSTOM_CATEGORIES_PER_FAMILY

  useEffect(() => {
    if (!familyId || !enabled) {
      setCategories([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const categoriesRef = collection(db, 'families', familyId, 'customCategories')
    const q = query(categoriesRef, orderBy('createdAt', 'asc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cats: CustomCategory[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          familyId: familyId,
          ...docSnap.data(),
        })) as CustomCategory[]
        setCategories(cats)
        setLoading(false)
      },
      (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error listening to custom categories:', err)
        }
        setError('Failed to load custom categories')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, enabled])

  /**
   * Create a new custom category.
   * AC1: Max 30 chars for name
   * AC6: Max 10 categories per family
   */
  const createCategory = useCallback(
    async (
      name: string,
      userId: string,
      apps: string[] = []
    ): Promise<{ success: boolean; error?: string; id?: string }> => {
      if (!familyId) {
        return { success: false, error: 'Missing family ID' }
      }

      if (name.length > 30) {
        return { success: false, error: 'Category name must be 30 characters or less' }
      }

      if (categories.length >= MAX_CUSTOM_CATEGORIES_PER_FAMILY) {
        return {
          success: false,
          error: `Maximum ${MAX_CUSTOM_CATEGORIES_PER_FAMILY} custom categories allowed`,
        }
      }

      try {
        const db = getFirestoreDb()
        const categoriesRef = collection(db, 'families', familyId, 'customCategories')

        const newCategory = {
          familyId,
          name,
          apps,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        const docRef = await addDoc(categoriesRef, newCategory)
        return { success: true, id: docRef.id }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error creating custom category:', err)
        }
        return { success: false, error: 'Failed to create category' }
      }
    },
    [familyId, categories.length]
  )

  /**
   * Update an existing custom category.
   */
  const updateCategory = useCallback(
    async (
      categoryId: string,
      updates: { name?: string; apps?: string[] }
    ): Promise<{ success: boolean; error?: string }> => {
      if (!familyId) {
        return { success: false, error: 'Missing family ID' }
      }

      if (updates.name && updates.name.length > 30) {
        return { success: false, error: 'Category name must be 30 characters or less' }
      }

      try {
        const db = getFirestoreDb()
        const categoryRef = doc(db, 'families', familyId, 'customCategories', categoryId)

        await updateDoc(categoryRef, {
          ...updates,
          updatedAt: Date.now(),
        })

        return { success: true }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error updating custom category:', err)
        }
        return { success: false, error: 'Failed to update category' }
      }
    },
    [familyId]
  )

  /**
   * Delete a custom category.
   */
  const deleteCategory = useCallback(
    async (categoryId: string): Promise<{ success: boolean; error?: string }> => {
      if (!familyId) {
        return { success: false, error: 'Missing family ID' }
      }

      try {
        const db = getFirestoreDb()
        const categoryRef = doc(db, 'families', familyId, 'customCategories', categoryId)

        await deleteDoc(categoryRef)
        return { success: true }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error deleting custom category:', err)
        }
        return { success: false, error: 'Failed to delete category' }
      }
    },
    [familyId]
  )

  return {
    categories,
    loading,
    error,
    canAddMore,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
