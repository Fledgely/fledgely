/**
 * Save Draft Button Component.
 *
 * Story 5.7: Draft Saving & Version History - AC2
 *
 * Provides manual save functionality for agreement drafts
 * with loading state and confirmation feedback.
 */

import { useState } from 'react'
import type { SaveStatus } from '../../hooks/useAutoSave'

interface SaveDraftButtonProps {
  /** Callback when save is triggered */
  onSave: () => Promise<void>
  /** Current save status */
  status: SaveStatus
  /** Whether there are unsaved changes */
  isDirty: boolean
  /** Whether button is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * SaveDraftButton provides a manual save option for agreement drafts.
 * Shows loading state during save and disables when there's nothing to save.
 */
export function SaveDraftButton({
  onSave,
  status,
  isDirty,
  disabled = false,
  className = '',
}: SaveDraftButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)

  const isSaving = status === 'saving'
  const isDisabled = disabled || isSaving || !isDirty

  const handleClick = async () => {
    if (isDisabled) return

    await onSave()

    // Show confirmation briefly
    setShowConfirmation(true)
    setTimeout(() => setShowConfirmation(false), 2000)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          min-h-[44px] transition-all
          ${
            isDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }
          ${className}
        `}
        aria-label={isSaving ? 'Saving draft...' : 'Save draft'}
        data-testid="save-draft-button"
      >
        {/* Icon */}
        {isSaving ? (
          <span className="animate-spin" aria-hidden="true">
            ↻
          </span>
        ) : (
          <span aria-hidden="true">💾</span>
        )}

        {/* Text */}
        <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
      </button>

      {/* Confirmation toast */}
      {showConfirmation && (
        <div
          className="absolute top-full left-0 mt-2 px-3 py-2 bg-green-100 text-green-800 text-sm rounded-lg shadow-md whitespace-nowrap"
          role="alert"
          data-testid="save-confirmation"
        >
          ✓ Draft saved successfully
        </div>
      )}
    </div>
  )
}
