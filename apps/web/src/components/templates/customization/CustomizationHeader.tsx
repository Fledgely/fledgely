'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { DiffBadge } from './DiffIndicator'

/**
 * Props for CustomizationHeader
 */
export interface CustomizationHeaderProps {
  /** Template name being customized */
  templateName: string
  /** Number of changes made */
  changeCount: number
  /** When the draft was last modified */
  lastModified?: string
  /** Callback when revert is confirmed */
  onRevert: () => void
  /** Callback when close is clicked */
  onClose?: () => void
  /** Additional class names */
  className?: string
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

/**
 * CustomizationHeader Component
 *
 * Story 4.5: Template Customization Preview - Task 1.2, Task 6
 * AC #7: Parent can revert to original template at any time
 *
 * @param props - Component props
 */
export function CustomizationHeader({
  templateName,
  changeCount,
  lastModified,
  onRevert,
  onClose,
  className,
}: CustomizationHeaderProps) {
  const [showRevertDialog, setShowRevertDialog] = useState(false)

  const handleRevertClick = useCallback(() => {
    if (changeCount > 0) {
      setShowRevertDialog(true)
    }
  }, [changeCount])

  const handleConfirmRevert = useCallback(() => {
    onRevert()
    setShowRevertDialog(false)
  }, [onRevert])

  const handleCancelRevert = useCallback(() => {
    setShowRevertDialog(false)
  }, [])

  return (
    <>
      <div className={cn('flex items-center justify-between border-b border-gray-200 pb-4', className)}>
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'p-2 -ml-2 rounded-md text-gray-400 hover:text-gray-600',
                'min-h-[44px] min-w-[44px]', // NFR49: Touch target
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
              aria-label="Close customization editor"
            >
              <span aria-hidden="true" className="text-xl">←</span>
            </button>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customize Template
            </h2>
            <p className="text-sm text-gray-500">
              {templateName}
              {lastModified && (
                <span className="ml-2 text-gray-400">
                  · Updated {formatRelativeTime(lastModified)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Change count badge */}
          {changeCount > 0 && (
            <DiffBadge
              status="modified"
              label={`${changeCount} change${changeCount > 1 ? 's' : ''}`}
            />
          )}

          {/* Revert button */}
          <button
            type="button"
            onClick={handleRevertClick}
            disabled={changeCount === 0}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
              'min-h-[44px]', // NFR49: Touch target
              'border border-gray-300 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              changeCount > 0
                ? 'text-red-600 hover:bg-red-50 hover:border-red-300'
                : 'text-gray-400 cursor-not-allowed'
            )}
            aria-label={`Revert all ${changeCount} changes to original template`}
          >
            <span aria-hidden="true">↩️</span>
            Revert to Original
          </button>
        </div>
      </div>

      {/* Revert confirmation dialog */}
      {showRevertDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revert-dialog-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              id="revert-dialog-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              Revert to Original Template?
            </h3>
            <p className="text-gray-600 mb-4">
              You have made <strong>{changeCount} change{changeCount > 1 ? 's' : ''}</strong> to this template.
              Reverting will discard all customizations and restore the original template settings.
            </p>

            {/* Summary of changes to be lost */}
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-6">
              <p className="text-sm text-amber-800">
                <span aria-hidden="true">⚠️</span>{' '}
                <strong>Warning:</strong> This action cannot be undone.
                All custom rules and modifications will be lost.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelRevert}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium',
                  'min-h-[44px]', // NFR49: Touch target
                  'border border-gray-300 text-gray-700 bg-white',
                  'hover:bg-gray-50',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                )}
              >
                Keep Changes
              </button>
              <button
                type="button"
                onClick={handleConfirmRevert}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium',
                  'min-h-[44px]', // NFR49: Touch target
                  'bg-red-600 text-white',
                  'hover:bg-red-700',
                  'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                )}
              >
                Revert to Original
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
