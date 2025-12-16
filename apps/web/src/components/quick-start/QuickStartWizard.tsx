'use client'

import { useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  useQuickStartWizard,
  WIZARD_STEPS,
  type WizardDraft,
} from './QuickStartWizardProvider'
import { WizardStepIndicator } from './WizardStepIndicator'
import { AgeSelectionStep } from './steps/AgeSelectionStep'
import { ScreenTimeDecisionStep } from './steps/ScreenTimeDecisionStep'
import { BedtimeCutoffStep } from './steps/BedtimeCutoffStep'
import { MonitoringLevelStep } from './steps/MonitoringLevelStep'
import { AgreementPreviewStep } from './steps/AgreementPreviewStep'

interface QuickStartWizardProps {
  /** Called when wizard completes with draft data */
  onComplete?: (draft: WizardDraft) => void
  /** Called when wizard is cancelled */
  onCancel?: () => void
  /** Optional className for styling */
  className?: string
}

/**
 * Multi-step Quick Start Wizard for new parents
 *
 * Story 4.4: Quick Start Wizard - Task 1
 * AC #1: Wizard asks child's age and pre-selects appropriate template
 * AC #4: Wizard uses progress indicator showing time remaining
 * AC #5: Wizard can be completed in under 10 minutes with defaults (NFR59)
 * AC #6: Wizard ends with agreement preview before proceeding to co-creation
 *
 * Features:
 * - 5-step guided flow: Age → Screen Time → Bedtime → Monitoring → Preview
 * - Progress indicator with time estimate
 * - Step navigation with validation
 * - Template pre-selection based on age
 * - Draft data for Epic 5 handoff
 *
 * @example
 * ```tsx
 * <QuickStartWizardProvider>
 *   <QuickStartWizard
 *     onComplete={(draft) => navigateToCoCreation(draft)}
 *     onCancel={() => navigateBack()}
 *   />
 * </QuickStartWizardProvider>
 * ```
 */
export function QuickStartWizard({
  onComplete,
  onCancel,
  className,
}: QuickStartWizardProps) {
  const {
    currentStep,
    childAge,
    selectedTemplateId,
    decisions,
    nextStep,
    prevStep,
    reset,
    getDraft,
  } = useQuickStartWizard()

  const headingRef = useRef<HTMLHeadingElement>(null)
  const stepContainerRef = useRef<HTMLDivElement>(null)

  // Focus management on step change
  useEffect(() => {
    // Focus the heading or first interactive element when step changes
    if (headingRef.current) {
      headingRef.current.focus()
    }
  }, [currentStep])

  // Validate current step for enabling Next button
  const isCurrentStepValid = useCallback(() => {
    switch (currentStep) {
      case 0: // Age selection
        return childAge !== null && selectedTemplateId !== null
      case 1: // Screen time - always valid (has default)
      case 2: // Bedtime - always valid (has default)
      case 3: // Monitoring - always valid (has default)
      case 4: // Preview - always valid
        return true
      default:
        return false
    }
  }, [currentStep, childAge, selectedTemplateId])

  const handleNext = useCallback(() => {
    if (isCurrentStepValid()) {
      nextStep()
    }
  }, [isCurrentStepValid, nextStep])

  const handleBack = useCallback(() => {
    prevStep()
  }, [prevStep])

  const handleCancel = useCallback(() => {
    reset()
    onCancel?.()
  }, [reset, onCancel])

  const handleComplete = useCallback(() => {
    const draft = getDraft()
    onComplete?.(draft)
  }, [getDraft, onComplete])

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === WIZARD_STEPS.length - 1

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <AgeSelectionStep />
      case 1:
        return <ScreenTimeDecisionStep />
      case 2:
        return <BedtimeCutoffStep />
      case 3:
        return <MonitoringLevelStep />
      case 4:
        return <AgreementPreviewStep />
      default:
        return null
    }
  }

  return (
    <section
      role="region"
      aria-label="Quick Start Wizard"
      className={cn('mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8', className)}
    >
      {/* Wizard header */}
      <header className="mb-6">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-gray-900 focus:outline-none sm:text-3xl"
        >
          Quick Start
        </h1>
        <p className="mt-1 text-gray-600">
          Create your first family agreement in just a few minutes
        </p>
      </header>

      {/* Progress indicator */}
      <WizardStepIndicator
        currentStep={currentStep}
        totalSteps={WIZARD_STEPS.length}
        stepNames={WIZARD_STEPS}
        className="mb-8"
      />

      {/* Step content */}
      <div
        ref={stepContainerRef}
        className="min-h-[300px] rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        {renderStepContent()}
      </div>

      {/* Navigation buttons */}
      <footer className="mt-6 flex items-center justify-between">
        <div>
          {!isFirstStep && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="min-h-[44px] min-w-[100px]"
            >
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="min-h-[44px]"
          >
            Cancel
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleComplete}
              className="min-h-[44px] min-w-[160px]"
            >
              Start Co-Creation
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!isCurrentStepValid()}
              className="min-h-[44px] min-w-[100px]"
            >
              Next
            </Button>
          )}
        </div>
      </footer>
    </section>
  )
}
