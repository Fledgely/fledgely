'use client'

/**
 * CaregiverFlagDetailView Component - Story 39.5
 *
 * Detailed view of a single flag for caregivers.
 *
 * Acceptance Criteria:
 * - AC1: Flag Queue Access (screenshot, category, severity, AI reasoning, timestamp)
 * - AC2: Reviewed Flag Marking (Mark as Reviewed button)
 * - AC3: Restricted Actions (no dismiss/escalate/resolve)
 * - AC4: Flag viewing logged on mount
 */

import { useState, useEffect, useCallback } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getFirebaseApp } from '../../lib/firebase'
import { FlagInfoPanel } from '../flags/FlagInfoPanel'
import { AIReasoningPanel } from '../flags/AIReasoningPanel'
import type { FlagDocument } from '@fledgely/shared'

export interface CaregiverFlagDetailViewProps {
  /** The flag to display */
  flag: FlagDocument
  /** Family ID */
  familyId: string
  /** Child's name */
  childName: string
  /** Caregiver's display name */
  caregiverName: string
  /** Callback when view is closed */
  onClose: () => void
  /** Optional callback when flag is marked as reviewed */
  onMarkedReviewed?: () => void
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxWidth: '600px',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    minWidth: '44px',
    minHeight: '44px', // NFR49: 44px touch target
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '20px',
    color: '#6b7280',
    transition: 'all 0.15s ease',
  },
  contactNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #fcd34d',
  },
  contactIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  contactText: {
    fontSize: '14px',
    color: '#92400e',
    lineHeight: 1.5,
  },
  actionSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  markReviewedButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 24px',
    minHeight: '44px', // NFR49: 44px touch target
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  markReviewedButtonDisabled: {
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed',
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#d1fae5',
    borderRadius: '8px',
    color: '#065f46',
    fontSize: '14px',
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    color: '#b91c1c',
    fontSize: '14px',
  },
}

/**
 * CaregiverFlagDetailView - Detailed flag view for caregivers
 */
export function CaregiverFlagDetailView({
  flag,
  familyId,
  childName,
  caregiverName,
  onClose,
  onMarkedReviewed,
}: CaregiverFlagDetailViewProps) {
  const [isMarkingReviewed, setIsMarkingReviewed] = useState(false)
  const [markedSuccess, setMarkedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoggedView, setHasLoggedView] = useState(false)

  // Log the view on mount (AC4)
  useEffect(() => {
    if (hasLoggedView) return

    const logView = async () => {
      try {
        const functions = getFunctions(getFirebaseApp())
        const logCaregiverFlagView = httpsCallable(functions, 'logCaregiverFlagView')

        await logCaregiverFlagView({
          familyId,
          flagId: flag.id,
          childUid: flag.childId,
          action: 'viewed',
          flagCategory: flag.category,
          flagSeverity: flag.severity,
        })

        setHasLoggedView(true)
      } catch (err) {
        // Log error but don't show to user - viewing should still work
        console.error('Failed to log flag view:', err)
      }
    }

    logView()
  }, [flag, familyId, hasLoggedView])

  // Handle marking flag as reviewed
  const handleMarkReviewed = useCallback(async () => {
    if (isMarkingReviewed || markedSuccess) return

    setIsMarkingReviewed(true)
    setError(null)

    try {
      const functions = getFunctions(getFirebaseApp())
      const markFlagReviewedByCaregiver = httpsCallable(functions, 'markFlagReviewedByCaregiver')

      await markFlagReviewedByCaregiver({
        familyId,
        flagId: flag.id,
        childUid: flag.childId,
      })

      setMarkedSuccess(true)
      onMarkedReviewed?.()
    } catch (err) {
      console.error('Failed to mark flag as reviewed:', err)
      setError('Failed to mark as reviewed. Please try again.')
    } finally {
      setIsMarkingReviewed(false)
    }
  }, [flag, familyId, isMarkingReviewed, markedSuccess, onMarkedReviewed])

  return (
    <div style={styles.container} data-testid="caregiver-flag-detail-view">
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title} role="heading">
          Flag Details
        </h2>
        <button type="button" style={styles.closeButton} onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {/* Flag Info Panel (AC1) */}
      <FlagInfoPanel flag={flag} childName={childName} />

      {/* AI Reasoning Panel (AC1) */}
      <AIReasoningPanel reasoning={flag.reasoning} />

      {/* Contact Parent Note (AC3) */}
      <div style={styles.contactNote} data-testid="contact-parent-note">
        <span style={styles.contactIcon} role="img" aria-label="Phone">
          📞
        </span>
        <span style={styles.contactText}>
          <strong>Contact parent about concerning content.</strong>
          <br />
          Only parents can dismiss, escalate, or resolve flags. You can mark this flag as reviewed
          to let them know you&apos;ve seen it.
        </span>
      </div>

      {/* Action Section */}
      <div style={styles.actionSection}>
        {/* Success Message */}
        {markedSuccess && (
          <div style={styles.successMessage}>
            <span role="img" aria-label="Success">
              ✅
            </span>
            <span>Flag marked as reviewed by {caregiverName}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={styles.errorMessage}>
            <span role="img" aria-label="Error">
              ⚠️
            </span>
            <span>{error}</span>
          </div>
        )}

        {/* Mark as Reviewed Button (AC2) */}
        {!markedSuccess && (
          <button
            type="button"
            style={{
              ...styles.markReviewedButton,
              ...(isMarkingReviewed ? styles.markReviewedButtonDisabled : {}),
            }}
            onClick={handleMarkReviewed}
            disabled={isMarkingReviewed}
            aria-label="Mark as Reviewed"
          >
            {isMarkingReviewed ? (
              <>
                <span>Marking...</span>
              </>
            ) : (
              <>
                <span role="img" aria-label="Checkmark">
                  ✓
                </span>
                <span>Mark as Reviewed</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default CaregiverFlagDetailView
