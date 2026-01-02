/**
 * Pre18ExportRequest Component - Story 38.6 Task 6
 *
 * Component for parent to request data export before child turns 18.
 * AC2: Export option available
 * AC3: Export includes: sanitized activity summaries (no screenshots)
 * AC4: Child must consent to any export
 */

import React from 'react'

export interface Pre18ExportRequestProps {
  childName: string
  daysUntil18: number
  onRequestExport: () => void
  status?: 'none' | 'pending_consent' | 'consent_granted' | 'processing' | 'completed'
  exportUrl?: string
}

/**
 * Component for parent to request pre-18 data export.
 */
export default function Pre18ExportRequest({
  childName,
  daysUntil18,
  onRequestExport,
  status = 'none',
  exportUrl,
}: Pre18ExportRequestProps) {
  const isRequestDisabled = status !== 'none'
  const isCompleted = status === 'completed'
  const isPending = status === 'pending_consent'
  const isProcessing = status === 'processing'

  return (
    <div
      className="pre18-export-request"
      style={{
        padding: '24px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
      }}
      data-testid="pre18-export-request"
    >
      {/* Header */}
      <h2
        style={{
          margin: '0 0 16px 0',
          fontSize: '20px',
          color: '#212529',
        }}
      >
        Data Export Available
      </h2>

      {/* Days until 18 */}
      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          color: '#495057',
        }}
      >
        {childName} turns 18 in <strong>{daysUntil18} days</strong>. All monitoring data will be
        automatically deleted on their birthday.
      </p>

      {/* What's included (AC3) */}
      <div
        style={{
          backgroundColor: '#e7f5ff',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1971c2' }}>
          What&apos;s included in the export:
        </h3>
        <ul style={{ margin: '0', paddingLeft: '20px', color: '#1864ab' }}>
          <li>Activity summaries by day</li>
          <li>Screen time by category</li>
          <li>Agreement history</li>
        </ul>
      </div>

      {/* What's NOT included (AC3) */}
      <div
        style={{
          backgroundColor: '#fff3bf',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#e67700' }}>
          Not included (for privacy):
        </h3>
        <ul style={{ margin: '0', paddingLeft: '20px', color: '#d9480f' }}>
          <li>No screenshots or images</li>
          <li>No specific URLs visited</li>
          <li>No flags or concerning content</li>
        </ul>
      </div>

      {/* Consent notice (AC4) */}
      <p
        style={{
          fontSize: '14px',
          color: '#868e96',
          marginBottom: '16px',
        }}
      >
        {childName}&apos;s consent is required for this export. They will be asked to approve or
        decline this request.
      </p>

      {/* Status display */}
      {isPending && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fff9db',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <span style={{ color: '#f59f00' }}>⏳</span> Waiting for {childName}&apos;s consent...
        </div>
      )}

      {isProcessing && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#e7f5ff',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <span>⚙️</span> Processing export...
        </div>
      )}

      {isCompleted && exportUrl && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#d3f9d8',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <span style={{ color: '#2f9e44' }}>✓</span> Export ready!{' '}
          <a
            href={exportUrl}
            download
            style={{
              color: '#2f9e44',
              textDecoration: 'underline',
            }}
          >
            Download export
          </a>
        </div>
      )}

      {/* Request button */}
      <button
        onClick={onRequestExport}
        disabled={isRequestDisabled}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 600,
          color: isRequestDisabled ? '#868e96' : '#fff',
          backgroundColor: isRequestDisabled ? '#e9ecef' : '#228be6',
          border: 'none',
          borderRadius: '8px',
          cursor: isRequestDisabled ? 'not-allowed' : 'pointer',
          width: '100%',
        }}
      >
        {isRequestDisabled ? 'Export Requested' : 'Request Export'}
      </button>
    </div>
  )
}
