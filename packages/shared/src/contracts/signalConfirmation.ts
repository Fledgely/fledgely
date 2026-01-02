/**
 * Signal Confirmation Contracts - Story 7.5.3 Task 1
 *
 * Data models for confirmation and crisis resources.
 * AC1: Discrete confirmation display
 * AC2: Crisis resources with direct links
 * AC4: Crisis chat option
 * AC6: Child-appropriate language
 *
 * CRITICAL SAFETY: All content must be child-appropriate (6th-grade reading level).
 * Confirmation UI is discrete and does not draw attention.
 */

import { z } from 'zod'

// ============================================
// Constants
// ============================================

/** Resource type values */
export const RESOURCE_TYPE = {
  /** Phone call resource */
  PHONE: 'phone',
  /** Text/SMS resource */
  TEXT: 'text',
  /** Live chat resource */
  CHAT: 'chat',
  /** Website resource */
  WEBSITE: 'website',
} as const

/** Confirmation display event types */
export const CONFIRMATION_EVENT_TYPE = {
  /** Confirmation was displayed */
  DISPLAYED: 'displayed',
  /** User dismissed confirmation */
  DISMISSED: 'dismissed',
  /** Confirmation auto-dismissed after timeout */
  AUTO_DISMISSED: 'auto_dismissed',
  /** User clicked a crisis resource */
  RESOURCE_CLICKED: 'resource_clicked',
} as const

/** Default confirmation settings */
export const CONFIRMATION_DEFAULTS = {
  /** Auto-dismiss after 30 seconds (AC3) */
  AUTO_DISMISS_MS: 30000,
  /** Maximum reading level for child-appropriate content (AC6) */
  MAX_READING_LEVEL: 6,
} as const

// ============================================
// Zod Schemas
// ============================================

/** Resource type schema */
export const resourceTypeSchema = z.enum([
  RESOURCE_TYPE.PHONE,
  RESOURCE_TYPE.TEXT,
  RESOURCE_TYPE.CHAT,
  RESOURCE_TYPE.WEBSITE,
])

/** Confirmation event type schema */
export const confirmationEventTypeSchema = z.enum([
  CONFIRMATION_EVENT_TYPE.DISPLAYED,
  CONFIRMATION_EVENT_TYPE.DISMISSED,
  CONFIRMATION_EVENT_TYPE.AUTO_DISMISSED,
  CONFIRMATION_EVENT_TYPE.RESOURCE_CLICKED,
])

/**
 * Crisis Resource Schema
 *
 * Represents an external crisis support resource.
 */
export const crisisResourceSchema = z.object({
  /** Unique resource ID */
  id: z.string().min(1),

  /** Resource name (e.g., "Crisis Text Line") */
  name: z.string().min(1),

  /** Child-friendly description */
  description: z.string().min(1),

  /** Resource type */
  type: resourceTypeSchema,

  /** Phone number, URL, or SMS shortcode */
  value: z.string().min(1),

  /** Display order (lower = higher priority) */
  priority: z.number().int().min(0),

  /** Supported jurisdictions (empty = universal) */
  jurisdictions: z.array(z.string()),

  /** Whether resource is available 24/7 */
  available24x7: z.boolean(),

  /** Whether chat option is available */
  chatAvailable: z.boolean(),
})

/**
 * Signal Confirmation Schema
 *
 * Records when and how confirmation was displayed to child.
 */
export const signalConfirmationSchema = z.object({
  /** Unique confirmation ID */
  id: z.string().min(1),

  /** Associated safety signal ID */
  signalId: z.string().min(1),

  /** When confirmation was displayed */
  displayedAt: z.date(),

  /** When user dismissed (null if not dismissed) */
  dismissedAt: z.date().nullable(),

  /** When confirmation auto-dismissed (null if manually dismissed) */
  autoDismissedAt: z.date().nullable(),

  /** Crisis resources shown to child */
  resources: z.array(crisisResourceSchema),

  /** Whether 911 message was shown (AC5) */
  emergencyMessageShown: z.boolean(),

  /** Auto-dismiss timeout in milliseconds */
  autoDismissAfterMs: z.number().int().positive(),

  /** Child's jurisdiction for resource filtering */
  jurisdiction: z.string().min(1),

  /** Child's age for age-appropriate content */
  childAge: z.number().int().min(0).max(17),

  /** Whether signal was queued offline */
  isOffline: z.boolean(),
})

