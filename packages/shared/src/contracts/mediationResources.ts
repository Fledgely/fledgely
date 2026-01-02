/**
 * Mediation Resources Contracts - Story 34.5.2 Task 1
 *
 * Data structures for mediation resources.
 * AC2: Link to Family Communication Resources
 * AC3: Family Meeting Template Access
 * AC4: Age-Appropriate Negotiation Tips
 *
 * CRITICAL: All content must be supportive, not accusatory (AC5)
 */

import { z } from 'zod'

// ============================================
// Age Tier Schema
// ============================================

/**
 * Age tiers for content adaptation.
 * Matches child's age to appropriate vocabulary and complexity.
 */
export const ageTierSchema = z.enum(['child-8-11', 'tween-12-14', 'teen-15-17'])
export type AgeTier = z.infer<typeof ageTierSchema>

// ============================================
// Resource Type Schema
// ============================================

/**
 * Types of mediation resources.
 */
export const resourceTypeSchema = z.enum([
  'family-meeting-template',
  'negotiation-tips',
  'communication-guide',
  'external-resource',
])
export type ResourceType = z.infer<typeof resourceTypeSchema>

// ============================================
// Mediation Resource Schema
// ============================================

/**
 * A mediation resource for helping families communicate.
 */
export const mediationResourceSchema = z.object({
  /** Unique identifier */
  id: z.string(),

  /** Type of resource */
  type: resourceTypeSchema,

  /** Title displayed to user */
  title: z.string(),

  /** Brief description of resource */
  description: z.string(),

  /** Full content (markdown supported) */
  content: z.string(),

  /** Age tier for content adaptation */
  ageTier: ageTierSchema,

  /** External URL for linked resources (null if internal) */
  externalUrl: z.string().url().nullable(),

  /** Whether resource can be printed/shared */
  isPrintable: z.boolean(),

  /** Display order (0-indexed) */
  order: z.number().int().min(0),
})

export type MediationResource = z.infer<typeof mediationResourceSchema>

// ============================================
// Family Meeting Template Schema
// ============================================

/**
 * Section of a family meeting template with heading and prompts.
 */
export const templateSectionSchema = z.object({
  /** Section heading */
  heading: z.string(),

  /** Discussion prompts/questions */
  prompts: z.array(z.string()),
})

export type TemplateSection = z.infer<typeof templateSectionSchema>

/**
 * Family meeting template for structured discussions.
 * AC3: Template includes parent concerns, child concerns, compromises.
 */
export const familyMeetingTemplateSchema = z.object({
  /** Unique identifier */
  id: z.string(),

  /** Template title */
  title: z.string(),

  /** Introduction text explaining the template */
  introduction: z.string(),

  /** Section for parent concerns */
  parentSection: templateSectionSchema,

  /** Section for child concerns */
  childSection: templateSectionSchema,

  /** Section for finding compromises together */
  jointSection: templateSectionSchema,

  /** Closing notes and reminders */
  closingNotes: z.string(),

  /** Age tier for language adaptation */
  ageTier: ageTierSchema,
})

export type FamilyMeetingTemplate = z.infer<typeof familyMeetingTemplateSchema>

// ============================================
// Negotiation Tip Schema
// ============================================

/**
 * A negotiation tip for children.
 * AC4: Tips are practical and actionable.
 */
export const negotiationTipSchema = z.object({
  /** Unique identifier */
  id: z.string(),

  /** Tip title */
  title: z.string(),

  /** Short description for preview */
  shortDescription: z.string(),

  /** Full content explaining the tip */
  fullContent: z.string(),

  /** Age tier for language adaptation */
  ageTier: ageTierSchema,

  /** Display order (0-indexed) */
  order: z.number().int().min(0),
})

export type NegotiationTip = z.infer<typeof negotiationTipSchema>

// ============================================
// Escalation Acknowledgment Schema
// ============================================

/**
 * Record of when a child acknowledged an escalation.
 * Used to track that child has seen mediation resources.
 */
export const escalationAcknowledgmentSchema = z.object({
  /** Unique identifier */
  id: z.string(),

  /** Family ID */
  familyId: z.string(),

  /** Child ID who acknowledged */
  childId: z.string(),

  /** Escalation event ID being acknowledged */
  escalationEventId: z.string(),

  /** When acknowledgment occurred */
  acknowledgedAt: z.date(),

  /** Whether resources were viewed */
  viewedResources: z.boolean(),
})

export type EscalationAcknowledgment = z.infer<typeof escalationAcknowledgmentSchema>
