'use client'

/**
 * CoParentStatusBadge Component - Story 22.6
 *
 * Badge showing co-parent interaction status with a flag.
 *
 * Acceptance Criteria:
 * - AC2: Shows if other parent has viewed
 * - AC3: Shows other parent's action if taken
 */

import type { FlagDocument, FlagAuditEntry } from '@fledgely/shared'

export interface CoParentStatusBadgeProps {
  /** The flag document */
  flag: FlagDocument
  /** Current parent's ID (to exclude from "other parent" display) */
  currentParentId: string
  /** Map of parent IDs to names */
  parentNameMap: Map<string, string>
}

const styles = {
  container: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 500,
  },
  viewedBadge: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
  },
  actionBadge: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  dismissedBadge: {
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
  },
  escalatedBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  discussedTogetherBadge: {
    backgroundColor: '#fce7f3',
    color: '#9d174d',
  },
}

/**
 * Get action display text
 */
function getActionText(action: string): string {
  switch (action) {
    case 'dismiss':
      return 'dismissed'
    case 'discuss':
      return 'noted for discussion'
    case 'escalate':
      return 'marked for action'
    case 'discussed_together':
      return 'discussed together'
    default:
      return action
  }
}

/**
 * Get badge style for action
 */
function getActionBadgeStyle(action: string): React.CSSProperties {
  switch (action) {
    case 'dismiss':
      return styles.dismissedBadge
    case 'escalate':
      return styles.escalatedBadge
    case 'discussed_together':
      return styles.discussedTogetherBadge
    default:
      return styles.actionBadge
  }
}

/**
 * CoParentStatusBadge - Shows co-parent interaction status
 */
export function CoParentStatusBadge({
  flag,
  currentParentId,
  parentNameMap,
}: CoParentStatusBadgeProps) {
  // Get other parents who viewed (excluding current parent)
  const otherViewers = (flag.viewedBy ?? []).filter((id) => id !== currentParentId)

  // Get other parents' actions from audit trail
  const otherActions = (flag.auditTrail ?? [])
    .filter((entry: FlagAuditEntry) => entry.parentId !== currentParentId)
    .filter((entry: FlagAuditEntry) => entry.action !== 'view')

  // If no other parent interactions, return null
  if (otherViewers.length === 0 && otherActions.length === 0) {
    return null
  }

  return (
    <div style={styles.container} data-testid="coparent-status">
      {/* Show viewed status for parents who haven't taken action yet */}
      {otherViewers.map((parentId) => {
        // Skip if this parent has taken an action
        const hasAction = otherActions.some((a: FlagAuditEntry) => a.parentId === parentId)
        if (hasAction) return null

        const parentName = parentNameMap.get(parentId) ?? 'Co-parent'
        return (
          <span
            key={`viewed-${parentId}`}
            style={{ ...styles.badge, ...styles.viewedBadge }}
            data-testid="viewed-badge"
          >
            <span role="img" aria-hidden="true">
              👁️
            </span>
            {parentName} viewed
          </span>
        )
      })}

      {/* Show actions taken by other parents */}
      {otherActions.map((entry: FlagAuditEntry, index: number) => (
        <span
          key={`action-${entry.parentId}-${index}`}
          style={{ ...styles.badge, ...getActionBadgeStyle(entry.action) }}
          data-testid="action-badge"
        >
          <span role="img" aria-hidden="true">
            {entry.action === 'dismiss'
              ? '✓'
              : entry.action === 'escalate'
                ? '⚠️'
                : entry.action === 'discussed_together'
                  ? '👨‍👩‍👧'
                  : '💬'}
          </span>
          {entry.parentName} {getActionText(entry.action)}
        </span>
      ))}
    </div>
  )
}

export default CoParentStatusBadge
