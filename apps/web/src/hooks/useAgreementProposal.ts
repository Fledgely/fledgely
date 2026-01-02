/**
 * useAgreementProposal Hook - Story 34.1, 34.5.1
 *
 * Hook for creating and managing agreement change proposals.
 * Supports parent-initiated proposals with real-time status sync.
 *
 * Story 34.5.1: Tracks child proposal submissions for communication metrics.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { ProposalChange, AgreementProposal } from '@fledgely/shared'
import { handleChildProposalSubmission } from '../services/agreementProposalService'

export interface UseAgreementProposalProps {
  familyId: string
  childId: string
  agreementId: string
  proposerId: string
  proposerName: string
  proposedBy: 'parent' | 'child'
}

export interface UseAgreementProposalReturn {
  loading: boolean
  error: string | null
  pendingProposal: AgreementProposal | null
  createProposal: (changes: ProposalChange[], reason: string | null) => Promise<string>
  withdrawProposal: (proposalId: string) => Promise<void>
}

export function useAgreementProposal(props: UseAgreementProposalProps): UseAgreementProposalReturn {
  const { familyId, childId, agreementId, proposerId, proposerName, proposedBy } = props

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingProposal, setPendingProposal] = useState<AgreementProposal | null>(null)

  // Subscribe to pending proposals for this agreement
  useEffect(() => {
    const db = getFirestoreDb()
    const proposalsRef = collection(db, 'families', familyId, 'agreementProposals')
    const pendingQuery = query(
      proposalsRef,
      where('agreementId', '==', agreementId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      pendingQuery,
      (snapshot) => {
        if (snapshot.docs.length > 0) {
          const docData = snapshot.docs[0]
          setPendingProposal({
            id: docData.id,
            ...docData.data(),
          } as AgreementProposal)
        } else {
          setPendingProposal(null)
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, agreementId])

  // Create a new proposal
  const createProposal = useCallback(
    async (changes: ProposalChange[], reason: string | null): Promise<string> => {
      const db = getFirestoreDb()
      const proposalsRef = collection(db, 'families', familyId, 'agreementProposals')

      // Query for the highest proposal number to calculate the next sequential number
      const maxQuery = query(proposalsRef, orderBy('proposalNumber', 'desc'), limit(1))
      const maxSnapshot = await getDocs(maxQuery)

      const nextProposalNumber = maxSnapshot.empty
        ? 1
        : (maxSnapshot.docs[0].data().proposalNumber || 0) + 1

      const proposalData = {
        familyId,
        childId,
        agreementId,
        proposedBy,
        proposerId,
        proposerName,
        changes,
        reason,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        respondedAt: null,
        version: 1,
        proposalNumber: nextProposalNumber,
      }

      const docRef = await addDoc(proposalsRef, proposalData)

      // Story 34.5.1: Track child proposal submissions for communication metrics
      if (proposedBy === 'child') {
        await handleChildProposalSubmission({
          familyId,
          childId,
          proposalId: docRef.id,
        })
      }

      return docRef.id
    },
    [familyId, childId, agreementId, proposedBy, proposerId, proposerName]
  )

  // Withdraw a proposal
  const withdrawProposal = useCallback(
    async (proposalId: string): Promise<void> => {
      const db = getFirestoreDb()
      const proposalRef = doc(db, 'families', familyId, 'agreementProposals', proposalId)

      await updateDoc(proposalRef, {
        status: 'withdrawn',
        updatedAt: serverTimestamp(),
      })
    },
    [familyId]
  )

  return {
    loading,
    error,
    pendingProposal,
    createProposal,
    withdrawProposal,
  }
}
