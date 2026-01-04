/**
 * useRectification Hook
 *
 * Story 51.8: Right to Rectification
 *
 * Hook for managing profile corrections, record notes,
 * correction requests, and AI disputes.
 */

'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'
import {
  type UpdateProfileInput,
  type UpdateProfileResponse,
  type AddRecordNoteInput,
  type AddRecordNoteResponse,
  type SubmitCorrectionRequestInput,
  type SubmitCorrectionRequestResponse,
  type ReviewCorrectionRequestInput,
  type ReviewCorrectionRequestResponse,
  type SubmitAIDisputeInput,
  type SubmitAIDisputeResponse,
  type GetProfileChangesResponse,
  type ProfileChangeLog,
  type EditableFieldValue,
  EditableFieldInfo,
} from '@fledgely/shared'

// Query keys
const QUERY_KEYS = {
  profileChanges: ['profile-changes'] as const,
  correctionRequests: ['correction-requests'] as const,
  aiDisputes: ['ai-disputes'] as const,
}

/**
 * Hook for profile updates with audit trail.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProfileInput): Promise<UpdateProfileResponse> => {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<UpdateProfileInput, UpdateProfileResponse>(
        functions,
        'updateUserProfile'
      )
      const result = await fn(input)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profileChanges })
    },
  })
}

/**
 * Hook for adding notes to records.
 */
export function useAddRecordNote() {
  return useMutation({
    mutationFn: async (input: AddRecordNoteInput): Promise<AddRecordNoteResponse> => {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<AddRecordNoteInput, AddRecordNoteResponse>(
        functions,
        'addRecordNote'
      )
      const result = await fn(input)
      return result.data
    },
  })
}

/**
 * Hook for submitting correction requests.
 */
export function useSubmitCorrectionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      input: SubmitCorrectionRequestInput
    ): Promise<SubmitCorrectionRequestResponse> => {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<SubmitCorrectionRequestInput, SubmitCorrectionRequestResponse>(
        functions,
        'submitCorrectionRequest'
      )
      const result = await fn(input)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.correctionRequests })
    },
  })
}

/**
 * Hook for reviewing correction requests (parent).
 */
export function useReviewCorrectionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      input: ReviewCorrectionRequestInput
    ): Promise<ReviewCorrectionRequestResponse> => {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<ReviewCorrectionRequestInput, ReviewCorrectionRequestResponse>(
        functions,
        'reviewCorrectionRequest'
      )
      const result = await fn(input)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.correctionRequests })
    },
  })
}

/**
 * Hook for submitting AI content disputes.
 */
export function useSubmitAIDispute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SubmitAIDisputeInput): Promise<SubmitAIDisputeResponse> => {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<SubmitAIDisputeInput, SubmitAIDisputeResponse>(
        functions,
        'disputeAIContent'
      )
      const result = await fn(input)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiDisputes })
    },
  })
}

/**
 * Hook for fetching profile change history.
 */
export function useProfileChanges(limit = 50) {
  return useQuery({
    queryKey: [...QUERY_KEYS.profileChanges, limit],
    queryFn: async (): Promise<GetProfileChangesResponse> => {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<{ limit: number }, GetProfileChangesResponse>(
        functions,
        'getProfileChanges'
      )
      const result = await fn({ limit })
      return result.data
    },
  })
}

/**
 * Hook for managing rectification state.
 */
export function useRectification() {
  const [isEditing, setIsEditing] = useState<EditableFieldValue | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editReason, setEditReason] = useState('')

  const updateProfile = useUpdateProfile()
  const profileChanges = useProfileChanges()
  const addRecordNote = useAddRecordNote()
  const submitCorrectionRequest = useSubmitCorrectionRequest()
  const reviewCorrectionRequest = useReviewCorrectionRequest()
  const submitAIDispute = useSubmitAIDispute()

  const startEditing = useCallback((field: EditableFieldValue, currentValue: string) => {
    setIsEditing(field)
    setEditValue(currentValue)
    setEditReason('')
  }, [])

  const cancelEditing = useCallback(() => {
    setIsEditing(null)
    setEditValue('')
    setEditReason('')
  }, [])

  const saveEdit = useCallback(async () => {
    if (!isEditing) return

    await updateProfile.mutateAsync({
      field: isEditing,
      value: editValue,
      reason: editReason || undefined,
    })

    cancelEditing()
  }, [isEditing, editValue, editReason, updateProfile, cancelEditing])

  const getFieldLabel = useCallback((field: EditableFieldValue): string => {
    return EditableFieldInfo[field]?.label || field
  }, [])

  const getFieldDescription = useCallback((field: EditableFieldValue): string => {
    return EditableFieldInfo[field]?.description || ''
  }, [])

  return {
    // Edit state
    isEditing,
    editValue,
    editReason,
    setEditValue,
    setEditReason,
    startEditing,
    cancelEditing,
    saveEdit,

    // Profile update
    updateProfile,
    isUpdating: updateProfile.isPending,
    updateError: updateProfile.error,

    // Profile changes (audit trail)
    profileChanges: profileChanges.data?.changes || [],
    totalChanges: profileChanges.data?.total || 0,
    isLoadingChanges: profileChanges.isLoading,

    // Record notes
    addRecordNote,
    isAddingNote: addRecordNote.isPending,

    // Correction requests
    submitCorrectionRequest,
    reviewCorrectionRequest,
    isSubmittingCorrection: submitCorrectionRequest.isPending,
    isReviewingCorrection: reviewCorrectionRequest.isPending,

    // AI disputes
    submitAIDispute,
    isSubmittingDispute: submitAIDispute.isPending,

    // Helpers
    getFieldLabel,
    getFieldDescription,
  }
}

/**
 * Format a profile change for display.
 */
export function formatProfileChange(change: ProfileChangeLog): string {
  const fieldInfo = EditableFieldInfo[change.field as EditableFieldValue]
  const fieldLabel = fieldInfo?.label || change.field

  if (change.oldValue === null) {
    return `Set ${fieldLabel} to "${change.newValue}"`
  }

  return `Changed ${fieldLabel} from "${change.oldValue}" to "${change.newValue}"`
}
