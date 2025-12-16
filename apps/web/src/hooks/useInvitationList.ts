'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getFamilyInvitations } from '@/services/invitationService'
import type { Invitation } from '@fledgely/contracts'

/**
 * Return type for useInvitationList hook
 *
 * Story 3.5: Invitation Management - Task 2
 */
export interface UseInvitationListReturn {
  /** All invitations for the family */
  invitations: Invitation[]
  /** Current pending invitation (if any) - must be pending AND not expired */
  pendingInvitation: Invitation | null
  /** Past invitations (accepted, revoked, expired) */
  invitationHistory: Invitation[]
  /** Loading state */
  loading: boolean
  /** Error state */
  error: Error | null
  /** Refresh the invitation list */
  refresh: () => Promise<void>
}

/**
 * Hook to manage invitation list state for a family
 *
 * Story 3.5: Invitation Management - Task 2
 *
 * Features:
 * - Fetches all invitations for a family
 * - Separates pending from historical invitations
 * - Handles expired invitations (pending status but past expiresAt)
 * - Provides loading and error states
 * - Supports manual refresh
 *
 * @param familyId - Family ID to fetch invitations for, or null
 * @param userId - User ID for authorization check
 * @returns UseInvitationListReturn with invitations, states, and refresh
 */
export function useInvitationList(
  familyId: string | null,
  userId: string | null
): UseInvitationListReturn {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchInvitations = useCallback(async () => {
    if (!familyId || !userId) {
      setInvitations([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getFamilyInvitations(familyId, userId)
      setInvitations(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch invitations'))
    } finally {
      setLoading(false)
    }
  }, [familyId, userId])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  // Derived state: Current pending invitation (pending AND not expired)
  const pendingInvitation = useMemo(() => {
    return invitations.find(
      (inv) => inv.status === 'pending' && new Date() < inv.expiresAt
    ) || null
  }, [invitations])

  // Derived state: Historical invitations (not pending OR expired)
  const invitationHistory = useMemo(() => {
    return invitations.filter(
      (inv) => inv.status !== 'pending' || new Date() >= inv.expiresAt
    )
  }, [invitations])

  return {
    invitations,
    pendingInvitation,
    invitationHistory,
    loading,
    error,
    refresh: fetchInvitations,
  }
}
