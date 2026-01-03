/**
 * LocationTransitionBanner Component - Story 40.4
 *
 * Shows current location transition status to the child.
 *
 * Acceptance Criteria:
 * - AC3: Transition Notification - child-friendly message
 * - NFR65: 6th-grade reading level
 */

import React from 'react'

export interface LocationTransitionBannerProps {
  /** Current zone name (null if not in a zone) */
  currentZoneName: string | null
  /** Whether a transition is in progress */
  inTransition: boolean
  /** Minutes remaining in grace period */
  gracePeriodMinutes: number
  /** Whether rules have been applied */
  rulesApplied: boolean
  /** Zone name being transitioned to (if in transition) */
  targetZoneName: string | null
}

/**
 * Banner showing location transition status.
 *
 * Displays in a child-friendly way:
 * - When transitioning to a new zone
 * - When rules have been applied
 * - When leaving all zones
 */
export function LocationTransitionBanner({
  currentZoneName,
  inTransition,
  gracePeriodMinutes,
  rulesApplied,
  targetZoneName,
}: LocationTransitionBannerProps): React.ReactElement | null {
  // Style definitions
  const bannerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }

  const transitionBannerStyle: React.CSSProperties = {
    ...bannerStyle,
    backgroundColor: '#FEF3C7',
    border: '1px solid #F59E0B',
  }

  const appliedBannerStyle: React.CSSProperties = {
    ...bannerStyle,
    backgroundColor: '#D1FAE5',
    border: '1px solid #10B981',
  }

  const unknownBannerStyle: React.CSSProperties = {
    ...bannerStyle,
    backgroundColor: '#F3F4F6',
    border: '1px solid #9CA3AF',
  }

  const iconStyle: React.CSSProperties = {
    fontSize: '24px',
    flexShrink: 0,
  }

  const textStyle: React.CSSProperties = {
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#374151',
  }

  const titleStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: '4px',
    color: '#111827',
  }

  // Don't show anything if not relevant
  if (!inTransition && !rulesApplied && currentZoneName) {
    return null
  }

  // Transition in progress
  if (inTransition && targetZoneName && gracePeriodMinutes > 0) {
    return (
      <div style={transitionBannerStyle} role="alert" aria-live="polite">
        <span style={iconStyle} aria-hidden="true">
          📍
        </span>
        <div style={textStyle}>
          <div style={titleStyle}>Moving to {targetZoneName}</div>
          <div>
            Your rules will change in{' '}
            {gracePeriodMinutes === 1 ? '1 minute' : `${gracePeriodMinutes} minutes`}. You have time
            to finish what you&apos;re doing.
          </div>
        </div>
      </div>
    )
  }

  // Rules have been applied
  if (rulesApplied && currentZoneName) {
    return (
      <div style={appliedBannerStyle} role="status" aria-live="polite">
        <span style={iconStyle} aria-hidden="true">
          ✅
        </span>
        <div style={textStyle}>
          <div style={titleStyle}>At {currentZoneName}</div>
          <div>Your rules have been updated for this location.</div>
        </div>
      </div>
    )
  }

  // Unknown location
  if (!currentZoneName && !inTransition) {
    return (
      <div style={unknownBannerStyle} role="status" aria-live="polite">
        <span style={iconStyle} aria-hidden="true">
          📍
        </span>
        <div style={textStyle}>
          <div style={titleStyle}>Location Unknown</div>
          <div>We can&apos;t tell where you are. Using your normal rules.</div>
        </div>
      </div>
    )
  }

  return null
}
