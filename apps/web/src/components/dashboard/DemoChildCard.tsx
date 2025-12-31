'use client'

/**
 * DemoChildCard Component
 *
 * Story 8.5.1: Demo Child Profile Creation
 *
 * Displays a demo child profile for new parents.
 * Uses distinct visual styling to differentiate from real children.
 *
 * Acceptance Criteria:
 * - AC2: Clear demo label ("Demo - Sample Data")
 * - AC4: Distinct styling (dashed border, different background)
 * - AC5: Dismissible with confirmation
 */

import { useState } from 'react'
import type { DemoChild } from '../../hooks/useDemo'
import type { DemoActivitySummary } from '../../data/demoData'

/**
 * Props for DemoChildCard component
 */
export interface DemoChildCardProps {
  /** The demo child profile */
  demoChild: DemoChild
  /** Activity summary for demo display */
  activitySummary: DemoActivitySummary
  /** Callback when user dismisses demo */
  onDismiss: () => Promise<void>
  /** Whether dismiss is in progress */
  dismissing?: boolean
  /** Callback when user wants to explore demo (navigate to detail view) */
  onExplore?: () => void
}

/**
 * Calculate age from birthdate
 */
function calculateAge(birthdate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthdate.getFullYear()
  const monthDiff = today.getMonth() - birthdate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--
  }
  return age
}

/**
 * Demo badge styling constant
 */
const DEMO_BADGE_STYLES: React.CSSProperties = {
  backgroundColor: '#ede9fe',
  color: '#6d28d9',
  fontSize: '11px',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '12px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
}

/**
 * DemoChildCard - Demo profile card for new parents
 */
export function DemoChildCard({
  demoChild,
  activitySummary,
  onDismiss,
  dismissing = false,
  onExplore,
}: DemoChildCardProps) {
  const [showDismissConfirm, setShowDismissConfirm] = useState(false)

  const age = calculateAge(demoChild.birthdate)

  // Card styles - distinct from real children
  const cardStyles: React.CSSProperties = {
    backgroundColor: '#faf5ff', // Light purple/lavender
    border: '2px dashed #c4b5fd', // Dashed purple border
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    position: 'relative',
  }

  // Demo banner at top
  const bannerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  }

  // Avatar styles (demo-specific)
  const avatarStyles: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#ddd6fe', // Purple-100
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    color: '#7c3aed', // Purple-600
    fontWeight: 600,
    marginRight: '12px',
    flexShrink: 0,
  }

  const contentStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '12px',
  }

  const infoStyles: React.CSSProperties = {
    flex: 1,
  }

  const nameStyles: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const ageStyles: React.CSSProperties = {
    fontSize: '13px',
    color: '#6b7280',
  }

  // Status message styles
  const statusStyles: React.CSSProperties = {
    backgroundColor: '#f0fdf4', // Green-50
    border: '1px solid #bbf7d0', // Green-200
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const buttonContainerStyles: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  }

  const primaryButtonStyles: React.CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#7c3aed', // Purple-600
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  }

  const secondaryButtonStyles: React.CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: dismissing ? 'wait' : 'pointer',
    opacity: dismissing ? 0.5 : 1,
  }

  const confirmOverlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  }

  const handleDismissClick = () => {
    setShowDismissConfirm(true)
  }

  const handleConfirmDismiss = async () => {
    await onDismiss()
    setShowDismissConfirm(false)
  }

  const handleCancelDismiss = () => {
    setShowDismissConfirm(false)
  }

  return (
    <div style={cardStyles} data-testid="demo-child-card">
      {/* Demo Banner */}
      <div style={bannerStyles}>
        <div style={DEMO_BADGE_STYLES} data-testid="demo-badge">
          <span aria-hidden="true">🎭</span>
          <span>Demo - Sample Data</span>
        </div>
      </div>

      {/* Child Info */}
      <div style={contentStyles}>
        <div style={avatarStyles} aria-hidden="true">
          AD
        </div>
        <div style={infoStyles}>
          <div style={nameStyles}>
            <span>{demoChild.name}</span>
          </div>
          <div style={ageStyles}>{age} years old</div>
        </div>
      </div>

      {/* Status Message */}
      <div style={statusStyles} data-testid="demo-status">
        <span style={{ color: '#22c55e' }} aria-hidden="true">
          ✓
        </span>
        <span style={{ fontSize: '13px', color: '#166534' }}>
          All Good - This is sample data showing how monitoring would appear
        </span>
      </div>

      {/* Activity Summary */}
      <div
        style={{
          fontSize: '13px',
          color: '#6b7280',
          marginBottom: '8px',
        }}
        data-testid="demo-activity-summary"
      >
        <span style={{ fontWeight: 500 }}>{activitySummary.totalScreenshots}</span> sample
        screenshots over <span style={{ fontWeight: 500 }}>{activitySummary.daysWithActivity}</span>{' '}
        days
      </div>

      {/* Buttons */}
      <div style={buttonContainerStyles}>
        {onExplore && (
          <button
            type="button"
            style={primaryButtonStyles}
            onClick={onExplore}
            data-testid="explore-demo-button"
          >
            Explore Demo
          </button>
        )}
        <button
          type="button"
          style={secondaryButtonStyles}
          onClick={handleDismissClick}
          disabled={dismissing}
          data-testid="dismiss-demo-button"
        >
          {dismissing ? 'Dismissing...' : 'Dismiss Demo'}
        </button>
      </div>

      {/* Dismiss Confirmation Overlay */}
      {showDismissConfirm && (
        <div style={confirmOverlayStyles} data-testid="dismiss-confirm">
          <p
            style={{
              fontSize: '15px',
              fontWeight: 500,
              color: '#1f2937',
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            Dismiss demo profile?
          </p>
          <p
            style={{
              fontSize: '13px',
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            You can always see how monitoring works by adding a real child.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              style={{
                ...secondaryButtonStyles,
                flex: 'none',
                width: '100px',
              }}
              onClick={handleCancelDismiss}
              data-testid="dismiss-cancel-button"
            >
              Cancel
            </button>
            <button
              type="button"
              style={{
                ...primaryButtonStyles,
                flex: 'none',
                width: '100px',
                backgroundColor: '#ef4444', // Red for dismiss
              }}
              onClick={handleConfirmDismiss}
              disabled={dismissing}
              data-testid="dismiss-confirm-button"
            >
              {dismissing ? 'Dismissing...' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
