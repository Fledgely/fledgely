/**
 * useProposalCooldown Hook - Story 34.5
 *
 * Checks if a similar proposal was declined within 7 days.
 * AC4: 7-day cooldown for same change
 */

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export interface UseProposalCooldownProps {
  familyId: string
  childId: string
  sectionId: string
  fieldPath: string
}

export interface CooldownCheck {
  isOnCooldown: boolean
  daysRemaining: number
  cooldownEndDate: Date | null
  declinedProposalId: string | null
  isLoading: boolean
  error: string | null
}

/**
 * Hook to check if a proposal is on cooldown.
 *
 * "Same change" means identical sectionId AND fieldPath.
 * Cooldown is 7 days from the decline date.
 */
export function useProposalCooldown(props: UseProposalCooldownProps): CooldownCheck {
  const { familyId, childId, sectionId, fieldPath } = props

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cooldownState, setCooldownState] = useState<{
    isOnCooldown: boolean
    daysRemaining: number
    cooldownEndDate: Date | null
    declinedProposalId: string | null
  }>({
    isOnCooldown: false,
    daysRemaining: 0,
    cooldownEndDate: null,
    declinedProposalId: null,
  })

  useEffect(() => {
    let isCancelled = false

    async function checkCooldown() {
      setIsLoading(true)
      setError(null)

      try {
        const db = getFirestoreDb()
        const proposalsRef = collection(db, 'families', familyId, 'agreementProposals')

        // Query for declined proposals for this child
        const q = query(
          proposalsRef,
          where('childId', '==', childId),
          where('status', '==', 'declined')
        )

        const snapshot = await getDocs(q)

        if (isCancelled) return

        if (snapshot.docs.length === 0) {
          setCooldownState({
            isOnCooldown: false,
            daysRemaining: 0,
            cooldownEndDate: null,
            declinedProposalId: null,
          })
          return
        }

        // Find matching proposals (same section + field) declined within 7 days
        const now = Date.now()
        let mostRecentMatch: {
          id: string
          declinedAt: number
        } | null = null

        for (const doc of snapshot.docs) {
          const data = doc.data()
          const changes = data.changes || []
          const respondedAt = data.respondedAt?.toMillis?.() || 0

          // Check if any change matches our section + field
          const hasMatchingChange = changes.some(
            (change: { sectionId: string; fieldPath: string }) =>
              change.sectionId === sectionId && change.fieldPath === fieldPath
          )

          if (hasMatchingChange) {
            // Check if this is within cooldown period
            const timeSinceDecline = now - respondedAt
            if (timeSinceDecline < SEVEN_DAYS_MS) {
              // Track most recent match
              if (!mostRecentMatch || respondedAt > mostRecentMatch.declinedAt) {
                mostRecentMatch = {
                  id: doc.id,
                  declinedAt: respondedAt,
                }
              }
            }
          }
        }

        if (isCancelled) return

        if (mostRecentMatch) {
          const cooldownEndMs = mostRecentMatch.declinedAt + SEVEN_DAYS_MS
          const msRemaining = cooldownEndMs - now
          const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000))

          setCooldownState({
            isOnCooldown: true,
            daysRemaining,
            cooldownEndDate: new Date(cooldownEndMs),
            declinedProposalId: mostRecentMatch.id,
          })
        } else {
          setCooldownState({
            isOnCooldown: false,
            daysRemaining: 0,
            cooldownEndDate: null,
            declinedProposalId: null,
          })
        }
      } catch (err) {
        if (isCancelled) return
        const errorMessage = err instanceof Error ? err.message : 'Failed to check cooldown'
        setError(errorMessage)
        setCooldownState({
          isOnCooldown: false,
          daysRemaining: 0,
          cooldownEndDate: null,
          declinedProposalId: null,
        })
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    checkCooldown()

    return () => {
      isCancelled = true
    }
  }, [familyId, childId, sectionId, fieldPath])

  return {
    ...cooldownState,
    isLoading,
    error,
  }
}
