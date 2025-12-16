/**
 * Crisis URL Schema Definitions
 *
 * Story 7.1: Crisis Allowlist Data Structure
 *
 * Zod schemas for crisis resource allowlist entries with validation.
 * These schemas define the structure for crisis resources that must
 * be protected from any monitoring activity.
 */

import { z } from 'zod'

/**
 * Crisis resource categories for organization
 *
 * These categories help organize crisis resources and allow
 * children to find help for specific situations.
 */
export const crisisResourceCategorySchema = z.enum([
  'suicide', // Suicide prevention resources
  'abuse', // General abuse support
  'crisis', // General crisis support (multi-purpose)
  'lgbtq', // LGBTQ+ specific resources
  'mental_health', // Mental health support
  'domestic_violence', // Domestic violence resources
  'child_abuse', // Child abuse specific resources
  'eating_disorder', // Eating disorder support
  'substance_abuse', // Substance abuse support
])

export type CrisisResourceCategory = z.infer<typeof crisisResourceCategorySchema>

/**
 * Contact methods available for crisis resources
 */
export const contactMethodSchema = z.enum(['phone', 'text', 'chat', 'web'])

export type ContactMethod = z.infer<typeof contactMethodSchema>

/**
 * Wildcard pattern validation
 * Must start with "*." to indicate subdomain wildcard
 */
const wildcardPatternSchema = z
  .string()
  .regex(/^\*\./, 'Wildcard patterns must start with *.')

/**
 * Single crisis URL entry
 *
 * Represents a crisis resource that should be protected from monitoring.
 * Each entry includes the domain, category, aliases, and metadata.
 */
export const crisisUrlEntrySchema = z.object({
  /** Unique identifier for the entry (UUID v4) */
  id: z.string().uuid(),

  /** Primary domain (e.g., "988lifeline.org") */
  domain: z.string().min(1),

  /** Resource category */
  category: crisisResourceCategorySchema,

  /** Domain aliases that should also be protected */
  aliases: z.array(z.string().min(1)).default([]),

  /** Wildcard patterns for subdomains (e.g., ["*.988lifeline.org"]) */
  wildcardPatterns: z.array(wildcardPatternSchema).default([]),

  /** Human-readable name */
  name: z.string().min(1),

  /** Description of what this resource helps with */
  description: z.string().min(1),

  /** Country/region code (ISO 3166-1 alpha-2) or 'global' */
  region: z.string().min(2).max(7).default('us'),

  /** Available contact methods */
  contactMethods: z.array(contactMethodSchema).min(1).default(['web']),

  /** Phone number if applicable (e.g., "988", "1-800-273-8255") */
  phoneNumber: z.string().optional(),

  /** Text number if applicable (e.g., "741741") */
  textNumber: z.string().optional(),
})

export type CrisisUrlEntry = z.infer<typeof crisisUrlEntrySchema>

/**
 * Version format for allowlist versioning
 *
 * Format: semver-ISO8601timestamp
 * Example: "1.0.0-2025-12-16T12:00:00Z"
 */
export const allowlistVersionSchema = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+-\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    'Version must be in format: X.Y.Z-YYYY-MM-DDTHH:MM:SSZ'
  )

/**
 * Complete crisis allowlist with versioning
 *
 * The main allowlist structure that contains all crisis URL entries
 * with version information for sync verification.
 */
export const crisisAllowlistSchema = z.object({
  /** Semantic version + timestamp for sync verification */
  version: allowlistVersionSchema,

  /** When this version was created (ISO 8601) */
  lastUpdated: z.string().datetime(),

  /** All crisis URL entries */
  entries: z.array(crisisUrlEntrySchema).min(1),
})

export type CrisisAllowlist = z.infer<typeof crisisAllowlistSchema>

/**
 * Parsed version information
 */
export interface ParsedVersion {
  major: number
  minor: number
  patch: number
  timestamp: Date
}

/**
 * Parse an allowlist version string into components
 */
export function parseAllowlistVersion(version: string): ParsedVersion | null {
  const match = version.match(
    /^(\d+)\.(\d+)\.(\d+)-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)$/
  )
  if (!match) return null

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    timestamp: new Date(match[4]),
  }
}

/**
 * Create a version string from components
 */
export function createAllowlistVersion(
  major: number,
  minor: number,
  patch: number,
  timestamp: Date = new Date()
): string {
  const isoTimestamp = timestamp.toISOString().replace(/\.\d{3}Z$/, 'Z')
  return `${major}.${minor}.${patch}-${isoTimestamp}`
}
