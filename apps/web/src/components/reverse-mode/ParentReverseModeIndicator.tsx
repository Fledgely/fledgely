'use client'

/**
 * ParentReverseModeIndicator - Story 52.7 AC1, AC7
 *
 * Shows parents that a child is in reverse mode with limited visibility.
 * Celebrates the teen's growing independence.
 */

import { useState, useEffect } from 'react'
import type { ReverseModeSettings, ReverseModeShareingPreferences } from '@fledgely/shared'
import { SUPPORTING_INDEPENDENCE_LINK } from '@fledgely/shared'

const styles = {
  container: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  icon: {
    width: '40px',
    height: '40px',
    backgroundColor: '#dbeafe',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1e40af',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#3b82f6',
    margin: 0,
  },
  description: {
    fontSize: '0.875rem',
    color: '#1e3a8a',
    lineHeight: 1.6,
    marginBottom: '16px',
  },
  sharingSection: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  sharingSectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
  },
  sharingList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  sharingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.875rem',
    color: '#374151',
    padding: '4px 0',
  },
  sharedIcon: {
    color: '#22c55e',
  },
  notSharedIcon: {
    color: '#9ca3af',
  },
  resourcesLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#2563eb',
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #bfdbfe',
  },
  celebrationBanner: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  celebrationText: {
    fontSize: '0.875rem',
    color: '#047857',
    flex: 1,
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '14px',
  },
}

interface ParentReverseModeIndicatorProps {
  childName: string
  reverseModeSettings: ReverseModeSettings
  isFirstView?: boolean
  onDismissCelebration?: () => void
}

/**
 * Get list of what is currently shared based on preferences.
 */
function getSharedItems(
  prefs: ReverseModeShareingPreferences | undefined
): { label: string; shared: boolean }[] {
  const p = prefs || {
    screenTime: false,
    screenTimeDetail: 'none',
    flags: false,
    screenshots: false,
    location: false,
    timeLimitStatus: false,
    sharedCategories: [],
  }

  return [
    {
      label: p.screenTimeDetail === 'full' ? 'Screen Time (Full)' : 'Screen Time (Summary)',
      shared: p.screenTime,
    },
    { label: 'Flagged Content Alerts', shared: p.flags },
    { label: 'Screenshots', shared: p.screenshots },
    { label: 'Location Data', shared: p.location },
    { label: 'Time Limit Status', shared: p.timeLimitStatus },
  ]
}

export function ParentReverseModeIndicator({
  childName,
  reverseModeSettings,
  isFirstView = false,
  onDismissCelebration,
}: ParentReverseModeIndicatorProps) {
  const [showCelebration, setShowCelebration] = useState(isFirstView)

  // Persist celebration dismissal in localStorage
  useEffect(() => {
    const key = `reverse-mode-celebration-dismissed-${childName}`
    const dismissed = localStorage.getItem(key)
    if (dismissed === 'true') {
      setShowCelebration(false)
    }
  }, [childName])

  const handleDismissCelebration = () => {
    const key = `reverse-mode-celebration-dismissed-${childName}`
    localStorage.setItem(key, 'true')
    setShowCelebration(false)
    onDismissCelebration?.()
  }

  const sharedItems = getSharedItems(reverseModeSettings.sharingPreferences)
  const hasAnyShared = sharedItems.some((item) => item.shared)

  return (
    <div style={styles.container} role="region" aria-label={`Reverse mode status for ${childName}`}>
      {/* AC7: Celebration message for first view */}
      {showCelebration && (
        <div style={styles.celebrationBanner}>
          <span role="img" aria-label="celebration">
            &#x1F389;
          </span>
          <p style={styles.celebrationText}>
            <strong>This is a milestone!</strong> {childName} is growing up and taking more control
            of their digital life. This is a sign of healthy development and trust.
          </p>
          <button
            type="button"
            style={styles.dismissButton}
            onClick={handleDismissCelebration}
            aria-label="Dismiss celebration message"
          >
            &#x2715;
          </button>
        </div>
      )}

      {/* AC1: Limited view indicator */}
      <div style={styles.header}>
        <div style={styles.icon} aria-hidden="true">
          &#x1F512;
        </div>
        <div>
          <h3 style={styles.title}>Limited View - {childName} Controls</h3>
          <p style={styles.subtitle}>Reverse Mode is active</p>
        </div>
      </div>

      <p style={styles.description}>
        {childName} has activated Reverse Mode, which means they control what you can see. This is a
        healthy step toward independence. You can still manage your subscription and account
        settings.
      </p>

      {/* AC2: Show what teen has chosen to share */}
      <div style={styles.sharingSection}>
        <h4 style={styles.sharingSectionTitle}>
          {hasAnyShared
            ? `What ${childName} is sharing with you:`
            : `${childName} has not shared any data yet`}
        </h4>
        <ul style={styles.sharingList}>
          {sharedItems.map((item) => (
            <li key={item.label} style={styles.sharingItem}>
              <span style={item.shared ? styles.sharedIcon : styles.notSharedIcon}>
                {item.shared ? '&#x2713;' : '&#x2212;'}
              </span>
              <span style={{ color: item.shared ? '#374151' : '#9ca3af' }}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* AC5: Resources link */}
      <a
        href={SUPPORTING_INDEPENDENCE_LINK}
        style={styles.resourcesLink}
        aria-label="Learn about supporting your teen's independence"
      >
        <span aria-hidden="true">&#x1F4DA;</span>
        Supporting Your Teen&apos;s Independence
      </a>
    </div>
  )
}

export default ParentReverseModeIndicator
