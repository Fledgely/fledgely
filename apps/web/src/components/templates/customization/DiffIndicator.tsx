'use client'

import { cn } from '@/lib/utils'
import { type DiffStatus } from './useTemplateDraft'

/**
 * Props for DiffIndicator
 */
export interface DiffIndicatorProps {
  /** Diff status to display */
  status: DiffStatus
  /** Optional label for screen readers */
  label?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show text label */
  showLabel?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Visual styling for each diff status
 */
const DIFF_STYLES: Record<DiffStatus, { bg: string; border: string; text: string; dot: string }> = {
  original: {
    bg: 'bg-transparent',
    border: 'border-transparent',
    text: 'text-gray-500',
    dot: 'bg-gray-300',
  },
  modified: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  added: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  removed: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
}

/**
 * Labels for each diff status
 */
const DIFF_LABELS: Record<DiffStatus, string> = {
  original: 'Original',
  modified: 'Modified',
  added: 'Added',
  removed: 'Removed',
}

/**
 * Size classes for the indicator dot
 */
const SIZE_CLASSES = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
}

/**
 * DiffIndicator Component
 *
 * Story 4.5: Template Customization Preview - Task 1.5
 * Visual indicator showing change status compared to original template
 *
 * @param props - Component props
 */
export function DiffIndicator({
  status,
  label,
  size = 'md',
  showLabel = false,
  className,
}: DiffIndicatorProps) {
  const styles = DIFF_STYLES[status]
  const statusLabel = label || DIFF_LABELS[status]

  // Don't show indicator for original/unchanged items unless explicitly requested
  if (status === 'original' && !showLabel) {
    return null
  }

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      role="status"
      aria-label={`Change status: ${statusLabel}`}
    >
      <span
        className={cn('rounded-full', SIZE_CLASSES[size], styles.dot)}
        aria-hidden="true"
      />
      {showLabel && (
        <span className={cn('text-xs font-medium', styles.text)}>
          {statusLabel}
        </span>
      )}
    </span>
  )
}

/**
 * DiffBadge Component
 *
 * A badge-style variant for more prominent diff indication
 */
export interface DiffBadgeProps {
  /** Diff status to display */
  status: DiffStatus
  /** Custom label text */
  label?: string
  /** Additional class names */
  className?: string
}

export function DiffBadge({ status, label, className }: DiffBadgeProps) {
  const styles = DIFF_STYLES[status]
  const statusLabel = label || DIFF_LABELS[status]

  // Don't show badge for original/unchanged items
  if (status === 'original') {
    return null
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border',
        styles.bg,
        styles.border,
        styles.text,
        className
      )}
      role="status"
      aria-label={`Change status: ${statusLabel}`}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} aria-hidden="true" />
      {statusLabel}
    </span>
  )
}

/**
 * DiffHighlight Component
 *
 * A wrapper that applies diff highlighting to child content
 */
export interface DiffHighlightProps {
  /** Diff status to apply */
  status: DiffStatus
  /** Child content */
  children: React.ReactNode
  /** Additional class names */
  className?: string
  /** Whether to show the diff badge */
  showBadge?: boolean
}

export function DiffHighlight({
  status,
  children,
  className,
  showBadge = false,
}: DiffHighlightProps) {
  const styles = DIFF_STYLES[status]

  return (
    <div
      className={cn(
        'relative rounded-lg border p-3 transition-colors',
        styles.bg,
        styles.border,
        status === 'removed' && 'line-through opacity-60',
        className
      )}
    >
      {showBadge && status !== 'original' && (
        <div className="absolute -top-2 right-2">
          <DiffBadge status={status} />
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * Get diff styles for custom usage
 */
export function getDiffStyles(status: DiffStatus) {
  return DIFF_STYLES[status]
}

/**
 * Get diff label for custom usage
 */
export function getDiffLabel(status: DiffStatus) {
  return DIFF_LABELS[status]
}
