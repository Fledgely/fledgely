/**
 * Adult Pattern Detection Contracts
 *
 * Story 8.10: Adult Pattern Detection
 *
 * Schemas for detecting adult usage patterns to prevent misuse of child
 * monitoring for adult surveillance (domestic abuse, stalking, elder abuse).
 *
 * FR134: Adult pattern detection as security foundation
 * NFR85: Adversarial testing
 *
 * PRIVACY: Detection uses ONLY metadata (URLs, timestamps), never screenshot content.
 */

import { z } from 'zod'

// ============================================================================
// ADULT PATTERN SIGNAL DEFINITIONS
// ============================================================================

/**
 * Work app URL patterns that indicate adult usage.
 *
 * These are domains typically used by adults in professional contexts.
 * AC5: Metadata-Only Detection - only domain matching, no content access.
 */
export const WORK_APP_DOMAINS = [
  // Professional networking & communication
  'linkedin.com',
  'slack.com',
  'teams.microsoft.com',
  // Note: Discord excluded - heavily used by teenagers for gaming
  // Video conferencing (business accounts)
  'zoom.us',
  'webex.com',
  'meet.google.com',
  'gotomeeting.com',
  // CRM & Sales
  'salesforce.com',
  'hubspot.com',
  'pipedrive.com',
  // Project management
  'jira.atlassian.com',
  'atlassian.com',
  'asana.com',
  'monday.com',
  'trello.com',
  'notion.so',
  // Accounting & Invoicing
  'quickbooks.com',
  'xero.com',
  'freshbooks.com',
  'wave.com',
  // HR & Recruiting
  'workday.com',
  'bamboohr.com',
  'greenhouse.io',
  'lever.co',
  // Cloud platforms (professional)
  'aws.amazon.com',
  'console.cloud.google.com',
  'portal.azure.com',
  // Note: GitHub/GitLab excluded - used by students and hobbyist programmers
] as const

/**
 * Financial site URL patterns that strongly indicate adult usage.
 *
 * Children typically don't use banking, trading, or tax preparation sites.
 * AC5: Metadata-Only Detection - only domain matching, no content access.
 */
export const FINANCIAL_SITE_DOMAINS = [
  // Banking
  'bankofamerica.com',
  'chase.com',
  'wellsfargo.com',
  'usbank.com',
  'citibank.com',
  'capitalone.com',
  'ally.com',
  'discover.com',
  'pnc.com',
  'tdbank.com',
  // Investment platforms
  'fidelity.com',
  'schwab.com',
  'vanguard.com',
  'etrade.com',
  'ameritrade.com',
  'merrilledge.com',
  // Trading platforms
  'robinhood.com',
  'webull.com',
  'coinbase.com',
  'binance.com',
  // Tax preparation
  'turbotax.intuit.com',
  'hrblock.com',
  'taxact.com',
  'freetaxusa.com',
  // Credit & Loans
  'creditkarma.com',
  'experian.com',
  'equifax.com',
  'transunion.com',
  'lendingtree.com',
  // Insurance
  'geico.com',
  'progressive.com',
  'statefarm.com',
  'allstate.com',
  // Payroll & Benefits
  'adp.com',
  'gusto.com',
  'paylocity.com',
] as const

/**
 * Adult pattern signal types.
 */
export const adultPatternSignalTypeSchema = z.enum([
  'work_apps',
  'financial_sites',
  'adult_schedule',
  'communication_patterns',
])
export type AdultPatternSignalType = z.infer<typeof adultPatternSignalTypeSchema>

/**
 * Individual signal detection result.
 */
export const adultPatternSignalSchema = z.object({
  /** Type of signal detected */
  signalType: adultPatternSignalTypeSchema,
  /** Confidence score for this signal (0-100) */
  confidence: z.number().min(0).max(100),
  /** Number of instances detected */
  instanceCount: z.number().int().min(0),
  /** Description of what was detected (no PII) */
  description: z.string(),
  /** Domains/patterns that triggered this signal */
  triggers: z.array(z.string()),
})
export type AdultPatternSignal = z.infer<typeof adultPatternSignalSchema>

