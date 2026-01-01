/**
 * ChildAgreementProposalWizard Component - Story 34.2 (AC1-3)
 *
 * Child-focused multi-step wizard for creating agreement change proposals.
 * Uses child-friendly language and requires reason input (unlike parent).
 * Steps: 1) Select sections → 2) Make changes → 3) Add reason (required) → 4) Review & submit
 */

import { useState, useCallback } from 'react'
import { CHILD_PROPOSAL_MESSAGES, type ProposalChange } from '@fledgely/shared'
import { useAgreementProposal } from '../../hooks/useAgreementProposal'
import { AgreementSectionSelector, type AgreementSection } from '../parent/AgreementSectionSelector'
import { AgreementDiffView } from '../shared/AgreementDiffView'

interface ChildAgreementProposalWizardProps {
  sections: AgreementSection[]
  agreementData: Record<string, unknown>
  familyId: string
  childId: string
  agreementId: string
  userId: string
  childName: string
  parentNames: string[]
  onComplete: (proposalId: string) => void
  onCancel: () => void
}

const STEPS = ['Pick Sections', 'Make Changes', 'Tell Why', 'Send It!']

export function ChildAgreementProposalWizard({
  sections,
  agreementData: _agreementData,
  familyId,
  childId,
  agreementId,
  userId,
  childName,
  parentNames,
  onComplete,
  onCancel,
}: ChildAgreementProposalWizardProps) {
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
    proposerId: userId,
    proposerName: childName,
    proposedBy: 'child',
  })

  // Format parent names for display
  const formatParentNames = () => {
    if (parentNames.length === 0) return 'your parents'
    if (parentNames.length === 1) return parentNames[0]
    if (parentNames.length === 2) return `${parentNames[0]} and ${parentNames[1]}`
    return parentNames.slice(0, -1).join(', ') + ', and ' + parentNames[parentNames.length - 1]
  }

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0:
        return selectedSectionIds.length > 0
      case 1:
        return true // Can proceed even without changes
      case 2:
        return reason.trim().length > 0 // Reason is REQUIRED for child
      case 3:
        return true // Review step
      default:
        return false
    }
  }, [currentStep, selectedSectionIds, reason])

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
      const proposalId = await createProposal(changes, reason)
      onComplete(proposalId)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Oops! Something went wrong. Please try again.'
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
            <h3 style={{ marginBottom: 16, color: '#334155' }}>What would you like to change?</h3>
            <p style={{ marginBottom: 20, color: '#64748b' }}>
              Pick the parts of your agreement you want to talk about with {formatParentNames()}.
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
            <h3 style={{ marginBottom: 16, color: '#334155' }}>Make Your Changes</h3>
            <p style={{ marginBottom: 20, color: '#64748b' }}>
              What would you like to change? Show {formatParentNames()} what you&apos;re thinking.
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
                      You can change {section?.name.toLowerCase()} settings here in the full
                      version.
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
            <h3 style={{ marginBottom: 16, color: '#334155' }}>Tell Your Parents Why</h3>
            <p style={{ marginBottom: 20, color: '#64748b' }}>
              {CHILD_PROPOSAL_MESSAGES.encouragement}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., I want more gaming time because..."
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
                Need ideas? Try one of these:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CHILD_PROPOSAL_MESSAGES.reasonPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setReason(prompt)}
                    style={{
                      padding: '8px 12px',
                      background: '#eff6ff',
                      border: '1px solid #93c5fd',
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#2563eb',
                      cursor: 'pointer',
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            {reason.trim().length === 0 && (
              <p style={{ marginTop: 12, fontSize: 13, color: '#f97316' }}>
                Please add a reason before continuing.
              </p>
            )}
          </div>
        )

      case 3:
        return (
          <div>
            <h3 style={{ marginBottom: 16, color: '#334155' }}>Review Your Request</h3>
            <p style={{ marginBottom: 20, color: '#64748b' }}>
              {formatParentNames()} will get a notification about your request.
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
                Your changes will appear here.
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Your reason:</div>
              <div
                style={{
                  background: '#eff6ff',
                  padding: 16,
                  borderRadius: 12,
                  color: '#2563eb',
                }}
              >
                &quot;{reason}&quot;
              </div>
            </div>
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
          <span style={{ fontSize: 14, fontWeight: 600, color: '#2563eb' }}>
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
                background: index <= currentStep ? '#2563eb' : '#e2e8f0',
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
                background: canProceed() ? '#2563eb' : '#e2e8f0',
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
              {isSubmitting ? 'Sending...' : 'Send to Parents'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
