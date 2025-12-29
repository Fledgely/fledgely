/**
 * Draft Preview Component.
 *
 * Story 4.5: Template Customization Preview - AC5, AC6
 *
 * Shows summary of customizations with save, revert, and continue actions.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { TemplateModifications, CustomRule } from '../../hooks/useTemplateCustomization'
import { formatMinutes, formatTime24to12 } from '../../utils/formatTime'
import { MONITORING_LEVEL_LABELS } from '../../data/templates'
import { ChangeHighlightBadge, ValueComparison } from './ChangeHighlightBadge'

interface DraftPreviewProps {
  templateName: string
  originalValues: {
    screenTimeLimits?: { weekday: number; weekend: number }
    monitoringLevel?: string
  }
  currentValues: {
    screenTimeLimits: { weekday: number; weekend: number }
    bedtimeCutoff: { weekday: string; weekend: string } | null
    monitoringLevel: string
  }
  modifications: TemplateModifications
  customRules: CustomRule[]
  removedRuleCount: number
  isDirty: boolean
  onSaveDraft: () => void
  onRevertToOriginal: () => void
  onContinueToCoCreation: () => void
}

export function DraftPreview({
  templateName,
  originalValues,
  currentValues,
  modifications,
  customRules,
  removedRuleCount,
  isDirty,
  onSaveDraft,
  onRevertToOriginal,
  onContinueToCoCreation,
}: DraftPreviewProps) {
  const [showRevertConfirm, setShowRevertConfirm] = useState(false)

  const handleRevertClick = () => {
    if (isDirty) {
      setShowRevertConfirm(true)
    }
  }

  const handleConfirmRevert = () => {
    setShowRevertConfirm(false)
    onRevertToOriginal()
  }

  const handleCancelRevert = useCallback(() => {
    setShowRevertConfirm(false)
  }, [])

  // Handle Escape key for dialog
  useEffect(() => {
    if (!showRevertConfirm) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelRevert()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showRevertConfirm, handleCancelRevert])

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Customization Summary</h2>
        <p className="mt-2 text-gray-600">Review your changes to the {templateName} template.</p>
      </div>

      {/* Changes Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        {/* Screen Time */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Screen Time Limits</h3>
          <div className="space-y-2">
            <ValueComparison
              label="Weekdays"
              originalValue={formatMinutes(originalValues.screenTimeLimits?.weekday || 60)}
              newValue={formatMinutes(currentValues.screenTimeLimits.weekday)}
            />
            <ValueComparison
              label="Weekends"
              originalValue={formatMinutes(originalValues.screenTimeLimits?.weekend || 120)}
              newValue={formatMinutes(currentValues.screenTimeLimits.weekend)}
            />
          </div>
        </div>

        {/* Bedtime */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Bedtime Cutoff</h3>
          {currentValues.bedtimeCutoff ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Weekdays:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatTime24to12(currentValues.bedtimeCutoff.weekday)}
                </span>
                {'bedtimeCutoff' in modifications && <ChangeHighlightBadge type="modified" />}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Weekends:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatTime24to12(currentValues.bedtimeCutoff.weekend)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No bedtime limit set</p>
          )}
        </div>

        {/* Monitoring Level */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Monitoring Level</h3>
          <ValueComparison
            label="Level"
            originalValue={MONITORING_LEVEL_LABELS[originalValues.monitoringLevel || 'medium']}
            newValue={MONITORING_LEVEL_LABELS[currentValues.monitoringLevel]}
          />
        </div>

        {/* Rules Summary */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Rules Changes</h3>
          <div className="space-y-2">
            {customRules.length > 0 && (
              <div className="flex items-center gap-2">
                <ChangeHighlightBadge type="added" />
                <span className="text-sm text-gray-600">
                  {customRules.length} custom rule{customRules.length !== 1 ? 's' : ''} added
                </span>
              </div>
            )}
            {removedRuleCount > 0 && (
              <div className="flex items-center gap-2">
                <ChangeHighlightBadge type="removed" />
                <span className="text-sm text-gray-600">
                  {removedRuleCount} template rule{removedRuleCount !== 1 ? 's' : ''} removed
                </span>
              </div>
            )}
            {customRules.length === 0 && removedRuleCount === 0 && (
              <p className="text-sm text-gray-500">No rule changes</p>
            )}
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {isDirty ? (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">You have unsaved changes</p>
              <p className="text-sm text-yellow-700 mt-1">
                Save your customizations as a draft or continue to co-creation.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800">Using original template</p>
              <p className="text-sm text-green-700 mt-1">
                No customizations made. You can proceed with the original template.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleRevertClick}
          disabled={!isDirty}
          className="px-4 py-3 text-gray-700 font-medium rounded-lg border border-gray-300 min-h-[44px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Revert to Original
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={!isDirty}
          className="px-4 py-3 text-primary font-medium rounded-lg border border-primary min-h-[44px] hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={onContinueToCoCreation}
          className="flex-1 px-6 py-4 bg-primary text-white font-medium rounded-lg min-h-[56px] text-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Continue to Co-Creation
        </button>
      </div>

      {/* Revert Confirmation Dialog */}
      {showRevertConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revert-dialog-title"
        >
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 id="revert-dialog-title" className="text-lg font-semibold text-gray-900">
              Revert to Original Template?
            </h3>
            <p className="mt-2 text-gray-600">
              This will discard all your customizations and restore the original template values.
              This action cannot be undone.
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelRevert}
                className="px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 min-h-[44px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevert}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg min-h-[44px] hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Revert Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DraftPreview
