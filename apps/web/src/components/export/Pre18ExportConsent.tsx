/**
 * Pre18ExportConsent Component - Story 38.6 Task 7
 *
 * Component for child to grant/deny export consent.
 * AC4: Child must consent to any export
 */

import React from 'react'

export interface Pre18ExportConsentProps {
  parentName: string
  onGrantConsent: () => void
  onDenyConsent: () => void
  status?: 'pending' | 'granted' | 'denied'
}

/**
 * Component for child to respond to export consent request.
 * AC4: Child must consent - emphasizes child's choice.
 */
export default function Pre18ExportConsent({
  parentName,
  onGrantConsent,
  onDenyConsent,
  status = 'pending',
}: Pre18ExportConsentProps) {
  const isPending = status === 'pending'
  const isGranted = status === 'granted'
  const isDenied = status === 'denied'

  return (
    <div
      className="pre18-export-consent"
      role="alert"
      style={{
        padding: '24px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
      }}
      data-testid="pre18-export-consent"
    >
      {/* Pending state */}
      {isPending && (
        <>
          {/* Header */}
          <h2
            style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              color: '#212529',
            }}
          >
            Export Request from {parentName}
          </h2>

          {/* Explanation */}
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              color: '#495057',
            }}
          >
            {parentName} would like to export a summary of your activity data before it gets deleted
            when you turn 18.
          </p>

          {/* What's included */}
          <div
            style={{
              backgroundColor: '#e7f5ff',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1971c2' }}>
              What they&apos;ll receive:
            </h3>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#1864ab' }}>
              <li>Daily activity summaries</li>
              <li>Screen time by category</li>
            </ul>
          </div>

          {/* What's NOT included */}
          <div
            style={{
              backgroundColor: '#d3f9d8',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#2f9e44' }}>
              What&apos;s protected (not included):
            </h3>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#2b8a3e' }}>
              <li>No screenshots or images</li>
              <li>No specific websites</li>
              <li>No flags or private details</li>
            </ul>
          </div>

          {/* Choice emphasis (AC4) */}
          <p
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#7048e8',
              textAlign: 'center',
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#f3f0ff',
              borderRadius: '8px',
            }}
          >
            This is your choice. You decide.
          </p>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
            }}
          >
            <button
              onClick={onDenyConsent}
              style={{
                flex: 1,
                padding: '14px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#e03131',
                backgroundColor: '#fff',
                border: '2px solid #e03131',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              No, Decline
            </button>
            <button
              onClick={onGrantConsent}
              style={{
                flex: 1,
                padding: '14px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: '#2f9e44',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Yes, Allow
            </button>
          </div>
        </>
      )}

      {/* Granted confirmation */}
      {isGranted && (
        <div
          style={{
            textAlign: 'center',
            padding: '32px',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}
          >
            ✓
          </div>
          <h2
            style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              color: '#2f9e44',
            }}
          >
            Export Approved
          </h2>
          <p
            style={{
              margin: '0',
              color: '#495057',
            }}
          >
            {parentName} can now download a summary of your activity.
          </p>
        </div>
      )}

      {/* Denied confirmation */}
      {isDenied && (
        <div
          style={{
            textAlign: 'center',
            padding: '32px',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}
          >
            ✕
          </div>
          <h2
            style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              color: '#495057',
            }}
          >
            Export Declined
          </h2>
          <p
            style={{
              margin: '0',
              color: '#868e96',
            }}
          >
            Your data will not be exported. It will be deleted when you turn 18.
          </p>
        </div>
      )}
    </div>
  )
}
