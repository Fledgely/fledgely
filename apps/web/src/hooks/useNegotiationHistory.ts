/**
 * useNegotiationHistory Hook - Story 34.3
 *
 * Hook for fetching and displaying negotiation history.
 * Provides proposal chain, responses, and timeline view.
 */

import { useState, useEffect, useMemo } from 'react'
import { collection, doc, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { ProposalChange } from '@fledgely/shared'

/**
 * Proposal data structure
 */
export interface NegotiationProposal {
  id: string
  familyId: string
  childId: string
  agreementId: string
  proposedBy: 'parent' | 'child'
  proposerId: string
  proposerName: string
  changes: ProposalChange[]
  reason: string | null
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'counter-proposed'
  createdAt: number
  updatedAt: number
  respondedAt: number | null
  version: number
  proposalNumber: number
  parentProposalId?: string // For counter-proposals
}

/**
 * Response data structure
 */
export interface NegotiationResponse {
  id: string
  proposalId: string
  responderId: string
  responderName: string
  action: 'accept' | 'decline' | 'counter'
  comment: string | null
  counterChanges: ProposalChange[] | null
  createdAt: number
}

/**
 * Timeline entry for unified display
 */
export interface TimelineEntry {
  id: string
  type: 'proposal' | 'response'
  actorName: string
  actorId: string
  action?: 'accept' | 'decline' | 'counter'
  comment?: string | null
  changes?: ProposalChange[]
  timestamp: number
}

export interface UseNegotiationHistoryProps {
  familyId: string
  proposalId: string
}

export interface UseNegotiationHistoryReturn {
  loading: boolean
  error: string | null
  proposal: NegotiationProposal | null
  responses: NegotiationResponse[]
  timeline: TimelineEntry[]
  currentRound: number
}

export function useNegotiationHistory(
  props: UseNegotiationHistoryProps
): UseNegotiationHistoryReturn {
  const { familyId, proposalId } = props

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<NegotiationProposal | null>(null)
  const [responses, setResponses] = useState<NegotiationResponse[]>([])

  // Load proposal data
  useEffect(() => {
    const loadProposal = async () => {
      try {
        const db = getFirestoreDb()
        const proposalRef = doc(db, 'families', familyId, 'agreementProposals', proposalId)
        const proposalSnapshot = await getDoc(proposalRef)

        if (!proposalSnapshot.exists()) {
          setError('Proposal not found')
          setProposal(null)
        } else {
          setProposal({
            id: proposalSnapshot.id,
            ...proposalSnapshot.data(),
          } as NegotiationProposal)
          setError(null)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load proposal'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadProposal()
  }, [familyId, proposalId])

  // Subscribe to responses in real-time
  useEffect(() => {
    const db = getFirestoreDb()
    const responsesRef = collection(
      db,
      'families',
      familyId,
      'agreementProposals',
      proposalId,
      'responses'
    )
    const responsesQuery = query(responsesRef, orderBy('createdAt', 'asc'))

    const unsubscribe = onSnapshot(
      responsesQuery,
      (snapshot) => {
        const loadedResponses: NegotiationResponse[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NegotiationResponse[]

        setResponses(loadedResponses)
      },
      (err) => {
        setError(err.message)
      }
    )

    return () => unsubscribe()
  }, [familyId, proposalId])

  /**
   * Build timeline from proposal and responses
   * AC5: Negotiation history visible to both parties
   */
  const timeline = useMemo((): TimelineEntry[] => {
    const entries: TimelineEntry[] = []

    // Add proposal as first entry
    if (proposal) {
      entries.push({
        id: proposal.id,
        type: 'proposal',
        actorName: proposal.proposerName,
        actorId: proposal.proposerId,
        changes: proposal.changes,
        comment: proposal.reason,
        timestamp: proposal.createdAt,
      })
    }

    // Add responses
    for (const response of responses) {
      entries.push({
        id: response.id,
        type: 'response',
        actorName: response.responderName,
        actorId: response.responderId,
        action: response.action,
        comment: response.comment,
        changes: response.counterChanges || undefined,
        timestamp: response.createdAt,
      })
    }

    // Sort by timestamp
    entries.sort((a, b) => a.timestamp - b.timestamp)

    return entries
  }, [proposal, responses])

  /**
   * Calculate current negotiation round
   * AC6: Round number displayed (e.g., "Round 2 of negotiation")
   */
  const currentRound = useMemo((): number => {
    // Start with round 1 (initial proposal)
    let round = 1

    // Each counter-proposal increments the round
    for (const response of responses) {
      if (response.action === 'counter') {
        round++
      }
    }

    return round
  }, [responses])

  return {
    loading,
    error,
    proposal,
    responses,
    timeline,
    currentRound,
  }
}
