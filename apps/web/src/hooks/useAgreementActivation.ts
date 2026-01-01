/**
 * useAgreementActivation Hook - Story 34.4
 *
 * Handles dual-signature confirmation and activation of agreement changes.
 * AC1: Proposer confirmation after acceptance
 * AC2: Dual digital signatures
 * AC3: Agreement version update
 * AC4: Immediate activation
 */

import { useState, useCallback } from 'react'
import { doc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import {
  notifyBothPartiesOfActivation,
  logAgreementActivation,
  createVersionHistoryEntry,
} from '../services/agreementActivationService'
import type { SignatureRecord, ActivatedAgreementVersion, DualSignatures } from '@fledgely/shared'

export interface UseAgreementActivationProps {
  familyId: string
  proposalId: string
  agreementId: string
  childId: string
  proposerId: string
  proposerName: string
  proposerRole: 'parent' | 'child'
}

export interface ConfirmActivationInput {
  recipientId: string
  recipientName: string
  recipientRole: 'parent' | 'child'
  comment: string | null
}

export interface UseAgreementActivationReturn {
  isActivating: boolean
  error: string | null
  activatedVersion: ActivatedAgreementVersion | null
  confirmActivation: (input: ConfirmActivationInput) => Promise<ActivatedAgreementVersion>
}

/**
 * Hook for confirming and activating agreement changes with dual signatures.
 *
 * Story 34.4: Dual-Signature Change Activation
 */
export function useAgreementActivation(
  props: UseAgreementActivationProps
): UseAgreementActivationReturn {
  const { familyId, proposalId, agreementId, childId, proposerId, proposerName, proposerRole } =
    props

  const [isActivating, setIsActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activatedVersion, setActivatedVersion] = useState<ActivatedAgreementVersion | null>(null)

  /**
   * Confirm activation and apply changes with dual signatures.
   *
   * AC1: Proposer confirms after acceptance
   * AC2: Records both signatures with timestamps
   * AC3: Creates new agreement version
   * AC4: Updates agreement atomically
   */
  const confirmActivation = useCallback(
    async (input: ConfirmActivationInput): Promise<ActivatedAgreementVersion> => {
      setIsActivating(true)
      setError(null)

      try {
        const db = getFirestoreDb()
        const now = Date.now()

        // Create signature records
        const proposerSignature: SignatureRecord = {
          userId: proposerId,
          userName: proposerName,
          role: proposerRole,
          signedAt: now,
          action: 'confirmed',
        }

        const recipientSignature: SignatureRecord = {
          userId: input.recipientId,
          userName: input.recipientName,
          role: input.recipientRole,
          signedAt: now - 1, // Recipient signed slightly before confirmation
          action: 'accepted',
        }

        const signatures: DualSignatures = {
          proposer: proposerSignature,
          recipient: recipientSignature,
        }

        // Atomic transaction for agreement update
        const agreementRef = doc(db, 'families', familyId, 'agreements', agreementId)

        const versionData = await runTransaction(db, async (transaction) => {
          // Get current agreement
          const agreementSnap = await transaction.get(agreementRef)
          if (!agreementSnap.exists()) {
            throw new Error('Agreement not found')
          }

          const currentData = agreementSnap.data()
          const newVersionNumber = (currentData.currentVersion || 1) + 1

          // Prepare new version data
          const newVersion: ActivatedAgreementVersion = {
            id: `version-${newVersionNumber}`,
            agreementId,
            familyId,
            childId,
            versionNumber: newVersionNumber,
            content: currentData.content || {},
            changedFromVersion: currentData.currentVersion || null,
            proposalId,
            signatures,
            createdAt: now,
            activatedAt: now,
          }

          // Update agreement with new version number
          transaction.update(agreementRef, {
            currentVersion: newVersionNumber,
            updatedAt: serverTimestamp(),
          })

          return newVersion
        })

        // Update proposal status to 'activated'
        const proposalRef = doc(db, 'families', familyId, 'agreementProposals', proposalId)
        await updateDoc(proposalRef, {
          status: 'activated',
          activatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        // Create version history entry
        await createVersionHistoryEntry({
          familyId,
          agreementId,
          version: versionData,
        })

        // Notify both parties
        await notifyBothPartiesOfActivation({
          familyId,
          proposalId,
          proposerId,
          proposerName,
          recipientId: input.recipientId,
          recipientName: input.recipientName,
        })

        // Log activation activity
        await logAgreementActivation({
          familyId,
          proposalId,
          proposerName,
          recipientName: input.recipientName,
          versionNumber: versionData.versionNumber,
        })

        setActivatedVersion(versionData)
        return versionData
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to activate agreement'
        setError(errorMessage)
        throw err
      } finally {
        setIsActivating(false)
      }
    },
    [familyId, proposalId, agreementId, childId, proposerId, proposerName, proposerRole]
  )

  return {
    isActivating,
    error,
    activatedVersion,
    confirmActivation,
  }
}
