'use client'

/**
 * Child Check-In Response Page
 *
 * Story 27.5.2: Check-In Response Interface - AC1, AC2, AC3, AC4
 *
 * Child-friendly version of the check-in response page with:
 * - Larger emojis and simpler language (AC1)
 * - Age-appropriate follow-up prompts (AC2)
 * - Optional free-text notes (AC3)
 * - Skip option (AC4)
 * - Privacy reassurance message
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ChildAuthGuard } from '../../../../components/child/ChildAuthGuard'
import { useChildAuth } from '../../../../contexts/ChildAuthContext'
import { EmojiRatingScale } from '../../../../components/health/EmojiRatingScale'
import { getFirestoreDb } from '../../../../lib/firebase'
import type { HealthCheckIn, CheckInRating, CheckInResponse } from '@fledgely/shared'

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f9ff',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #bae6fd',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0369a1',
    textDecoration: 'none',
  },
  logoIcon: {
    fontSize: '1.75rem',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#ffffff',
    color: '#0369a1',
    border: '2px solid #7dd3fc',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    minHeight: '48px',
  },
  content: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e0f2fe',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0c4a6e',
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#0369a1',
    marginBottom: '24px',
    textAlign: 'center' as const,
    lineHeight: 1.6,
  },
  privacyNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#ecfdf5',
    borderRadius: '12px',
    marginBottom: '32px',
    fontSize: '14px',
    color: '#065f46',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0c4a6e',
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  textarea: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #bae6fd',
    fontSize: '16px',
    lineHeight: 1.6,
    resize: 'vertical' as const,
    minHeight: '120px',
    fontFamily: 'inherit',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginTop: '32px',
  },
  submitButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 32px',
    backgroundColor: '#0ea5e9',
    color: '#ffffff',
    borderRadius: '12px',
    border: 'none',
    fontSize: '18px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    minHeight: '56px',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  skipButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 24px',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: '52px',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '16px',
    color: '#dc2626',
    fontSize: '16px',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  successMessage: {
    textAlign: 'center' as const,
    padding: '48px 24px',
  },
  successIcon: {
    fontSize: '80px',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0ea5e9',
    marginBottom: '8px',
  },
  successText: {
    fontSize: '1.125rem',
    color: '#0369a1',
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    color: '#0369a1',
    fontSize: '1.125rem',
  },
}

const CHILD_FOLLOW_UP_QUESTIONS: Record<CheckInRating, { title: string; placeholder: string }> = {
  positive: {
    title: "That's great! What's been good?",
    placeholder: 'Tell us what you like...',
  },
  neutral: {
    title: 'What could be better?',
    placeholder: 'Tell us what you think...',
  },
  concerned: {
    title: "We're sorry to hear that. What's hard?",
    placeholder: "Tell us what's bothering you...",
  },
}

function ChildCheckInContent() {
  const params = useParams()
  const checkInId = params.checkInId as string
  const { childSession } = useChildAuth()

  const [checkIn, setCheckIn] = useState<HealthCheckIn | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [skipped, setSkipped] = useState(false)

  // Response state
  const [rating, setRating] = useState<CheckInRating | null>(null)
  const [followUp, setFollowUp] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  // Load check-in data from Firestore
  useEffect(() => {
    if (!childSession?.childId) return

    const loadCheckIn = async () => {
      try {
        const db = getFirestoreDb()
        const checkInRef = doc(db, 'healthCheckIns', checkInId)
        const checkInDoc = await getDoc(checkInRef)

        if (!checkInDoc.exists()) {
          setError('Check-in not found')
        } else {
          const data = checkInDoc.data() as HealthCheckIn

          // Verify this check-in belongs to the child
          if (data.recipientUid !== childSession.childId) {
            setError('Check-in not found')
          } else if (data.status !== 'pending') {
            setError('This check-in has already been completed')
          } else {
            setCheckIn(data)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load check-in')
      } finally {
        setLoading(false)
      }
    }

    loadCheckIn()
  }, [childSession?.childId, checkInId])

  const handleSubmit = async () => {
    if (!rating || !childSession || !checkIn) return

    setSubmitting(true)
    setError(null)

    try {
      const db = getFirestoreDb()
      const checkInRef = doc(db, 'healthCheckIns', checkInId)

      const response: CheckInResponse = {
        rating,
        followUp: followUp.trim() || null,
        additionalNotes: additionalNotes.trim() || null,
      }

      await updateDoc(checkInRef, {
        response,
        respondedAt: Date.now(),
        status: 'completed',
      })

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    if (!childSession || !checkIn) return

    setSubmitting(true)
    setError(null)

    try {
      const db = getFirestoreDb()
      const checkInRef = doc(db, 'healthCheckIns', checkInId)

      await updateDoc(checkInRef, {
        status: 'skipped',
        respondedAt: Date.now(),
      })

      setSkipped(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip check-in')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (submitted || skipped) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <a href="/child/dashboard" style={styles.logo}>
            <span style={styles.logoIcon}>🐣</span>
            <span>Fledgely</span>
          </a>
        </header>
        <div style={styles.content}>
          <div style={styles.card}>
            <div style={styles.successMessage}>
              <div style={styles.successIcon} role="img" aria-hidden="true">
                {skipped ? '⏭️' : '🎉'}
              </div>
              <h1 style={styles.successTitle}>{skipped ? 'Skipped!' : 'Thanks!'}</h1>
              <p style={styles.successText}>
                {skipped
                  ? "No problem! We'll ask again later."
                  : 'Thanks for sharing how you feel!'}
              </p>
              <a href="/child/dashboard" style={{ ...styles.submitButton, textDecoration: 'none' }}>
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <a href="/child/dashboard" style={styles.logo}>
          <span style={styles.logoIcon}>🐣</span>
          <span>Fledgely</span>
        </a>
        <a href="/child/dashboard" style={styles.backButton}>
          ← Back
        </a>
      </header>

      <div style={styles.content}>
        <div style={styles.card}>
          <h1 style={styles.title}>How are things going? 💭</h1>
          <p style={styles.subtitle}>
            We want to know how you feel about mom and dad looking at your phone and computer.
          </p>

          {/* Privacy reassurance */}
          <div style={styles.privacyNote}>
            <span role="img" aria-hidden="true">
              🔒
            </span>
            <span>Your answers are private</span>
          </div>

          {error && <div style={styles.errorMessage}>{error}</div>}

          {/* AC1: Emoji Rating Scale - child version */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Pick one:</h2>
            <EmojiRatingScale value={rating} onChange={setRating} isChild />
          </div>

          {/* AC2: Follow-up question based on rating */}
          {rating && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>{CHILD_FOLLOW_UP_QUESTIONS[rating].title}</h2>
              <textarea
                style={styles.textarea}
                placeholder={CHILD_FOLLOW_UP_QUESTIONS[rating].placeholder}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                maxLength={500}
                aria-label={CHILD_FOLLOW_UP_QUESTIONS[rating].title}
              />
            </div>
          )}

          {/* AC3: Optional additional notes */}
          {rating && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Anything else? (you don&apos;t have to)</h2>
              <textarea
                style={styles.textarea}
                placeholder="Write here if you want to..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                maxLength={1000}
                aria-label="Anything else"
              />
            </div>
          )}

          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!rating || submitting}
              style={{
                ...styles.submitButton,
                ...(!rating || submitting ? styles.submitButtonDisabled : {}),
              }}
              aria-label="Submit your answer"
            >
              {submitting ? 'Sending...' : 'Done! ✓'}
            </button>

            {/* AC4: Skip option */}
            <button
              type="button"
              onClick={handleSkip}
              disabled={submitting}
              style={styles.skipButton}
              aria-label="Skip for now"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChildCheckInPage() {
  return (
    <ChildAuthGuard>
      <ChildCheckInContent />
    </ChildAuthGuard>
  )
}
