'use client'

/**
 * useTrustedAdults Hook - Story 52.4 Task 5.2
 *
 * Hook for managing trusted adults with Firebase callable functions.
 *
 * Features:
 * - Fetches trusted adults for a child
 * - Provides invite, revoke, and resend functions
 * - Tracks loading and error states
 */

import { useState, useCallback, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'
import type { TrustedAdultStatusValue } from '@fledgely/shared'

interface TrustedAdultData {
  id: string
  name: string
  email: string
  status: TrustedAdultStatusValue
  invitedAt: Date
  expiresAt?: Date
  acceptedAt?: Date
  approvedByTeenAt?: Date
}

interface TrustedAdultCounts {
  active: number
  pendingInvitation: number
  pendingTeenApproval: number
  total: number
  maxAllowed: number
  canAddMore: boolean
}

interface UseTrustedAdultsResult {
  trustedAdults: TrustedAdultData[]
  counts: TrustedAdultCounts | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  invite: (email: string, name: string) => Promise<void>
  revoke: (trustedAdultId: string, reason?: string) => Promise<void>
  resendInvitation: (trustedAdultId: string) => Promise<void>
}

interface UseTrustedAdultsOptions {
  familyId: string
  childId: string
}

export function useTrustedAdults({
  familyId,
  childId,
}: UseTrustedAdultsOptions): UseTrustedAdultsResult {
  const [trustedAdults, setTrustedAdults] = useState<TrustedAdultData[]>([])
  const [counts, setCounts] = useState<TrustedAdultCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrustedAdults = useCallback(async () => {
    if (!familyId || !childId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const getTrustedAdults = httpsCallable(functions, 'getTrustedAdultsCallable')
      const result = await getTrustedAdults({ familyId, childId })
      const data = result.data as {
        trustedAdults: Array<{
          id: string
          name: string
          email: string
          status: TrustedAdultStatusValue
          invitedAt: string | { _seconds: number }
          expiresAt?: string | { _seconds: number }
          acceptedAt?: string | { _seconds: number }
          approvedByTeenAt?: string | { _seconds: number }
        }>
        counts: TrustedAdultCounts
      }

      // Convert date strings/timestamps to Date objects
      const formattedTrustedAdults = data.trustedAdults.map((ta) => ({
        ...ta,
        invitedAt: parseDate(ta.invitedAt),
        expiresAt: ta.expiresAt ? parseDate(ta.expiresAt) : undefined,
        acceptedAt: ta.acceptedAt ? parseDate(ta.acceptedAt) : undefined,
        approvedByTeenAt: ta.approvedByTeenAt ? parseDate(ta.approvedByTeenAt) : undefined,
      }))

      setTrustedAdults(formattedTrustedAdults)
      setCounts(data.counts)
    } catch (err) {
      console.error('Failed to fetch trusted adults:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trusted adults')
    } finally {
      setLoading(false)
    }
  }, [familyId, childId])

  // Parse date from various formats
  function parseDate(value: string | { _seconds: number }): Date {
    if (typeof value === 'string') {
      return new Date(value)
    }
    if (value && typeof value === 'object' && '_seconds' in value) {
      return new Date(value._seconds * 1000)
    }
    return new Date()
  }

  useEffect(() => {
    fetchTrustedAdults()
  }, [fetchTrustedAdults])

  const invite = useCallback(
    async (email: string, name: string) => {
      setError(null)

      try {
        const inviteTrustedAdult = httpsCallable(functions, 'inviteTrustedAdultCallable')
        await inviteTrustedAdult({ email, name, childId })
        await fetchTrustedAdults()
      } catch (err) {
        console.error('Failed to invite trusted adult:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation'
        setError(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [childId, fetchTrustedAdults]
  )

  const revoke = useCallback(
    async (trustedAdultId: string, reason?: string) => {
      setError(null)

      try {
        const revokeTrustedAdult = httpsCallable(functions, 'revokeTrustedAdultCallable')
        await revokeTrustedAdult({ trustedAdultId, reason })
        await fetchTrustedAdults()
      } catch (err) {
        console.error('Failed to revoke trusted adult:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove trusted adult'
        setError(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [fetchTrustedAdults]
  )

  const resendInvitation = useCallback(
    async (trustedAdultId: string) => {
      setError(null)

      try {
        const resendTrustedAdultInvitation = httpsCallable(
          functions,
          'resendTrustedAdultInvitationCallable'
        )
        await resendTrustedAdultInvitation({ trustedAdultId, familyId })
        await fetchTrustedAdults()
      } catch (err) {
        console.error('Failed to resend invitation:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to resend invitation'
        setError(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [familyId, fetchTrustedAdults]
  )

  return {
    trustedAdults,
    counts,
    loading,
    error,
    refresh: fetchTrustedAdults,
    invite,
    revoke,
    resendInvitation,
  }
}
