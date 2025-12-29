/**
 * Change Highlight Badge Component.
 *
 * Story 4.5: Template Customization Preview - AC2
 *
 * Displays visual indicators for modifications, additions, and removals
 * with appropriate colors and accessibility labels.
 */

'use client'

export type ChangeType = 'modified' | 'added' | 'removed'

const CHANGE_STYLES: Record<ChangeType, string> = {
  modified: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  added: 'bg-green-100 text-green-800 border-green-200',
  removed: 'bg-red-100 text-red-800 border-red-200',
}

const CHANGE_LABELS: Record<ChangeType, string> = {
  modified: 'Modified',
  added: 'Custom Addition',
  removed: 'Removed',
}

const CHANGE_ARIA_LABELS: Record<ChangeType, string> = {
  modified: 'This value has been modified from the original template',
  added: 'This is a custom rule you added',
  removed: 'This rule has been removed from the template',
}

interface ChangeHighlightBadgeProps {
  type: ChangeType
  originalValue?: string
  newValue?: string
  showDiff?: boolean
  className?: string
}

export function ChangeHighlightBadge({
  type,
  originalValue,
  newValue,
  showDiff = false,
  className = '',
}: ChangeHighlightBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium
        border rounded-full
        ${CHANGE_STYLES[type]}
        ${className}
      `}
      aria-label={CHANGE_ARIA_LABELS[type]}
    >
      <span>{CHANGE_LABELS[type]}</span>
      {showDiff && type === 'modified' && originalValue && newValue && (
        <span className="sr-only">
          Changed from {originalValue} to {newValue}
        </span>
      )}
    </span>
  )
}

interface ValueComparisonProps {
  originalValue: string
  newValue: string
  label: string
  showBadge?: boolean
}

export function ValueComparison({
  originalValue,
  newValue,
  label,
  showBadge = true,
}: ValueComparisonProps) {
  const hasChanged = originalValue !== newValue

  if (!hasChanged) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{label}:</span>
        <span className="text-sm font-medium text-gray-900">{newValue}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{label}:</span>
        <span className="text-sm font-medium text-gray-900">{newValue}</span>
        {showBadge && <ChangeHighlightBadge type="modified" />}
      </div>
      <div className="flex items-center gap-2 ml-4">
        <span className="text-xs text-gray-400">Was:</span>
        <span className="text-xs text-gray-500 line-through">{originalValue}</span>
      </div>
    </div>
  )
}

export default ChangeHighlightBadge