// ============================================================================
// ADULT PATTERN ANALYSIS RESULT
// ============================================================================

/**
 * Signal weight configuration for confidence calculation.
 *
 * Financial sites have the highest weight as children rarely use them.
 */
export const SIGNAL_WEIGHTS: Record<AdultPatternSignalType, number> = {
  work_apps: 0.3, // 30% weight
  financial_sites: 0.35, // 35% weight (strongest signal)
  adult_schedule: 0.25, // 25% weight
  communication_patterns: 0.1, // 10% weight
}

/**
 * Confidence threshold for flagging a profile as potentially adult.
 *
 * 65% provides good balance between catching misuse and avoiding false positives.
 */
export const ADULT_PATTERN_THRESHOLD = 65

/**
 * Minimum days of data required before analysis.
 *
 * AC1: 7 days of usage data analyzed.
 */
export const MINIMUM_ANALYSIS_DAYS = 7

/**
 * Cooldown period in days after an explained pattern.
 *
 * AC4: Do NOT trigger analysis again for 90 days after explanation.
 */
export const PATTERN_EXPLANATION_COOLDOWN_DAYS = 90

/**
 * Reason string for monitoring disabled due to adult pattern confirmation.
 */
export const MONITORING_DISABLED_REASON_ADULT_PATTERN = 'adult_pattern_confirmed'

/**
 * Analysis result for a child profile.
 *
 * Contains all detected signals and overall confidence score.
 */
export const adultPatternAnalysisSchema = z.object({
  /** Child profile ID analyzed */
  childId: z.string(),
  /** Family ID for authorization checks */
  familyId: z.string(),
  /** When analysis was performed (epoch ms) */
  analyzedAt: z.number(),
  /** Date range analyzed (YYYY-MM-DD format) */
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Number of screenshots analyzed */
  screenshotsAnalyzed: z.number().int().min(0),
  /** Individual signals detected */
  signals: z.array(adultPatternSignalSchema),
  /** Overall confidence that this is an adult (0-100) */
  overallConfidence: z.number().min(0).max(100),
  /** Whether confidence exceeds threshold for flagging */
  shouldFlag: z.boolean(),
})
export type AdultPatternAnalysis = z.infer<typeof adultPatternAnalysisSchema>

// ============================================================================
// ADULT PATTERN FLAG DOCUMENT
// ============================================================================

/**
 * Status of an adult pattern flag.
 */
export const adultPatternFlagStatusSchema = z.enum([
  'pending', // Awaiting guardian response
  'confirmed_adult', // Guardian confirmed this is an adult
  'explained', // Guardian provided valid explanation
  'dismissed', // System dismissed (false positive)
  'expired', // No response after 30 days
])
export type AdultPatternFlagStatus = z.infer<typeof adultPatternFlagStatusSchema>

/**
 * Adult Pattern Flag document.
 *
 * Stored at: /families/{familyId}/adultPatternFlags/{flagId}
 *
 * Records detection results and guardian response.
 */
export const adultPatternFlagSchema = z.object({
  /** Unique flag ID */
  id: z.string(),
  /** Child profile ID */
  childId: z.string(),
  /** Family ID */
  familyId: z.string(),
  /** Analysis that triggered this flag */
  analysis: adultPatternAnalysisSchema,
  /** Current status */
  status: adultPatternFlagStatusSchema,
  /** When flag was created (epoch ms) */
  createdAt: z.number(),
  /** When flag was last updated (epoch ms) */
  updatedAt: z.number(),
  /** Guardian UID who responded (if any) */
  respondedBy: z.string().nullable(),
  /** When guardian responded (epoch ms) */
  respondedAt: z.number().nullable(),
  /** Guardian's explanation (if status is 'explained') */
  explanation: z.string().nullable(),
  /** When to suppress next analysis (epoch ms, if explained) */
  suppressAnalysisUntil: z.number().nullable(),
  /** Whether notification was sent to guardians */
  notificationSent: z.boolean(),
  /** When notification was sent (epoch ms) */
  notificationSentAt: z.number().nullable(),
})
export type AdultPatternFlag = z.infer<typeof adultPatternFlagSchema>

// ============================================================================
// GUARDIAN RESPONSE SCHEMAS
// ============================================================================

