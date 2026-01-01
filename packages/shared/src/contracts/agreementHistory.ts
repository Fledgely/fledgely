/**
 * Agreement History Types and Constants - Story 34.6
 *
 * Types, schemas, and messaging for agreement change history.
 * AC1: Timeline with versions and dates
 * AC2: Who proposed, who accepted, what changed
 * AC4: "Updated X times" summary
 * AC5: Growth and trust-building messaging
 */

import { z } from 'zod'

/**
 * Schema for a single field change within an agreement version.
 * AC2: What changed
 */
export const agreementChangeSchema = z.object({
  /** Dot-notation path to the changed field */
  fieldPath: z.string().min(1),
  /** Human-readable label for the field */
  fieldLabel: z.string().min(1),
  /** Previous value (null if new field) */
  previousValue: z.string().nullable(),
  /** New value (null if field removed) */
  newValue: z.string().nullable(),
})

export type AgreementChange = z.infer<typeof agreementChangeSchema>

/**
 * Schema for an agreement version record.
 * AC1: Timeline with versions and dates
 * AC2: Who proposed, who accepted, what changed
 */
export const agreementVersionSchema = z.object({
  /** Unique version ID */
  id: z.string().min(1),
  /** Sequential version number */
  versionNumber: z.number().int().positive(),
  /** ID of the parent who proposed the change */
  proposerId: z.string().min(1),
  /** Name of the proposer */
  proposerName: z.string().min(1),
  /** ID of the parent who accepted the change */
  accepterId: z.string().min(1),
  /** Name of the accepter */
  accepterName: z.string().min(1),
  /** List of changes in this version */
  changes: z.array(agreementChangeSchema),
  /** When this version was created */
  createdAt: z.date(),
  /** Optional note about the change */
  note: z.string().optional(),
})

export type AgreementVersion = z.infer<typeof agreementVersionSchema>

/**
 * UI messaging constants for agreement history.
 * AC5: Growth and trust-building messaging
 */
export const HISTORY_MESSAGES = {
  timeline: {
    header: 'Agreement History',
    subheader: 'See how your family agreement has evolved',
    emptyState: 'Your agreement history will appear here as you make changes together.',
  },
  growth: {
    milestone: {
      five: "You've reached 5 updates! Your family is learning to adapt together.",
      ten: '10 updates and counting! This shows real commitment to growth.',
      twenty: '20 updates! Your agreement evolves with your family.',
    },
    collaboration: 'Every update represents a conversation and a decision made together.',
    evolution: 'Agreements that change are agreements that work.',
  },
  diff: {
    header: 'Compare Versions',
    previous: 'Previous',
    current: 'Current',
    noChanges: 'No differences found between these versions.',
    selectVersions: 'Select two versions to compare.',
  },
  export: {
    button: 'Export History',
    success: 'History exported successfully!',
    formats: {
      json: 'Export as JSON',
      text: 'Export as Text',
    },
  },
  version: {
    proposedBy: 'Proposed by',
    acceptedBy: 'Accepted by',
    changesLabel: 'Changes made',
  },
} as const

/**
 * Get the "updated X times" summary message.
 * AC4: Summary of update count
 */
export function getUpdateCountMessage(count: number): string {
  if (count === 0) {
    return "We haven't updated the agreement yet."
  }
  if (count === 1) {
    return "We've updated the agreement 1 time."
  }
  return `We've updated the agreement ${count} times.`
}

/**
 * Get a growth/trust-building message based on version count.
 * AC5: History demonstrates growth and trust-building
 */
export function getGrowthMessage(versionCount: number): string {
  if (versionCount >= 20) {
    return HISTORY_MESSAGES.growth.milestone.twenty
  }
  if (versionCount >= 10) {
    return HISTORY_MESSAGES.growth.milestone.ten
  }
  if (versionCount >= 5) {
    return HISTORY_MESSAGES.growth.milestone.five
  }
  if (versionCount >= 2) {
    return HISTORY_MESSAGES.growth.collaboration
  }
  return HISTORY_MESSAGES.growth.evolution
}
