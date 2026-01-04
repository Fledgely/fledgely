'use client'

/**
 * DataExportCard Component - Story 51.1
 *
 * Card for requesting and downloading GDPR data exports.
 *
 * Acceptance Criteria:
 * - AC1: Request export from settings
 * - AC3: Download as ZIP with JSON data
 * - AC7: Show "export in progress" with estimated completion
 *
 * UI/UX Requirements:
 * - Clear call-to-action for export
 * - Progress indication during processing
 * - Download button when ready
 * - Expiry warning
 */

import { useCallback } from 'react'
import { useDataExport, formatFileSize } from '../../hooks/useDataExport'

/**
 * Props for DataExportCard component
 */
export interface DataExportCardProps {
  /** Family ID */
  familyId: string
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Calculate days until date
 */
function daysUntil(date: Date): number {
  const now = Date.now()
  const diff = date.getTime() - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * DataExportCard - GDPR data export request and download UI
 *
 * Story 51.1: Data Export Request (GDPR Article 20)
 */
export function DataExportCard({ familyId }: DataExportCardProps) {
  const {
    status,
    loading,
    actionLoading,
    error,
    canRequestExport,
    downloadUrl,
    expiresAt,
    fileSize,
    estimatedCompletionAt,
    requestExport,
    clearError,
  } = useDataExport(familyId)

  const handleRequestExport = useCallback(async () => {
    clearError()
    await requestExport()
  }, [requestExport, clearError])

  const handleDownload = useCallback(() => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }, [downloadUrl])

  // Styles
  const cardStyles: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
  }

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  }

  const iconStyles: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#ede9fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  }

  const titleStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  }

  const subtitleStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  }

  const descriptionStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '20px',
  }

  const buttonStyles: React.CSSProperties = {
    minHeight: '48px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'white',
    backgroundColor: '#7c3aed',
    border: 'none',
    borderRadius: '8px',
    cursor: canRequestExport && !actionLoading ? 'pointer' : 'not-allowed',
    opacity: canRequestExport && !actionLoading ? 1 : 0.6,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    justifyContent: 'center',
  }

  const downloadButtonStyles: React.CSSProperties = {
    ...buttonStyles,
    backgroundColor: '#059669',
    cursor: 'pointer',
    opacity: 1,
  }

  const statusBoxStyles: React.CSSProperties = {
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
  }

  const processingStyles: React.CSSProperties = {
    ...statusBoxStyles,
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
  }

  const completedStyles: React.CSSProperties = {
    ...statusBoxStyles,
    backgroundColor: '#ecfdf5',
    border: '1px solid #6ee7b7',
  }

  const expiredStyles: React.CSSProperties = {
    ...statusBoxStyles,
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
  }

  const failedStyles: React.CSSProperties = {
    ...statusBoxStyles,
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
  }

  const statusTextStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#374151',
    margin: 0,
    lineHeight: 1.5,
  }

  const warningStyles: React.CSSProperties = {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#92400e',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  }

  const errorBoxStyles: React.CSSProperties = {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  }

  const infoRowStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    fontSize: '13px',
    color: '#6b7280',
  }

  const loadingSpinnerStyles: React.CSSProperties = {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  }

  if (loading) {
    return (
      <div style={cardStyles} data-testid="data-export-card-loading">
        <div style={headerStyles}>
          <div style={iconStyles}>📦</div>
          <div>
            <h3 style={titleStyles}>Export Your Data</h3>
            <p style={subtitleStyles}>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={cardStyles} data-testid="data-export-card">
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={headerStyles}>
        <div style={iconStyles}>📦</div>
        <div>
          <h3 style={titleStyles}>Export Your Data</h3>
          <p style={subtitleStyles}>GDPR Data Portability</p>
        </div>
      </div>

      <p style={descriptionStyles}>
        Download a complete copy of your family&apos;s data including profiles, agreements,
        screenshots, flags, activity logs, and settings. Your data will be packaged as a ZIP file
        containing JSON data and images.
      </p>

      {error && (
        <div style={errorBoxStyles} role="alert" data-testid="export-error">
          {error}
        </div>
      )}

      {/* Processing State */}
      {(status === 'pending' || status === 'processing') && (
        <div style={processingStyles} data-testid="export-processing">
          <p style={statusTextStyles}>
            <strong>⏳ Export in Progress</strong>
            <br />
            Your data export is being generated. This may take up to 48 hours for large datasets.
            We&apos;ll email you when it&apos;s ready.
          </p>
          {estimatedCompletionAt && (
            <div style={infoRowStyles}>
              <span>Estimated completion:</span>
              <span>{formatDate(estimatedCompletionAt)}</span>
            </div>
          )}
        </div>
      )}

      {/* Completed State */}
      {status === 'completed' && downloadUrl && (
        <div style={completedStyles} data-testid="export-completed">
          <p style={statusTextStyles}>
            <strong>✅ Export Ready</strong>
            <br />
            Your data export is ready for download.
          </p>
          {fileSize && (
            <div style={infoRowStyles}>
              <span>File size:</span>
              <span>{formatFileSize(fileSize)}</span>
            </div>
          )}
          {expiresAt && (
            <div style={infoRowStyles}>
              <span>Available until:</span>
              <span>{formatDate(expiresAt)}</span>
            </div>
          )}
          {expiresAt && daysUntil(expiresAt) <= 2 && (
            <div style={warningStyles}>
              <span>⚠️</span>
              <span>
                This download expires in {daysUntil(expiresAt)} day
                {daysUntil(expiresAt) !== 1 ? 's' : ''}. Download it soon!
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expired State */}
      {status === 'expired' && (
        <div style={expiredStyles} data-testid="export-expired">
          <p style={statusTextStyles}>
            <strong>⏰ Export Expired</strong>
            <br />
            Your previous export has expired. You can request a new one below.
          </p>
        </div>
      )}

      {/* Failed State */}
      {status === 'failed' && (
        <div style={failedStyles} data-testid="export-failed">
          <p style={statusTextStyles}>
            <strong>❌ Export Failed</strong>
            <br />
            There was a problem generating your export. Please try again.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {status === 'completed' && downloadUrl ? (
        <button
          style={downloadButtonStyles}
          onClick={handleDownload}
          data-testid="download-export-button"
        >
          <span aria-hidden="true">⬇️</span>
          Download Export
        </button>
      ) : (
        <button
          style={buttonStyles}
          onClick={handleRequestExport}
          disabled={!canRequestExport || actionLoading}
          aria-busy={actionLoading}
          data-testid="request-export-button"
        >
          {actionLoading ? (
            <>
              <span style={loadingSpinnerStyles} aria-hidden="true" />
              Requesting...
            </>
          ) : status === 'pending' || status === 'processing' ? (
            'Export in Progress...'
          ) : (
            <>
              <span aria-hidden="true">📤</span>
              Request Data Export
            </>
          )}
        </button>
      )}

      {/* Privacy note */}
      <p
        style={{
          marginTop: '16px',
          fontSize: '12px',
          color: '#9ca3af',
          lineHeight: 1.5,
        }}
      >
        Your export will be available for 7 days. It contains sensitive family data—please store it
        securely.
      </p>
    </div>
  )
}

export default DataExportCard
