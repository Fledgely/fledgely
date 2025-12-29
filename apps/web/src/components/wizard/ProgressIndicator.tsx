/**
 * Progress Indicator Component.
 *
 * Story 4.4: Quick Start Wizard - AC3
 *
 * Displays wizard progress with step names, current step,
 * and estimated time remaining.
 */

'use client'

import { WIZARD_STEPS } from '../../hooks/useQuickStartWizard'

interface ProgressIndicatorProps {
  currentStep: number
  timeRemaining: number
}

export function ProgressIndicator({ currentStep, timeRemaining }: ProgressIndicatorProps) {
  const totalSteps = WIZARD_STEPS.length
  const progressPercentage = currentStep === totalSteps - 1 ? 100 : (currentStep / totalSteps) * 100
  const currentStepName = WIZARD_STEPS[currentStep].name

  return (
    <div className="mb-6">
      {/* Screen reader announcement for step changes (AC6) */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Now on step {currentStep + 1} of {totalSteps}: {currentStepName}. {timeRemaining} minutes
        remaining.
      </div>

      {/* Time remaining */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep + 1} of {totalSteps}: {currentStepName}
        </span>
        <span className="text-sm text-gray-500">{timeRemaining} min remaining</span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(progressPercentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Wizard progress: ${Math.round(progressPercentage)}% complete`}
      >
        <div
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step indicators */}
      <ul className="flex justify-between mt-3" role="list">
        {WIZARD_STEPS.map((step, index) => (
          <li
            key={step.id}
            className="flex flex-col items-center"
            aria-current={index === currentStep ? 'step' : undefined}
          >
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                transition-colors duration-200
                ${
                  index < currentStep
                    ? 'bg-primary text-white'
                    : index === currentStep
                      ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                      : 'bg-gray-200 text-gray-500'
                }
              `}
              data-testid={
                index < currentStep
                  ? 'step-completed'
                  : index === currentStep
                    ? 'step-current'
                    : 'step-upcoming'
              }
            >
              {index < currentStep ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`
                mt-1 text-xs hidden sm:block
                ${index === currentStep ? 'font-medium text-gray-900' : 'text-gray-500'}
              `}
            >
              {step.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ProgressIndicator
