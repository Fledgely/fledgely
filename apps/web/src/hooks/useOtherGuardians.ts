'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { getUser } from '@/services/userService'
import type { FamilyGuardian } from '@fledgely/contracts'

/**
 * Hook return type for useOtherGuardians
 */
export interface UseOtherGuardiansReturn {
  /** Display names of other guardians (excluding current user) */
  otherGuardianNames: string[]
  /** Whether guardian data is loading */
  isLoading: boolean
  /** Error if fetching failed */
  error: Error | null
}

/**
 * Fallback name for guardians without display name
 */
const FALLBACK_NAME = 'Co-parent'

/**
 * useOtherGuardians Hook - Fetches display names for other family guardians
 *
 * Story 3.4: Equal Access Verification - Task 3
 *
 * Features:
 * - Filters out current user from guardians array
 * - Fetches display names from users collection
 * - Returns formatted name list for display
 * - Handles loading and error states
 * - Optimizes with memoized guardian UID comparison
 *
 * @param guardians - Array of family guardians
 * @param currentUserId - Current user's uid
 * @returns Display names, loading state, and error
 *
 * @example
 * ```tsx
 * const { otherGuardianNames, isLoading, error } = useOtherGuardians(
 *   family.guardians,
 *   user.uid
 * )
 *
 * if (otherGuardianNames.length > 0) {
 *   return <CoManagedIndicator otherGuardianNames={otherGuardianNames} isLoading={isLoading} />
 * }
 * ```
 */
export function useOtherGuardians(
  guardians: FamilyGuardian[] | null | undefined,
  currentUserId: string | null | undefined
): UseOtherGuardiansReturn {
  const [otherGuardianNames, setOtherGuardianNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Track previous guardian UIDs to prevent unnecessary re-fetches
  const prevGuardianUidsRef = useRef<string>('')

  // Get other guardian UIDs (excluding current user)
  const otherGuardianUids = useMemo(() => {
    if (!guardians || !currentUserId) return []
    return guardians
      .filter((g) => g.uid !== currentUserId)
      .map((g) => g.uid)
  }, [guardians, currentUserId])

  // Create stable key for comparison
  const guardianUidsKey = otherGuardianUids.sort().join(',')

  useEffect(() => {
    // Skip if no other guardians
    if (otherGuardianUids.length === 0) {
      setOtherGuardianNames([])
      setIsLoading(false)
      setError(null)
      return
    }

    // Skip if guardian UIDs haven't changed
    if (guardianUidsKey === prevGuardianUidsRef.current) {
      return
    }

    let isMounted = true

    const fetchGuardianNames = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch all guardian users in parallel
        const userPromises = otherGuardianUids.map(async (uid) => {
          try {
            const user = await getUser(uid)
            return user?.displayName || FALLBACK_NAME
          } catch {
            // Individual failures don't stop the whole operation
            console.warn(`[useOtherGuardians] Failed to fetch user ${uid}`)
            return FALLBACK_NAME
          }
        })

        const names = await Promise.all(userPromises)

        if (isMounted) {
          setOtherGuardianNames(names)
          prevGuardianUidsRef.current = guardianUidsKey
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch guardian names'))
          setOtherGuardianNames([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchGuardianNames()

    return () => {
      isMounted = false
    }
  }, [otherGuardianUids, guardianUidsKey])

  return {
    otherGuardianNames,
    isLoading,
    error,
  }
}
