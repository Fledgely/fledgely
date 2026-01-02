/**
 * useAgreementProposal Hook - Story 34.1, 34.5.1, 3A.3
 *
 * Hook for creating and managing agreement change proposals.
 * Supports parent-initiated proposals with real-time status sync.
 *
 * Story 34.5.1: Tracks child proposal submissions for communication metrics.
 * Story 3A.3: Checks for shared custody and requires co-parent approval.
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
import {
  handleChildProposalSubmission,
  createCoParentApprovalNotification,
} from '../services/agreementProposalService'
import {
  requiresCoParentApproval,
  calculateExpirationDate,
} from '../services/coParentProposalApprovalService'

export interface UseAgreementProposalProps {
  familyId: string
  childId: string
  childName: string
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
  const { familyId, childId, childName, agreementId, proposerId, proposerName, proposedBy } = props

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingProposal, setPendingProposal] = useState<AgreementProposal | null>(null)

  // Subscribe to pending proposals for this agreement
  // Story 3A.3: Include both 'pending' and 'pending_coparent_approval' statuses
  useEffect(() => {
    const db = getFirestoreDb()
    const proposalsRef = collection(db, 'families', familyId, 'agreementProposals')
    const pendingQuery = query(
      proposalsRef,
      where('agreementId', '==', agreementId),
      where('status', 'in', ['pending', 'pending_coparent_approval']),
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
  // Story 3A.3: Check if co-parent approval is required for shared custody
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

      // Story 3A.3: Check if co-parent approval is required (shared custody)
      // Only applies to parent-initiated proposals
      let coParentRequired = false
      let status: 'pending' | 'pending_coparent_approval' = 'pending'
      let expiresAt: number | null = null
      let coParentUid: string | null = null

      if (proposedBy === 'parent') {
        const coParentResult = await requiresCoParentApproval(childId, proposerId)
        if (coParentResult.required && coParentResult.otherParentUid) {
          coParentRequired = true
          coParentUid = coParentResult.otherParentUid
          status = 'pending_coparent_approval'
          expiresAt = calculateExpirationDate()
        }
      }

      const proposalData = {
        familyId,
        childId,
        agreementId,
        proposedBy,
        proposerId,
        proposerName,
        changes,
        reason,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        respondedAt: null,
        version: 1,
        proposalNumber: nextProposalNumber,
        // Story 3A.3: Co-parent approval fields
        coParentApprovalRequired: coParentRequired,
        coParentApprovalStatus: coParentRequired ? 'pending' : null,
        coParentApprovedByUid: null,
        coParentApprovedAt: null,
        coParentDeclineReason: null,
        expiresAt,
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

      // Story 3A.3: Notify co-parent when approval is required
      if (coParentRequired && coParentUid) {
        const changeSummary =
          changes.length === 1
            ? `Change to ${changes[0].sectionName}`
            : `${changes.length} proposed changes`
        await createCoParentApprovalNotification({
          familyId,
          proposalId: docRef.id,
          coParentUid,
          proposerName,
          childName,
          changeSummary,
        })
      }

      return docRef.id
    },
    [familyId, childId, childName, agreementId, proposedBy, proposerId, proposerName]
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
