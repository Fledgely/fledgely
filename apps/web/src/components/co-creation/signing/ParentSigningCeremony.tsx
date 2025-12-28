'use client'

import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { SignaturePad } from './SignaturePad'
import type { SignatureType, DigitalAgreementSignature } from '@fledgely/contracts'

/**
 * ParentSigningCeremony Component Props
 */
export interface ParentSigningCeremonyProps {
  /** Agreement ID */
  agreementId: string
  /** Parent's name for signature placeholder */
  parentName: string
  /** Child's commitments (for transparency) */
  childCommitments: string[]
  /** Parent's commitments */
  parentCommitments: string[]
  /** Callback when signing is complete */
  onComplete: (signature: DigitalAgreementSignature) => void
  /** Callback when back button is pressed */
  onBack: () => void
  /** Loading state during submission */
  isLoading?: boolean
}

/**
 * ParentSigningCeremony Component
 *
 * Story 6.2: Parent Digital Signature - Task 1
 *
 * Displays the parent signing ceremony where parents review the agreement
 * and provide their digital signature. Parents sign FIRST in the flow
 * to demonstrate commitment before the child signs.
 *
 * Features:
 * - Display child's commitments for transparency (AC: 2)
 * - Display parent's own commitments (AC: 4)
 * - Typed or drawn signature modes (AC: 3)
 * - Commitment acknowledgment checkbox (AC: 4)
 * - 44x44px touch targets (NFR49)
 * - Accessible for screen readers (NFR42)
 *
 * @example
 * ```tsx
 * <ParentSigningCeremony
 *   agreementId="agreement-123"
 *   parentName="John Smith"
 *   childCommitments={["I will limit screen time..."]}
 *   parentCommitments={["I will respect your privacy..."]}
 *   onComplete={(sig) => recordParentSignature(sig)}
 *   onBack={() => router.back()}
 * />
 * ```
 */
export function ParentSigningCeremony({
  agreementId,
  parentName,
  childCommitments,
  parentCommitments,
  onComplete,
  onBack,
  isLoading = false,
}: ParentSigningCeremonyProps) {
  // Signature state
  const [signatureMode, setSignatureMode] = useState<SignatureType>('typed')
  const [signatureValue, setSignatureValue] = useState('')
  const [consentChecked, setConsentChecked] = useState(false)

  // Check if form is valid
  const isFormValid = consentChecked && signatureValue.length >= 2

  /**
   * Handle signature submission
   */
  const handleSubmit = useCallback(() => {
    if (!isFormValid || isLoading) return

    const signature: DigitalAgreementSignature = {
      agreementId,
      signature: {
        id: uuidv4(),
        type: signatureMode,
        value: signatureValue,
        signedBy: 'parent',
        signedAt: new Date().toISOString(),
      },
      consentCheckboxChecked: true,
      commitmentsReviewed: true,
    }

    onComplete(signature)
  }, [agreementId, signatureMode, signatureValue, isFormValid, isLoading, onComplete])

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Sign the Family Agreement
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Review the commitments below, then sign to show your child you're equally committed.
        </p>
      </div>

      {/* Child's Commitments Section (Transparency - AC: 2) */}
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          What Your Child Will Agree To
        </h3>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <ul className="space-y-2">
            {childCommitments.map((commitment, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-sm font-medium">
                  {index + 1}
                </span>
                <span>{commitment}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Parent's Commitments Section (AC: 4) */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Your Commitments as a Parent
        </h3>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <ul className="space-y-2">
            {parentCommitments.map((commitment, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-sm font-medium">
                  {index + 1}
                </span>
                <span>{commitment}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Consent Checkbox */}
      <div className="mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            disabled={isLoading}
            className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            aria-label="I commit to this agreement"
          />
          <span className="text-gray-700 dark:text-gray-300">
            <strong>I commit to this agreement.</strong> I have reviewed both my commitments
            and my child's commitments, and I agree to uphold my part of this family agreement.
          </span>
        </label>
      </div>

      {/* Signature Pad */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Your Signature
        </h3>
        <SignaturePad
          mode={signatureMode}
          onModeChange={setSignatureMode}
          value={signatureValue}
          onChange={setSignatureValue}
          childName={parentName}
          disabled={isLoading}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="min-h-[44px] px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid || isLoading}
          aria-label={isLoading ? 'Signing agreement...' : 'Sign the Agreement'}
          className="flex-1 min-h-[44px] px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
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
            'Sign the Agreement'
          )}
        </button>
      </div>

      {/* Helper text */}
      {!isFormValid && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          {!consentChecked && !signatureValue
            ? 'Please check the commitment box and sign your name to continue.'
            : !consentChecked
              ? 'Please check the commitment box to continue.'
              : 'Please sign your name to continue.'}
        </p>
      )}
    </div>
  )
}
