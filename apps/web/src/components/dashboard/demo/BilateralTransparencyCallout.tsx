'use client'

/**
 * BilateralTransparencyCallout Component - Story 8.5.6
 *
 * Displays child-friendly message about bilateral transparency.
 * Emphasizes that both parent and child see the same information.
 *
 * Acceptance Criteria:
 * - AC2: Demo highlights bilateral transparency ("You'll see this too!")
 * - AC5: Language is at 6th-grade reading level
 */

export interface BilateralTransparencyCalloutProps {
  /** Compact mode for inline display */
  compact?: boolean
}

/**
 * BilateralTransparencyCallout - "You'll see this too!" message
 *
 * Uses child-friendly language at 6th-grade reading level:
 * - Short sentences (10-15 words)
 * - Simple words (1-2 syllables)
 * - Active voice
 * - Direct "you" address
 */
export function BilateralTransparencyCallout({
  compact = false,
}: BilateralTransparencyCalloutProps) {
  const containerStyles: React.CSSProperties = {
    backgroundColor: '#ecfdf5', // Green-50
    border: '1px solid #86efac', // Green-300
    borderRadius: compact ? '6px' : '8px',
    padding: compact ? '10px 12px' : '14px 16px',
    marginBottom: compact ? '8px' : '12px',
  }

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: compact ? '4px' : '8px',
  }

  const iconStyles: React.CSSProperties = {
    fontSize: compact ? '18px' : '22px',
  }

  const titleStyles: React.CSSProperties = {
    margin: 0,
    fontSize: compact ? '14px' : '16px',
    fontWeight: 600,
    color: '#166534', // Green-800
  }

  const messageStyles: React.CSSProperties = {
    margin: 0,
    fontSize: compact ? '13px' : '15px',
    color: '#374151', // Gray-700
    lineHeight: 1.5,
  }

  return (
    <div data-testid="bilateral-transparency-callout" style={containerStyles}>
      <div style={headerStyles}>
        <span style={iconStyles} aria-hidden="true" data-testid="callout-icon">
          👀
        </span>
        <h4 style={titleStyles} data-testid="callout-title">
          You See This Too!
        </h4>
      </div>
      <p style={messageStyles} data-testid="callout-message">
        Your parent does not see anything secret. You both see the same pictures of what is on your
        screen. It is fair for everyone.
      </p>
    </div>
  )
}
