/**
 * ChildAgreementContainer Component - Story 19C.5 + Story 34.5.2 Task 7
 *
 * Integration container that connects ChildAgreementView with
 * the ChangeRequestModal, submission logic, and escalation prompts.
 *
 * Task 6: Integrate with ChildAgreementView (AC: #1)
 * Story 34.5.2 Task 7: Add escalation prompt integration
 */

import React, { useState, useCallback } from 'react'
import { ChildAgreementView } from './ChildAgreementView'
import { ChangeRequestModal } from './ChangeRequestModal'
import { useChangeRequest } from '../../hooks/useChangeRequest'
import { useEscalationStatus } from '../../hooks/useEscalationStatus'
import { EscalationPrompt, MediationResourcesModal } from '../escalation'
import { getAgeTier } from '@fledgely/shared/services/mediationResourceService'
import type { ChildAgreement } from '../../hooks/useChildAgreement'
import type { ChangeRequestData } from './ChangeRequestForm'

interface ChildAgreementContainerProps {
  /** The agreement to display */
  agreement: ChildAgreement | null
  /** Loading state */
  loading?: boolean
  /** Error message */
  error?: string | null
  /** Child's user ID */
  childId: string
  /** Child's display name */
  childName: string
  /** Family ID */
  familyId: string
  /** Parent's name for confirmation message */
  parentName: string
  /** Child's birth date for age-appropriate content (Story 34.5.2) */
  childBirthDate?: Date
}

export function ChildAgreementContainer({
  agreement,
  loading = false,
  error = null,
  childId,
  childName,
  familyId,
  parentName,
  childBirthDate,
}: ChildAgreementContainerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isResourcesModalOpen, setIsResourcesModalOpen] = useState(false)

  // Use the change request hook for submission handling
  const {
    submit,
    isSubmitting,
    error: submitError,
    reset: resetSubmitState,
  } = useChangeRequest({
    childId,
    childName,
    familyId,
    agreementId: agreement?.id || '',
  })

  // Story 34.5.2: Use escalation status hook
  const { status: escalationStatus, acknowledgeEscalation } = useEscalationStatus(familyId, childId)

  // Calculate age tier for content adaptation
  const ageTier = childBirthDate ? getAgeTier(childBirthDate) : 'tween-12-14' // Default to middle tier if birthdate unknown

  // Open the modal when "Request a Change" is clicked (Task 6.1)
  const handleRequestChange = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  // Close modal and reset state
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    resetSubmitState()
  }, [resetSubmitState])

  // Handle form submission (Task 6.2, 6.3)
  const handleSubmitRequest = useCallback(
    async (data: ChangeRequestData) => {
      await submit(data)
    },
    [submit]
  )

  // Story 34.5.2: Handle escalation acknowledgment
  const handleAcknowledgeEscalation = useCallback(async () => {
    await acknowledgeEscalation()
  }, [acknowledgeEscalation])

  // Story 34.5.2: Open resources modal
  const handleViewResources = useCallback(() => {
    setIsResourcesModalOpen(true)
  }, [])

  // Story 34.5.2: Close resources modal
  const handleCloseResourcesModal = useCallback(() => {
    setIsResourcesModalOpen(false)
  }, [])

  // Story 34.5.2: Show escalation prompt if active and not acknowledged
  const showEscalationPrompt =
    escalationStatus?.hasActiveEscalation && !escalationStatus?.isAcknowledged

  return (
    <>
      {/* Story 34.5.2: Escalation prompt */}
      {showEscalationPrompt && (
        <div data-testid="escalation-prompt-container" style={{ marginBottom: '16px' }}>
          <EscalationPrompt
            childId={childId}
            familyId={familyId}
            ageTier={ageTier}
            onAcknowledge={handleAcknowledgeEscalation}
            onViewResources={handleViewResources}
          />
        </div>
      )}

      <ChildAgreementView
        agreement={agreement}
        loading={loading}
        error={error}
        onRequestChange={handleRequestChange}
        childName={childName}
      />

      <ChangeRequestModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        parentName={parentName}
        onSubmitRequest={handleSubmitRequest}
        isSubmitting={isSubmitting}
        error={submitError}
      />

      {/* Story 34.5.2: Mediation resources modal */}
      <MediationResourcesModal
        isOpen={isResourcesModalOpen}
        onClose={handleCloseResourcesModal}
        ageTier={ageTier}
        childName={childName}
      />
    </>
  )
}
