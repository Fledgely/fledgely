'use client'

/**
 * Custody status badge component.
 *
 * Displays custody status for a child with appropriate styling.
 * Shows "No custody declared" indicator when custody is not set.
 */

import type { CustodyArrangement } from '@fledgely/shared/contracts'
import { getCustodyTypeLabel } from '../services/custodyService'

interface CustodyStatusBadgeProps {
  custody: CustodyArrangement | null | undefined
  showWarning?: boolean
}

const styles = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 500,
  },
  sole: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  shared: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  complex: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
  },
  none: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
}

export default function CustodyStatusBadge({
  custody,
  showWarning = true,
}: CustodyStatusBadgeProps) {
  if (!custody) {
    if (!showWarning) return null
    return (
      <span
        style={{ ...styles.badge, ...styles.none }}
        role="status"
        aria-label="No custody declared"
      >
        No custody declared
      </span>
    )
  }

  const typeStyles = {
    sole: styles.sole,
    shared: styles.shared,
    complex: styles.complex,
  }

  return (
    <span
      style={{ ...styles.badge, ...typeStyles[custody.type] }}
      role="status"
      aria-label={`Custody: ${getCustodyTypeLabel(custody.type)}`}
    >
      {getCustodyTypeLabel(custody.type)}
    </span>
  )
}
