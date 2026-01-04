/**
 * useReverseMode Hook - Story 52.2 Task 6
 *
 * Hook for managing reverse mode state and actions.
 *
 * AC1: Check if child is 16+ for visibility
 * AC3: Toggle reverse mode status
 * AC5: Deactivation support
 */

'use client'

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'
import type { ReverseModeStatusValue, ReverseModeShareingPreferences } from '@fledgely/shared'

// Query keys
const QUERY_KEYS = {
  reverseModeStatus: ['reverse-mode-status'] as const,
}

// Types for callable function inputs/outputs
interface GetStatusInput {
  childId: string
}

interface GetStatusResponse {
  status: ReverseModeStatusValue
  isActive: boolean
  isEligible: boolean
  canActivate: boolean
  activatedAt: string | null
  deactivatedAt: string | null
  sharingPreferences: ReverseModeShareingPreferences | null
  familyId: string
}

interface ActivateInput {
  childId: string
  confirmationAcknowledged: boolean
}

interface ActivateResponse {
  success: boolean
  status: ReverseModeStatusValue
  activatedAt: string
  sharingPreferences: ReverseModeShareingPreferences
}

interface DeactivateInput {
  childId: string
}

interface DeactivateResponse {
  success: boolean
  status: ReverseModeStatusValue
  deactivatedAt: string
}

interface UpdateSharingInput {
  childId: string
  sharingPreferences: Partial<ReverseModeShareingPreferences>
}

interface UpdateSharingResponse {
  success: boolean
  sharingPreferences: ReverseModeShareingPreferences
}

/**
 * Hook for fetching reverse mode status.
 */
export function useReverseModeStatus(childId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.reverseModeStatus, childId],
    queryFn: async (): Promise<GetStatusResponse | null> => {
      if (!childId) return null

      const functions = getFirebaseFunctions()
      const fn = httpsCallable<GetStatusInput, GetStatusResponse>(
        functions,
        'getReverseModeStatusCallable'
      )
      const result = await fn({ childId })
      return result.data
    },
    enabled: !!childId,
    staleTime: 30000, // Consider status fresh for 30 seconds
  })
}

/**
 * Hook for activating reverse mode.
 */
export function useActivateReverseMode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      childId,
      confirmationAcknowledged,
    }: {
      childId: string
      confirmationAcknowledged: boolean
    }): Promise<ActivateResponse> => {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<ActivateInput, ActivateResponse>(
        functions,
        'activateReverseModeCallable'
      )
      const result = await fn({ childId, confirmationAcknowledged })
      return result.data
    },
    onSuccess: (_data, variables) => {
      // Invalidate the status query to refetch
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.reverseModeStatus, variables.childId],
      })
      // Also invalidate any parent dashboard queries
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['child'] })
    },
  })
}

/**
 * Hook for deactivating reverse mode.
 */
export function useDeactivateReverseMode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (childId: string): Promise<DeactivateResponse> => {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<DeactivateInput, DeactivateResponse>(
        functions,
        'deactivateReverseModeCallable'
      )
      const result = await fn({ childId })
      return result.data
    },
    onSuccess: (_data, childId) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.reverseModeStatus, childId],
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['child'] })
    },
  })
}

/**
 * Hook for updating sharing preferences.
 */
export function useUpdateReverseModeSharing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      childId,
      sharingPreferences,
    }: UpdateSharingInput): Promise<UpdateSharingResponse> => {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<UpdateSharingInput, UpdateSharingResponse>(
        functions,
        'updateReverseModeSharing'
      )
      const result = await fn({ childId, sharingPreferences })
      return result.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.reverseModeStatus, variables.childId],
      })
    },
  })
}

/**
 * Main hook for reverse mode state management.
 */
export function useReverseMode(childId?: string) {
  // Get current status
  const statusQuery = useReverseModeStatus(childId)

  // Mutations
  const activateMutation = useActivateReverseMode()
  const deactivateMutation = useDeactivateReverseMode()
  const updateSharingMutation = useUpdateReverseModeSharing()

  // Derived state
  const statusData = statusQuery.data
  const status = statusData?.status ?? 'off'
  const isActive = statusData?.isActive ?? false
  const isEligible = statusData?.isEligible ?? false
  const canActivate = statusData?.canActivate ?? false
  const sharingPreferences = statusData?.sharingPreferences ?? null

  // Actions
  const activate = useCallback(
    async (confirmationAcknowledged: boolean) => {
      if (!childId) throw new Error('Child ID is required')
      return activateMutation.mutateAsync({ childId, confirmationAcknowledged })
    },
    [childId, activateMutation]
  )

  const deactivate = useCallback(async () => {
    if (!childId) throw new Error('Child ID is required')
    return deactivateMutation.mutateAsync(childId)
  }, [childId, deactivateMutation])

  const updateSharing = useCallback(
    async (preferences: Partial<ReverseModeShareingPreferences>) => {
      if (!childId) throw new Error('Child ID is required')
      return updateSharingMutation.mutateAsync({
        childId,
        sharingPreferences: preferences,
      })
    },
    [childId, updateSharingMutation]
  )

  // Combined loading state for any mutation
  const isMutating =
    activateMutation.isPending || deactivateMutation.isPending || updateSharingMutation.isPending

  return {
    // State
    status,
    isActive,
    isEligible,
    canActivate,
    sharingPreferences,
    activatedAt: statusData?.activatedAt ? new Date(statusData.activatedAt) : null,
    deactivatedAt: statusData?.deactivatedAt ? new Date(statusData.deactivatedAt) : null,

    // Loading states
    isLoading: statusQuery.isLoading,
    isActivating: activateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
    isUpdatingSharing: updateSharingMutation.isPending,
    isMutating,

    // Errors
    error: statusQuery.error,
    activateError: activateMutation.error,
    deactivateError: deactivateMutation.error,
    updateSharingError: updateSharingMutation.error,

    // Actions
    activate,
    deactivate,
    updateSharing,

    // Refetch
    refetch: statusQuery.refetch,
  }
}

export default useReverseMode
