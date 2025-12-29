/**
 * Agreement Preview Step Component.
 *
 * Story 4.4: Quick Start Wizard - AC4
 *
 * Displays summary of all wizard selections with edit links
 * and Start Co-Creation button.
 */

'use client'

import type { QuickStartState } from '../../../hooks/useQuickStartWizard'
import { AGE_GROUP_LABELS, MONITORING_LEVEL_LABELS } from '../../../data/templates'
import { formatMinutes, formatTime24to12 } from '../../../utils/formatTime'

interface AgreementPreviewStepProps {
  state: QuickStartState
  onEditStep: (stepIndex: number) => void
  onStartCoCreation: () => void
}

export function AgreementPreviewStep({
  state,
  onEditStep,
  onStartCoCreation,
}: AgreementPreviewStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Review Your Selections</h2>
        <p className="mt-2 text-gray-600">
          Here&apos;s a summary of your agreement. You can edit any section before continuing.
        </p>
      </div>

      <div className="space-y-4">
        {/* Age Group Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Age Group</h3>
              <p className="text-sm text-gray-600">
                {state.ageGroup ? AGE_GROUP_LABELS[state.ageGroup] : 'Not selected'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(0)}
              className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded min-h-[44px] min-w-[60px]"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Screen Time Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Screen Time Limits</h3>
              <p className="text-sm text-gray-600">
                Weekdays: {formatMinutes(state.screenTimeLimits.weekday)} • Weekends:{' '}
                {formatMinutes(state.screenTimeLimits.weekend)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded min-h-[44px] min-w-[60px]"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Bedtime Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Bedtime Cutoff</h3>
              {state.bedtimeCutoff ? (
                <p className="text-sm text-gray-600">
                  Weekdays: {formatTime24to12(state.bedtimeCutoff.weekday)} • Weekends:{' '}
                  {formatTime24to12(state.bedtimeCutoff.weekend)}
                </p>
              ) : (
                <p className="text-sm text-gray-600">No bedtime limit set</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onEditStep(2)}
              className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded min-h-[44px] min-w-[60px]"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Monitoring Level Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Monitoring Level</h3>
              <p className="text-sm text-gray-600">
                {MONITORING_LEVEL_LABELS[state.monitoringLevel]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(3)}
              className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded min-h-[44px] min-w-[60px]"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Template Info */}
        {state.selectedTemplate && (
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-primary mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Based on: {state.selectedTemplate.name}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">{state.selectedTemplate.description}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <p className="text-sm text-green-800">
          <strong>What&apos;s next?</strong> You&apos;ll sit down with your child to review and
          finalize this agreement together. They can suggest changes and you&apos;ll both sign it.
        </p>
      </div>

      <button
        type="button"
        onClick={onStartCoCreation}
        className="w-full px-6 py-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[56px] text-lg"
      >
        Start Co-Creation with My Child
      </button>
    </div>
  )
}

export default AgreementPreviewStep
