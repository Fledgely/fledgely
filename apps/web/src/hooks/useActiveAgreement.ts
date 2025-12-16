'use client'

import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AgreementStatus } from '@fledgely/contracts'

/**
 * useActiveAgreement Hook
 *
 * Story 6.3: Agreement Activation - Task 8
 *
 * Fetches the active agreement for a family to display on the dashboard.
 */

/**
 * Agreement data for dashboard display
 */
export interface ActiveAgreementData {
  id: string
  status: AgreementStatus
  version: string
  activatedAt?: string
  termsCount: number
  signedBy: string[]
  signingStatus: string
}

/**
 * Hook parameters
 */
export interface UseActiveAgreementParams {
  familyId: string | null | undefined
}

/**
 * Hook return type
 */
export interface UseActiveAgreementReturn {
  /** Active agreement data, or null if none */
  agreement: ActiveAgreementData | null
  /** Pending agreement awaiting signatures, or null if none */
  pendingAgreement: ActiveAgreementData | null
  /** Whether data is loading */
  loading: boolean
  /** Error if fetch failed */
  error: Error | null
  /** Function to refresh data */
  refresh: () => Promise<void>
}

/**
 * Build signed by list from signatures object
 */
function buildSignedByList(signatures: Record<string, unknown> | undefined): string[] {
  if (!signatures) return []

  const signedBy: string[] = []
  if (signatures.parent) signedBy.push('Parent')
  if (signatures.coParent) signedBy.push('Co-Parent')
  if (signatures.child) signedBy.push('Child')

  return signedBy
}

/**
 * Custom hook to fetch active agreement for dashboard
 *
 * @param params - Family ID
 * @returns Active agreement data, loading state, error, and refresh function
 */
export function useActiveAgreement({
  familyId,
}: UseActiveAgreementParams): UseActiveAgreementReturn {
  const [agreement, setAgreement] = useState<ActiveAgreementData | null>(null)
  const [pendingAgreement, setPendingAgreement] = useState<ActiveAgreementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAgreements = useCallback(async () => {
    if (!familyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const agreementsRef = collection(db, 'families', familyId, 'agreements')

      // Query for active agreement
      const activeQuery = query(
        agreementsRef,
        where('status', '==', 'active'),
        limit(1)
      )
      const activeSnapshot = await getDocs(activeQuery)

      if (!activeSnapshot.empty) {
        const doc = activeSnapshot.docs[0]
        const data = doc.data()
        setAgreement({
          id: doc.id,
          status: data.status as AgreementStatus,
          version: data.version || '1.0',
          activatedAt: data.activatedAt?.toDate?.()?.toISOString() || data.activatedAt,
          termsCount: data.terms?.length || 0,
          signedBy: buildSignedByList(data.signatures),
          signingStatus: data.signingStatus || 'pending',
        })
      } else {
        setAgreement(null)
      }

      // Query for pending agreement (most recent that needs signatures)
      const pendingQuery = query(
        agreementsRef,
        where('status', '==', 'pending_signatures'),
        orderBy('createdAt', 'desc'),
        limit(1)
      )
      const pendingSnapshot = await getDocs(pendingQuery)

      if (!pendingSnapshot.empty) {
        const doc = pendingSnapshot.docs[0]
        const data = doc.data()
        setPendingAgreement({
          id: doc.id,
          status: data.status as AgreementStatus,
          version: data.version || '1.0',
          activatedAt: undefined,
          termsCount: data.terms?.length || 0,
          signedBy: buildSignedByList(data.signatures),
          signingStatus: data.signingStatus || 'pending',
        })
      } else {
        setPendingAgreement(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agreement'))
      setAgreement(null)
      setPendingAgreement(null)
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    fetchAgreements()
  }, [fetchAgreements])

  return {
    agreement,
    pendingAgreement,
    loading,
    error,
    refresh: fetchAgreements,
  }
}

export default useActiveAgreement
