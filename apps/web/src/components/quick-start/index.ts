/**
 * Quick Start Wizard Components
 *
 * Story 4.4: Quick Start Wizard
 * Guided wizard for new parents to create their first family agreement
 */

// Main wizard components
export { QuickStartWizard } from './QuickStartWizard'
export { WizardStepIndicator } from './WizardStepIndicator'

// State management
export {
  QuickStartWizardProvider,
  useQuickStartWizard,
  WIZARD_STEPS,
  STEP_TIME_ESTIMATES,
  type WizardState,
  type WizardDecisions,
  type WizardDraft,
  type MonitoringLevel,
  type WizardStepName,
} from './QuickStartWizardProvider'

// Step components
export { AgeSelectionStep } from './steps/AgeSelectionStep'
export { ScreenTimeDecisionStep } from './steps/ScreenTimeDecisionStep'
export { BedtimeCutoffStep } from './steps/BedtimeCutoffStep'
export { MonitoringLevelStep } from './steps/MonitoringLevelStep'
export { AgreementPreviewStep } from './steps/AgreementPreviewStep'
