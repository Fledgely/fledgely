import { z } from 'zod'

/**
 * Agreement Template Schema - Story 4.1: Template Library Structure
 *
 * This schema defines types for the template library that helps parents
 * find appropriate starting points for family agreements organized by child age.
 *
 * Templates are:
 * 1. Bundled in code (not stored in Firestore) for performance (S3: Bundled Templates)
 * 2. Organized by age groups: 5-7, 8-10, 11-13, 14-16
 * 3. Available in variations: strict, balanced, permissive
 * 4. Filterable by concerns: gaming, social_media, homework, screen_time, safety
 *
 * Design principles:
 * - Templates provide INITIAL content for agreements (ADR-004)
 * - Template sections align with agreementChangeTypeSchema types
 * - All content at 6th-grade reading level (NFR65)
 */

// ============================================
// AGE GROUP SCHEMA
// ============================================

/**
 * Age groups for organizing templates
 * Each group has developmentally appropriate content
 */
export const ageGroupSchema = z.enum(['5-7', '8-10', '11-13', '14-16'])

export type AgeGroup = z.infer<typeof ageGroupSchema>

/**
 * Human-readable labels for age groups
 */
export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  '5-7': 'Early Childhood (5-7 years)',
  '8-10': 'Middle Childhood (8-10 years)',
  '11-13': 'Early Adolescence (11-13 years)',
  '14-16': 'Late Adolescence (14-16 years)',
}

/**
 * Get human-readable label for an age group
 */
export function getAgeGroupLabel(ageGroup: AgeGroup): string {
  return AGE_GROUP_LABELS[ageGroup]
}

// ============================================
// TEMPLATE VARIATION SCHEMA
// ============================================

/**
 * Template variations representing different parenting approaches
 * - strict: More monitoring, lower limits, few exceptions
 * - balanced: Moderate monitoring, moderate limits, some flexibility
 * - permissive: Light monitoring, higher limits, trust-based
 */
export const templateVariationSchema = z.enum(['strict', 'balanced', 'permissive'])

export type TemplateVariation = z.infer<typeof templateVariationSchema>

/**
 * Human-readable labels for template variations
 */
export const TEMPLATE_VARIATION_LABELS: Record<TemplateVariation, string> = {
  strict: 'Strict',
  balanced: 'Balanced',
  permissive: 'Permissive',
}

/**
 * Descriptions for template variations at 6th-grade reading level
 */
export const TEMPLATE_VARIATION_DESCRIPTIONS: Record<TemplateVariation, string> = {
  strict: 'More rules and closer watching. Good for younger kids or when building trust.',
  balanced: 'A mix of rules and freedom. Good for most families.',
  permissive: 'More freedom and trust. Good for older kids who have shown responsibility.',
}

/**
 * Get human-readable label for a template variation
 */
export function getTemplateVariationLabel(variation: TemplateVariation): string {
  return TEMPLATE_VARIATION_LABELS[variation]
}

/**
 * Get description for a template variation
 */
export function getTemplateVariationDescription(variation: TemplateVariation): string {
  return TEMPLATE_VARIATION_DESCRIPTIONS[variation]
}

// ============================================
// TEMPLATE CONCERN SCHEMA
// ============================================

/**
 * Concerns/topics that templates address
 * Used for filtering and searching
 */
export const templateConcernSchema = z.enum([
  'gaming',
  'social_media',
  'homework',
  'screen_time',
  'safety',
])

export type TemplateConcern = z.infer<typeof templateConcernSchema>

/**
 * Array of all template concerns for iteration
 */
export const TEMPLATE_CONCERNS: readonly TemplateConcern[] = templateConcernSchema.options

/**
 * Human-readable labels for template concerns
 */
export const TEMPLATE_CONCERN_LABELS: Record<TemplateConcern, string> = {
  gaming: 'Gaming',
  social_media: 'Social Media',
  homework: 'Homework',
  screen_time: 'Screen Time',
  safety: 'Online Safety',
}

/**
 * Descriptions for template concerns at 6th-grade reading level
 */
