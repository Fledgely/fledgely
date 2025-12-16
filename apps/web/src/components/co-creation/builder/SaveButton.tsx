'use client'

import { useEffect, useCallback } from 'react'
import type { SaveStatus } from '../../../hooks/useAutoSave'

/**
 * Props for the SaveButton component
 */
export interface SaveButtonProps {
  /** Current save status */
  status: SaveStatus
  /** Last saved timestamp */
  lastSaved: Date | null
  /** Formatted time since last save */
  timeSinceLastSave: string
  /** Callback when save is triggered */
  onSave: () => void
  /** Whether the button is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * Get status icon based on save status
 */
function getStatusIcon(status: SaveStatus): React.ReactNode {
  switch (status) {
    case 'saving':
      return (
        <svg
          className="w-5 h-5 animate-spin text-blue-500"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )
    case 'saved':
      return (
        <svg
          className="w-5 h-5 text-green-500"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'error':
      return (
        <svg
          className="w-5 h-5 text-red-500"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
            clipRule="evenodd"
          />
        </svg>
      )
    default:
      return (
        <svg
          className="w-5 h-5 text-gray-500 dark:text-gray-400"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
          <path
            fillRule="evenodd"
            d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      )
  }
}

/**
 * Get accessible label for save button
 */
function getAriaLabel(status: SaveStatus): string {
  switch (status) {
    case 'saving':
      return 'Saving your agreement...'
    case 'saved':
      return 'Agreement saved. Click to save again.'
    case 'error':
      return 'Save failed. Click to try again.'
    default:
      return 'Save your agreement'
  }
}

/**
 * SaveButton Component
 *
 * Story 5.7: Draft Saving & Version History - Task 3
 *
 * Manual save button with:
 * - Save status display (AC #2)
 * - "Last saved X ago" timestamp
 * - Keyboard shortcut support (Cmd/Ctrl+S)
 * - Accessible design (NFR42, NFR43, NFR49)
 *
 * @example
 * ```tsx
 * <SaveButton
 *   status={saveStatus}
 *   lastSaved={lastSaved}
 *   timeSinceLastSave={timeSinceLastSave}
 *   onSave={handleSave}
 * />
 * ```
 */
export function SaveButton({
  status,
  lastSaved,
  timeSinceLastSave,
  onSave,
  disabled = false,
  className = '',
  'data-testid': dataTestId = 'save-button',
}: SaveButtonProps) {
  const isDisabled = disabled || status === 'saving'

  // Handle keyboard shortcut (Cmd/Ctrl+S)
  const handleKeyboardSave = useCallback(
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault()
        if (!isDisabled) {
          onSave()
        }
      }
    },
    [isDisabled, onSave]
  )

  // Set up keyboard shortcut listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardSave)
    return () => {
      document.removeEventListener('keydown', handleKeyboardSave)
    }
  }, [handleKeyboardSave])

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid={dataTestId}>
      <button
        type="button"
        onClick={onSave}
        disabled={isDisabled}
        aria-label={getAriaLabel(status)}
        className={`
          flex items-center justify-center gap-2 px-4 py-2 rounded-lg
          min-w-[44px] min-h-[44px]
          font-medium text-sm
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${
            isDisabled
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
        `}
        data-testid={`${dataTestId}-trigger`}
      >
        {getStatusIcon(status)}
        <span className="hidden sm:inline">
          {status === 'saving' ? 'Saving...' : 'Save'}
        </span>
      </button>

      {/* Status text with aria-live for screen reader announcements */}
      <div
        role="status"
        className="text-sm text-gray-500 dark:text-gray-400"
        aria-live="polite"
        aria-atomic="true"
      >
        {status === 'error' ? (
          <span className="text-red-500 dark:text-red-400" role="alert">
            Save failed
          </span>
        ) : lastSaved ? (
          <span data-testid={`${dataTestId}-timestamp`}>
            {timeSinceLastSave}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">Not saved yet</span>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      <span
        className="hidden md:inline text-xs text-gray-400 dark:text-gray-500 ml-2"
        aria-hidden="true"
      >
        {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac')
          ? '⌘S'
          : 'Ctrl+S'}
      </span>
    </div>
  )
}

export default SaveButton
