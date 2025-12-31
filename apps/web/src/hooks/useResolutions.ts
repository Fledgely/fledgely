/**
 * useResolutions Hook
 *
 * Story 27.5.6: Resolution Markers
 *
 * Hook for managing family resolution markers.
 * - AC1: Add resolution markers
 * - AC6: Resolution history
 */

import { useState, useCallback, useEffect } from 'react'
import { getAuth } from 'firebase/auth'
import type { Resolution, ResolutionMarkerType } from '@fledgely/shared'

interface UseResolutionsResult {
  resolutions: Resolution[]
  isLoading: boolean
  error: string | null
  createResolution: (
    markerType: ResolutionMarkerType,
    note?: string
  ) => Promise<{ message: string } | null>
  refresh: () => Promise<void>
}

export function useResolutions(): UseResolutionsResult {
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResolutions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const auth = getAuth()
      const user = auth.currentUser
      if (!user) {
        setError('Not authenticated')
        return
      }

      const token = await user.getIdToken()
      const response = await fetch('/api/getResolutionsEndpoint', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch resolutions')
      }

      const data = await response.json()
      setResolutions(data.resolutions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resolutions')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createResolution = useCallback(
    async (
      markerType: ResolutionMarkerType,
      note?: string
    ): Promise<{ message: string } | null> => {
      try {
        const auth = getAuth()
        const user = auth.currentUser
        if (!user) {
          throw new Error('Not authenticated')
        }

        const token = await user.getIdToken()
        const response = await fetch('/api/createResolutionEndpoint', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ markerType, note }),
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
    [fetchResolutions]
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
