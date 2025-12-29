/**
 * Parent Signing Ceremony Component.
 *
 * Story 6.2: Parent Digital Signature - AC1, AC2, AC3, AC4, AC5, AC6, AC7
 * Story 6.3: Agreement Activation - AC1, AC4
 * Story 6.4: Signing Ceremony Celebration - AC1, AC2, AC3, AC4, AC5, AC6, AC7
 *
 * Signing ceremony flow for parents to sign family agreements.
 * Parent can only sign after child has signed (FR19).
 * Shows celebration screen when all signatures collected and activated.
 */

'use client'

import { useState, useCallback } from 'react'
import type { AgreementTerm, SignatureMethod, AgreementSigning } from '@fledgely/shared/contracts'
import {
  canParentSign,
  hasParentSigned,
  isSigningComplete,
  getSigningProgress,
} from '@fledgely/shared/contracts'
import { TypedSignature } from './TypedSignature'
import { DrawnSignature } from './DrawnSignature'
import { ConsentCheckbox } from './ConsentCheckbox'
import { SignatureConfirmation } from './SignatureConfirmation'
import { CelebrationScreen } from '../agreements/CelebrationScreen'

interface ParentSigningCeremonyProps {
  /** Parent's name */
  parentName: string
  /** Parent's UID */
  parentUid: string
  /** Child's name (for display) */
  childName: string
  /** Family name (for display) */
  familyName?: string
  /** Agreement title */
  agreementTitle: string
  /** Key terms to display */
  keyTerms: AgreementTerm[]
  /** Parent-specific terms/commitments */
  parentTerms: AgreementTerm[]
  /** Current signing session state */
  signingState: AgreementSigning
  /** Called when parent submits signature */
  onSign: (signature: {
    method: SignatureMethod
    name: string | null
    imageData: string | null
    acknowledged: boolean
  }) => void
  /** Called when user views dashboard from celebration */
  onViewDashboard?: () => void
  /** Called when user wants to set up devices from celebration */
  onSetupDevices?: () => void
  /** Called when user wants to download agreement from celebration */
  onDownload?: () => void
  /** Agreement version (set after activation) */
  agreementVersion?: string
  /** Activation timestamp (set after activation) */
  activatedAt?: Date
  /** Whether signing is in progress */
  isSubmitting?: boolean
  /** Additional CSS classes */
  className?: string
}

type CeremonyStep = 'review' | 'signature' | 'confirmation'

