'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useFamily } from '@/hooks/useFamily'
import { useCoCreationSession } from '@/hooks/useCoCreationSession'
import { useSigningOrder } from '@/hooks/useSigningOrder'
import { recordParentSignature } from '@/services/signatureService'
import {
  ParentSigningCeremony,
  ParentSigningComplete,
} from '@/components/co-creation/signing'
import type { AgreementSignature } from '@fledgely/contracts'

/**
 * ParentSigningPage
 *
 * Story 6.2: Parent Digital Signature - Task 3
 *
 * Route page for parent signing ceremony. Handles:
 * - Checking signing eligibility (parent signs first)
 * - Rendering signing ceremony component
 * - Recording signature via signatureService
 * - Showing completion screen after signing
 * - Navigation to dashboard
 *
 * Route: /agreements/sign/parent/[sessionId]
 */
export default function ParentSigningPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  // Auth and family context
  const { user, loading: authLoading } = useAuthContext()
  const { family, loading: familyLoading, hasFamily } = useFamily()

  // Session data
  const { session, loading: sessionLoading } = useCoCreationSession(sessionId)

  // Signing order check
  const {
    canParentSign,
    signingStatus,
    waitingMessage,
    loading: signingLoading,
    error: signingError,
  } = useSigningOrder({
    familyId: family?.id ?? '',
    agreementId: sessionId,
  })

  // Local state
  const [signingState, setSigningState] = useState<'signing' | 'complete'>('signing')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get child name from session/family
  const child = family?.children?.find((c) => c.id === session?.childId)
  const childName = child?.name ?? 'your child'

  // Get parent name from user
  const parentName = user?.email?.split('@')[0] ?? 'Parent'

  /**
   * Handle signing completion
   */
  const handleSigningComplete = useCallback(
    async (signature: AgreementSignature) => {
      if (!family?.id || isSubmitting) return

      setIsSubmitting(true)
      setError(null)

      try {
        // Determine if this is a shared custody family
        const isSharedCustody = family.custodyType === 'shared'

        await recordParentSignature({
          familyId: family.id,
          agreementId: sessionId,
          signature,
          isSharedCustody,
        })
        setSigningState('complete')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Signing failed'
        setError(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [family?.id, sessionId, isSubmitting]
  )

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  /**
   * Handle continue to dashboard
   */
  const handleContinue = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  // Loading state
  const isLoading = authLoading || familyLoading || sessionLoading || signingLoading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    )
  }

  // Error state
  if (signingError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Something went wrong
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {signingError.message}
          </p>
          <button
            onClick={handleBack}
            className="min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Already signed state (includes shared custody states)
  if (
    signingStatus === 'parent_signed' ||
    signingStatus === 'one_parent_signed' ||
    signingStatus === 'both_parents_signed' ||
    signingStatus === 'complete'
  ) {
    let statusMessage = 'You have already signed.'
    if (signingStatus === 'complete') {
      statusMessage = 'This agreement has been fully signed by all parties.'
    } else if (signingStatus === 'one_parent_signed') {
      statusMessage = 'You have signed. Waiting for the other parent to sign.'
    } else if (signingStatus === 'both_parents_signed') {
      statusMessage = 'Both parents have signed. Waiting for child to sign.'
    } else if (signingStatus === 'parent_signed') {
      statusMessage = 'You have signed. Waiting for child to sign.'
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Already Signed
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {statusMessage}
          </p>
          <button
            onClick={handleContinue}
            className="min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Get commitments from session terms
  const childCommitments =
    session?.terms?.map((t) => t.content?.childCommitment ?? t.content?.title ?? '') ?? []
  const parentCommitments =
    session?.terms
      ?.map((t) => t.content?.parentCommitment)
      .filter((c): c is string => Boolean(c)) ?? []

  // Completion screen
  if (signingState === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ParentSigningComplete
          parentName={parentName}
          childName={childName}
          signingLink={`/agreements/sign/child/${sessionId}`}
          onContinue={handleContinue}
        />
      </div>
    )
  }

  // Signing ceremony
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Error display */}
      {error && (
        <div role="alert" className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {canParentSign ? (
        <ParentSigningCeremony
          agreementId={sessionId}
          parentName={parentName}
          childCommitments={childCommitments}
          parentCommitments={parentCommitments}
          onComplete={handleSigningComplete}
          onBack={handleBack}
          isLoading={isSubmitting}
        />
      ) : (
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">
            {waitingMessage ?? 'Unable to sign at this time.'}
          </p>
        </div>
      )}
    </div>
  )
}