export const TEMPLATE_CONCERN_DESCRIPTIONS: Record<TemplateConcern, string> = {
  gaming: 'Rules about video games and gaming time',
  social_media: 'Rules about apps like TikTok, Instagram, and Snapchat',
  homework: 'Rules about doing schoolwork before screen time',
  screen_time: 'Rules about how much time can be spent on screens',
  safety: 'Rules about staying safe online and who to talk to',
}

/**
 * Get human-readable label for a template concern
 */
export function getTemplateConcernLabel(concern: TemplateConcern): string {
  return TEMPLATE_CONCERN_LABELS[concern]
}

/**
 * Get description for a template concern
 */
export function getTemplateConcernDescription(concern: TemplateConcern): string {
  return TEMPLATE_CONCERN_DESCRIPTIONS[concern]
}

// ============================================
// MONITORING LEVEL SCHEMA
// ============================================

/**
 * Monitoring intensity levels for template summaries
 */
export const monitoringLevelSchema = z.enum(['light', 'moderate', 'comprehensive'])

export type MonitoringLevel = z.infer<typeof monitoringLevelSchema>

/**
 * Human-readable labels for monitoring levels
 */
export const MONITORING_LEVEL_LABELS: Record<MonitoringLevel, string> = {
  light: 'Light',
  moderate: 'Moderate',
  comprehensive: 'Comprehensive',
}

/**
 * Descriptions for monitoring levels at 6th-grade reading level
 */
export const MONITORING_LEVEL_DESCRIPTIONS: Record<MonitoringLevel, string> = {
  light: 'Parent checks in sometimes. Child has lots of privacy.',
  moderate: 'Parent checks in regularly. Child has some privacy.',
  comprehensive: 'Parent watches closely. Less privacy but more safety.',
}

/**
 * Get human-readable label for a monitoring level
 */
export function getMonitoringLevelLabel(level: MonitoringLevel): string {
  return MONITORING_LEVEL_LABELS[level]
}

/**
 * Get description for a monitoring level
 */
