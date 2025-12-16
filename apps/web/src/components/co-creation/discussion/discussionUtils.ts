/**
 * Discussion Utilities
 *
 * Story 5.4: Negotiation & Discussion Support
 *
 * Provides prompts, suggestions, and utilities for facilitating family
 * discussions about agreement terms.
 *
 * NFR65: All prompts at 6th-grade reading level
 */

import type { SessionContributor, TermType, ResolutionStatus } from '@fledgely/contracts'

// ============================================
// TYPES
// ============================================

export interface DiscussionPrompt {
  id: string
  contributor: SessionContributor
  text: string
}

export interface CompromiseSuggestion {
  id: string
  text: string
  adjustment: Record<string, unknown>
}

export interface PromptSet {
  child: string
  parent: string
}

// ============================================
// DISCUSSION PROMPTS BY TERM TYPE
// ============================================

/**
 * Child-friendly prompts for each term type.
 * All written at 6th-grade reading level (NFR65).
 */
export const DISCUSSION_PROMPTS: Record<TermType, PromptSet> = {
  screen_time: {
    child: 'Why is this screen time important to you?',
    parent: 'What concerns do you have about screen time?',
  },
  bedtime: {
    child: 'Why do you want to stay up later?',
    parent: 'Why is this bedtime important for your family?',
  },
  monitoring: {
    child: 'How does this make you feel?',
    parent: 'Why is this level of monitoring needed?',
  },
  rule: {
    child: 'What would help you follow this rule?',
    parent: 'What problem does this rule solve?',
  },
  consequence: {
    child: 'Does this feel fair to you?',
    parent: 'How does this help learning?',
  },
  reward: {
    child: 'What would make this reward exciting?',
    parent: 'What behavior does this encourage?',
  },
}

/**
 * Generic fallback prompts for term types not explicitly defined.
 */
export const DEFAULT_PROMPTS: PromptSet = {
  child: 'What do you think about this?',
  parent: 'Why is this important to you?',
}

// ============================================
// COMPROMISE SUGGESTIONS BY TERM TYPE
// ============================================

/**
 * Predefined compromise suggestions for common disagreements.
 * Shown when terms are in discussion status.
 */
export const COMPROMISE_SUGGESTIONS: Record<TermType, CompromiseSuggestion[]> = {
  screen_time: [
    { id: 'st-less-30', text: 'Try 30 minutes less', adjustment: { minutes: -30 } },
    { id: 'st-more-15', text: 'Try 15 minutes more', adjustment: { minutes: 15 } },
    { id: 'st-weekday-split', text: 'Less on school days, more on weekends', adjustment: { weekdaySplit: true } },
  ],
  bedtime: [
    { id: 'bt-earlier-15', text: 'Try 15 minutes earlier', adjustment: { minutes: -15 } },
    { id: 'bt-later-15', text: 'Try 15 minutes later', adjustment: { minutes: 15 } },
    { id: 'bt-weekend-flex', text: 'Later bedtime on weekends', adjustment: { weekendFlex: true } },
  ],
  monitoring: [
    { id: 'mon-trial', text: 'Try a 2-week trial at lower level', adjustment: { trial: '2weeks' } },
    { id: 'mon-gradual', text: 'Gradually reduce over time', adjustment: { gradual: true } },
  ],
  rule: [],
  consequence: [],
  reward: [],
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the discussion prompt for a specific term type and contributor.
 */
export function getDiscussionPrompt(
  termType: TermType,
  contributor: SessionContributor
): string {
  const prompts = DISCUSSION_PROMPTS[termType] ?? DEFAULT_PROMPTS
  return prompts[contributor]
}

/**
 * Get all discussion prompts for a term type.
 */
export function getDiscussionPrompts(termType: TermType): PromptSet {
  return DISCUSSION_PROMPTS[termType] ?? DEFAULT_PROMPTS
}

/**
 * Get compromise suggestions for a term type.
 */
export function getCompromiseSuggestions(termType: TermType): CompromiseSuggestion[] {
  return COMPROMISE_SUGGESTIONS[termType] ?? []
}

/**
 * Check if a term type has compromise suggestions available.
 */
export function hasCompromiseSuggestions(termType: TermType): boolean {
  const suggestions = COMPROMISE_SUGGESTIONS[termType]
  return suggestions !== undefined && suggestions.length > 0
}

/**
 * Get a specific compromise suggestion by ID.
 */
export function getCompromiseSuggestionById(
  termType: TermType,
  suggestionId: string
): CompromiseSuggestion | undefined {
  const suggestions = COMPROMISE_SUGGESTIONS[termType]
  return suggestions?.find((s) => s.id === suggestionId)
}

// ============================================
// RESOLUTION STATUS LABELS
// ============================================

/**
 * Human-readable labels for resolution statuses.
 */
export const RESOLUTION_STATUS_LABELS: Record<ResolutionStatus, string> = {
  unresolved: 'Needs discussion',
  'parent-agreed': 'Parent agreed',
  'child-agreed': 'Child agreed',
  resolved: 'Resolved',
}

/**
 * Get a human-readable label for a resolution status.
 */
export function getResolutionStatusLabel(status: ResolutionStatus): string {
  return RESOLUTION_STATUS_LABELS[status]
}

/**
 * Check if a resolution status means the term is still in discussion.
 */
export function isInDiscussion(status: ResolutionStatus): boolean {
  return status !== 'resolved'
}

/**
 * Get the remaining agreement needed for resolution.
 */
export function getRemainingAgreement(status: ResolutionStatus): SessionContributor | 'none' | 'both' {
  switch (status) {
    case 'resolved':
      return 'none'
    case 'parent-agreed':
      return 'child'
    case 'child-agreed':
      return 'parent'
    case 'unresolved':
      return 'both'
    default:
      return 'both'
  }
}

// ============================================
// SCREEN READER ANNOUNCEMENTS
// ============================================

/**
 * Get screen reader announcement for resolution status change (NFR42).
 */
export function getResolutionAnnouncement(
  termTitle: string,
  newStatus: ResolutionStatus
): string {
  switch (newStatus) {
    case 'parent-agreed':
      return `Parent has agreed to ${termTitle}. Waiting for child agreement.`
    case 'child-agreed':
      return `Child has agreed to ${termTitle}. Waiting for parent agreement.`
    case 'resolved':
      return `${termTitle} has been resolved. Both parties agree.`
    case 'unresolved':
      return `${termTitle} needs discussion.`
    default:
      return `${termTitle} status changed.`
  }
}

/**
 * Get screen reader announcement for adding a note.
 */
export function getNoteAddedAnnouncement(contributor: SessionContributor): string {
  return `${contributor === 'parent' ? 'Parent' : 'Child'} added a note to the discussion.`
}

/**
 * Get screen reader announcement for accepting a compromise.
 */
export function getCompromiseAcceptedAnnouncement(suggestionText: string): string {
  return `Compromise accepted: ${suggestionText}. Term value has been updated.`
}
