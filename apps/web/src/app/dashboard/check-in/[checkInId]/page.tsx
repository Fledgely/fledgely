'use client'

/**
 * Guardian Check-In Response Page
 *
 * Story 27.5.2: Check-In Response Interface - AC1, AC2, AC3, AC4, AC5
 *
 * Allows guardians to respond to health check-ins with:
 * - Emoji rating scale (AC1)
 * - Follow-up questions based on rating (AC2)
 * - Optional free-text notes (AC3)
 * - Skip option (AC4)
 * - Quick completion time (AC5)
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { EmojiRatingScale } from '../../../../components/health/EmojiRatingScale'
import type { HealthCheckIn, CheckInRating, CheckInResponse } from '@fledgely/shared'
import { getIdToken } from 'firebase/auth'

const styles = {
  main: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1f2937',
    textDecoration: 'none',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  content: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '48px 24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '32px',
    textAlign: 'center' as const,
    lineHeight: 1.6,
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '16px',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    lineHeight: 1.6,
    resize: 'vertical' as const,
    minHeight: '100px',
    fontFamily: 'inherit',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '32px',
  },
  submitButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 32px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    minHeight: '48px',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  skipButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: '48px',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  successMessage: {
    textAlign: 'center' as const,
    padding: '48px 24px',
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#10b981',
    marginBottom: '8px',
  },
  successText: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '24px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    color: '#6b7280',
  },
}

const FOLLOW_UP_QUESTIONS: Record<CheckInRating, { title: string; placeholder: string }> = {
  positive: {
    title: "What's working well?",
    placeholder: "Share what's been going well with the monitoring arrangement...",
  },
  neutral: {
    title: 'Is there anything that could be better?',
    placeholder: 'Let us know if there are any concerns or suggestions...',
  },
  concerned: {
    title: "What's been difficult?",
    placeholder: "Share what's been challenging about the monitoring...",
  },
}

export default function GuardianCheckInPage() {
  const router = useRouter()
  const params = useParams()
  const checkInId = params.checkInId as string
  const { firebaseUser, loading: authLoading } = useAuth()

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

  // Load check-in data
  useEffect(() => {
    if (authLoading || !firebaseUser) return

    const loadCheckIn = async () => {
      try {
        const token = await getIdToken(firebaseUser)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL}/api/health/check-ins/pending`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to load check-in')
        }

        const checkIns: HealthCheckIn[] = await response.json()
        const found = checkIns.find((c) => c.id === checkInId)

        if (!found) {
          setError('Check-in not found or already completed')
        } else {
          setCheckIn(found)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load check-in')
      } finally {
        setLoading(false)
      }
    }

    loadCheckIn()
  }, [authLoading, firebaseUser, checkInId])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  const handleSubmit = async () => {
    if (!rating || !firebaseUser || !checkIn) return

    setSubmitting(true)
    setError(null)

    try {
      const token = await getIdToken(firebaseUser)
      const response: CheckInResponse = {
        rating,
        followUp: followUp.trim() || null,
        additionalNotes: additionalNotes.trim() || null,
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL}/api/health/check-ins/${checkInId}/respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ response }),
        }
      )

      if (!res.ok) {
        throw new Error('Failed to submit response')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    if (!firebaseUser || !checkIn) return

    setSubmitting(true)
    setError(null)

    try {
      const token = await getIdToken(firebaseUser)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL}/api/health/check-ins/${checkInId}/skip`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!res.ok) {
        throw new Error('Failed to skip check-in')
      }

      setSkipped(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip check-in')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <main style={styles.main}>
        <div style={styles.loading}>Loading...</div>
      </main>
    )
  }

  if (submitted || skipped) {
    return (
      <main style={styles.main}>
        <header style={styles.header}>
          <a href="/" style={styles.logo}>
            Fledgely
          </a>
        </header>
        <div style={styles.content}>
          <div style={styles.card}>
            <div style={styles.successMessage}>
              <div style={styles.successIcon} role="img" aria-hidden="true">
                {skipped ? '⏭️' : '✅'}
              </div>
              <h1 style={styles.successTitle}>{skipped ? 'Check-In Skipped' : 'Thank You!'}</h1>
              <p style={styles.successText}>
                {skipped
                  ? "No problem. We'll check in again next period."
                  : 'Your feedback helps us understand how monitoring is going for your family.'}
              </p>
              <a href="/dashboard" style={{ ...styles.submitButton, textDecoration: 'none' }}>
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <a href="/" style={styles.logo}>
          Fledgely
        </a>
        <a href="/dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </a>
      </header>

      <div style={styles.content}>
        <div style={styles.card}>
          <h1 style={styles.title}>Family Check-In</h1>
          <p style={styles.subtitle}>
            Take a moment to reflect on how monitoring is going with your family. Your responses are
            private.
          </p>

          {error && <div style={styles.errorMessage}>{error}</div>}

          {/* AC1: Emoji Rating Scale */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>How are things going?</h2>
            <EmojiRatingScale value={rating} onChange={setRating} />
          </div>

          {/* AC2: Follow-up question based on rating */}
          {rating && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>{FOLLOW_UP_QUESTIONS[rating].title}</h2>
              <textarea
                style={styles.textarea}
                placeholder={FOLLOW_UP_QUESTIONS[rating].placeholder}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                maxLength={500}
                aria-label={FOLLOW_UP_QUESTIONS[rating].title}
              />
            </div>
          )}

          {/* AC3: Optional additional notes */}
          {rating && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Anything else to share? (optional)</h2>
              <textarea
                style={styles.textarea}
                placeholder="Any other thoughts or suggestions..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                maxLength={1000}
                aria-label="Additional notes"
              />
            </div>
          )}

          <div style={styles.buttonGroup}>
            {/* AC4: Skip option */}
            <button
              type="button"
              onClick={handleSkip}
              disabled={submitting}
              style={styles.skipButton}
              aria-label="Skip this check-in"
            >
              Skip this month
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!rating || submitting}
              style={{
                ...styles.submitButton,
                ...(!rating || submitting ? styles.submitButtonDisabled : {}),
              }}
              aria-label="Submit check-in response"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
