'use client'

import { useMemo, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { STEP_TIME_ESTIMATES } from './QuickStartWizardProvider'

interface WizardStepIndicatorProps {
  /** Current step index (0-based) */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Array of step names for display */
  stepNames: readonly string[]
  /** Optional className for styling */
  className?: string
}

/**
 * Progress indicator for Quick Start Wizard
 *
 * Story 4.4: Quick Start Wizard - Task 4
 * AC #4: Wizard uses progress indicator showing time remaining
 *
 * Features:
 * - Visual progress bar with percentage
 * - Step dots showing completed/current/pending states
 * - Time remaining estimate
 * - ARIA live region for screen reader announcements
 *
 * @example
 * ```tsx
 * <WizardStepIndicator
 *   currentStep={2}
 *   totalSteps={5}
 *   stepNames={['Age', 'Screen Time', 'Bedtime', 'Monitoring', 'Preview']}
 * />
 * ```
 */
export function WizardStepIndicator({
  currentStep,
  totalSteps,
  stepNames,
  className,
}: WizardStepIndicatorProps) {
  const liveRegionRef = useRef<HTMLDivElement>(null)

  // Calculate progress percentage (0-100)
  const progressPercentage = useMemo(() => {
    if (totalSteps <= 1) return currentStep === 0 ? 0 : 100
    return Math.round((currentStep / totalSteps) * 100)
  }, [currentStep, totalSteps])

  // Calculate time remaining in seconds
  const timeRemainingSeconds = useMemo(() => {
    const stepEstimates = Object.values(STEP_TIME_ESTIMATES)
    const remaining = stepEstimates.slice(currentStep)
    return remaining.reduce((sum, s) => sum + s, 0)
  }, [currentStep])

  // Format time remaining for display
  const timeRemainingDisplay = useMemo(() => {
    const minutes = Math.ceil(timeRemainingSeconds / 60)
    return `~${minutes} min remaining`
  }, [timeRemainingSeconds])

  // Display step number (1-indexed for users)
  const stepNumber = currentStep + 1
  const currentStepName = stepNames[currentStep] || `Step ${stepNumber}`

  // Announce step changes to screen readers
  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `Step ${stepNumber} of ${totalSteps}: ${currentStepName}`
    }
  }, [currentStep, stepNumber, totalSteps, currentStepName])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Screen reader live region */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Step count and time estimate */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">
          Step {stepNumber} of {totalSteps}
        </span>
        <span className="text-gray-500" aria-label={`Estimated time: ${timeRemainingDisplay}`}>
          {timeRemainingDisplay}
        </span>
      </div>

      {/* Current step name */}
      <div className="text-lg font-semibold text-gray-900">{currentStepName}</div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-label="Wizard progress"
        aria-valuenow={progressPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200"
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-in-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-between px-1">
        {stepNames.map((name, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isPending = index > currentStep

          let statusClass = 'bg-gray-300 pending'
          let statusLabel = `${name}: pending`

          if (isCompleted) {
            statusClass = 'bg-blue-600 completed done'
            statusLabel = `${name}: completed`
          } else if (isCurrent) {
            statusClass = 'bg-blue-600 ring-2 ring-blue-300 ring-offset-2 active current'
            statusLabel = `${name}: current step`
          }

          return (
            <div
              key={`step-${index}`}
              data-testid={`step-dot-${index}`}
              aria-label={statusLabel}
              className={cn(
                'h-3 w-3 rounded-full transition-all duration-200',
                statusClass,
                isPending && 'pending upcoming'
              )}
              role="presentation"
            />
          )
        })}
      </div>
    </div>
  )
}
