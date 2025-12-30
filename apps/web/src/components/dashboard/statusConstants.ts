/**
 * Shared status constants for dashboard components
 * Story 19A.1 & 19A.2
 *
 * Centralized color scheme and labels to avoid duplication
 * across FamilyStatusCard and ChildStatusRow components.
 */

import type { FamilyStatus } from '../../hooks/useFamilyStatus'

/**
 * Color scheme for each status level
 */
export const statusColors = {
  good: {
    bg: '#dcfce7',
    border: '#22c55e',
    text: '#166534',
    icon: '#22c55e',
  },
  attention: {
    bg: '#fef9c3',
    border: '#eab308',
    text: '#854d0e',
    icon: '#eab308',
  },
  action: {
    bg: '#fee2e2',
    border: '#ef4444',
    text: '#991b1b',
    icon: '#ef4444',
  },
} as const

/**
 * Status labels for display
 */
export const statusLabels: Record<FamilyStatus, string> = {
  good: 'All Good',
  attention: 'Needs Attention',
  action: 'Action Required',
}
