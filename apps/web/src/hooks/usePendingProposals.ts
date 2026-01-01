/**
 * usePendingProposals Hook - Story 34.1
 *
 * Hook for querying and subscribing to pending agreement proposals.
 * Returns all pending proposals for a family, optionally filtered by child.
 */

import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { AgreementProposal } from '@fledgely/shared'

export interface UsePendingProposalsProps {
  familyId: string
  childId?: string
}

export interface UsePendingProposalsReturn {
  loading: boolean
  error: string | null
  proposals: AgreementProposal[]
  count: number
}

export function usePendingProposals(props: UsePendingProposalsProps): UsePendingProposalsReturn {
  const { familyId, childId } = props

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [proposals, setProposals] = useState<AgreementProposal[]>([])

  // Subscribe to pending proposals
  useEffect(() => {
    const db = getFirestoreDb()
    const proposalsRef = collection(db, 'families', familyId, 'agreementProposals')

    // Build query - always filter by pending status
    const constraints = [where('status', '==', 'pending'), orderBy('createdAt', 'desc')]

    // Optionally filter by childId
    if (childId) {
      constraints.unshift(where('childId', '==', childId))
    }

    const pendingQuery = query(proposalsRef, ...constraints)

    const unsubscribe = onSnapshot(
      pendingQuery,
      (snapshot) => {
        const pendingProposals = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AgreementProposal[]

        setProposals(pendingProposals)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, childId])

  return {
    loading,
    error,
    proposals,
    count: proposals.length,
  }
}
