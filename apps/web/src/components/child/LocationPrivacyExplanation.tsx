'use client'

/**
 * LocationPrivacyExplanation Component - Story 40.5
 *
 * Child-friendly explanation of location data usage.
 *
 * Acceptance Criteria:
 * - AC1: Clear Privacy Explanation (child understands data collection)
 * - AC4: Data Sharing Limits (only family, never third-party)
 * - AC5: Data Deletion at 18
 *
 * NFR Requirements:
 * - NFR65: Text at 6th-grade reading level for child views
 * - NFR49: 44x44px minimum touch targets
 * - NFR45: 4.5:1 contrast ratio
 */

import React from 'react'
import { LOCATION_PRIVACY_MESSAGES } from '@fledgely/shared'

export interface LocationPrivacyExplanationProps {
  /** Whether to show the request disable link */
  showRequestDisable?: boolean
  /** Callback when request disable is clicked */
  onRequestDisable?: () => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 20px 0',
  },
  section: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
  },
  icon: {
    width: '48px',
    height: '48px',
    minWidth: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
  },
  iconCollect: {
    backgroundColor: '#dbeafe',
  },
  iconFamily: {
    backgroundColor: '#dcfce7',
  },
  icon18: {
    backgroundColor: '#fef3c7',
  },
  iconRights: {
    backgroundColor: '#f3e8ff',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  sectionText: {
    fontSize: '14px',
    color: '#4b5563',
    margin: 0,
    lineHeight: 1.5,
  },
  requestButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 20px',
    minWidth: '44px',
    minHeight: '44px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    marginTop: '16px',
    transition: 'background-color 0.2s',
  },
  footer: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '8px',
  },
}

export function LocationPrivacyExplanation({
  showRequestDisable = true,
  onRequestDisable,
}: LocationPrivacyExplanationProps): React.ReactElement {
  const sections = [
    {
      id: 'collect',
      icon: '📍',
      iconStyle: styles.iconCollect,
      title: 'What we check',
      text: LOCATION_PRIVACY_MESSAGES.whatWeCollect,
    },
    {
      id: 'family',
      icon: '👨‍👩‍👧',
      iconStyle: styles.iconFamily,
      title: 'Who can see it',
      text: LOCATION_PRIVACY_MESSAGES.whoCanSee,
    },
    {
      id: 'eighteen',
      icon: '🎂',
      iconStyle: styles.icon18,
      title: 'When you turn 18',
      text: LOCATION_PRIVACY_MESSAGES.atEighteen,
    },
    {
      id: 'rights',
      icon: '✋',
      iconStyle: styles.iconRights,
      title: 'Your choice',
      text: LOCATION_PRIVACY_MESSAGES.yourRights,
    },
  ]

  return (
    <div
      style={styles.container}
      data-testid="location-privacy-explanation"
      role="region"
      aria-label="Location Privacy Information"
    >
      <h2 style={styles.title}>How your location is used</h2>

      {sections.map((section) => (
        <div key={section.id} style={styles.section} data-testid={`section-${section.id}`}>
          <div style={{ ...styles.icon, ...section.iconStyle }} aria-hidden="true">
            {section.icon}
          </div>
          <div style={styles.content}>
            <h3 style={styles.sectionTitle}>{section.title}</h3>
            <p style={styles.sectionText}>{section.text}</p>
          </div>
        </div>
      ))}

      {showRequestDisable && (
        <div style={styles.footer}>
          <button
            type="button"
            style={styles.requestButton}
            onClick={onRequestDisable}
            data-testid="request-disable-link"
            aria-label="Request to turn off location features"
          >
            Ask to turn off location
          </button>
        </div>
      )}
    </div>
  )
}

export default LocationPrivacyExplanation
