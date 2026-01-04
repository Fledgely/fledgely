/**
 * useChildReverseMode Hook - Story 52.7
 *
 * Hook for parents to view a child's reverse mode status.
 * Used by the parent dashboard to show the limited view indicator.
 */

'use client'

import { useQuery, useQueries } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'
import type { ReverseModeStatusValue, ReverseModeShareingPreferences } from '@fledgely/shared'

interface GetChildReverseModeInput {
  childId: string
}

interface GetChildReverseModeResponse {
  status: ReverseModeStatusValue
  isActive: boolean
  activatedAt: string | null
  sharingPreferences: ReverseModeShareingPreferences | null
}

/**
 * Fetch reverse mode status for a single child.
 */
async function fetchChildReverseMode(childId: string): Promise<GetChildReverseModeResponse | null> {
  if (!childId) return null

  const functions = getFirebaseFunctions()
  const fn = httpsCallable<GetChildReverseModeInput, GetChildReverseModeResponse>(
    functions,
    'getReverseModeStatusCallable'
  )
  const result = await fn({ childId })
  return result.data
}

/**
 * Hook for parents to fetch a child's reverse mode status.
 * Returns the status and sharing preferences so the parent can see what is shared.
 */
export function useChildReverseMode(childId: string | undefined) {
  return useQuery({
    queryKey: ['child-reverse-mode', childId],
    queryFn: () => fetchChildReverseMode(childId!),
    enabled: !!childId,
    staleTime: 60000, // Consider status fresh for 1 minute
  })
}

/**
 * Hook for parents to fetch reverse mode status for multiple children.
 * Uses useQueries to fetch all children in parallel.
 */
export function useChildrenReverseMode(childIds: string[]) {
  const results = useQueries({
    queries: childIds.map((childId) => ({
      queryKey: ['child-reverse-mode', childId],
      queryFn: () => fetchChildReverseMode(childId),
      enabled: !!childId,
      staleTime: 60000,
    })),
  })

  // Combine results into a map
  const reverseModeByChild: Record<
    string,
    {
      isActive: boolean
      status: ReverseModeStatusValue
      sharingPreferences: ReverseModeShareingPreferences | null
      activatedAt: Date | null
      isLoading: boolean
    }
  > = {}

  childIds.forEach((childId, index) => {
    const result = results[index]
    reverseModeByChild[childId] = {
      isActive: result.data?.isActive ?? false,
      status: result.data?.status ?? 'off',
      sharingPreferences: result.data?.sharingPreferences ?? null,
      activatedAt: result.data?.activatedAt ? new Date(result.data.activatedAt) : null,
      isLoading: result.isLoading,
    }
  })

  return {
    reverseModeByChild,
    isLoading: results.some((r) => r.isLoading),
  }
}

export default useChildReverseMode
