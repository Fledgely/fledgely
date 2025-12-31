'use client'

/**
 * LearningProgressDashboard Component.
 *
 * Story 24.4: Learning Progress Dashboard - AC1, AC2, AC3, AC4, AC5, AC6
 *
 * Displays AI learning progress including:
 * - Corrections summary (total, applied, pending)
 * - Accuracy improvement percentage
 * - Learned patterns
 * - Reset option with confirmation
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useLearningDashboard } from '../../hooks/useLearningDashboard'
import { MINIMUM_CORRECTIONS_THRESHOLD } from '@fledgely/shared'

/**
 * Styles for the learning progress dashboard.
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '4px 0 0 0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#3b82f6',
    margin: 0,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '4px',
  },
  accuracyCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
  },
  accuracyValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#10b981',
    margin: 0,
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
  },
  patternsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  patternItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  patternIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    fontSize: '1rem',
  },
  patternDetails: {
    flex: 1,
  },
  patternDescription: {
    fontSize: '0.875rem',
    color: '#374151',
    margin: 0,
  },
  patternMeta: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginTop: '2px',
  },
  motivationalBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  motivationalText: {
    fontSize: '0.875rem',
    color: '#92400e',
    margin: 0,
  },
  inactiveBanner: {
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  inactiveText: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },
  progressBar: {
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    height: '8px',
    marginTop: '12px',
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#3b82f6',
    height: '100%',
    transition: 'width 0.3s ease',
  },
  resetSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '20px',
    marginTop: '20px',
  },
  resetButton: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid #fecaca',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  resetButtonDisabled: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#6b7280',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    color: '#991b1b',
    fontSize: '0.875rem',
    marginBottom: '16px',
  },
  modal: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '12px',
  },
  modalText: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '20px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    cursor: 'pointer',
  },
}

export interface LearningProgressDashboardProps {
  /** Family ID to show dashboard for */
  familyId: string
}

/**
 * Learning Progress Dashboard component.
 *
 * Story 24.4: Learning Progress Dashboard
 * Shows how AI has learned from parent corrections.
 */
export function LearningProgressDashboard({ familyId }: LearningProgressDashboardProps) {
  const { dashboardData, loading, error, refresh, resetLearning, resetting } =
    useLearningDashboard(familyId)

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle escape key for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showResetModal && !resetting) {
        setShowResetModal(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showResetModal, resetting])

  const handleResetClick = useCallback(() => {
    setShowResetModal(true)
    setResetSuccess(null)
  }, [])

  const handleConfirmReset = useCallback(async () => {
    const result = await resetLearning()
    if (result?.success) {
      setResetSuccess(result.message)
      setShowResetModal(false)
    }
  }, [resetLearning])

  const handleCancelReset = useCallback(() => {
    if (!resetting) {
      setShowResetModal(false)
    }
  }, [resetting])

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading learning progress...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <button onClick={refresh} style={styles.resetButton}>
          Try Again
        </button>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div style={styles.container}>
        <div style={styles.inactiveBanner}>
          <p style={styles.inactiveText}>No learning data available yet.</p>
        </div>
      </div>
    )
  }

  const progressPercentage = Math.min(
    100,
    (dashboardData.totalCorrections / MINIMUM_CORRECTIONS_THRESHOLD) * 100
  )

  return (
    <div style={styles.container} data-testid="learning-progress-dashboard">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>AI Learning Progress</h2>
          <p style={styles.subtitle}>See how AI has improved from your feedback</p>
        </div>
      </div>

      {/* Motivational banner - AC6 */}
      {dashboardData.isLearningActive ? (
        <div style={styles.motivationalBanner}>
          <p style={styles.motivationalText}>
            Your corrections are making a difference! AI is adapting to your family&apos;s
            preferences.
          </p>
        </div>
      ) : (
        <div style={styles.inactiveBanner}>
          <p style={styles.inactiveText}>
            Make {MINIMUM_CORRECTIONS_THRESHOLD - dashboardData.totalCorrections} more corrections
            to activate AI learning for your family.
          </p>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progressPercentage}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Stats grid - AC1 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statValue}>{dashboardData.totalCorrections}</p>
          <p style={styles.statLabel}>Total Corrections</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statValue}>{dashboardData.appliedCorrections}</p>
          <p style={styles.statLabel}>Applied to Model</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statValue}>{dashboardData.pendingCorrections}</p>
          <p style={styles.statLabel}>Pending</p>
        </div>
        {/* Accuracy improvement - AC2 */}
        <div style={styles.accuracyCard}>
          <p style={styles.accuracyValue}>+{dashboardData.accuracyImprovement}%</p>
          <p style={styles.statLabel}>Accuracy Improvement</p>
        </div>
      </div>

      {/* Learned patterns - AC3 */}
      {dashboardData.learnedPatterns.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Learned Patterns</h3>
          <ul style={styles.patternsList}>
            {dashboardData.learnedPatterns.map((pattern, index) => (
              <li key={index} style={styles.patternItem}>
                <div style={styles.patternIcon}>
                  {pattern.category === 'Violence'
                    ? '🎮'
                    : pattern.category === 'Adult Content'
                      ? '🔒'
                      : pattern.category === 'Bullying'
                        ? '🛡️'
                        : pattern.category === 'Explicit Language'
                          ? '💬'
                          : '📊'}
                </div>
                <div style={styles.patternDetails}>
                  <p style={styles.patternDescription}>{pattern.description}</p>
                  <p style={styles.patternMeta}>
                    {pattern.category} • {pattern.count} corrections
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reset section - AC5 */}
      <div style={styles.resetSection}>
        <button
          style={
            dashboardData.totalCorrections > 0 ? styles.resetButton : styles.resetButtonDisabled
          }
          onClick={handleResetClick}
          disabled={dashboardData.totalCorrections === 0 || resetting}
          data-testid="reset-learning-button"
        >
          {resetting ? 'Resetting...' : 'Reset Learning Data'}
        </button>
        {resetSuccess && (
          <p style={{ ...styles.patternMeta, marginTop: '8px', color: '#10b981' }}>
            {resetSuccess}
          </p>
        )}
      </div>

      {/* Reset confirmation modal */}
      {showResetModal && (
        <div style={styles.modal} onClick={handleCancelReset}>
          <div style={styles.modalContent} ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Reset Learning Data?</h3>
            <p style={styles.modalText}>
              This will clear all AI learning based on your {dashboardData.totalCorrections}{' '}
              corrections. The AI will return to default behavior for your family. This action
              cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={handleCancelReset} disabled={resetting}>
                Cancel
              </button>
              <button
                style={styles.confirmButton}
                onClick={handleConfirmReset}
                disabled={resetting}
                data-testid="confirm-reset-button"
              >
                {resetting ? 'Resetting...' : 'Reset Learning'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