export function ParentSigningCeremony({
  parentName,
  parentUid,
  childName,
  familyName,
  agreementTitle,
  keyTerms,
  parentTerms,
  signingState,
  onSign,
  onViewDashboard,
  onSetupDevices,
  onDownload,
  agreementVersion,
  activatedAt,
  isSubmitting = false,
  className = '',
}: ParentSigningCeremonyProps) {
  const [step, setStep] = useState<CeremonyStep>('review')
  const [signatureMethod, setSignatureMethod] = useState<SignatureMethod>('typed')
  const [typedName, setTypedName] = useState('')
  const [drawnImageData, setDrawnImageData] = useState<string | null>(null)
  const [hasConsented, setHasConsented] = useState(false)

  // Check parent signing status
  const canSign = canParentSign(signingState)
  const alreadySigned = hasParentSigned(signingState, parentUid)
  const signingProgress = getSigningProgress(signingState)
  const isComplete = isSigningComplete(signingState)

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
   * Handle proceeding from review to signature.
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

  // Show waiting message if child hasn't signed (AC1)
  if (!canSign) {
    return (
      <div
        className={`p-8 rounded-xl bg-blue-50 border-2 border-blue-300 text-center ${className}`}
        role="status"
        aria-live="polite"
        data-testid="waiting-for-child"
      >
        <span className="text-4xl mb-4 block" aria-hidden="true">
          ⏳
        </span>
        <h2 className="text-xl font-bold text-blue-800 mb-2">Waiting for {childName}</h2>
        <p className="text-blue-700">
          In Fledgely, children sign first so they know their voice matters. Once {childName} signs,
          you&apos;ll be able to add your signature.
        </p>
      </div>
    )
  }

  // Show celebration screen if all signatures collected and agreement activated (AC4)
  // This check comes FIRST because once activated, we always show celebration screen
  if (isComplete && agreementVersion && activatedAt) {
    return (
      <CelebrationScreen
        version={agreementVersion}
        activatedAt={activatedAt}
        childName={childName}
        familyName={familyName}
        onViewDashboard={onViewDashboard}
        onSetupDevices={onSetupDevices}
        onDownload={onDownload}
        className={className}
      />
    )
  }

  // Show confirmation if this parent already signed
  if (alreadySigned) {
    // Check if we're waiting for second parent in shared custody
    if (
      signingState.requiresBothParents &&
      signingProgress.parentsSigned < signingProgress.parentsRequired
    ) {
      const otherParentSigned = signingState.parentSignatures.find(
        (sig) => sig.signerId !== parentUid
      )
      if (otherParentSigned) {
        // Both parents have now signed (other parent signed after me)
        return (
          <SignatureConfirmation signerName={parentName} party="parent" className={className} />
        )
      }
      // Only this parent has signed, waiting for the other
      return (
        <div
          className={`p-8 rounded-xl bg-amber-50 border-2 border-amber-300 text-center ${className}`}
          role="status"
          aria-live="polite"
          data-testid="waiting-for-second-parent"
        >
          <span className="text-4xl mb-4 block" aria-hidden="true">
            ✓
          </span>
          <h2 className="text-xl font-bold text-amber-800 mb-2">You&apos;ve signed!</h2>
          <p className="text-amber-700">
            Because your family has shared custody, we&apos;re waiting for the other parent to sign
            too.
          </p>
        </div>
      )
    }
    // Single parent custody or all parents signed
    return <SignatureConfirmation signerName={parentName} party="parent" className={className} />
  }

  // Show completion screen if all signatures collected (but not yet activated)
  if (isComplete) {
    return <SignatureConfirmation signerName={parentName} party="parent" className={className} />
  }

  return (
    <main
      role="main"
      aria-label="Parent signing ceremony"
      className={`max-w-2xl mx-auto p-4 ${className}`}
      data-testid="parent-signing-ceremony"
    >
      {/* Progress indicator */}
      <nav className="mb-6" aria-label="Signing progress">
        <ol className="flex items-center justify-center gap-2" role="list">
          {(['review', 'signature', 'confirmation'] as CeremonyStep[]).map((s, i) => {
            const stepLabels = ['Review', 'Sign', 'Done']
            const currentIndex = ['review', 'signature', 'confirmation'].indexOf(step)
            const isStepComplete = i < currentIndex
            const isCurrent = step === s

            return (
              <li key={s} className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${isCurrent ? 'bg-indigo-600 text-white' : isStepComplete ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}
                  `}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Step ${i + 1}: ${stepLabels[i]}${isStepComplete ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                >
                  {i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={`w-12 h-1 mx-1 ${isStepComplete ? 'bg-green-500' : 'bg-gray-200'}`}
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

      {/* Step: Review - Show child's signature and parent commitments (AC2, AC4) */}
      {step === 'review' && (
        <section aria-labelledby="review-heading" data-testid="review-step">
          <header className="text-center mb-6">
            <h1 id="review-heading" className="text-2xl font-bold text-gray-900 mb-2">
              Review &amp; Sign, {parentName}
            </h1>
            <p className="text-gray-600">
              {childName} has signed &quot;{agreementTitle}&quot;. Now it&apos;s your turn!
            </p>
          </header>

          {/* Child's signature summary (AC2) */}
          {signingState.childSignature && (
            <div
              className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg"
              data-testid="child-signature-summary"
            >
              <h2 className="text-lg font-semibold text-green-800 mb-2 flex items-center gap-2">
                <span aria-hidden="true">✓</span>
                {childName}&apos;s Signature
              </h2>
              <p className="text-green-700 text-sm">
                Signed on{' '}
                {new Date(signingState.childSignature.signedAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}

          {/* Other parent's signature if exists (AC5) */}
          {signingState.parentSignatures.some((sig) => sig.signerId !== parentUid) && (
            <div
              className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg"
              data-testid="other-parent-signature"
            >
              <h2 className="text-lg font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <span aria-hidden="true">✓</span>
                Other Parent Signed
              </h2>
              <p className="text-blue-700 text-sm">
                {
                  signingState.parentSignatures.find((sig) => sig.signerId !== parentUid)
                    ?.signerName
                }{' '}
                has already signed.
              </p>
            </div>
          )}

          {/* Agreement terms summary */}
          <div className="space-y-3 mb-6">
            <h2 className="text-lg font-semibold text-gray-800">The Agreement Includes:</h2>
            <ul className="space-y-2" aria-label="Agreement terms">
              {keyTerms.slice(0, 5).map((term) => (
                <li key={term.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-bold mt-0.5" aria-hidden="true">
                    •
                  </span>
                  <span className="text-gray-800">{term.text}</span>
                </li>
              ))}
              {keyTerms.length > 5 && (
                <li className="text-sm text-gray-500 pl-6">
                  ...and {keyTerms.length - 5} more items
                </li>
              )}
            </ul>
          </div>

          {/* Parent commitments (AC4) */}
          {parentTerms.length > 0 && (
            <div className="space-y-3 mb-6" data-testid="parent-commitments">
              <h2 className="text-lg font-semibold text-indigo-800">
                Your Commitments as a Parent:
              </h2>
              <ul className="space-y-2" aria-label="Parent commitments">
                {parentTerms.map((term) => (
                  <li
                    key={term.id}
                    className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-400"
                  >
                    <span className="text-indigo-600 font-bold mt-0.5" aria-hidden="true">
                      •
                    </span>
                    <span className="text-gray-800">{term.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

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

      {/* Step: Signature (AC3) */}
      {step === 'signature' && (
        <section aria-labelledby="signature-heading" data-testid="signature-step">
          <header className="text-center mb-6">
            <h1 id="signature-heading" className="text-2xl font-bold text-gray-900 mb-2">
              Add Your Signature
            </h1>
            <p className="text-gray-600">Choose how you want to sign the agreement.</p>
          </header>

          {/* Signature method toggle */}
          <div
            className="flex justify-center gap-2 mb-6"
            role="tablist"
            aria-label="Signature method"
          >
            <button
              type="button"
              id="typed-tab"
              role="tab"
              aria-selected={signatureMethod === 'typed'}
              aria-controls="signature-tabpanel"
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
              id="drawn-tab"
              role="tab"
              aria-selected={signatureMethod === 'drawn'}
              aria-controls="signature-tabpanel"
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
          <div
            id="signature-tabpanel"
            className="mb-6"
            role="tabpanel"
            aria-labelledby={signatureMethod === 'typed' ? 'typed-tab' : 'drawn-tab'}
          >
            {signatureMethod === 'typed' ? (
              <TypedSignature
                value={typedName}
                onChange={setTypedName}
                placeholder={`Type "${parentName}" here`}
                disabled={isSubmitting}
              />
            ) : (
              <DrawnSignature onChange={setDrawnImageData} disabled={isSubmitting} />
            )}
          </div>

          {/* Consent checkbox - parent version */}
          <ConsentCheckbox
            checked={hasConsented}
            onChange={setHasConsented}
            disabled={isSubmitting}
            label="I commit to upholding my part of this agreement"
            className="mb-6"
          />

          {/* Submit button */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isSignatureValid() || isSubmitting}
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
              <p className="mt-2 text-sm text-gray-500">
                {!hasConsented
                  ? 'Please check the box above to commit'
                  : signatureMethod === 'typed'
                    ? 'Please type your name'
                    : 'Please draw your signature'}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Step: Confirmation - show celebration screen if activated, otherwise signature confirmation */}
      {step === 'confirmation' &&
        (agreementVersion && activatedAt ? (
          <CelebrationScreen
            version={agreementVersion}
            activatedAt={activatedAt}
            childName={childName}
            familyName={familyName}
            onViewDashboard={onViewDashboard}
            onSetupDevices={onSetupDevices}
            onDownload={onDownload}
          />
        ) : (
          <SignatureConfirmation signerName={parentName} party="parent" />
        ))}
    </main>
  )
}