/**
 * Confirmation Content Schema
 *
 * Child-appropriate text content for confirmation display.
 * All text must be at 6th-grade reading level or below (AC6).
 */
export const confirmationContentSchema = z.object({
  /** Header text (e.g., "Someone will reach out") */
  headerText: z.string().min(1),

  /** Reassuring body message */
  bodyText: z.string().min(1),

  /** Emergency 911 message (AC5) */
  emergencyText: z.string().min(1),

  /** Chat prompt text (AC4) */
  chatPromptText: z.string().min(1),

  /** Dismiss button text */
  dismissButtonText: z.string().min(1),
})

/**
 * Confirmation Display Event Schema
 *
 * Tracks confirmation interactions for analytics (admin only).
 */
export const confirmationDisplayEventSchema = z.object({
  /** Unique event ID */
  id: z.string().min(1),

  /** Associated confirmation ID */
  confirmationId: z.string().min(1),

  /** Associated signal ID */
  signalId: z.string().min(1),

  /** Event type */
  eventType: confirmationEventTypeSchema,

  /** Resource ID if resource_clicked event */
  resourceId: z.string().nullable(),

  /** Event timestamp */
  timestamp: z.date(),

  /** Duration confirmation was visible (for dismissed events) */
  durationMs: z.number().int().positive().nullable(),
})

// ============================================
// Types
// ============================================

export type ResourceType = z.infer<typeof resourceTypeSchema>
export type ConfirmationEventType = z.infer<typeof confirmationEventTypeSchema>
export type CrisisResource = z.infer<typeof crisisResourceSchema>
export type SignalConfirmation = z.infer<typeof signalConfirmationSchema>
export type ConfirmationContent = z.infer<typeof confirmationContentSchema>
export type ConfirmationDisplayEvent = z.infer<typeof confirmationDisplayEventSchema>

// ============================================
// ID Generators
// ============================================

/**
 * Generate a unique resource ID.
 */
