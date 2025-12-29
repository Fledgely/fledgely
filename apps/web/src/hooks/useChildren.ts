'use client'

/**
 * useChildren Hook - Story 12.5
 *
 * Real-time listener for children in a family.
 * Used by device assignment UI to show available children.
 *
 * Requirements:
 * - AC2: Dropdown shows all children in the family
 */

import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'

/**
 * Child summary for assignment dropdown
 */
export interface ChildSummary {
  id: string
  name: string
  photoURL: string | null
}

interface UseChildrenOptions {
  familyId: string | null
  enabled?: boolean
}

interface UseChildrenResult {
  children: ChildSummary[]
  loading: boolean
  error: string | null
}

/**
 * Hook to listen for children in a family.
 * Returns real-time list of children with id, name, and avatar.
 *
 * Task 3: useChildren Hook (AC: #2)
 * - 3.1 Create hook to fetch children in family
 * - 3.2 Return list of children with id/name/avatar
 * - 3.3 Handle loading and error states
 */
export function useChildren({ familyId, enabled = true }: UseChildrenOptions): UseChildrenResult {
  const [children, setChildren] = useState<ChildSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyId || !enabled) {
      setChildren([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const childrenRef = collection(db, 'children')

    // Query children belonging to this family, ordered by name
    const childrenQuery = query(
      childrenRef,
      where('familyId', '==', familyId),
      orderBy('name', 'asc')
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      childrenQuery,
      (snapshot) => {
        const childList: ChildSummary[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          childList.push({
            id: doc.id,
            name: data.name || 'Unknown',
            photoURL: data.photoURL || null,
          })
        })

        setChildren(childList)
        setLoading(false)
      },
      (err) => {
        // Error details logged in development only
        if (process.env.NODE_ENV === 'development') {
          console.error('Error listening to children:', err)
        }
        setError('Failed to load children')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, enabled])

  return {
    children,
    loading,
    error,
  }
}
