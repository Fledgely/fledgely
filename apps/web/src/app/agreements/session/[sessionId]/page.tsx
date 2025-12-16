'use client'

import { useState, useCallback, useEffect, Suspense, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useFamily } from '@/hooks/useFamily'
import { useCoCreationSession } from '@/hooks/useCoCreationSession'
import {
  VisualAgreementBuilder,
  AddTermModal,
  getTermTypeLabel,
} from '@/components/co-creation/builder'
import { SessionTimeoutWarning } from '@/components/co-creation'
import {
  addSessionTerm,
  updateSessionTerm,
} from '@/services/coCreationSessionService'
import type {
  SessionTerm,
  SessionTermType,
  SessionTermStatus,
  SessionContributor,
} from '@fledgely/contracts'

/**
 * Session Builder Page
 *
 * Story 5.2: Visual Agreement Builder - Task 8
 *
 * Main page for building agreements using the visual builder.
 * Integrates VisualAgreementBuilder with session management.
 *
 * Features:
 * - Load session data with useCoCreationSession hook
 * - Visual term management with drag-and-drop
 * - Add/edit term modal integration
 * - Session timeout warning handling
 * - Auto-save via term operations
 */

/**
 * New term data from AddTermModal
 */
interface NewTermData {
  type: SessionTermType
  content: Record<string, unknown>
}

