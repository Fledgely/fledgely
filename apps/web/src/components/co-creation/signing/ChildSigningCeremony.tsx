'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { type SignatureType, type SessionTerm, type AgreementSignature, isTypedSignatureValid, isDrawnSignatureValid } from '@fledgely/contracts'
import { SignaturePad } from './SignaturePad'
import { useStepAnnouncer } from '@/hooks/useStepAnnouncer'
import { v4 as uuidv4 } from 'uuid'

/**
 * ChildSigningCeremony Component Props
 */
export interface ChildSigningCeremonyProps {
  /** Agreement ID being signed */
  agreementId: string
  /** Child's name for personalization */
  childName: string
  /** Terms to display as key commitments */
  terms: SessionTerm[]
  /** Callback when signing is complete */
  onComplete: (signature: AgreementSignature) => void | Promise<void>
  /** Callback when user wants to go back */
  onBack: () => void
  /** Whether signing is in progress */
  isLoading?: boolean
}

/**
 * ChildSigningCeremony Component
 *
 * Story 6.1: Child Digital Signature Ceremony - Task 3
 *
 * A child-friendly signing ceremony screen that guides the child
 * through the process of signing their family agreement.
 *
 * Features:
 * - Child-friendly introduction with encouraging messaging (Task 3.2)
 * - Key commitments summary before signing (Task 3.3)
 * - "I understand and agree" checkbox (Task 3.4)
 * - SignaturePad integration (Task 3.5)
 * - Submit button disabled until complete (Task 3.6)
 * - 6th-grade reading level text (NFR65)
 * - 44x44px touch targets (NFR49)
 *
 * @example
 * ```tsx
 * <ChildSigningCeremony
 *   agreementId="123..."
 *   childName="Alex"
 *   terms={agreementTerms}
 *   onComplete={(signature) => saveSignature(signature)}
 *   onBack={() => router.back()}
 * />
 * ```
 */
export function ChildSigningCeremony({
  agreementId,
  childName,
  terms,
  onComplete,
  onBack,
  isLoading = false,
}: ChildSigningCeremonyProps) {
  // Signature state
  const [signatureMode, setSignatureMode] = useState<SignatureType>('typed')
  const [signatureValue, setSignatureValue] = useState('')
  const [consentChecked, setConsentChecked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validate signature based on mode
  const isSignatureValid =
    signatureMode === 'typed'
      ? isTypedSignatureValid(signatureValue)
      : isDrawnSignatureValid(signatureValue)

  // Accessibility: Step announcer for screen readers (Story 6.7)
  const { announceStep, announceMessage, AnnouncerRegion } = useStepAnnouncer()

  // Track current step for announcements
  const getCurrentStep = useCallback(() => {
    if (!consentChecked) return 1 // Review and consent
    if (!isSignatureValid) return 2 // Sign
    return 3 // Ready to submit
  }, [consentChecked, isSignatureValid])

  // Refs for focus management
  const headerRef = useRef<HTMLHeadingElement>(null)

  // Announce initial step on mount
  useEffect(() => {
    announceStep(1, 3, 'Review your commitments and check the consent box')
    // Auto-focus header for screen readers
    headerRef.current?.focus()
  }, [announceStep])

  // Announce step changes
  useEffect(() => {
    const step = getCurrentStep()
    if (step === 2 && consentChecked) {
      announceStep(2, 3, 'Add your signature')
    } else if (step === 3) {
      announceStep(3, 3, 'Ready to sign. Press the Sign button to complete.')
    }
  }, [consentChecked, isSignatureValid, getCurrentStep, announceStep])

  // Announce signature mode changes
  const handleSignatureModeChange = useCallback((mode: SignatureType) => {
    setSignatureMode(mode)
    const modeLabel = mode === 'typed' ? 'type your name' : 'draw your signature'
    announceMessage(`Signature mode changed to ${modeLabel}`)
  }, [announceMessage])

  // Can submit when checkbox is checked and signature is valid
  const canSubmit = consentChecked && isSignatureValid && !isSubmitting && !isLoading

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    setIsSubmitting(true)

    try {
      // Sanitize typed signature to remove control characters and normalize (Story 6.7 security fix)
      const sanitizedValue =
        signatureMode === 'typed'
          ? signatureValue.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control chars
          : signatureValue // Canvas data URLs are already validated by browser

      const signature: AgreementSignature = {
        agreementId,
        signature: {
          id: uuidv4(),
          type: signatureMode,
          value: sanitizedValue,
          signedBy: 'child',
          signedAt: new Date().toISOString(),
        },
        consentCheckboxChecked: true,
        commitmentsReviewed: true,
      }

      await onComplete(signature)
    } finally {
      setIsSubmitting(false)
    }
  }, [canSubmit, agreementId, signatureMode, signatureValue, onComplete])

  // Get accepted terms for display
  const acceptedTerms = terms.filter((term) => term.status === 'accepted')

  return (
    <div
      data-testid="signing-ceremony"
      className="max-w-2xl mx-auto px-4 py-8"
    >
      {/* Screen reader announcements (Story 6.7) */}
      <AnnouncerRegion />

      {/* Header */}
      <header className="text-center mb-8">
        <div
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
          aria-hidden="true"
        >
          <svg
            className="w-10 h-10 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1
          ref={headerRef}
          tabIndex={-1}
          className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 outline-none"
        >
          Time to Sign, {childName}!
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-300">
          This is a big moment! You are making a promise to your family.
        </p>

        {/* Take your time guidance (Story 6.7 AC #5) */}
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
          Take your time. There is no rush.
        </p>
      </header>

      {/* Key Commitments Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          What You Are Agreeing To
        </h2>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
          {acceptedTerms.length > 0 ? (
            acceptedTerms.map((term) => (
              <div
                key={term.id}
                className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {term.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {term.content}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No terms to display
            </p>
          )}
        </div>
      </section>

      {/* Consent Checkbox */}
      <section className="mb-8">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            disabled={isSubmitting || isLoading}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
            aria-describedby="consent-description"
          />
          <span className="text-gray-900 dark:text-gray-100">
            <span className="font-medium">I understand and agree</span>
            <span
              id="consent-description"
              className="block text-sm text-gray-600 dark:text-gray-400 mt-1"
            >
              I have read the agreement and I understand what I am agreeing to.
            </span>
          </span>
        </label>
      </section>

      {/* Signature Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Your Signature
        </h2>

        <SignaturePad
          mode={signatureMode}
          onModeChange={handleSignatureModeChange}
          value={signatureValue}
          onChange={setSignatureValue}
          childName={childName}
          disabled={isSubmitting || isLoading}
        />
      </section>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting || isLoading}
          aria-label="Go back to previous step"
          className="flex-1 min-h-[44px] px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Sign the agreement"
          className="flex-1 min-h-[44px] px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting || isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Signing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Sign the Agreement
            </span>
          )}
        </button>
      </div>

      {/* Helper Text */}
      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        By signing, you are making a promise to follow this agreement.
        <br />
        Your parent has already signed, so they are making the same promise!
      </p>
    </div>
  )
}

export type { ChildSigningCeremonyProps }
