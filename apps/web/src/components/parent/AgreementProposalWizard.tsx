/**
 * AgreementProposalWizard Component - Story 34.1 (AC1-4)
 *
 * Multi-step wizard for creating agreement change proposals.
 * Steps: 1) Select sections → 2) Make changes → 3) Add reason → 4) Review & submit
 */

import { useState, useCallback } from 'react'
import { AGREEMENT_PROPOSAL_MESSAGES, type ProposalChange } from '@fledgely/shared'
import { useAgreementProposal } from '../../hooks/useAgreementProposal'
import { AgreementSectionSelector, type AgreementSection } from './AgreementSectionSelector'
import { AgreementDiffView } from '../shared/AgreementDiffView'

interface AgreementProposalWizardProps {
  sections: AgreementSection[]
  agreementData: Record<string, unknown>
  familyId: string
  childId: string
  childName: string
  agreementId: string
  proposerId: string
  proposerName: string
  onComplete: (proposalId: string) => void
  onCancel: () => void
}

const STEPS = ['Select Sections', 'Make Changes', 'Add Reason', 'Review & Submit']

export function AgreementProposalWizard({
  sections,
  agreementData: _agreementData,
  familyId,
  childId,
  childName,
  agreementId,
  proposerId,
  proposerName,
  onComplete,
  onCancel,
}: AgreementProposalWizardProps) {
  // Note: _agreementData will be used in full implementation for editing values
  void _agreementData

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([])
  const [changes, setChanges] = useState<ProposalChange[]>([])
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Note: setChanges will be used in full implementation for editing
  void setChanges

  const { createProposal } = useAgreementProposal({
    familyId,
    childId,
    agreementId,
    proposerId,
    proposerName,
    proposedBy: 'parent',
  })

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0:
        return selectedSectionIds.length > 0
      case 1:
        return true // Can proceed even without changes
      case 2:
        return true // Reason is optional
      case 3:
        return true // Review step
      default:
        return false
    }
  }, [currentStep, selectedSectionIds])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const proposalId = await createProposal(changes, reason || null)
      onComplete(proposalId)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create proposal. Please try again.'
      setSubmitError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div>
            <h3 style={{ marginBottom: 16, color: '#334155' }}>Select Sections to Modify</h3>
            <p style={{ marginBottom: 20, color: '#64748b' }}>
              Choose which parts of the agreement you&apos;d like to propose changes to.
            </p>
            <AgreementSectionSelector
              sections={sections}
              selectedIds={selectedSectionIds}
              onSelectionChange={setSelectedSectionIds}
            />
          </div>
        )

      case 1:
        return (
          <div>
            <h3 style={{ marginBottom: 16, color: '#334155' }}>Make Changes</h3>
            <p style={{ marginBottom: 20, color: '#64748b' }}>
              Edit the values you&apos;d like to change. Your proposed changes will be shown to{' '}
              {childName}.
            </p>
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: 20,
                color: '#64748b',
              }}
            >
              {selectedSectionIds.map((sectionId) => {
                const section = sections.find((s) => s.id === sectionId)
                return (
                  <div key={sectionId} style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                      {section?.name}
                    </div>
                    <div style={{ fontSize: 14 }}>
                      Current values for {section?.name.toLowerCase()} editing will be available in
                      full implementation.
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case 2:
        return (
          <div>
            <h3 style={{ marginBottom: 16, color: '#334155' }}>Add a Reason (Optional)</h3>
            <p style={{ marginBottom: 20, color: '#64748b' }}>
              Help {childName} understand why you&apos;re proposing this change. Positive framing
              works best!
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., You've been responsible with gaming time this month..."
              style={{
                width: '100%',
                minHeight: 100,
                padding: 16,
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                fontSize: 16,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
                Suggested prompts:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AGREEMENT_PROPOSAL_MESSAGES.reasonPrompts.slice(0, 3).map((prompt, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setReason(prompt)}
                    style={{
                      padding: '8px 12px',
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#16a34a',
                      cursor: 'pointer',
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div>
            <h3 style={{ marginBottom: 16, color: '#334155' }}>Review Your Proposal</h3>
            <p style={{ marginBottom: 20, color: '#64748b' }}>
              {childName} will receive a notification about this proposal.
            </p>

            {changes.length > 0 ? (
              <AgreementDiffView changes={changes} />
            ) : (
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 16,
                  color: '#64748b',
                }}
              >
                No specific changes to preview.
              </div>
            )}

            {reason && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Your reason:</div>
                <div
                  style={{
                    background: '#f0fdf4',
                    padding: 16,
                    borderRadius: 12,
                    color: '#16a34a',
                  }}
                >
                  &quot;{reason}&quot;
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Step indicator */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#6366f1' }}>
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {STEPS.map((_, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: index <= currentStep ? '#6366f1' : '#e2e8f0',
              }}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div style={{ marginBottom: 24 }}>{renderStepContent()}</div>

      {/* Error display */}
      {submitError && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            color: '#dc2626',
            marginBottom: 16,
          }}
        >
          {submitError}
        </div>
      )}

      {/* Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Cancel
        </button>

        <div style={{ display: 'flex', gap: 12 }}>
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                color: '#334155',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Back
            </button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              style={{
                padding: '12px 24px',
                background: canProceed() ? '#6366f1' : '#e2e8f0',
                border: 'none',
                borderRadius: 8,
                color: canProceed() ? '#fff' : '#94a3b8',
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                background: '#16a34a',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                cursor: isSubmitting ? 'wait' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
