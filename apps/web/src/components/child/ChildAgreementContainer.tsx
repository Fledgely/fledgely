/**
 * ChildAgreementContainer Component - Story 19C.5
 *
 * Integration container that connects ChildAgreementView with
 * the ChangeRequestModal and submission logic.
 *
 * Task 6: Integrate with ChildAgreementView (AC: #1)
 */

import React, { useState, useCallback } from 'react'
import { ChildAgreementView } from './ChildAgreementView'
import { ChangeRequestModal } from './ChangeRequestModal'
import { useChangeRequest } from '../../hooks/useChangeRequest'
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
}

export function ChildAgreementContainer({
  agreement,
  loading = false,
  error = null,
  childId,
  childName,
  familyId,
  parentName,
}: ChildAgreementContainerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  return (
    <>
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
    </>
  )
}
