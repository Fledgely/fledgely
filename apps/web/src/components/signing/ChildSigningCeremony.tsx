/**
 * Child Signing Ceremony Component.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC1, AC2, AC3, AC4, AC5, AC6, AC7
 * Story 6.7: Signature Accessibility - AC1, AC2, AC3, AC4
 *
 * Full signing ceremony flow for children to sign family agreements.
 * Provides meaningful ceremony experience with accessibility support.
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { AgreementTerm, SignatureMethod, AgreementSigning } from '@fledgely/shared/contracts'
import { canChildSign } from '@fledgely/shared/contracts'
import { TypedSignature } from './TypedSignature'
import { DrawnSignature } from './DrawnSignature'
import { ConsentCheckbox } from './ConsentCheckbox'
import { SignatureConfirmation } from './SignatureConfirmation'

interface ChildSigningCeremonyProps {
  /** Child's name */
  childName: string
  /** Agreement title */
  agreementTitle: string
  /** Key terms to display before signing */
  keyTerms: AgreementTerm[]
  /** Current signing session state */
  signingState: AgreementSigning
  /** Called when child submits signature */
  onSign: (signature: {
    method: SignatureMethod
    name: string | null
    imageData: string | null
    acknowledged: boolean
  }) => void
  /** Whether signing is in progress */
  isSubmitting?: boolean
  /** Additional CSS classes */
  className?: string
}

type CeremonyStep = 'commitments' | 'signature' | 'confirmation'

