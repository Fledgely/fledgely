'use client'

import { useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useFamily } from '@/hooks/useFamily'
import { useCoCreationSession } from '@/hooks/useCoCreationSession'
import { useSigningOrder } from '@/hooks/useSigningOrder'

/**
 * SigningEntryPage
 *
 * Story 6.2: Parent Digital Signature - Task 4
 *
 * Entry point for agreement signing. Routes users to the appropriate
 * signing ceremony based on their role and signing status.
 *
 * Route: /agreements/sign/[sessionId]
 *
 * Routing logic:
 * - If canParentSign → redirect to /agreements/sign/parent/[sessionId]
 * - If canChildSign → redirect to /agreements/sign/child/[sessionId]
 * - If complete → show completion message
 * - If waiting for co-parent → show waiting message
 */

function SigningEntryContent() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  // Auth and family context
  const { user, loading: authLoading } = useAuthContext()
  const { family, loading: familyLoading } = useFamily()

  // Session data
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
  } = useCoCreationSession(sessionId)

  // Signing order check
  const {
    canParentSign,
    canChildSign,
    signingStatus,
    isComplete,
    waitingMessage,
    loading: signingLoading,
    error: signingError,
  } = useSigningOrder({
    familyId: family?.id ?? '',
    agreementId: sessionId,
  })

  // Route user based on signing eligibility
  useEffect(() => {
    if (authLoading || familyLoading || sessionLoading || signingLoading) {
      return
    }

    if (signingError || sessionError) {
      return // Show error state
    }

    if (!session || !family?.id) {
      return // Show not found
    }

    // If agreement is complete, stay on this page to show completion
    if (isComplete) {
      return
    }

    // Route to appropriate signing page
    if (canParentSign) {
      router.replace(`/agreements/sign/parent/${sessionId}`)
      return
    }

    if (canChildSign) {
      router.replace(`/agreements/sign/child/${sessionId}`)
      return
    }

    // If neither can sign (waiting for co-parent), stay on this page
  }, [
    authLoading,
    familyLoading,
    sessionLoading,
    signingLoading,
    signingError,
    sessionError,
    session,
    family?.id,
    isComplete,
    canParentSign,
    canChildSign,
    sessionId,
    router,
  ])

  // Loading state
  const isLoading = authLoading || familyLoading || sessionLoading || signingLoading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  // Error states
  if (sessionError || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Session Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {sessionError?.message || 'Could not find this session.'}
          </p>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (signingError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Something Went Wrong
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {signingError.message}
          </p>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Agreement complete
  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
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

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Agreement Complete!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Both parties have signed. Your family agreement is now active.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Waiting for co-parent (shared custody)
  if (!canParentSign && !canChildSign && waitingMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {/* Waiting Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Waiting for Signatures
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {waitingMessage}
          </p>

          {/* Signing status indicator */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Current status: <span className="font-medium">{signingStatus}</span>
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Default fallback (shouldn't normally reach here)
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-gray-600 dark:text-gray-300">Redirecting...</p>
      </div>
    </div>
  )
}

/**
 * Signing Entry Page with Suspense boundary
 */
export default function SigningEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
          </div>
        </div>
      }
    >
      <SigningEntryContent />
    </Suspense>
  )
}
