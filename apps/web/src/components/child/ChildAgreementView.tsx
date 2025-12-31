/**
 * ChildAgreementView Component - Story 19C.1
 *
 * Displays the active family agreement in a child-friendly read-only view.
 *
 * Task 2: Create ChildAgreementView component (AC: #1, #4, #5)
 * Task 3: Display agreement terms (AC: #2)
 * Task 4: Display signatures (AC: #3)
 * Task 5: Add request change link (AC: #6)
 */

import React from 'react'
import type { ChildAgreement, AgreementTermDisplay } from '../../hooks/useChildAgreement'
import type { TermCategory } from '@fledgely/shared/contracts'

/**
 * Category display configuration
 */
const CATEGORY_CONFIG: Record<TermCategory, { label: string; emoji: string }> = {
  time: { label: 'Screen Time', emoji: '⏰' },
  apps: { label: 'Apps & Games', emoji: '🎮' },
  monitoring: { label: 'What Gets Tracked', emoji: '📸' },
  rewards: { label: 'Rewards', emoji: '🌟' },
  general: { label: 'Other Rules', emoji: '📋' },
}

/**
 * Inline styles using React.CSSProperties (NOT Tailwind per Epic 19B pattern)
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#f0f9ff',
    minHeight: '100%',
    padding: '16px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  title: {
    color: '#0ea5e9',
    fontSize: '24px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    color: '#0ea5e9',
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  termItem: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    borderLeft: '3px solid #0ea5e9',
  },
  termText: {
    color: '#334155',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  termParty: {
    display: 'inline-block',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '12px',
    marginTop: '6px',
  },
  parentBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  childBadge: {
    backgroundColor: '#fce7f3',
    color: '#9d174d',
  },
  monitoringCard: {
    backgroundColor: '#ecfeff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid #a5f3fc',
  },
  monitoringRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #e0f2fe',
  },
  monitoringLabel: {
    color: '#0369a1',
    fontSize: '14px',
    fontWeight: 500,
  },
  monitoringValue: {
    color: '#0c4a6e',
    fontSize: '14px',
    fontWeight: 600,
  },
  signaturesCard: {
    backgroundColor: '#fefce8',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid #fef08a',
  },
  signatureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid #fef9c3',
  },
  signatureIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  signatureInfo: {
    flex: 1,
  },
  signatureName: {
    color: '#713f12',
    fontSize: '14px',
    fontWeight: 600,
  },
  signatureDate: {
    color: '#a16207',
    fontSize: '12px',
  },
  checkmark: {
    color: '#22c55e',
    fontSize: '18px',
  },
  requestChangeButton: {
    display: 'block',
    width: '100%',
    padding: '14px',
    backgroundColor: '#ffffff',
    border: '2px dashed #0ea5e9',
    borderRadius: '12px',
    color: '#0ea5e9',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'center',
    marginTop: '16px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e0f2fe',
    borderTop: '4px solid #0ea5e9',
    borderRadius: '50%',
    // Note: CSS animation requires keyframes which can't be defined inline.
    // The component uses a keyframes style element for the spin animation.
  },
  loadingText: {
    color: '#64748b',
    fontSize: '14px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    textAlign: 'center',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '48px',
  },
  emptyTitle: {
    color: '#334155',
    fontSize: '18px',
    fontWeight: 600,
  },
  emptyText: {
    color: '#64748b',
    fontSize: '14px',
    maxWidth: '280px',
  },
  errorState: {
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
    color: '#991b1b',
  },
}

interface ChildAgreementViewProps {
  /** The agreement to display */
  agreement: ChildAgreement | null
  /** Loading state */
  loading?: boolean
  /** Error message */
  error?: string | null
  /** Handler for request change action (Story 19C.5) */
  onRequestChange?: () => void
  /** Child's name for personalized display */
  childName?: string
}

