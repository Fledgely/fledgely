/**
 * Co-Creation Session Components
 *
 * Story 5.1: Co-Creation Session Initiation
 *
 * Components for initiating and managing co-creation sessions
 * where families collaboratively build digital agreements.
 */

export { CoCreationSessionInitiation } from './CoCreationSessionInitiation'
export type { WizardDraft, TemplateDraft } from './CoCreationSessionInitiation'
export { ChildPresencePrompt } from './ChildPresencePrompt'
export { SessionStartButton } from './SessionStartButton'
export { SessionTimeoutWarning } from './SessionTimeoutWarning'
export type { SessionTimeoutWarningProps } from './SessionTimeoutWarning'
export {
  useDraftLoader,
  loadWizardDraft,
  loadTemplateDraft,
  clearWizardDraft,
  clearTemplateDraft,
  transformDraftToTerms,
  buildDraftUrl,
} from './useDraftLoader'
export type { UseDraftLoaderReturn, DraftSource, CustomRule } from './useDraftLoader'

// Story 5.4: Discussion & Negotiation Components
export {
  DiscussionPrompt,
  TermNotesPanel,
  CompromiseSuggestions,
  ResolutionControls,
  DiscussionTermCard,
  // Utilities
  DISCUSSION_PROMPTS,
  DEFAULT_PROMPTS,
  getDiscussionPrompt,
  getDiscussionPrompts,
  COMPROMISE_SUGGESTIONS,
  getCompromiseSuggestions,
  hasCompromiseSuggestions,
  getCompromiseSuggestionById,
  RESOLUTION_STATUS_LABELS,
  getResolutionStatusLabel,
  isInDiscussion,
  getRemainingAgreement,
  getResolutionAnnouncement,
  getNoteAddedAnnouncement,
  getCompromiseAcceptedAnnouncement,
} from './discussion'
export type {
  DiscussionPromptProps,
  TermNotesPanelProps,
  CompromiseSuggestionsProps,
  ResolutionControlsProps,
  DiscussionTermCardProps,
  DiscussionPromptType,
  CompromiseSuggestion,
  PromptSet,
} from './discussion'

// Story 5.5: Agreement Preview & Summary Components
export {
  AgreementSummary,
  ContributionAttribution,
  ImpactSummary,
  ScrollProgress,
  ExportButton,
  AgreementPreview,
  // Utilities
  groupTermsByCategory,
  getSortedCategoryGroups,
  CATEGORY_DISPLAY_ORDER,
  getSectionDescription,
  getSectionHeaderInfo,
  SECTION_DESCRIPTIONS,
  formatCommitmentsForDisplay,
  getContributionForTerm,
  formatContributorName,
  getSimpleCategoryName,
  SIMPLE_CATEGORY_NAMES,
  getTermCountsByStatus,
  getAcceptanceSummaryText,
} from './preview'
export type {
  AgreementSummaryProps,
  ContributionAttributionProps,
  ImpactSummaryProps,
  ScrollProgressProps,
  ExportButtonProps,
  AgreementPreviewProps,
} from './preview'

// Story 5.6: Agreement Mode Selection Components
export { AgreementModeSelector } from './mode'
