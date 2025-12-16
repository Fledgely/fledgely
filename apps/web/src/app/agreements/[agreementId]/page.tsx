'use client'

import { useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useFamily } from '@/hooks/useFamily'
import { useAgreement } from '@/hooks/useAgreement'
import {
  getAgreementStatusLabel,
  getAgreementStatusDescription,
} from '@fledgely/contracts'

/**
 * Agreement Detail Page
 *
 * Story 6.3: Agreement Activation - Task 6
 *
 * Displays the full agreement with all terms, commitments,
 * signatures, and history. Accessible from the dashboard.
 *
 * Route: /agreements/[agreementId]
 *
 * Accessibility features:
 * - 44x44px minimum touch targets (NFR49)
 * - ARIA labels for all elements (NFR42)
 * - Full keyboard navigation (NFR43)
 * - Color contrast 4.5:1 minimum (NFR45)
 */
export default function AgreementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const agreementId = params.agreementId as string

  // Auth and family context
  const { loading: authLoading } = useAuthContext()
  const { family, loading: familyLoading } = useFamily()

  // Agreement data
  const { agreement, loading: agreementLoading, error } = useAgreement({
    familyId: family?.id ?? '',
    agreementId,
  })

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  /**
   * Handle navigate to dashboard
   */
  const handleGoToDashboard = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  // Loading state
  const isLoading = authLoading || familyLoading || agreementLoading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading agreement...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !agreement) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Agreement Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {error?.message || 'The agreement could not be found.'}
          </p>
          <button
            onClick={handleGoToDashboard}
            className="min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const statusLabel = getAgreementStatusLabel(agreement.status)
  const statusDescription = getAgreementStatusDescription(agreement.status)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header with back button */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="min-h-[44px] inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label="Go back"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>

        {/* Agreement header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Family Agreement
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Version {agreement.version}
              </p>
            </div>
            <span
              className={`
                inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                ${agreement.status === 'active'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }
              `}
              aria-label={`Status: ${statusLabel}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{statusDescription}</p>
        </div>

        {/* Agreement terms */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Agreement Terms
          </h2>
          {agreement.terms && agreement.terms.length > 0 ? (
            <ul className="space-y-4" aria-label="Agreement terms">
              {agreement.terms.map((term, index) => (
                <li
                  key={term.id || index}
                  className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {term.content?.title || `Term ${index + 1}`}
                  </h3>
                  {term.content?.childCommitment && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Child commitment:</span>{' '}
                      {term.content.childCommitment}
                    </p>
                  )}
                  {term.content?.parentCommitment && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      <span className="font-medium">Parent commitment:</span>{' '}
                      {term.content.parentCommitment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No terms in this agreement.</p>
          )}
        </div>

        {/* Signatures section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Signatures
          </h2>
          <div className="space-y-3">
            {agreement.signatures?.parent && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300">Parent</span>
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Signed
                </span>
              </div>
            )}
            {agreement.signatures?.coParent && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300">Co-Parent</span>
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Signed
                </span>
              </div>
            )}
            {agreement.signatures?.child && (
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 dark:text-gray-300">Child</span>
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Signed
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Agreement history */}
        {agreement.activatedAt && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              History
            </h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>
                <span className="font-medium">Activated:</span>{' '}
                {new Date(agreement.activatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {agreement.archivedAt && (
                <p>
                  <span className="font-medium">Archived:</span>{' '}
                  {new Date(agreement.archivedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleGoToDashboard}
            className="min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