export function ChildSigningCeremony({
  childName,
  agreementTitle,
  keyTerms,
  signingState,
  onSign,
  isSubmitting = false,
  className = '',
}: ChildSigningCeremonyProps) {
  const [step, setStep] = useState<CeremonyStep>('commitments')
  const [signatureMethod, setSignatureMethod] = useState<SignatureMethod>('typed')
  const [typedName, setTypedName] = useState('')
  const [drawnImageData, setDrawnImageData] = useState<string | null>(null)
  const [hasConsented, setHasConsented] = useState(false)
  const [stepAnnouncement, setStepAnnouncement] = useState('')

  // Refs for focus management (Story 6.7 - AC4)
  const commitmentsHeadingRef = useRef<HTMLHeadingElement>(null)
  const signatureHeadingRef = useRef<HTMLHeadingElement>(null)

  // Check if child can sign (AC7 - parent cannot sign first)
  const canSign = canChildSign(signingState)

  // Focus management when step changes (Story 6.7 - AC4)
  useEffect(() => {
    if (step === 'commitments') {
      commitmentsHeadingRef.current?.focus()
      setStepAnnouncement('Step 1 of 3: Review your commitments')
    } else if (step === 'signature') {
      signatureHeadingRef.current?.focus()
      setStepAnnouncement('Step 2 of 3: Sign your name')
    } else if (step === 'confirmation') {
      setStepAnnouncement('Step 3 of 3: Signing complete!')
    }
  }, [step])

  /**
   * Check if signature is valid for submission.
   */
  const isSignatureValid = useCallback(() => {
    if (!hasConsented) return false
    if (signatureMethod === 'typed') {
      return typedName.length >= 2
    }
    return drawnImageData !== null
  }, [hasConsented, signatureMethod, typedName, drawnImageData])

  /**
   * Handle proceeding from commitments to signature.
   */
  const handleProceedToSignature = useCallback(() => {
    setStep('signature')
  }, [])

  /**
   * Handle signature submission.
   */
  const handleSubmit = useCallback(() => {
    if (!isSignatureValid() || isSubmitting) return

    onSign({
      method: signatureMethod,
      name: signatureMethod === 'typed' ? typedName : null,
      imageData: signatureMethod === 'drawn' ? drawnImageData : null,
      acknowledged: hasConsented,
    })

    setStep('confirmation')
  }, [
    isSignatureValid,
    isSubmitting,
    onSign,
    signatureMethod,
    typedName,
    drawnImageData,
    hasConsented,
  ])

  // Show blocked message if parent signed first (should not happen, but safety check)
  if (!canSign && signingState.parentSignatures.length > 0) {
    return (
      <div
        className={`p-8 rounded-xl bg-yellow-50 border-2 border-yellow-300 text-center ${className}`}
        role="alert"
        data-testid="parent-signed-first-warning"
      >
        <span className="text-4xl mb-4 block" aria-hidden="true">
          ⚠️
        </span>
        <h2 className="text-xl font-bold text-yellow-800 mb-2">Wait a moment!</h2>
        <p className="text-yellow-700">
          Your parent signed before you. In our family, children sign first so you know your voice
          matters. Please ask your parent to start over.
        </p>
      </div>
    )
  }

  // Already signed
  if (signingState.childSignature) {
    return <SignatureConfirmation signerName={childName} party="child" className={className} />
  }

  return (
    <main
      role="main"
      aria-label="Signing ceremony"
      className={`max-w-2xl mx-auto p-4 ${className}`}
      data-testid="child-signing-ceremony"
    >
      {/* Live region for step announcements (Story 6.7 - AC3) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="step-announcement"
      >
        {stepAnnouncement}
      </div>

      {/* Progress indicator */}
      <nav className="mb-6" aria-label="Signing progress">
        <ol className="flex items-center justify-center gap-2" role="list">
          {(['commitments', 'signature', 'confirmation'] as CeremonyStep[]).map((s, i) => {
            const stepLabels = ['Review', 'Sign', 'Done']
            const currentIndex = ['commitments', 'signature', 'confirmation'].indexOf(step)
            const isComplete = i < currentIndex
            const isCurrent = step === s

            return (
              <li key={s} className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${isCurrent ? 'bg-indigo-600 text-white' : isComplete ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}
                  `}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Step ${i + 1}: ${stepLabels[i]}${isComplete ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                >
                  {i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={`w-12 h-1 mx-1 ${isComplete ? 'bg-green-500' : 'bg-gray-200'}`}
                    aria-hidden="true"
                  />
                )}
              </li>
            )
          })}
        </ol>
        <div className="flex justify-center gap-8 mt-2 text-sm text-gray-600" aria-hidden="true">
          <span>Review</span>
          <span>Sign</span>
          <span>Done</span>
        </div>
      </nav>

      {/* Step: Commitments Review */}
      {step === 'commitments' && (
        <section aria-labelledby="commitments-heading" data-testid="commitments-step">
          <header className="text-center mb-6">
            <h1
              id="commitments-heading"
              ref={commitmentsHeadingRef}
              tabIndex={-1}
              className="text-2xl font-bold text-gray-900 mb-2 outline-none"
            >
              Ready to Sign, {childName}?
            </h1>
            <p className="text-gray-600">
              Let&apos;s review what you&apos;re agreeing to in &quot;{agreementTitle}&quot;
            </p>
          </header>

          {/* Key commitments */}
          <div className="space-y-3 mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Here are the main rules:</h2>
            <ul className="space-y-2" aria-label="Key commitments">
              {keyTerms.slice(0, 5).map((term) => (
                <li key={term.id} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                  <span className="text-indigo-600 font-bold mt-0.5" aria-hidden="true">
                    •
                  </span>
                  <span className="text-gray-800">{term.text}</span>
                </li>
              ))}
              {keyTerms.length > 5 && (
                <li className="text-sm text-gray-500 pl-6">
                  ...and {keyTerms.length - 5} more rules
                </li>
              )}
            </ul>
          </div>

          {/* Proceed button */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleProceedToSignature}
              className="
                px-8 py-3 rounded-full
                bg-indigo-600 text-white font-medium text-lg
                hover:bg-indigo-700
                min-h-[44px]
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              "
              data-testid="proceed-to-signature-button"
            >
              I&apos;m Ready to Sign
            </button>
          </div>
        </section>
      )}

      {/* Step: Signature */}
      {step === 'signature' && (
        <section aria-labelledby="signature-heading" data-testid="signature-step">
          <header className="text-center mb-6">
            <h1
              id="signature-heading"
              ref={signatureHeadingRef}
              tabIndex={-1}
              className="text-2xl font-bold text-gray-900 mb-2 outline-none"
            >
              Sign Your Name
            </h1>
            <p className="text-gray-600">Choose how you want to sign: type your name or draw it!</p>
          </header>

          {/* Signature method toggle */}
          <div
            className="flex justify-center gap-2 mb-6"
            role="tablist"
            aria-label="Signature method"
          >
            <button
              type="button"
              role="tab"
              aria-selected={signatureMethod === 'typed'}
              onClick={() => setSignatureMethod('typed')}
              className={`
                px-4 py-2 rounded-full min-h-[44px]
                font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                ${signatureMethod === 'typed' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              `}
              data-testid="typed-signature-tab"
            >
              ✏️ Type My Name
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={signatureMethod === 'drawn'}
              onClick={() => setSignatureMethod('drawn')}
              className={`
                px-4 py-2 rounded-full min-h-[44px]
                font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                ${signatureMethod === 'drawn' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              `}
              data-testid="drawn-signature-tab"
            >
              ✍️ Draw My Signature
            </button>
          </div>

          {/* Signature input */}
          <div className="mb-6" role="tabpanel">
            {signatureMethod === 'typed' ? (
              <TypedSignature
                value={typedName}
                onChange={setTypedName}
                placeholder={`Type "${childName}" here`}
                disabled={isSubmitting}
              />
            ) : (
              <DrawnSignature onChange={setDrawnImageData} disabled={isSubmitting} />
            )}
          </div>

          {/* Consent checkbox */}
          <ConsentCheckbox
            checked={hasConsented}
            onChange={setHasConsented}
            disabled={isSubmitting}
            className="mb-6"
          />

          {/* Submit button */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isSignatureValid() || isSubmitting}
              aria-describedby={!isSignatureValid() ? 'signature-validation-error' : undefined}
              className={`
                px-8 py-3 rounded-full
                font-medium text-lg
                min-h-[44px]
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                ${
                  isSignatureValid() && !isSubmitting
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
              data-testid="submit-signature-button"
            >
              {isSubmitting ? 'Signing...' : 'Sign the Agreement'}
            </button>
            {!isSignatureValid() && (
              <p
                id="signature-validation-error"
                role="alert"
                className="mt-2 text-sm text-gray-500"
                data-testid="validation-message"
              >
                {!hasConsented
                  ? 'Please check the box above to agree'
                  : signatureMethod === 'typed'
                    ? 'Please type your name'
                    : 'Please draw your signature'}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Step: Confirmation */}
      {step === 'confirmation' && <SignatureConfirmation signerName={childName} party="child" />}
    </main>
  )
}
