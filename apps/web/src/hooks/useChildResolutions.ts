/**
 * useChildResolutions Hook
 *
 * Story 27.5.6: Resolution Markers
 *
 * Hook for managing family resolution markers for children.
 * Children read from Firestore cache (bilateral transparency).
 * - AC2: Either party can add
 * - AC3: Both see same data
 * - AC6: Resolution history
 */

import { useState, useCallback, useEffect } from 'react'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import type { Resolution, ResolutionMarkerType } from '@fledgely/shared'

interface UseChildResolutionsResult {
  resolutions: Resolution[]
  isLoading: boolean
  error: string | null
  createResolution: (
    markerType: ResolutionMarkerType,
    note?: string
  ) => Promise<{ message: string } | null>
  refresh: () => Promise<void>
}

export function useChildResolutions(familyId: string | null): UseChildResolutionsResult {
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResolutions = useCallback(async () => {
    if (!familyId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const db = getFirestore()
      const resolutionsRef = collection(db, 'families', familyId, 'resolutions')
      const q = query(resolutionsRef, orderBy('createdAt', 'desc'), limit(20))
      const snapshot = await getDocs(q)

      const resolutionsList: Resolution[] = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        resolutionsList.push({
          id: data.id,
          familyId: data.familyId,
          createdBy: data.createdBy,
          createdByType: data.createdByType,
          createdByName: data.createdByName,
          markerType: data.markerType,
          note: data.note,
          createdAt: data.createdAt,
        })
      })

      setResolutions(resolutionsList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resolutions')
    } finally {
      setIsLoading(false)
    }
  }, [familyId])

  const createResolution = useCallback(
    async (
      markerType: ResolutionMarkerType,
      note?: string
    ): Promise<{ message: string } | null> => {
      if (!familyId) {
        setError('No family ID')
        return null
      }

      try {
        // Get child session from localStorage
        const sessionStr = localStorage.getItem('fledgely_child_session')
        if (!sessionStr) {
          throw new Error('Not authenticated')
        }
        const session = JSON.parse(sessionStr)

        // Create resolution via HTTP endpoint (child endpoint)
        const response = await fetch('/api/createChildResolutionEndpoint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            familyId,
            childId: session.childId,
            markerType,
            note,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to create resolution')
        }

        const data = await response.json()

        // Refresh the list
        await fetchResolutions()

        return { message: data.message }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create resolution')
        return null
      }
    },
    [familyId, fetchResolutions]
  )

  useEffect(() => {
    fetchResolutions()
  }, [fetchResolutions])

  return {
    resolutions,
    isLoading,
    error,
    createResolution,
    refresh: fetchResolutions,
  }
}
