/**
 * useProposalResponse Hook - Story 34.3, 34.5.1
 *
 * Hook for responding to agreement change proposals.
 * Supports accept, decline, and counter-propose actions.
 *
 * Story 34.5.1: Integrates with rejection pattern tracking for child proposals.
 */

import { useState, useCallback } from 'react'
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { ProposalChange } from '@fledgely/shared'
import { handleChildProposalRejection } from '../services/agreementProposalService'

export interface UseProposalResponseProps {
  familyId: string
  proposalId: string
  responderId: string
  responderName: string
  /** Story 34.5.1: Child ID if this is a child's proposal */
  childId?: string
  /** Story 34.5.1: Whether this proposal was made by a child */
  isChildProposal?: boolean
}

export interface UseProposalResponseReturn {
  isSubmitting: boolean
  error: string | null
  acceptProposal: (comment: string | null) => Promise<string>
  declineProposal: (comment: string) => Promise<string>
  createCounterProposal: (counterChanges: ProposalChange[], comment: string) => Promise<string>
}

export function useProposalResponse(props: UseProposalResponseProps): UseProposalResponseReturn {
  const { familyId, proposalId, responderId, responderName, childId, isChildProposal } = props

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Save response to the responses subcollection
   */
  const saveResponse = useCallback(
    async (
      action: 'accept' | 'decline' | 'counter',
      comment: string | null,
      counterChanges: ProposalChange[] | null = null
    ): Promise<string> => {
      const db = getFirestoreDb()
      const responsesRef = collection(
        db,
        'families',
        familyId,
        'agreementProposals',
        proposalId,
        'responses'
      )

      const responseData = {
        proposalId,
        responderId,
        responderName,
        action,
        comment,
        counterChanges,
        createdAt: serverTimestamp(),
      }

      const responseDoc = await addDoc(responsesRef, responseData)
      return responseDoc.id
    },
    [familyId, proposalId, responderId, responderName]
  )

  /**
   * Update proposal status
   */
  const updateProposalStatus = useCallback(
    async (status: 'accepted' | 'declined' | 'counter-proposed'): Promise<void> => {
      const db = getFirestoreDb()
      const proposalRef = doc(db, 'families', familyId, 'agreementProposals', proposalId)

      await updateDoc(proposalRef, {
        status,
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    [familyId, proposalId]
  )

  /**
   * Accept the proposal
   * AC2: Accept option
   */
  const acceptProposal = useCallback(
    async (comment: string | null): Promise<string> => {
      setIsSubmitting(true)
      setError(null)

      try {
        // Update proposal status first
        await updateProposalStatus('accepted')

        // Save response to subcollection
        const responseId = await saveResponse('accept', comment)

        return responseId
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to accept proposal'
        setError(errorMessage)
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [updateProposalStatus, saveResponse]
  )

  /**
   * Decline the proposal
   * AC2: Decline option
   * AC4: Comment required for decline
   *
   * Story 34.5.1: Track rejection pattern when declining child's proposal
   */
  const declineProposal = useCallback(
    async (comment: string): Promise<string> => {
      setIsSubmitting(true)
      setError(null)

      try {
        // Update proposal status first
        await updateProposalStatus('declined')

        // Save response to subcollection
        const responseId = await saveResponse('decline', comment)

        // Story 34.5.1: Track rejection pattern for child proposals
        if (isChildProposal && childId) {
          await handleChildProposalRejection({
            familyId,
            childId,
            proposalId,
          })
        }

        return responseId
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to decline proposal'
        setError(errorMessage)
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [updateProposalStatus, saveResponse, isChildProposal, childId, familyId, proposalId]
  )

  /**
   * Create a counter-proposal
   * AC3: Counter-proposal flow
   * AC4: Comment required for counter
   * AC6: Multiple rounds supported
   */
  const createCounterProposal = useCallback(
    async (counterChanges: ProposalChange[], comment: string): Promise<string> => {
      setIsSubmitting(true)
      setError(null)

      try {
        // Update original proposal status
        await updateProposalStatus('counter-proposed')

        // Save response with counter-changes to subcollection
        const responseId = await saveResponse('counter', comment, counterChanges)

        return responseId
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create counter-proposal'
        setError(errorMessage)
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [updateProposalStatus, saveResponse]
  )

  return {
    isSubmitting,
    error,
    acceptProposal,
    declineProposal,
    createCounterProposal,
  }
}
