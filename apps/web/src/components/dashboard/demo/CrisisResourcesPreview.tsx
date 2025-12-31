'use client'

/**
 * CrisisResourcesPreview Component - Story 8.5.6
 *
 * Shows child that crisis/help resources are protected and private.
 * Reassures child that getting help is always safe.
 *
 * Acceptance Criteria:
 * - AC3: Demo shows what crisis resources look like (protected)
 * - AC5: Language is at 6th-grade reading level
 */

export interface CrisisResourcesPreviewProps {
  /** Compact mode for inline display */
  compact?: boolean
}

/**
 * Sample protected sites to show as examples
 */
const SAMPLE_PROTECTED_SITES = [
  { name: 'Crisis Text Line', url: 'crisistextline.org' },
  { name: 'Kids Help Phone', url: 'kidshelpphone.ca' },
  { name: 'Teen Line', url: 'teenline.org' },
]

/**
 * CrisisResourcesPreview - Shows that help sites stay private
 *
 * Uses child-friendly language at 6th-grade reading level:
 * - Short sentences (10-15 words)
 * - Simple words (1-2 syllables)
 * - Active voice
 * - Reassuring tone
 */
export function CrisisResourcesPreview({ compact = false }: CrisisResourcesPreviewProps) {
  const containerStyles: React.CSSProperties = {
    backgroundColor: '#fef3c7', // Amber-100
    border: '1px solid #fcd34d', // Amber-300
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
    color: '#92400e', // Amber-800
  }

  const messageStyles: React.CSSProperties = {
    margin: '0 0 10px 0',
    fontSize: compact ? '13px' : '15px',
    color: '#374151', // Gray-700
    lineHeight: 1.5,
  }

  const protectedListStyles: React.CSSProperties = {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  }

  const protectedItemStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    marginBottom: '4px',
    backgroundColor: '#fefce8', // Yellow-50
    borderRadius: '4px',
    fontSize: compact ? '12px' : '13px',
    color: '#78350f', // Amber-900
  }

  const shieldStyles: React.CSSProperties = {
    color: '#ca8a04', // Yellow-600
    fontSize: compact ? '12px' : '14px',
  }

  return (
    <div data-testid="crisis-resources-preview" style={containerStyles}>
      <div style={headerStyles}>
        <span style={iconStyles} aria-hidden="true" data-testid="callout-icon">
          🛡️
        </span>
        <h4 style={titleStyles} data-testid="callout-title">
          Help Sites Stay Private
        </h4>
      </div>
      <p style={messageStyles} data-testid="callout-message">
        When you visit help websites, no pictures are taken. Getting help is always private. No one
        will know.
      </p>
      <div data-testid="protected-sites-container">
        <ul style={protectedListStyles}>
          {SAMPLE_PROTECTED_SITES.map((site) => (
            <li key={site.url} style={protectedItemStyles} data-testid="protected-site">
              <span style={shieldStyles} aria-hidden="true">
                🔒
              </span>
              <span>
                {site.name} ({site.url})
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