function SessionBuilderContent() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const { family, loading: familyLoading, hasFamily } = useFamily()

  const sessionId = params.sessionId as string

  // Co-creation session management
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
    isActive,
    pauseSession,
    resumeSession,
    recordContribution,
    completeSession,
    timeoutWarning,
    markActivity,
    refreshSession,
  } = useCoCreationSession(sessionId)

  // Local state
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTerm, setEditingTerm] = useState<SessionTerm | null>(null)
  const [initialTermType, setInitialTermType] = useState<SessionTermType | undefined>()
  const [operationError, setOperationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Current contributor (for MVP, defaults to parent - future: toggle between parent/child)
  const [currentContributor] = useState<SessionContributor>('parent')

  // Clear operation errors after display
  useEffect(() => {
    if (operationError) {
      const timeout = setTimeout(() => setOperationError(null), 5000)
      return () => clearTimeout(timeout)
    }
  }, [operationError])

  /**
   * Handle term selection
   */
  const handleTermSelect = useCallback((term: SessionTerm | null) => {
    setSelectedTermId(term?.id ?? null)
  }, [])

  /**
   * Handle opening add term modal
   */
  const handleAddTerm = useCallback((type?: SessionTermType) => {
    setInitialTermType(type)
    setEditingTerm(null)
    setIsAddModalOpen(true)
  }, [])

  /**
   * Handle opening edit modal for a term
   */
  const handleEditTerm = useCallback((term: SessionTerm) => {
    setEditingTerm(term)
    setInitialTermType(undefined)
    setIsAddModalOpen(true)
  }, [])

  /**
   * Handle saving a term (add or edit)
   */
  const handleSaveTerm = useCallback(
    async (termData: NewTermData) => {
      if (!sessionId) return

      setIsSaving(true)
      setOperationError(null)

      try {
        if (editingTerm) {
          // Update existing term
          const result = await updateSessionTerm({
            sessionId,
            termId: editingTerm.id,
            contributor: currentContributor,
            content: termData.content,
          })

          if (!result.success) {
            setOperationError(result.error || 'Failed to update term')
            return
          }
        } else {
          // Add new term
          const result = await addSessionTerm({
            sessionId,
            contributor: currentContributor,
            type: termData.type,
            content: termData.content,
          })

          if (!result.success) {
            setOperationError(result.error || 'Failed to add term')
            return
          }
        }

        // Refresh session to get updated terms
        await refreshSession()

        // Close modal
        setIsAddModalOpen(false)
        setEditingTerm(null)
        setInitialTermType(undefined)
      } catch (error) {
        console.error('[SessionBuilder.handleSaveTerm]', error)
        setOperationError('An unexpected error occurred')
      } finally {
        setIsSaving(false)
      }
    },
    [sessionId, editingTerm, currentContributor, refreshSession]
  )

  /**
   * Handle term status change
   */
  const handleTermStatusChange = useCallback(
    async (term: SessionTerm, status: SessionTermStatus) => {
      if (!sessionId) return

      setOperationError(null)

      try {
        const result = await updateSessionTerm({
          sessionId,
          termId: term.id,
          contributor: currentContributor,
          status,
        })

        if (!result.success) {
          setOperationError(result.error || 'Failed to update term status')
          return
        }

        // Refresh session to get updated terms
        await refreshSession()
      } catch (error) {
        console.error('[SessionBuilder.handleTermStatusChange]', error)
        setOperationError('An unexpected error occurred')
      }
    },
    [sessionId, currentContributor, refreshSession]
  )

  /**
   * Handle term reorder (via drag-and-drop)
   */
  const handleTermReorder = useCallback(
    async (termId: string, oldIndex: number, newIndex: number) => {
      if (!sessionId) return

      // Record the contribution
      await recordContribution({
        contributor: currentContributor,
        action: 'modified_term',
        termId,
        details: { previousOrder: oldIndex, newOrder: newIndex },
      })
    },
    [sessionId, currentContributor, recordContribution]
  )

  /**
   * Handle modal close
   */
  const handleModalClose = useCallback(() => {
    setIsAddModalOpen(false)
    setEditingTerm(null)
    setInitialTermType(undefined)
  }, [])

  /**
   * Handle save and exit from timeout warning
   */
  const handleSaveAndExit = useCallback(async () => {
    await pauseSession()
    router.push('/dashboard')
  }, [pauseSession, router])

  /**
   * Handle continue from timeout warning
   */
  const handleContinue = useCallback(() => {
    markActivity()
  }, [markActivity])

  /**
   * Handle pause session
   */
  const handlePause = useCallback(async () => {
    const result = await pauseSession()
    if (result.success) {
      router.push('/dashboard')
    } else {
      setOperationError(result.error || 'Failed to pause session')
    }
  }, [pauseSession, router])

  /**
   * Handle finish/complete session
   */
  const handleFinish = useCallback(async () => {
    const result = await completeSession()
    if (result.success) {
      // Navigate to signing flow (Epic 6)
      router.push(`/agreements/sign/${sessionId}`)
    } else {
      setOperationError(result.error || 'Failed to complete session')
    }
  }, [completeSession, sessionId, router])

  // Sorted terms for display
  const sortedTerms = useMemo(() => {
    if (!session?.terms) return []
    return [...session.terms].sort((a, b) => a.order - b.order)
  }, [session?.terms])

  // Loading state while auth is checking
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-5xl">
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
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              You need to be signed in to access this session.
            </p>
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Loading session
  if (sessionLoading || familyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading session...</p>
          </div>
        </main>
      </div>
    )
  }

  // Session error or not found
  if (sessionError || !session) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Session Not Found</h1>
            <p className="text-muted-foreground mb-6">
              {sessionError?.message || 'Could not find this session.'}
            </p>
            <Link href="/dashboard" className="text-primary hover:underline">
              Go to Dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Session is completed
  if (session.status === 'completed') {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Session Completed</h1>
            <p className="text-muted-foreground mb-6">
              This session has been completed and is ready for signing.
            </p>
            <Link
              href={`/agreements/sign/${sessionId}`}
              className="text-primary hover:underline"
            >
              Go to Signing
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Session is paused
  if (session.status === 'paused') {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold mb-4">Session Paused</h1>
            <p className="text-muted-foreground mb-6">
              This session is paused. Resume when you're ready to continue.
            </p>
            <button
              onClick={() => resumeSession()}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]"
            >
              Resume Session
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800"
      data-testid="session-builder-page"
    >
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <button
              onClick={handlePause}
              className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-flex items-center min-h-[44px] min-w-[44px]"
              aria-label="Save and exit to dashboard"
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
              Save &amp; Exit
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Build Your Agreement
            </h1>
            <p className="text-sm text-muted-foreground">
              Work together to create rules everyone agrees on
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePause}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
            >
              Pause
            </button>
            <button
              onClick={handleFinish}
              disabled={sortedTerms.length === 0}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              aria-label={sortedTerms.length === 0 ? 'Add terms before finishing' : 'Finish and go to signing'}
            >
              Finish
            </button>
          </div>
        </div>

        {/* Operation error toast */}
        {operationError && (
          <div
            role="alert"
            className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300"
          >
            {operationError}
          </div>
        )}

        {/* Visual Agreement Builder */}
        <VisualAgreementBuilder
          terms={sortedTerms}
          currentContributor={currentContributor}
          selectedTermId={selectedTermId ?? undefined}
          onTermSelect={handleTermSelect}
          onTermEdit={handleEditTerm}
          onTermStatusChange={handleTermStatusChange}
          onTermReorder={handleTermReorder}
          onAddTerm={handleAddTerm}
          groupByCategory
        />

        {/* Add/Edit Term Modal */}
        <AddTermModal
          isOpen={isAddModalOpen}
          onClose={handleModalClose}
          onSave={handleSaveTerm}
          contributor={currentContributor}
          editingTerm={editingTerm ?? undefined}
          initialType={initialTermType}
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
 * Session Builder Page with Suspense boundary
 */
export default function SessionBuilderPage() {
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
      <SessionBuilderContent />
    </Suspense>
  )
}
