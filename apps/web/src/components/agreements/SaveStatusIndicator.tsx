/**
 * Save Status Indicator Component.
 *
 * Story 5.7: Draft Saving & Version History - AC1
 *
 * Displays the current save status and last saved time
 * for auto-save functionality.
 */

import type { SaveStatus } from '../../hooks/useAutoSave'

interface SaveStatusIndicatorProps {
  /** Current save status */
  status: SaveStatus
  /** Last successful save timestamp */
  lastSavedAt: Date | null
  /** Additional CSS classes */
  className?: string
}

/**
 * Format time ago string.
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) {
    return 'just now'
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Status configuration for display.
 */
const STATUS_CONFIG: Record<
  SaveStatus,
  { text: string; icon: string; color: string; ariaLive: 'polite' | 'assertive' }
> = {
  saved: {
    text: 'All changes saved',
    icon: '✓',
    color: 'text-green-600',
    ariaLive: 'polite',
  },
  saving: {
    text: 'Saving...',
    icon: '↻',
    color: 'text-gray-500',
    ariaLive: 'polite',
  },
  unsaved: {
    text: 'Unsaved changes',
    icon: '●',
    color: 'text-amber-600',
    ariaLive: 'polite',
  },
  error: {
    text: 'Save failed - retrying',
    icon: '⚠',
    color: 'text-red-600',
    ariaLive: 'assertive',
  },
}

/**
 * SaveStatusIndicator displays the current auto-save status
 * with appropriate visual feedback and accessibility.
 */
export function SaveStatusIndicator({
  status,
  lastSavedAt,
  className = '',
}: SaveStatusIndicatorProps) {
  const config = STATUS_CONFIG[status]

  return (
    <div
      className={`flex items-center gap-2 text-sm ${className}`}
      role="status"
      aria-live={config.ariaLive}
      data-testid="save-status-indicator"
    >
      {/* Status icon */}
      <span
        className={`${config.color} ${status === 'saving' ? 'animate-spin' : ''}`}
        aria-hidden="true"
      >
        {config.icon}
      </span>

      {/* Status text */}
      <span className={config.color} data-testid="save-status-text">
        {config.text}
      </span>

      {/* Last saved time (only when saved) */}
      {status === 'saved' && lastSavedAt && (
        <span className="text-gray-400" data-testid="last-saved-time">
          · {formatTimeAgo(lastSavedAt)}
        </span>
      )}
    </div>
  )
}
