'use client'

import { CUSTODY_TYPE_LABELS, type CustodyDeclaration } from '@fledgely/contracts'
import { Button } from '@/components/ui/button'

interface CustodyDisplayProps {
  /** The custody declaration to display */
  custody: CustodyDeclaration
  /** Whether the current user can edit the custody */
  canEdit?: boolean
  /** Callback when edit button is clicked */
  onEdit?: () => void
  /** Whether to show compact view (less details) */
  compact?: boolean
}

/**
 * Custody Display Component
 *
 * Displays the current custody declaration for a child.
 * Shows custody type, who declared it, when, and any notes.
 *
 * Accessibility features:
 * - Semantic structure with proper headings
 * - Time element for screen reader date announcement
 * - Edit button meets 44x44px touch target (NFR49)
 * - 4.5:1 color contrast (NFR45)
 *
 * Story 2.3: Custody Arrangement Declaration
 *
 * @example
 * ```tsx
 * <CustodyDisplay
 *   custody={child.custodyDeclaration}
 *   canEdit={hasFullPermissions}
 *   onEdit={() => setEditMode(true)}
 * />
 * ```
 */
export function CustodyDisplay({
  custody,
  canEdit = false,
  onEdit,
  compact = false,
}: CustodyDisplayProps) {
  const typeLabel = CUSTODY_TYPE_LABELS[custody.type]

  // Format date for display
  const formattedDate = custody.declaredAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // ISO date for screen readers
  const isoDate = custody.declaredAt.toISOString()

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              custody.type === 'shared'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                : custody.type === 'complex'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
            }`}
          >
            {typeLabel.title}
          </span>
        </div>

        {canEdit && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="min-h-[44px] min-w-[44px] text-xs"
          >
            Edit
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Header with type and edit button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Custody Arrangement</h3>
          <p className="mt-1 text-lg font-medium text-foreground">{typeLabel.title}</p>
        </div>

        {canEdit && onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="min-h-[44px] min-w-[44px]"
          >
            Edit
          </Button>
        )}
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-muted-foreground">{typeLabel.description}</p>

      {/* Notes for complex arrangements */}
      {custody.notes && (
        <div className="mt-4 rounded-md bg-muted/50 p-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Additional Details
          </h4>
          <p className="mt-1 text-sm text-foreground">{custody.notes}</p>
        </div>
      )}

      {/* Shared custody informational message */}
      {custody.type === 'shared' && (
        <div
          className="mt-4 rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-900"
          role="note"
          aria-label="Information about shared custody"
        >
          <p className="font-medium mb-1">Shared Custody Safeguards Active</p>
          <p className="text-xs">
            Both parents will be notified when co-parent joins and have equal access to monitoring data.
          </p>
        </div>
      )}

      {/* Declaration metadata */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Declared on{' '}
          <time dateTime={isoDate}>{formattedDate}</time>
        </p>
      </div>
    </div>
  )
}

/**
 * Custody Badge - A small badge showing custody type
 */
export function CustodyBadge({
  type,
}: {
  type: CustodyDeclaration['type']
}) {
  const typeLabel = CUSTODY_TYPE_LABELS[type]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        type === 'shared'
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
          : type === 'complex'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
      }`}
      title={typeLabel.description}
    >
      {typeLabel.title}
    </span>
  )
}

/**
 * No Custody Declaration Banner - Shown when custody hasn't been declared
 */
export function NoCustodyBanner({
  onDeclare,
  childName,
}: {
  onDeclare?: () => void
  childName?: string
}) {
  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-amber-600 dark:text-amber-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Custody Declaration Required
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {childName
              ? `Please declare your custody arrangement for ${childName} before setting up monitoring.`
              : 'Please declare your custody arrangement before setting up monitoring.'}
          </p>
          {onDeclare && (
            <div className="mt-3">
              <Button
                onClick={onDeclare}
                size="sm"
                className="min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white"
              >
                Declare Custody
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
