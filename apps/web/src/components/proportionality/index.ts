/**
 * Proportionality Check Components - Story 38.4
 *
 * Components for the annual proportionality check system.
 */

export { default as ProportionalityCheckQuestions } from './ProportionalityCheckQuestions'
export type {
  ProportionalityCheckQuestionsProps,
  ProportionalityResponseInput,
} from './ProportionalityCheckQuestions'

export { default as ProportionalitySuggestions } from './ProportionalitySuggestions'
export type { ProportionalitySuggestionsProps } from './ProportionalitySuggestions'

export { default as DisagreementNotification } from './DisagreementNotification'
export type { DisagreementNotificationProps } from './DisagreementNotification'

export { default as ProportionalityCheckPrompt } from './ProportionalityCheckPrompt'
export type { ProportionalityCheckPromptProps } from './ProportionalityCheckPrompt'

export type { ViewerType } from './ProportionalityCheckQuestions'
