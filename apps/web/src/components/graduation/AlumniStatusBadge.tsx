'use client'

/**
 * Alumni Status Badge Component - Story 38.3 Task 9
 *
 * UI component showing alumni status.
 * AC6: Child account transitions to alumni status
 */

import type { AlumniRecord, ViewerType } from '@fledgely/shared'

export interface AlumniStatusBadgeProps {
  alumniRecord: AlumniRecord
  viewerType: ViewerType
  showDetails?: boolean
  onViewCertificate?: () => void
}

const styles = {
  container: {
    display: 'inline-block',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '24px',
  },
  icon: {
    fontSize: '16px',
  },
  text: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#166534',
    margin: 0,
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '8px',
    padding: '2px 8px',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
  },
  detailsPanel: {
    marginTop: '12px',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
  },
  detailsTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '12px',
    margin: 0,
  },
  detailsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  detailsItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '14px',
  },
  detailsLabel: {
    color: '#6b7280',
    margin: 0,
  },
  detailsValue: {
    color: '#1f2937',
    fontWeight: 500,
    margin: 0,
  },
  certificateButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: '#166534',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #22c55e',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function AlumniStatusBadge({
  alumniRecord,
  viewerType,
  showDetails = false,
  onViewCertificate,
}: AlumniStatusBadgeProps) {
  const isChild = viewerType === 'child'

  return (
    <div style={styles.container}>
      <div style={styles.badge} role="status" aria-label="Alumni status">
        <span style={styles.icon} aria-hidden="true">
          🎓
        </span>
        <p style={styles.text}>Graduated Alumni</p>
        <span style={styles.statusIndicator}>No Monitoring</span>
      </div>

      {showDetails && (
        <div style={styles.detailsPanel}>
          <style>
            {`
              .cert-btn:hover {
                background-color: #f0fdf4;
              }
              .cert-btn:focus {
                outline: 2px solid #22c55e;
                outline-offset: 2px;
              }
            `}
          </style>

          <h3 style={styles.detailsTitle}>{isChild ? 'Your Alumni Status' : 'Alumni Details'}</h3>

          <ul style={styles.detailsList}>
            <li style={styles.detailsItem}>
              <span style={styles.detailsLabel}>Graduated</span>
              <span style={styles.detailsValue}>{formatDate(alumniRecord.graduatedAt)}</span>
            </li>
            <li style={styles.detailsItem}>
              <span style={styles.detailsLabel}>Monitoring Duration</span>
              <span style={styles.detailsValue}>
                {alumniRecord.previousAccountData.totalMonitoringMonths} months
              </span>
            </li>
            <li style={{ ...styles.detailsItem, borderBottom: 'none' }}>
              <span style={styles.detailsLabel}>Final Trust Score</span>
              <span style={styles.detailsValue}>
                {alumniRecord.previousAccountData.finalTrustScore}%
              </span>
            </li>
          </ul>

          {onViewCertificate && (
            <button
              type="button"
              onClick={onViewCertificate}
              style={styles.certificateButton}
              className="cert-btn"
              aria-label="View Certificate"
            >
              <span aria-hidden="true">📜</span>
              View Certificate
            </button>
          )}
        </div>
      )}
    </div>
  )
}