export function generateResourceId(): string {
  return `res_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generate a unique confirmation ID.
 */
export function generateConfirmationId(): string {
  return `conf_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generate a unique display event ID.
 */
export function generateDisplayEventId(): string {
  return `devt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new crisis resource.
 *
 * @param name - Resource name
 * @param description - Child-friendly description
 * @param type - Resource type
 * @param value - Phone number, URL, or SMS shortcode
 * @param priority - Display order (lower = higher priority)
 * @param jurisdictions - Supported jurisdictions (empty = universal)
 * @param available24x7 - Whether available 24/7
 * @param chatAvailable - Whether chat is available
 * @returns New CrisisResource
 */
export function createCrisisResource(
  name: string,
  description: string,
  type: ResourceType,
  value: string,
  priority: number,
  jurisdictions: string[],
  available24x7: boolean,
  chatAvailable: boolean
): CrisisResource {
  const resource: CrisisResource = {
    id: generateResourceId(),
    name,
    description,
    type,
    value,
    priority,
    jurisdictions,
    available24x7,
    chatAvailable,
  }

  return crisisResourceSchema.parse(resource)
}

/**
 * Create a new signal confirmation.
 *
 * @param signalId - Associated signal ID
 * @param resources - Crisis resources to display
 * @param jurisdiction - Child's jurisdiction
 * @param childAge - Child's age
 * @param isOffline - Whether signal was queued offline
 * @param autoDismissAfterMs - Auto-dismiss timeout (default 30000ms)
 * @returns New SignalConfirmation
 */
export function createSignalConfirmation(
  signalId: string,
  resources: CrisisResource[],
  jurisdiction: string,
  childAge: number,
  isOffline: boolean,
  autoDismissAfterMs: number = CONFIRMATION_DEFAULTS.AUTO_DISMISS_MS
): SignalConfirmation {
  const confirmation: SignalConfirmation = {
    id: generateConfirmationId(),
    signalId,
    displayedAt: new Date(),
    dismissedAt: null,
    autoDismissedAt: null,
    resources,
    emergencyMessageShown: true, // Always show emergency message (AC5)
    autoDismissAfterMs,
    jurisdiction,
    childAge,
    isOffline,
  }

  return signalConfirmationSchema.parse(confirmation)
}

/**
 * Create confirmation content with child-appropriate language.
 *
 * AC6: All text at 6th-grade reading level or below.
 *
 * @param headerText - Header text (default: "Someone will reach out")
 * @param bodyText - Body message
 * @param emergencyText - Emergency 911 message
 * @param chatPromptText - Chat prompt text
 * @param dismissButtonText - Dismiss button text
 * @returns ConfirmationContent
 */
export function createConfirmationContent(
  headerText: string = 'Someone will reach out',
  bodyText: string = 'You did the right thing by asking for help. Someone who can help will contact you soon.',
  emergencyText: string = 'If you are in danger right now, call 911',
  chatPromptText: string = 'Chat with someone now',
  dismissButtonText: string = 'Got it'
): ConfirmationContent {
  const content: ConfirmationContent = {
    headerText,
    bodyText,
    emergencyText,
    chatPromptText,
    dismissButtonText,
  }

  return confirmationContentSchema.parse(content)
}

/**
 * Create a confirmation display event.
 *
 * @param confirmationId - Associated confirmation ID
 * @param signalId - Associated signal ID
 * @param eventType - Event type
 * @param resourceId - Resource ID (for resource_clicked events)
 * @param durationMs - Duration visible (for dismissed events)
 * @returns ConfirmationDisplayEvent
 */
export function createConfirmationDisplayEvent(
  confirmationId: string,
  signalId: string,
  eventType: ConfirmationEventType,
  resourceId: string | null = null,
  durationMs: number | null = null
): ConfirmationDisplayEvent {
  const event: ConfirmationDisplayEvent = {
    id: generateDisplayEventId(),
    confirmationId,
    signalId,
    eventType,
    resourceId,
    timestamp: new Date(),
    durationMs,
  }

  return confirmationDisplayEventSchema.parse(event)
}

// ============================================
// Default Crisis Resources by Jurisdiction
// ============================================

/**
 * Create default US crisis resources.
 *
 * Resources include:
 * - 988 Suicide & Crisis Lifeline
 * - Crisis Text Line (HOME to 741741)
 * - Childhelp National Child Abuse Hotline
 * - National Domestic Violence Hotline
 */
export function createDefaultUSResources(): CrisisResource[] {
  return [
    createCrisisResource(
      '988 Suicide & Crisis Lifeline',
      'Call or text 988 for help',
      'phone',
      '988',
      1,
      ['US'],
      true,
      true
    ),
    createCrisisResource(
      'Crisis Text Line',
      'Text HOME to 741741 for help',
      'text',
      '741741',
      2,
      ['US'],
      true,
      false
    ),
    createCrisisResource(
      'Childhelp National Child Abuse Hotline',
      'Call for help with abuse',
      'phone',
      '1-800-422-4453',
      3,
      ['US'],
      true,
      false
    ),
    createCrisisResource(
      'National Domestic Violence Hotline',
      'Call for help at home',
      'phone',
      '1-800-799-7233',
      4,
      ['US'],
      true,
      true
    ),
  ]
}

/**
 * Create default UK crisis resources.
 */
export function createDefaultUKResources(): CrisisResource[] {
  return [
    createCrisisResource(
      'Emergency Services',
      'Call 999 if you are in danger',
      'phone',
      '999',
      0,
      ['UK'],
      true,
      false
    ),
    createCrisisResource(
      'Childline UK',
      'Call for help and support',
      'phone',
      '0800 1111',
      1,
      ['UK'],
      true,
      true
    ),
    createCrisisResource(
      'NSPCC Helpline',
      'Call for help with abuse',
      'phone',
      '0808 800 5000',
      2,
      ['UK'],
      true,
      false
    ),
  ]
}

/**
 * Create default Canada crisis resources.
 */
export function createDefaultCAResources(): CrisisResource[] {
  return [
    createCrisisResource(
      'Emergency Services',
      'Call 911 if you are in danger',
      'phone',
      '911',
      0,
      ['CA'],
      true,
      false
    ),
    createCrisisResource(
      'Kids Help Phone',
      'Call or text for help and support',
      'phone',
      '1-800-668-6868',
      1,
      ['CA'],
      true,
      true
    ),
  ]
}

/**
 * Create default Australia crisis resources.
 */
export function createDefaultAUResources(): CrisisResource[] {
  return [
    createCrisisResource(
      'Emergency Services',
      'Call 000 if you are in danger',
      'phone',
      '000',
      0,
      ['AU'],
      true,
      false
    ),
    createCrisisResource(
      'Kids Helpline',
      'Call for help and support',
      'phone',
      '1800 55 1800',
      1,
      ['AU'],
      true,
      true
    ),
  ]
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a crisis resource.
 */
export function validateCrisisResource(data: unknown): CrisisResource {
  return crisisResourceSchema.parse(data)
}

/**
 * Validate a signal confirmation.
 */
export function validateSignalConfirmation(data: unknown): SignalConfirmation {
  return signalConfirmationSchema.parse(data)
}

/**
 * Validate confirmation content.
 */
export function validateConfirmationContent(data: unknown): ConfirmationContent {
  return confirmationContentSchema.parse(data)
}

/**
 * Check if data is a valid crisis resource.
 */
export function isCrisisResource(data: unknown): data is CrisisResource {
  return crisisResourceSchema.safeParse(data).success
}

/**
 * Check if data is a valid signal confirmation.
 */
export function isSignalConfirmation(data: unknown): data is SignalConfirmation {
  return signalConfirmationSchema.safeParse(data).success
}

// ============================================
// Utility Functions
// ============================================

/**
 * Validate text is at appropriate reading level.
 *
 * Uses simplified Flesch-Kincaid grade level approximation.
 * AC6: All confirmation text must be at 6th-grade level or below.
 *
 * @param text - Text to validate
 * @param maxGradeLevel - Maximum grade level (default 6)
 * @returns True if text is at or below max grade level
 */
export function validateReadingLevel(text: string, maxGradeLevel: number = 6): boolean {
  if (!text || text.trim().length === 0) {
    return true
  }

  // Simple heuristic based on average word and sentence length
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const syllables = countSyllables(text)

  if (sentences.length === 0 || words.length === 0) {
    return true
  }

  const avgWordsPerSentence = words.length / sentences.length
  const avgSyllablesPerWord = syllables / words.length

  // Simplified Flesch-Kincaid Grade Level formula
  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59

  return gradeLevel <= maxGradeLevel
}

/**
 * Count syllables in text (simple approximation).
 */
function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/)
  let totalSyllables = 0

  for (const word of words) {
    // Count vowel groups as syllables
    const matches = word.match(/[aeiouy]+/g)
    if (matches) {
      totalSyllables += matches.length
    } else if (word.length > 0) {
      totalSyllables += 1 // At least one syllable per word
    }
  }

  return totalSyllables
}

/**
 * Filter resources by type.
 *
 * @param resources - Resources to filter
 * @param type - Resource type to filter by
 * @returns Filtered resources
 */
export function getResourcesByType(
  resources: CrisisResource[],
  type: ResourceType
): CrisisResource[] {
  return resources.filter((r) => r.type === type)
}

/**
 * Filter resources by jurisdiction.
 *
 * Includes resources that:
 * - Exactly match the jurisdiction
 * - Match the country code (e.g., 'US' matches 'US-CA')
 * - Are universal (empty jurisdictions array)
 *
 * @param resources - Resources to filter
 * @param jurisdiction - Jurisdiction to filter by
 * @returns Filtered resources
 */
export function getResourcesByJurisdiction(
  resources: CrisisResource[],
  jurisdiction: string
): CrisisResource[] {
  const countryCode = jurisdiction.split('-')[0]

  return resources.filter((r) => {
    // Universal resources (empty jurisdictions)
    if (r.jurisdictions.length === 0) {
      return true
    }

    // Exact jurisdiction match
    if (r.jurisdictions.includes(jurisdiction)) {
      return true
    }

    // Country code match
    if (r.jurisdictions.includes(countryCode)) {
      return true
    }

    return false
  })
}

/**
 * Sort resources by priority (ascending).
 *
 * @param resources - Resources to sort
 * @returns Sorted resources (new array)
 */
export function sortResourcesByPriority(resources: CrisisResource[]): CrisisResource[] {
  return [...resources].sort((a, b) => a.priority - b.priority)
}

/**
 * Filter resources that have chat available.
 *
 * @param resources - Resources to filter
 * @returns Resources with chatAvailable = true
 */
export function filterChatResources(resources: CrisisResource[]): CrisisResource[] {
  return resources.filter((r) => r.chatAvailable)
}