/**
 * Guardian response type.
 *
 * AC3: confirm_adult - Monitoring is disabled
 * AC4: explain_pattern - Flag is cleared with explanation
 */
export const adultPatternResponseTypeSchema = z.enum(['confirm_adult', 'explain_pattern'])
export type AdultPatternResponseType = z.infer<typeof adultPatternResponseTypeSchema>

/**
 * Input for guardian response to adult pattern flag.
 */
export const respondToAdultPatternInputSchema = z.object({
  /** Flag ID to respond to */
  flagId: z.string().min(1),
  /** Response type */
  response: adultPatternResponseTypeSchema,
  /** Explanation (required if response is 'explain_pattern') */
  explanation: z
    .string()
    .min(10, 'Explanation must be at least 10 characters')
    .max(500, 'Explanation must be at most 500 characters')
    .optional(),
})
export type RespondToAdultPatternInput = z.infer<typeof respondToAdultPatternInputSchema>

/**
 * Response from guardian response endpoint.
 */
export const respondToAdultPatternResponseSchema = z.object({
  /** Whether the response was processed successfully */
  success: z.boolean(),
  /** Updated flag status */
  newStatus: adultPatternFlagStatusSchema,
  /** Human-readable message */
  message: z.string(),
  /** If confirmed_adult, whether monitoring was disabled */
  monitoringDisabled: z.boolean().optional(),
  /** If confirmed_adult, number of screenshots deleted */
  screenshotsDeleted: z.number().int().optional(),
})
export type RespondToAdultPatternResponse = z.infer<typeof respondToAdultPatternResponseSchema>

// ============================================================================
// GET FLAGS ENDPOINT
// ============================================================================

/**
 * Response from get adult pattern flags endpoint.
 */
export const getAdultPatternFlagsResponseSchema = z.object({
  /** Pending flags requiring guardian response */
  flags: z.array(adultPatternFlagSchema),
})
export type GetAdultPatternFlagsResponse = z.infer<typeof getAdultPatternFlagsResponseSchema>

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique flag ID.
 *
 * @param childId - Child profile ID
 * @param timestamp - Analysis timestamp
 * @returns Unique flag ID
 */
export function generateAdultPatternFlagId(childId: string, timestamp: number): string {
  const random = Math.random().toString(36).substring(2, 8)
  return `apf_${childId}_${timestamp}_${random}`
}

/**
 * Calculate cooldown expiry timestamp.
 *
 * @param now - Current timestamp (epoch ms)
 * @returns Timestamp when analysis can be triggered again
 */
export function calculateCooldownExpiry(now: number): number {
  return now + PATTERN_EXPLANATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
}

/**
 * Check if a domain matches any adult pattern domain.
 *
 * @param url - URL to check
 * @param domainList - List of domains to match against
 * @returns Whether the URL domain matches any in the list
 */
export function matchesDomain(url: string, domainList: readonly string[]): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return domainList.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

/**
 * Check if URL matches work app domains.
 */
export function isWorkAppUrl(url: string): boolean {
  return matchesDomain(url, WORK_APP_DOMAINS)
}

/**
 * Check if URL matches financial site domains.
 */
export function isFinancialSiteUrl(url: string): boolean {
  return matchesDomain(url, FINANCIAL_SITE_DOMAINS)
}

/**
 * Calculate weighted confidence score from individual signals.
 *
 * @param signals - Array of detected signals
 * @returns Overall confidence score (0-100)
 */
export function calculateOverallConfidence(signals: AdultPatternSignal[]): number {
  let totalWeight = 0
  let weightedSum = 0

  for (const signal of signals) {
    const weight = SIGNAL_WEIGHTS[signal.signalType] ?? 0
    weightedSum += signal.confidence * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return 0
  return Math.round(weightedSum / totalWeight)
}

/**
 * Validate that explanation is provided when response is 'explain_pattern'.
 */
export function validateAdultPatternResponse(input: RespondToAdultPatternInput): string | null {
  if (input.response === 'explain_pattern' && !input.explanation) {
    return 'Explanation is required when selecting "explain_pattern"'
  }
  return null
}