export function ChildAgreementView({
  agreement,
  loading = false,
  error = null,
  onRequestChange,
  childName = 'You',
}: ChildAgreementViewProps) {
  // Loading state
  if (loading) {
    return (
      <div style={styles.container} data-testid="child-agreement-view">
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={styles.loadingContainer} data-testid="loading-state">
          <div style={{ ...styles.loadingSpinner, animation: 'spin 1s linear infinite' }} />
          <span style={styles.loadingText}>Loading your agreement...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container} data-testid="child-agreement-view">
        <div style={styles.errorState} data-testid="error-state">
          <span style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}>😕</span>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  // Empty state - no agreement
  if (!agreement) {
    return (
      <div style={styles.container} data-testid="child-agreement-view">
        <div style={styles.emptyState} data-testid="empty-state">
          <span style={styles.emptyIcon}>📋</span>
          <h3 style={styles.emptyTitle}>No Agreement Yet</h3>
          <p style={styles.emptyText}>
            You don&apos;t have a family agreement yet. Talk to your parent about creating one
            together!
          </p>
        </div>
      </div>
    )
  }

  // Group terms by category
  const termsByCategory = agreement.terms.reduce(
    (acc, term) => {
      if (!acc[term.category]) {
        acc[term.category] = []
      }
      acc[term.category].push(term)
      return acc
    },
    {} as Record<TermCategory, AgreementTermDisplay[]>
  )

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div style={styles.container} data-testid="child-agreement-view">
      {/* Header - AC5: "This is what we agreed to together" framing */}
      <div style={styles.header}>
        <h1 style={styles.title} data-testid="agreement-title">
          Our Family Agreement
        </h1>
        <p style={styles.subtitle} data-testid="transparency-message">
          This is what we agreed to together. You can look at this anytime!
        </p>
      </div>

      {/* Monitoring Summary Card - AC2 */}
      <div style={styles.monitoringCard} data-testid="monitoring-summary">
        <h2 style={{ ...styles.sectionTitle, color: '#0369a1' }}>
          <span>📸</span> What Gets Tracked
        </h2>

        <div style={styles.monitoringRow} data-testid="screenshots-row">
          <span style={styles.monitoringLabel}>Screenshots</span>
          <span style={styles.monitoringValue}>
            {agreement.monitoring.screenshotsEnabled ? 'Yes ✓' : 'No'}
          </span>
        </div>

        {agreement.monitoring.captureFrequency && (
          <div style={styles.monitoringRow} data-testid="frequency-row">
            <span style={styles.monitoringLabel}>How often</span>
            <span style={styles.monitoringValue}>{agreement.monitoring.captureFrequency}</span>
          </div>
        )}

        {agreement.monitoring.retentionPeriod && (
          <div
            style={{ ...styles.monitoringRow, borderBottom: 'none' }}
            data-testid="retention-row"
          >
            <span style={styles.monitoringLabel}>How long kept</span>
            <span style={styles.monitoringValue}>{agreement.monitoring.retentionPeriod}</span>
          </div>
        )}
      </div>

      {/* Signatures Card - AC3 */}
      <div style={styles.signaturesCard} data-testid="signatures-card">
        <h2 style={{ ...styles.sectionTitle, color: '#92400e' }}>
          <span>✍️</span> Who Signed
        </h2>

        {agreement.signatures.map((sig, index) => (
          <div
            key={`${sig.party}-${index}`}
            style={{
              ...styles.signatureRow,
              borderBottom:
                index === agreement.signatures.length - 1
                  ? 'none'
                  : styles.signatureRow.borderBottom,
            }}
            data-testid={`signature-${sig.party}-${index}`}
          >
            <div
              style={{
                ...styles.signatureIcon,
                backgroundColor: sig.party === 'child' ? '#fce7f3' : '#dbeafe',
              }}
            >
              {sig.party === 'child' ? '👧' : '👨‍👩‍👧'}
            </div>
            <div style={styles.signatureInfo}>
              <div style={styles.signatureName}>{sig.name}</div>
              <div style={styles.signatureDate}>{formatDate(sig.signedAt)}</div>
            </div>
            <span style={styles.checkmark}>✓</span>
          </div>
        ))}
      </div>

      {/* Agreement Terms - AC4: Read-only display */}
      {Object.entries(termsByCategory).map(([category, terms]) => {
        const config = CATEGORY_CONFIG[category as TermCategory]
        return (
          <div key={category} style={styles.card} data-testid={`terms-category-${category}`}>
            <h2 style={styles.sectionTitle}>
              <span>{config.emoji}</span> {config.label}
            </h2>

            {terms.map((term) => (
              <div key={term.id} style={styles.termItem} data-testid={`term-${term.id}`}>
                <p style={styles.termText}>{term.text}</p>
                <span
                  style={{
                    ...styles.termParty,
                    ...(term.party === 'child' ? styles.childBadge : styles.parentBadge),
                  }}
                >
                  {term.party === 'child' ? childName : 'Parent'}
                </span>
              </div>
            ))}
          </div>
        )
      })}

      {/* Agreement Version & Date */}
      <div
        style={{
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '12px',
          marginBottom: '16px',
        }}
        data-testid="agreement-version"
      >
        Agreement {agreement.version} • Active since {formatDate(agreement.activatedAt)}
      </div>

      {/* Request Change Button - AC6 */}
      {onRequestChange && (
        <button
          type="button"
          style={styles.requestChangeButton}
          onClick={onRequestChange}
          data-testid="request-change-button"
        >
          💬 Want to change something? Ask your parent
        </button>
      )}
    </div>
  )
}
