'use client'

/**
 * Child Annotation Page - Story 23.2
 *
 * Allows children to add context/explanation to flagged content.
 *
 * AC1: Screenshot with flag category display
 * AC6: Timer visibility on annotation screen
 *
 * Task 3: Create annotation page route
 * - 3.1 Create page.tsx
 * - 3.2 Wrap with ChildAuthGuard
 * - 3.3 Fetch flag by flagId
 * - 3.4 Verify flag belongs to authenticated child
 * - 3.5 Display timer from annotation deadline
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirestoreDb } from '../../../../lib/firebase'
import { ChildAuthGuard } from '../../../../components/child/ChildAuthGuard'
import { useChildAuth } from '../../../../contexts/ChildAuthContext'
import { ChildAnnotationView } from '../../../../components/child/ChildAnnotationView'
import {
  getRemainingTime,
  formatRemainingTime,
} from '../../../../services/childFlagNotificationService'
import {
  submitAnnotation,
  skipAnnotation,
  requestExtension,
  type AnnotationResult,
} from '../../../../services/annotationService'
import type { FlagDocument, AnnotationOption } from '@fledgely/shared'

/**
 * Styles for annotation page
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#fef3c7', // amber-100
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #fcd34d', // amber-300
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '2px solid #fcd34d',
    borderRadius: '8px',
    color: '#92400e',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#92400e',
    margin: 0,
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#fef3c7',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#b45309',
  },
  timerPaused: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#d1fae5',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#065f46',
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    fontSize: '1rem',
    color: '#92400e',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '2px solid #fecaca',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
    color: '#991b1b',
  },
  success: {
    backgroundColor: '#d1fae5',
    border: '2px solid #a7f3d0',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
    color: '#065f46',
  },
}

/**
 * Annotation page content component
 */
