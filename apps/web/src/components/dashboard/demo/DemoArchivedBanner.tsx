'use client'

/**
 * DemoArchivedBanner Component - Story 8.5.5
 *
 * Shows in the help section when demo mode has been archived.
 * Allows parents to re-access demo mode for reference.
 *
 * Acceptance Criteria:
 * - AC5: Demo Re-access - parent can re-access demo from help section if needed
 */

export interface DemoArchivedBannerProps {
  /** Callback to reactivate demo mode */
  onReactivateDemo: () => void
  /** Whether reactivation is in progress */
  reactivating?: boolean
}

/**
 * DemoArchivedBanner - Access archived demo from help section
 */
export function DemoArchivedBanner({
  onReactivateDemo,
  reactivating = false,
}: DemoArchivedBannerProps) {
  return (
    <div
      data-testid="demo-archived-banner"
      style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      {/* Icon and Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <span data-testid="banner-icon" style={{ fontSize: '20px' }} aria-hidden="true">
          🎭
        </span>
        <h4
          data-testid="banner-title"
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#166534',
          }}
        >
          Demo Mode Available
        </h4>
      </div>

      {/* Description */}
      <p
        data-testid="banner-description"
        style={{
          margin: '0 0 12px 0',
          fontSize: '13px',
          color: '#4b5563',
          lineHeight: 1.4,
        }}
      >
        You can revisit demo mode anytime to see example screenshots, time tracking, and flag
        examples as a reference.
      </p>

      {/* Reactivate Button */}
      <button
        type="button"
        onClick={onReactivateDemo}
        disabled={reactivating}
        data-testid="reactivate-demo-button"
        style={{
          padding: '8px 16px',
          backgroundColor: 'transparent',
          color: '#166534',
          border: '1px solid #86efac',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: reactivating ? 'wait' : 'pointer',
          opacity: reactivating ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {reactivating ? (
          'Loading Demo...'
        ) : (
          <>
            <span aria-hidden="true">👁️</span>
            View Demo Mode
          </>
        )}
      </button>
    </div>
  )
}
