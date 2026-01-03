/**
 * Location Abuse Resources Component
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC5: Conflict resolution resources
 *
 * Displays curated conflict resolution resources with neutral, non-judgmental tone.
 */

import * as React from 'react'
import { LOCATION_ABUSE_RESOURCES } from '@fledgely/shared'

export interface LocationAbuseResourcesProps {
  /** Callback when a resource link is clicked */
  onResourceClick?: (resourceId: string) => void
  /** Whether to show as a modal/dialog */
  isModal?: boolean
  /** Callback to close modal */
  onClose?: () => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '600px',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#333',
    margin: 0,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '8px',
    minHeight: '44px',
    minWidth: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
  },
  intro: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  resourceList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  resourceItem: {
    borderBottom: '1px solid #E0E0E0',
    paddingBottom: '16px',
    marginBottom: '16px',
  },
  resourceLink: {
    display: 'block',
    padding: '12px',
    borderRadius: '6px',
    textDecoration: 'none',
    backgroundColor: '#F5F5F5',
    transition: 'background-color 0.2s',
    minHeight: '44px',
  },
  resourceName: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1976D2',
    margin: 0,
    marginBottom: '4px',
  },
  resourceDescription: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
  externalIcon: {
    fontSize: '12px',
    marginLeft: '4px',
    verticalAlign: 'super',
  },
  footer: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#E3F2FD',
    borderRadius: '6px',
  },
  footerText: {
    fontSize: '13px',
    color: '#1565C0',
    margin: 0,
    lineHeight: 1.5,
  },
}

/**
 * LocationAbuseResources Component
 *
 * Displays curated resources for co-parenting conflict resolution.
 * All resources are external links that open in new tabs.
 */
export function LocationAbuseResources({
  onResourceClick,
  isModal = false,
  onClose,
}: LocationAbuseResourcesProps): React.ReactElement {
  const handleResourceClick = (resourceId: string) => {
    if (onResourceClick) {
      onResourceClick(resourceId)
    }
  }

  const content = (
    <div
      style={styles.container}
      role="dialog"
      aria-labelledby="resources-title"
      data-testid="location-abuse-resources"
    >
      <div style={styles.header}>
        <h2 id="resources-title" style={styles.title}>
          {LOCATION_ABUSE_RESOURCES.title}
        </h2>
        {isModal && onClose && (
          <button
            style={styles.closeButton}
            onClick={onClose}
            aria-label="Close resources dialog"
            data-testid="close-button"
          >
            ×
          </button>
        )}
      </div>

      <p style={styles.intro}>{LOCATION_ABUSE_RESOURCES.intro}</p>

      <ul style={styles.resourceList} role="list" aria-label="Conflict resolution resources">
        {LOCATION_ABUSE_RESOURCES.resources.map((resource, index) => (
          <li
            key={resource.id}
            style={{
              ...styles.resourceItem,
              borderBottom:
                index === LOCATION_ABUSE_RESOURCES.resources.length - 1
                  ? 'none'
                  : styles.resourceItem.borderBottom,
            }}
          >
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.resourceLink}
              onClick={() => handleResourceClick(resource.id)}
              data-testid={`resource-link-${resource.id}`}
            >
              <p style={styles.resourceName}>
                {resource.name}
                <span style={styles.externalIcon} aria-hidden="true">
                  ↗
                </span>
              </p>
              <p style={styles.resourceDescription}>{resource.description}</p>
            </a>
          </li>
        ))}
      </ul>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          These resources are provided for informational purposes. Every family situation is unique,
          and professional guidance may be helpful for your specific circumstances.
        </p>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div
        style={styles.modalOverlay}
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) {
            onClose()
          }
        }}
        data-testid="modal-overlay"
      >
        {content}
      </div>
    )
  }

  return content
}