function AnnotationPageContent() {
  const router = useRouter()
  const params = useParams()
  const flagId = params?.flagId as string | undefined
  const { childSession } = useChildAuth()

  const [flag, setFlag] = useState<FlagDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [remainingMs, setRemainingMs] = useState(0)
  // Story 23.3 AC4: Timer pause while typing
  const [isTyping, setIsTyping] = useState(false)
  // Story 23.3 AC5: Extension request
  const [extensionRequested, setExtensionRequested] = useState(false)
  const [requestingExtension, setRequestingExtension] = useState(false)

  // Fetch flag document
  useEffect(() => {
    if (!flagId || !childSession?.childId) {
      setLoading(false)
      return
    }

    const flagRef = doc(getFirestoreDb(), 'children', childSession.childId, 'flags', flagId)

    const unsubscribe = onSnapshot(
      flagRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setError('Flag not found')
          setLoading(false)
          return
        }

        const flagData = snapshot.data() as FlagDocument

        // Verify flag belongs to this child
        if (flagData.childId !== childSession.childId) {
          setError('You cannot annotate this flag')
          setLoading(false)
          return
        }

        // Check if already annotated
        if (flagData.childNotificationStatus === 'annotated') {
          setSuccess(true)
          setLoading(false)
          return
        }

        // Check if can annotate
        // Story 23.5 AC4: Allow 'skipped' status if parent hasn't reviewed yet
        const canAnnotateStatus =
          flagData.childNotificationStatus === 'notified' ||
          (flagData.childNotificationStatus === 'skipped' && flagData.status === 'pending')

        if (!canAnnotateStatus) {
          setError('This flag is not awaiting your annotation')
          setLoading(false)
          return
        }

        setFlag(flagData)
        // Use effective deadline (extension if granted, otherwise original)
        const effectiveDeadline = flagData.extensionDeadline ?? flagData.annotationDeadline ?? 0
        setRemainingMs(getRemainingTime(effectiveDeadline))
        // Story 23.3 AC5: Check if extension was already requested
        if (flagData.extensionRequestedAt) {
          setExtensionRequested(true)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching flag:', err)
        setError('Failed to load flag')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [flagId, childSession?.childId])

  // Update timer every second
  // Story 23.3 AC4: Timer pauses while typing
  useEffect(() => {
    const effectiveDeadline = flag?.extensionDeadline ?? flag?.annotationDeadline
    if (!effectiveDeadline) return

    // Don't update timer while typing (visual pause)
    if (isTyping) return

    const interval = setInterval(() => {
      const remaining = getRemainingTime(effectiveDeadline)
      setRemainingMs(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [flag?.annotationDeadline, flag?.extensionDeadline, isTyping])

  const handleSubmit = useCallback(
    async (annotation: AnnotationOption, explanation?: string) => {
      if (!flagId || !childSession?.childId) return

      setSubmitting(true)

      const result: AnnotationResult = await submitAnnotation({
        flagId,
        childId: childSession.childId,
        annotation,
        explanation,
      })

      setSubmitting(false)

      if (result.success) {
        setSuccess(true)
        // Redirect after short delay
        setTimeout(() => {
          router.push('/child/dashboard')
        }, 1500)
      } else {
        setError(result.error || 'Failed to submit annotation')
      }
    },
    [flagId, childSession?.childId, router]
  )

  const handleSkip = useCallback(async () => {
    if (!flagId || !childSession?.childId) return

    setSubmitting(true)

    const result = await skipAnnotation(childSession.childId, flagId)

    setSubmitting(false)

    if (result.success) {
      router.push('/child/dashboard')
    } else {
      setError(result.error || 'Failed to skip annotation')
    }
  }, [flagId, childSession?.childId, router])

  const handleBack = useCallback(() => {
    router.push('/child/dashboard')
  }, [router])

  /**
   * Story 23.3 AC4: Handle typing state change
   */
  const handleTypingChange = useCallback((typing: boolean) => {
    setIsTyping(typing)
  }, [])

  /**
   * Story 23.3 AC5: Handle extension request
   */
  const handleRequestExtension = useCallback(async () => {
    if (!flagId || !childSession?.childId || extensionRequested || requestingExtension) return

    setRequestingExtension(true)

    const result = await requestExtension(childSession.childId, flagId)

    setRequestingExtension(false)

    if (result.success && result.extensionDeadline) {
      setExtensionRequested(true)
      setRemainingMs(getRemainingTime(result.extensionDeadline))
    } else {
      setError(result.error || 'Failed to request extension')
    }
  }, [flagId, childSession?.childId, extensionRequested, requestingExtension])

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <button type="button" style={styles.backButton} onClick={handleBack}>
            ← Back
          </button>
          <h1 style={styles.title}>Add Your Side</h1>
          <div />
        </header>
        <main style={styles.main}>
          <div style={styles.error}>
            <p>{error}</p>
            <button
              type="button"
              style={{ ...styles.backButton, marginTop: '16px' }}
              onClick={handleBack}
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div />
          <h1 style={styles.title}>Thank You!</h1>
          <div />
        </header>
        <main style={styles.main}>
          <div style={styles.success}>
            <p style={{ fontSize: '1.25rem', marginBottom: '8px' }}>
              ✅ Your explanation was saved
            </p>
            <p style={{ opacity: 0.8 }}>Redirecting to dashboard...</p>
          </div>
        </main>
      </div>
    )
  }

  // Main annotation view
  return (
    <div style={styles.container} data-testid="annotation-page">
      <header style={styles.header}>
        <button type="button" style={styles.backButton} onClick={handleBack}>
          ← Back
        </button>
        <h1 style={styles.title}>Add Your Side</h1>
        {/* Story 23.3 AC4: Show timer paused when typing */}
        <div
          style={isTyping ? styles.timerPaused : styles.timer}
          role="timer"
          aria-label={
            isTyping
              ? 'Timer paused - you are typing'
              : `Time remaining: ${formatRemainingTime(remainingMs)}`
          }
          data-testid="timer-display"
        >
          {isTyping ? '✏️ Paused - typing' : `⏱️ ${formatRemainingTime(remainingMs)}`}
        </div>
      </header>

      <main style={styles.main}>
        {flag && (
          <ChildAnnotationView
            flag={flag}
            onSubmit={handleSubmit}
            onSkip={handleSkip}
            submitting={submitting}
            onTypingChange={handleTypingChange}
            onRequestExtension={handleRequestExtension}
            extensionRequested={extensionRequested}
            requestingExtension={requestingExtension}
            remainingMs={remainingMs}
          />
        )}
      </main>
    </div>
  )
}

/**
 * Child Annotation Page - Protected by ChildAuthGuard
 */
export default function ChildAnnotatePage() {
  return (
    <ChildAuthGuard>
      <AnnotationPageContent />
    </ChildAuthGuard>
  )
}