export function getMonitoringLevelDescription(level: MonitoringLevel): string {
  return MONITORING_LEVEL_DESCRIPTIONS[level]
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum string lengths for template fields
 * Prevents storage bloat and ensures reasonable limits
 */
export const TEMPLATE_FIELD_LIMITS = {
  id: 128,
  name: 100,
  description: 500,
  sectionTitle: 100,
  sectionDescription: 1000,
  sectionDefaultValue: 5000,
  keyRuleText: 200,
  screenTimeLimitText: 100,
} as const

/**
 * Maximum number of items in template arrays
 */
export const TEMPLATE_ARRAY_LIMITS = {
  maxSections: 20,
  maxKeyRules: 5,
  maxConcerns: 5,
} as const

// ============================================
// TEMPLATE SUMMARY SCHEMA
// ============================================

/**
 * Preview summary for templates displayed in cards
 * Shows key information at a glance
 */
export const templateSummarySchema = z.object({
  /** Screen time limit text (e.g., "2 hours on school days, 4 hours on weekends") */
  screenTimeLimit: z
    .string()
    .min(1, 'Screen time limit is required')
    .max(TEMPLATE_FIELD_LIMITS.screenTimeLimitText),

  /** Overall monitoring intensity */
  monitoringLevel: monitoringLevelSchema,

  /** Top rules for quick preview (max 5) */
  keyRules: z
    .array(z.string().min(1).max(TEMPLATE_FIELD_LIMITS.keyRuleText))
    .min(1, 'At least one key rule is required')
    .max(TEMPLATE_ARRAY_LIMITS.maxKeyRules),
})

export type TemplateSummary = z.infer<typeof templateSummarySchema>

// ============================================
// TEMPLATE SECTION SCHEMA
// ============================================

/**
 * Section type - aligns with agreementChangeTypeSchema for consistency
 */
export const templateSectionTypeSchema = z.enum([
  'terms', // General terms and conditions
  'monitoring_rules', // What monitoring occurs and when
  'screen_time', // Screen time limits and schedules
  'bedtime_schedule', // Bedtime/device lockout times
  'app_restrictions', // Allowed/blocked app lists
  'content_filters', // Age restrictions and content filtering
  'consequences', // What happens on violations
  'rewards', // Incentives for compliance
])

export type TemplateSectionType = z.infer<typeof templateSectionTypeSchema>

/**
 * A section within a template
 * Represents a configurable part of the family agreement
 */
export const templateSectionSchema = z.object({
  /** Unique section ID within the template */
  id: z.string().min(1, 'Section ID is required').max(TEMPLATE_FIELD_LIMITS.id),

  /** Section type (aligns with agreement change types) */
  type: templateSectionTypeSchema,

  /** Human-readable section title */
  title: z.string().min(1, 'Section title is required').max(TEMPLATE_FIELD_LIMITS.sectionTitle),

  /** Description explaining what this section covers */
  description: z
    .string()
    .min(1, 'Section description is required')
    .max(TEMPLATE_FIELD_LIMITS.sectionDescription),

  /** Default value/content for this section */
  defaultValue: z
    .string()
    .min(1, 'Default value is required')
    .max(TEMPLATE_FIELD_LIMITS.sectionDefaultValue),

  /** Whether this section can be customized by the parent */
  customizable: z.boolean(),

  /** Display order within the template (lower = earlier) */
  order: z.number().int().min(0).max(99),
})

export type TemplateSection = z.infer<typeof templateSectionSchema>

// ============================================
// AGREEMENT TEMPLATE SCHEMA
// ============================================

/**
 * A complete agreement template
 */
export const agreementTemplateSchema = z.object({
  /** Unique template ID (UUID format) */
  id: z.string().uuid('Template ID must be a valid UUID'),

  /** Template name displayed to users */
  name: z.string().min(1, 'Template name is required').max(TEMPLATE_FIELD_LIMITS.name),

  /** Template description explaining when to use it */
  description: z.string().min(1, 'Description is required').max(TEMPLATE_FIELD_LIMITS.description),

  /** Target age group for this template */
  ageGroup: ageGroupSchema,

  /** Parenting approach variation */
  variation: templateVariationSchema,

  /** Concerns/topics this template addresses */
  concerns: z
    .array(templateConcernSchema)
    .min(1, 'At least one concern is required')
    .max(TEMPLATE_ARRAY_LIMITS.maxConcerns),

  /** Summary for preview display */
  summary: templateSummarySchema,

  /** Template sections (agreement content) */
  sections: z
    .array(templateSectionSchema)
    .min(1, 'At least one section is required')
    .max(TEMPLATE_ARRAY_LIMITS.maxSections),

  /** When this template was created (ISO 8601 datetime) */
  createdAt: z.string().datetime('Invalid datetime format'),

  /** When this template was last updated (ISO 8601 datetime) */
  updatedAt: z.string().datetime('Invalid datetime format'),
})

export type AgreementTemplate = z.infer<typeof agreementTemplateSchema>

// ============================================
// INPUT SCHEMAS
// ============================================

/**
 * Input for filtering templates by age group
 */
export const filterByAgeGroupInputSchema = z.object({
  ageGroup: ageGroupSchema,
})

export type FilterByAgeGroupInput = z.infer<typeof filterByAgeGroupInputSchema>

/**
 * Input for filtering templates by concerns
 */
export const filterByConcernsInputSchema = z.object({
  concerns: z.array(templateConcernSchema).min(1, 'At least one concern is required'),
})

export type FilterByConcernsInput = z.infer<typeof filterByConcernsInputSchema>

/**
 * Input for searching templates
 */
export const searchTemplatesInputSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100),
  ageGroup: ageGroupSchema.optional(),
  concerns: z.array(templateConcernSchema).optional(),
})

export type SearchTemplatesInput = z.infer<typeof searchTemplatesInputSchema>

/**
 * Response for template library API
 */
export const templateLibraryResponseSchema = z.object({
  templates: z.array(agreementTemplateSchema),
  totalCount: z.number().int().min(0),
  filteredCount: z.number().int().min(0),
})

export type TemplateLibraryResponse = z.infer<typeof templateLibraryResponseSchema>

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely parse an agreement template, returning null if invalid
 */
