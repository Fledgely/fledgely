'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useFamily } from '@/hooks/useFamily'
import { useCoCreationSession } from '@/hooks/useCoCreationSession'
import { useSigningOrder } from '@/hooks/useSigningOrder'
import {
  ChildSigningCeremony,
  FamilyCelebration,
} from '@/components/co-creation/signing'
import { recordChildSignature } from '@/services/signatureService'
import { useAgreementDownload } from '@/hooks/useAgreementDownload'
import type { AgreementSignature } from '@fledgely/contracts'

/**
 * Child Signing Ceremony Page
 *
 * Story 6.1: Child Digital Signature Ceremony - Task 8
 *
 * Routes: /agreements/sign/child/[sessionId]
 *
 * This page handles the child's digital signature ceremony:
 * - Validates parent has signed first (AC #7)
 * - Displays signing ceremony with commitments
 * - Records signature and updates agreement status
 * - Shows celebratory feedback on completion
 */

type PageState = 'loading' | 'waiting' | 'ceremony' | 'celebration' | 'error'

function ChildSigningContent() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const { family, loading: familyLoading } = useFamily()

  const sessionId = params.sessionId as string

  // Co-creation session for agreement data
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
  } = useCoCreationSession(sessionId)

  // Signing order enforcement (requires familyId)
  const familyId = family?.id || ''
  const agreementId = sessionId // In this flow, sessionId maps to agreementId

  const {
    canChildSign,
    waitingMessage,
    loading: signingOrderLoading,
    error: signingOrderError,
  } = useSigningOrder({
    familyId,
    agreementId,
  })

  // Page state
  const [pageState, setPageState] = useState<PageState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [agreementVersion, setAgreementVersion] = useState<string>('1.0')

  // Get child name from family data
  const childName = session?.childId
    ? family?.children?.find((c) => c.id === session.childId)?.name || 'Friend'
    : 'Friend'

  // Get parent name(s) from family data
  const parentNames = family?.parents?.map((p) => p.name || 'Parent') || ['Parent']

  // Agreement download/share functionality
  const { downloadAgreement, shareAgreement } = useAgreementDownload({
    agreementId,
    familyId,
  })

  // Determine page state based on loading and signing status
  useEffect(() => {
    if (authLoading || familyLoading || sessionLoading || signingOrderLoading) {
      setPageState('loading')
      return
    }

    if (sessionError || signingOrderError) {
      setError(sessionError?.message || signingOrderError?.message || 'An error occurred')
      setPageState('error')
      return
    }

    if (!session) {
      setError('Session not found')
      setPageState('error')
      return
    }

    if (!canChildSign) {
      setPageState('waiting')
      return
    }

    setPageState('ceremony')
  }, [
    authLoading,
    familyLoading,
    sessionLoading,
    signingOrderLoading,
    sessionError,
    signingOrderError,
    session,
    canChildSign,
  ])

  /**
   * Handle signature completion
   */
  const handleSignatureComplete = useCallback(
    async (signature: AgreementSignature) => {
      if (!familyId || !agreementId) return

      setIsSubmitting(true)
      setError(null)

      try {
        await recordChildSignature({
          familyId,
          agreementId,
          signature,
        })

        // Show celebration
        setPageState('celebration')
      } catch (err) {
        console.error('[ChildSigningPage] Error recording signature:', err)
        setError(err instanceof Error ? err.message : 'Failed to record signature')
        setIsSubmitting(false)
      }
    },
    [familyId, agreementId]
  )

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  /**
   * Handle next step selection from FamilyCelebration
   */
  const handleNextStep = useCallback((choice: 'device-enrollment' | 'dashboard') => {
    if (choice === 'device-enrollment') {
      // Navigate to device enrollment flow (when available)
      router.push('/devices/enroll')
    } else {
      router.push('/dashboard')
    }
  }, [router])

  // Not authenticated
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              You need to be signed in to sign the agreement.
            </p>
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Something Went Wrong</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/dashboard" className="text-primary hover:underline">
              Go to Dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Waiting for parent to sign
  if (pageState === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            {/* Waiting icon */}
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
              Almost Time to Sign!
            </h1>

            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
              {waitingMessage}
            </p>

            {/* Explanation for child - why parent signs first (Task 6.4) */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-md mx-auto mb-8">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                When your parent signs first, it shows they believe in this agreement too.
                You both have to follow the rules!
              </p>
            </div>

            <button
              onClick={handleBack}
              className="min-h-[44px] px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Go Back
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Celebration state - Family celebration when agreement is activated
  if (pageState === 'celebration') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <FamilyCelebration
            agreement={{
              id: agreementId,
              version: agreementVersion,
              activatedAt: new Date().toISOString(),
              termsCount: session?.terms?.length || 0,
            }}
            parentNames={parentNames}
            childName={childName}
            onNextStep={handleNextStep}
            onDownload={downloadAgreement}
            onShare={shareAgreement}
          />
        </main>
      </div>
    )
  }

  // Signing ceremony
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {error && (
          <div
            role="alert"
            className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <ChildSigningCeremony
          agreementId={agreementId}
          childName={childName}
          terms={session?.terms || []}
          onComplete={handleSignatureComplete}
          onBack={handleBack}
          isLoading={isSubmitting}
        />
      </main>
    </div>
  )
}

/**
 * Child Signing Page with Suspense boundary
 */
export default function ChildSigningPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ChildSigningContent />
    </Suspense>
  )
}
