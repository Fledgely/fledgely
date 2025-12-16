'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useFamily } from '@/hooks/useFamily'
import { useCoCreationSession } from '@/hooks/useCoCreationSession'
import {
  CoCreationSessionInitiation,
  SessionTimeoutWarning,
  useDraftLoader,
} from '@/components/co-creation'
import { getChild, hasFullPermissionsForChild } from '@/services/childService'
import type { ChildProfile } from '@fledgely/contracts'

/**
 * Co-Creation Session Page
 *
 * Story 5.1: Co-Creation Session Initiation - Task 8
 *
 * Entry point for creating a new co-creation session with a child.
 * Handles:
 * - Authentication and permission checks
 * - Loading child profile
 * - Loading draft from Epic 4 (wizard or template)
 * - Session timeout warning
 * - Navigation after session creation
 */

function CoCreationPageContent() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const { family, loading: familyLoading, hasFamily } = useFamily()

  const childId = params.childId as string

  // Page state
  const [child, setChild] = useState<ChildProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Load draft from Epic 4 (wizard or template customization)
  const { draftSource, isLoading: draftLoading, clearDraft } = useDraftLoader(childId)

  // Co-creation session management
  const {
    session,
    loading: sessionLoading,
    createSession,
    pauseSession,
    timeoutWarning,
    markActivity,
  } = useCoCreationSession(sessionId)

  /**
   * Load child profile and verify permissions
   */
  useEffect(() => {
    async function loadChild() {
      if (authLoading || familyLoading || !user?.uid) {
        return
      }

      if (!hasFamily || !family) {
        setPageError('You need to create a family first.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setPageError(null)

        // Check permissions
        const canAccess = await hasFullPermissionsForChild(childId, user.uid)
        setHasPermission(canAccess)

        if (!canAccess) {
          setPageError('You do not have permission to create an agreement for this child.')
          return
        }

        // Fetch child data
        const childData = await getChild(childId)

        // Set child (may be null if not found - handled in render)
        setChild(childData)
      } catch (err) {
        console.error('Error loading child:', err)
        setPageError('Failed to load child profile. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadChild()
  }, [childId, user?.uid, authLoading, familyLoading, hasFamily, family])

  /**
   * Handle session creation
   */
  const handleSessionStart = useCallback(
    (newSessionId: string) => {
      setSessionId(newSessionId)
      // Clear the draft after session is created
      clearDraft()
      // Navigate to the session page
      router.push(`/agreements/session/${newSessionId}`)
    },
    [clearDraft, router]
  )

  /**
   * Handle cancel - go back to templates or dashboard
   */
  const handleCancel = useCallback(() => {
    router.push('/templates')
  }, [router])

  /**
   * Handle save and exit from timeout warning
   */
  const handleSaveAndExit = useCallback(async () => {
    if (session) {
      await pauseSession()
      router.push('/dashboard')
    }
  }, [session, pauseSession, router])

  /**
   * Handle continue from timeout warning
   */
  const handleContinue = useCallback(() => {
    markActivity()
  }, [markActivity])

  // Loading state while auth is checking
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              You need to be signed in to create an agreement.
            </p>
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Loading family or child data
  if (familyLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading child profile...</p>
          </div>
        </main>
      </div>
    )
  }

  // Error or permission denied
  if (pageError || hasPermission === false) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Cannot Create Agreement</h1>
            <p className="text-muted-foreground mb-6">
              {pageError || 'You do not have permission to create an agreement for this child.'}
            </p>
            <button
              onClick={() => router.back()}
              className="text-primary hover:underline"
            >
              Go back
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Child not found
  if (!child || !family) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Profile Not Found</h1>
            <p className="text-muted-foreground mb-6">
              We could not find this child profile.
            </p>
            <Link href="/dashboard" className="text-primary hover:underline">
              Go to Dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Loading draft
  if (draftLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading your draft...</p>
          </div>
        </main>
      </div>
    )
  }

  // Calculate child age
  const calculateAge = (birthDate: Date): number => {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const childAge = child.dateOfBirth ? calculateAge(child.dateOfBirth) : 10

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center min-h-[44px] min-w-[44px]"
            aria-label="Go back to templates"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Templates
          </button>
        </div>

        {/* Co-Creation Session Initiation */}
        <CoCreationSessionInitiation
          child={{
            id: child.id,
            name: child.firstName,
            age: childAge,
          }}
          familyId={family.id}
          draftSource={draftSource}
          onSessionStart={handleSessionStart}
          onCancel={handleCancel}
          createSession={createSession}
        />

        {/* Session Timeout Warning */}
        <SessionTimeoutWarning
          show={timeoutWarning.show}
          remainingFormatted={timeoutWarning.remainingFormatted}
          remainingMs={timeoutWarning.remainingMs}
          onContinue={handleContinue}
          onSaveAndExit={handleSaveAndExit}
        />
      </main>
    </div>
  )
}

/**
 * Co-Creation Page with Suspense boundary
 *
 * Wraps content in Suspense for Next.js streaming and loading states
 */
export default function CoCreationPage() {
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
      <CoCreationPageContent />
    </Suspense>
  )
}
