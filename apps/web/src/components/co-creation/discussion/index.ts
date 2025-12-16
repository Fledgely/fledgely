/**
 * Discussion Components Index
 *
 * Story 5.4: Negotiation & Discussion Support
 *
 * Exports all discussion-related components and utilities.
 */

export { DiscussionPrompt } from './DiscussionPrompt'
export type { DiscussionPromptProps } from './DiscussionPrompt'

export { TermNotesPanel } from './TermNotesPanel'
export type { TermNotesPanelProps } from './TermNotesPanel'

export { CompromiseSuggestions } from './CompromiseSuggestions'
export type { CompromiseSuggestionsProps } from './CompromiseSuggestions'

export { ResolutionControls } from './ResolutionControls'
export type { ResolutionControlsProps } from './ResolutionControls'

export { DiscussionTermCard } from './DiscussionTermCard'
export type { DiscussionTermCardProps } from './DiscussionTermCard'

export {
  // Prompts
  DISCUSSION_PROMPTS,
  DEFAULT_PROMPTS,
  getDiscussionPrompt,
  getDiscussionPrompts,
  // Compromise suggestions
  COMPROMISE_SUGGESTIONS,
  getCompromiseSuggestions,
  hasCompromiseSuggestions,
  getCompromiseSuggestionById,
  // Resolution status
  RESOLUTION_STATUS_LABELS,
  getResolutionStatusLabel,
  isInDiscussion,
  getRemainingAgreement,
  // Screen reader announcements
  getResolutionAnnouncement,
  getNoteAddedAnnouncement,
  getCompromiseAcceptedAnnouncement,
} from './discussionUtils'

export type {
  DiscussionPrompt as DiscussionPromptType,
  CompromiseSuggestion,
  PromptSet,
} from './discussionUtils'
