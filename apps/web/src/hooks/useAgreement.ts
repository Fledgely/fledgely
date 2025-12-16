'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  AgreementStatus,
  AgreementSignatures,
} from '@fledgely/contracts'

/**
 * useAgreement Hook
 *
 * Story 6.3: Agreement Activation - Task 6
 *
 * Fetches and manages agreement data for display on the detail page.
 */

/**
 * Agreement term data
 */
export interface AgreementTerm {
  id: string
  type: string
  content: {
    title?: string
    childCommitment?: string
    parentCommitment?: string
  }
}

/**
 * Full agreement data
 */
export interface AgreementData {
  id: string
  status: AgreementStatus
  version: string
  activatedAt?: string
  archivedAt?: string
  archiveReason?: string
  supersededBy?: string
  signingStatus: string
  signatures?: AgreementSignatures
  terms?: AgreementTerm[]
}

/**
 * Hook parameters
 */
export interface UseAgreementParams {
  familyId: string
  agreementId: string
}

/**
 * Hook return type
 */
export interface UseAgreementReturn {
  agreement: AgreementData | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Custom hook to fetch and manage agreement data
 *
 * @param params - Family ID and agreement ID
 * @returns Agreement data, loading state, error, and refresh function
 */
export function useAgreement({
  familyId,
  agreementId,
}: UseAgreementParams): UseAgreementReturn {
  const [agreement, setAgreement] = useState<AgreementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAgreement = async () => {
    if (!familyId || !agreementId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const docRef = doc(db, 'families', familyId, 'agreements', agreementId)
      const snapshot = await getDoc(docRef)

      if (!snapshot.exists()) {
        setError(new Error('Agreement not found'))
        setAgreement(null)
      } else {
        const data = snapshot.data()
        setAgreement({
          id: snapshot.id,
          status: data.status || 'draft',
          version: data.version || '1.0',
          activatedAt: data.activatedAt?.toDate?.()?.toISOString() || data.activatedAt,
          archivedAt: data.archivedAt?.toDate?.()?.toISOString() || data.archivedAt,
          archiveReason: data.archiveReason,
          supersededBy: data.supersededBy,
          signingStatus: data.signingStatus || 'pending',
          signatures: data.signatures,
          terms: data.terms || [],
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agreement'))
      setAgreement(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgreement()
  }, [familyId, agreementId])

  return {
    agreement,
    loading,
    error,
    refresh: fetchAgreement,
  }
}

export default useAgreement
