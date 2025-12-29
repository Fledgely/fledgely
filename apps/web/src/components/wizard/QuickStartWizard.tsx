/**
 * Quick Start Wizard Component.
 *
 * Story 4.4: Quick Start Wizard
 *
 * Main wizard container that orchestrates the multi-step
 * agreement creation flow with progress tracking.
 */

'use client'

import { useQuickStartWizard } from '../../hooks/useQuickStartWizard'
import { ProgressIndicator } from './ProgressIndicator'
import { AgeSelectionStep } from './steps/AgeSelectionStep'
import { ScreenTimeStep } from './steps/ScreenTimeStep'
import { BedtimeCutoffStep } from './steps/BedtimeCutoffStep'
import { MonitoringLevelStep } from './steps/MonitoringLevelStep'
import { AgreementPreviewStep } from './steps/AgreementPreviewStep'

interface QuickStartWizardProps {
  childAge?: number
  onComplete: (agreementData: ReturnType<typeof useQuickStartWizard>['state']) => void
  onCancel?: () => void
}

export function QuickStartWizard({ childAge, onComplete, onCancel }: QuickStartWizardProps) {
  const {
    currentStep,
    state,
    timeRemaining,
    canProceed,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    setAgeGroup,
    setScreenTimeLimits,
    setBedtimeCutoff,
    setMonitoringLevel,
  } = useQuickStartWizard(childAge)

  const handleStartCoCreation = () => {
    onComplete(state)
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <AgeSelectionStep
            selectedAgeGroup={state.ageGroup}
            childAge={state.childAge}
            onSelectAgeGroup={setAgeGroup}
          />
        )
      case 1:
        return (
          <ScreenTimeStep
            screenTimeLimits={state.screenTimeLimits}
            onUpdateLimits={setScreenTimeLimits}
            templateDefaults={state.selectedTemplate?.screenTimeLimits}
          />
        )
      case 2:
        return (
          <BedtimeCutoffStep
            bedtimeCutoff={state.bedtimeCutoff}
            ageGroup={state.ageGroup}
            onUpdateBedtime={setBedtimeCutoff}
          />
        )
      case 3:
        return (
          <MonitoringLevelStep
            monitoringLevel={state.monitoringLevel}
            onSelectLevel={setMonitoringLevel}
            templateDefault={state.selectedTemplate?.monitoringLevel}
          />
        )
      case 4:
        return (
          <AgreementPreviewStep
            state={state}
            onEditStep={goToStep}
            onStartCoCreation={handleStartCoCreation}
          />
        )
      default:
        return null
    }
  }

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === 4

  return (
    <div className="max-w-2xl mx-auto">
      <ProgressIndicator currentStep={currentStep} timeRemaining={timeRemaining} />

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {renderCurrentStep()}

        {/* Navigation buttons - not shown on last step (has its own button) */}
        {!isLastStep && (
          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={isFirstStep ? onCancel : goToPreviousStep}
              className="px-6 py-3 text-gray-600 font-medium rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 min-h-[44px]"
            >
              {isFirstStep ? 'Cancel' : 'Back'}
            </button>

            <button
              type="button"
              onClick={goToNextStep}
              disabled={!canProceed}
              className={`
                px-6 py-3 font-medium rounded-lg min-h-[44px]
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                ${
                  canProceed
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              Continue
            </button>
          </div>
        )}

        {/* Back button on last step */}
        {isLastStep && (
          <div className="mt-4">
            <button
              type="button"
              onClick={goToPreviousStep}
              className="px-6 py-3 text-gray-600 font-medium rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 min-h-[44px]"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuickStartWizard
