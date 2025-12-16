'use client'

import { useState, useCallback } from 'react'

/**
 * ParentSigningComplete Component Props
 */
export interface ParentSigningCompleteProps {
  /** Parent's name */
  parentName: string
  /** Child's name */
  childName: string
  /** Link for child to sign */
  signingLink: string
  /** Callback when continuing to dashboard */
  onContinue: () => void
}

/**
 * ParentSigningComplete Component
 *
 * Story 6.2: Parent Digital Signature - Task 2
 *
 * Displays completion screen after parent signs the agreement.
 * Shows success message and provides options to share signing
 * link with the child.
 *
 * Features:
 * - "You signed!" success message (AC: 6)
 * - "Now your child can sign" next steps
 * - Copy link option for sharing
 * - Continue to dashboard button
 * - Accessible for screen readers (NFR42)
 * - 44x44px touch targets (NFR49)
 *
 * @example
 * ```tsx
 * <ParentSigningComplete
 *   parentName="John Smith"
 *   childName="Alex"
 *   signingLink="/agreements/sign/child/session-123"
 *   onContinue={() => router.push('/dashboard')}
 * />
 * ```
 */
export function ParentSigningComplete({
  parentName,
  childName,
  signingLink,
  onContinue,
}: ParentSigningCompleteProps) {
  const [copied, setCopied] = useState(false)

  /**
   * Copy signing link to clipboard
   */
  const handleCopyLink = useCallback(async () => {
    try {
      const fullLink = `${window.location.origin}${signingLink}`
      await navigator.clipboard.writeText(fullLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }, [signingLink])

  return (
    <div className="w-full max-w-2xl mx-auto text-center py-8">
      {/* Success Announcement for Screen Readers */}
      <div role="alert" aria-live="polite" className="sr-only">
        Congratulations! You have successfully signed the family agreement.
        Now {childName} can sign to complete the agreement.
      </div>

      {/* Success Icon */}
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-green-500"
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

      {/* Success Message */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        You Signed, {parentName}!
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Now your child can sign to complete the family agreement.
      </p>

      {/* Next Steps Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Next Step: {childName} Signs
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Share this link with {childName} so they can sign the agreement on their device.
          Once they sign, the agreement will be active!
        </p>

        {/* Copy Link Section */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <div className="flex-1 w-full sm:w-auto px-4 py-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 truncate">
            {signingLink}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label={copied ? 'Link copied' : 'Copy signing link'}
            className="min-h-[44px] px-4 py-2 flex items-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {copied ? (
              <>
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Helpful Tips */}
      <div className="text-left bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-8">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          Tips for {childName}'s Signing:
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• They can type their name or draw their signature</li>
          <li>• They'll review the key commitments before signing</li>
          <li>• Make sure they understand what they're agreeing to</li>
          <li>• Be available to answer any questions they might have</li>
        </ul>
      </div>

      {/* Continue Button */}
      <button
        type="button"
        onClick={onContinue}
        className="min-h-[44px] px-8 py-3 text-white bg-gray-700 dark:bg-gray-600 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors font-medium"
      >
        Continue to Dashboard
      </button>
    </div>
  )
}

export type { ParentSigningCompleteProps }
