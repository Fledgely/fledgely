/**
 * AgreementDiffView Component - Story 34.1 (AC2)
 *
 * Displays agreement changes in diff view format.
 * Shows old vs new values with color coding.
 */

import type { ProposalChange } from '@fledgely/shared'

interface AgreementDiffViewProps {
  changes: ProposalChange[]
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '(none)'
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
  }
  return String(value)
}

/**
 * Format field path to readable label
 * e.g., "timeLimits.weekday.gaming" -> "weekday gaming"
 */
function formatFieldPath(fieldPath: string): string {
  const parts = fieldPath.split('.')
  // Remove first part if it's the section prefix
  const relevantParts = parts.length > 1 ? parts.slice(1) : parts
  return relevantParts
    .map((part) => part.replace(/([A-Z])/g, ' $1').toLowerCase())
    .join(' ')
    .trim()
}

/**
 * Group changes by section
 */
function groupBySection(changes: ProposalChange[]): Map<string, ProposalChange[]> {
  const grouped = new Map<string, ProposalChange[]>()

  for (const change of changes) {
    const existing = grouped.get(change.sectionId) || []
    grouped.set(change.sectionId, [...existing, change])
  }

  return grouped
}

export function AgreementDiffView({ changes }: AgreementDiffViewProps) {
  if (changes.length === 0) {
    return (
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
          color: '#64748b',
        }}
      >
        No changes to display.
      </div>
    )
  }

  const grouped = groupBySection(changes)

  return (
    <div role="list" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Array.from(grouped.entries()).map(([sectionId, sectionChanges]) => (
        <div
          key={sectionId}
          role="listitem"
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* Section header */}
          <div
            style={{
              background: '#f8fafc',
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              fontWeight: 600,
              color: '#334155',
            }}
          >
            {sectionChanges[0].sectionName}
          </div>

          {/* Changes list */}
          <div style={{ padding: 16 }}>
            {sectionChanges.map((change, index) => {
              const globalIndex = changes.indexOf(change)

              return (
                <div
                  key={change.fieldPath}
                  style={{
                    padding: '12px 0',
                    borderBottom: index < sectionChanges.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}
                >
                  {/* Field path */}
                  <div
                    style={{
                      fontSize: 13,
                      color: '#64748b',
                      marginBottom: 8,
                      textTransform: 'capitalize',
                    }}
                  >
                    {formatFieldPath(change.fieldPath)}
                  </div>

                  {/* Values */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Old value */}
                    {change.oldValue !== null && (
                      <div
                        data-testid={`old-value-${globalIndex}`}
                        style={{
                          padding: '6px 12px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          borderRadius: 6,
                          fontSize: 14,
                          fontWeight: 500,
                          textDecoration: change.changeType === 'remove' ? 'none' : 'line-through',
                        }}
                      >
                        {formatValue(change.oldValue)}
                      </div>
                    )}

                    {/* Arrow for modifications */}
                    {change.changeType === 'modify' && <div style={{ color: '#94a3b8' }}>→</div>}

                    {/* New value */}
                    {change.newValue !== null && (
                      <div
                        data-testid={`new-value-${globalIndex}`}
                        style={{
                          padding: '6px 12px',
                          background: '#f0fdf4',
                          color: '#16a34a',
                          borderRadius: 6,
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        {formatValue(change.newValue)}
                      </div>
                    )}

                    {/* Change type badge */}
                    <div
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        color: '#94a3b8',
                        fontWeight: 600,
                      }}
                    >
                      {change.changeType}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