export function safeParseAgreementTemplate(data: unknown): AgreementTemplate | null {
  const result = agreementTemplateSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate agreement template input
 */
export function validateAgreementTemplate(data: unknown): AgreementTemplate {
  return agreementTemplateSchema.parse(data)
}

/**
 * Safely parse a template section
 */
export function safeParseTemplateSection(data: unknown): TemplateSection | null {
  const result = templateSectionSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Safely parse a template summary
 */
export function safeParseTemplateSummary(data: unknown): TemplateSummary | null {
  const result = templateSummarySchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Calculate suggested age group from birth date
 */
export function calculateAgeGroupFromBirthDate(
  birthDate: Date,
  referenceDate: Date = new Date()
): AgeGroup | null {
  const ageMs = referenceDate.getTime() - birthDate.getTime()
  const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000))

  if (ageYears >= 5 && ageYears <= 7) return '5-7'
  if (ageYears >= 8 && ageYears <= 10) return '8-10'
  if (ageYears >= 11 && ageYears <= 13) return '11-13'
  if (ageYears >= 14 && ageYears <= 16) return '14-16'

  // Outside supported age range
  return null
}

/**
 * Check if a template matches a concern filter
 */
export function templateMatchesConcerns(
  template: AgreementTemplate,
  concerns: TemplateConcern[]
): boolean {
  if (concerns.length === 0) return true
  return concerns.some((concern) => template.concerns.includes(concern))
}

/**
 * Check if a template matches a search query (name or description)
 */
export function templateMatchesSearch(template: AgreementTemplate, query: string): boolean {
  const lowerQuery = query.toLowerCase().trim()
  if (!lowerQuery) return true

  return (
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Sort templates by variation (strict first, then balanced, then permissive)
 */
export function sortTemplatesByVariation(templates: AgreementTemplate[]): AgreementTemplate[] {
  const variationOrder: Record<TemplateVariation, number> = {
    strict: 0,
    balanced: 1,
    permissive: 2,
  }

  return [...templates].sort((a, b) => variationOrder[a.variation] - variationOrder[b.variation])
}

/**
 * Group templates by age group
 */
export function groupTemplatesByAgeGroup(
  templates: AgreementTemplate[]
): Record<AgeGroup, AgreementTemplate[]> {
  const groups: Record<AgeGroup, AgreementTemplate[]> = {
    '5-7': [],
    '8-10': [],
    '11-13': [],
    '14-16': [],
  }

  for (const template of templates) {
    groups[template.ageGroup].push(template)
  }

  return groups
}

/**
 * Get default monitoring level for an age group
 */
export function getDefaultMonitoringLevel(ageGroup: AgeGroup): MonitoringLevel {
  switch (ageGroup) {
    case '5-7':
      return 'comprehensive'
    case '8-10':
      return 'comprehensive'
    case '11-13':
      return 'moderate'
    case '14-16':
      return 'light'
  }
}

/**
 * Get recommended screen time range for an age group (in minutes)
 */
export function getRecommendedScreenTimeRange(ageGroup: AgeGroup): { min: number; max: number } {
  switch (ageGroup) {
    case '5-7':
      return { min: 30, max: 60 }
    case '8-10':
      return { min: 60, max: 120 }
    case '11-13':
      return { min: 120, max: 180 }
    case '14-16':
      return { min: 180, max: 240 }
  }
}

// ============================================
// ERROR MESSAGES
// ============================================

/**
 * Error messages for template operations (6th-grade reading level)
 */
export const TEMPLATE_ERROR_MESSAGES: Record<string, string> = {
  'not-found': 'Could not find that template.',
  'invalid-age-group': 'Please pick a valid age group.',
  'invalid-variation': 'Please pick a valid template type.',
  'invalid-concern': 'Please pick a valid topic.',
  'no-templates': 'No templates match your search. Try different filters.',
  'load-failed': 'Could not load templates. Please try again.',
  'invalid-template': 'This template has a problem. Please pick another one.',
  unknown: 'Something went wrong. Please try again.',
}

/**
 * Get user-friendly error message for template operations
 */
export function getTemplateErrorMessage(code: keyof typeof TEMPLATE_ERROR_MESSAGES | string): string {
  return TEMPLATE_ERROR_MESSAGES[code] || TEMPLATE_ERROR_MESSAGES.unknown
}
