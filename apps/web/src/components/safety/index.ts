/**
 * Safety Components - Epic 0.5: Safe Account Escape
 *
 * Components for domestic abuse victims to safely contact support.
 *
 * CRITICAL SAFETY DESIGN:
 * These components are intentionally subtle and use neutral language.
 * They must NOT draw attention from a potential abuser.
 */

export { SafetyContactForm } from './SafetyContactForm'
export type { SafetyContactFormProps } from './SafetyContactForm'

export { SafetyDocumentUpload } from './SafetyDocumentUpload'
export type { SafetyDocumentUploadProps } from './SafetyDocumentUpload'

// Child Safety Signal (Story 7.5.1)
export { default as SafetySignalGestureDetector } from './SafetySignalGestureDetector'
export type { SafetySignalGestureDetectorProps, TriggerMethod } from './SafetySignalGestureDetector'

// Signal Confirmation (Story 7.5.3)
export { default as SignalConfirmationUI } from './SignalConfirmationUI'
export type { SignalConfirmationUIProps } from './SignalConfirmationUI'

export { default as CrisisResourceList } from './CrisisResourceList'
export type { CrisisResourceListProps } from './CrisisResourceList'

export { useSafetySignalConfirmation } from './useSafetySignalConfirmation'
export type {
  UseSafetySignalConfirmationProps,
  UseSafetySignalConfirmationReturn,
} from './useSafetySignalConfirmation'
