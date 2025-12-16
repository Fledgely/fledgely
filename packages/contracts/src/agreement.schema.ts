/**
 * Agreement Schema
 *
 * Story 6.3: Agreement Activation - Task 1
 *
 * Defines agreement lifecycle status and versioning schemas.
 * Separate from signing status (signature.schema.ts) which tracks
 * the signing process, this tracks the overall agreement lifecycle.
 */

import { z } from 'zod'

// ============================================
// AGREEMENT STATUS SCHEMA (Task 1.1)
// ============================================

/**
 * Agreement lifecycle status
 *
 * - draft: Agreement being created/edited in co-creation session
 * - pending_signatures: All edits done, awaiting signatures
 * - active: Fully signed and governing family's digital arrangement
 * - archived: Manually archived by family (replaced or no longer needed)
 * - superseded: Replaced by a newer agreement version
 */
export const agreementStatusSchema = z.enum([
  'draft',
  'pending_signatures',
  'active',
  'archived',
  'superseded',
])

export type AgreementStatus = z.infer<typeof agreementStatusSchema>

// ============================================
// AGREEMENT VERSION SCHEMA (Task 1.2)
// ============================================

/**
 * Agreement version number format: "X.Y"
 *
 * Examples: "1.0", "1.1", "2.0", "10.5"
 */
export const agreementVersionSchema = z
  .string()
  .regex(/^\d+\.\d+$/, 'Version must be in X.Y format (e.g., 1.0, 1.1, 2.0)')

export type AgreementVersion = z.infer<typeof agreementVersionSchema>

// ============================================
// ARCHIVE REASON SCHEMA (Task 1.4)
// ============================================

/**
 * Reason for archiving an agreement
 *
 * - new_version: A new agreement version replaced this one
 * - manual_archive: Family manually archived the agreement
 * - expired: Agreement reached its expiration date
 */
export const archiveReasonSchema = z.enum([
  'new_version',
  'manual_archive',
  'expired',
])

export type ArchiveReason = z.infer<typeof archiveReasonSchema>

// ============================================
// LABEL CONSTANTS
// ============================================

/**
 * Human-readable labels for agreement statuses
 */
export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  draft: 'Draft',
  pending_signatures: 'Waiting for Signatures',
  active: 'Active',
  archived: 'Archived',
  superseded: 'Replaced',
}

/**
 * Descriptions for agreement statuses (6th-grade reading level)
 */
export const AGREEMENT_STATUS_DESCRIPTIONS: Record<AgreementStatus, string> = {
  draft: 'This agreement is being created. You can still make changes.',
  pending_signatures:
    'This agreement is ready to sign. All family members need to sign it.',
  active:
    'This agreement is now in effect. Everyone has signed and agreed to follow it.',
  archived:
    'This agreement is no longer active. It has been saved for your records.',
  superseded:
    'This agreement was replaced by a newer version. You can still view it.',
}

/**
 * Human-readable labels for archive reasons
 */
export const ARCHIVE_REASON_LABELS: Record<ArchiveReason, string> = {
  new_version: 'New Version Created',
  manual_archive: 'Manually Archived',
  expired: 'Expired',
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get human-readable label for agreement status
 */
export function getAgreementStatusLabel(status: AgreementStatus): string {
  return AGREEMENT_STATUS_LABELS[status]
}

/**
 * Get description for agreement status (6th-grade reading level)
 */
export function getAgreementStatusDescription(status: AgreementStatus): string {
  return AGREEMENT_STATUS_DESCRIPTIONS[status]
}

/**
 * Get human-readable label for archive reason
 */
export function getArchiveReasonLabel(reason: ArchiveReason): string {
  return ARCHIVE_REASON_LABELS[reason]
}

// ============================================
// STATUS HELPER FUNCTIONS (Task 1.5)
// ============================================

/**
 * Check if an agreement is currently active
 *
 * @param status - The agreement status to check
 * @returns true if the agreement is active
 */
export function isAgreementActive(status: AgreementStatus): boolean {
  return status === 'active'
}

/**
 * Check if an agreement is archived (either manually or superseded)
 *
 * @param status - The agreement status to check
 * @returns true if the agreement is archived or superseded
 */
export function isAgreementArchived(status: AgreementStatus): boolean {
  return status === 'archived' || status === 'superseded'
}

/**
 * Check if an agreement can be activated
 *
 * An agreement can only be activated when it's in pending_signatures status
 * and all required signatures have been collected (checked separately).
 *
 * @param status - The agreement status to check
 * @returns true if the agreement is ready to be activated
 */
export function canActivateAgreement(status: AgreementStatus): boolean {
  return status === 'pending_signatures'
}

// ============================================
// VERSION HELPER FUNCTIONS (Task 1.5)
// ============================================

/**
 * Parse a version string into major and minor components
 *
 * @param version - Version string in "X.Y" format
 * @returns Object with major and minor numbers, or null if invalid
 */
export function parseVersionNumber(
  version: string
): { major: number; minor: number } | null {
  const match = version.match(/^(\d+)\.(\d+)$/)
  if (!match) return null
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
  }
}

/**
 * Compare two version strings
 *
 * @param a - First version string
 * @param b - Second version string
 * @returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const parsedA = parseVersionNumber(a) ?? { major: 0, minor: 0 }
  const parsedB = parseVersionNumber(b) ?? { major: 0, minor: 0 }

  // Compare major version first
  if (parsedA.major !== parsedB.major) {
    return parsedA.major - parsedB.major
  }

  // Then compare minor version
  return parsedA.minor - parsedB.minor
}

/**
 * Get the next version number for a new agreement
 *
 * @param existingVersions - Array of existing version strings
 * @returns Next version number (increments minor version)
 *
 * @example
 * getNextVersionNumber([]) // "1.0"
 * getNextVersionNumber(["1.0"]) // "1.1"
 * getNextVersionNumber(["1.0", "1.1", "1.2"]) // "1.3"
 * getNextVersionNumber(["1.2", "1.0", "1.1"]) // "1.3" (finds highest)
 */
export function getNextVersionNumber(existingVersions: string[]): string {
  // Handle empty or undefined
  if (!existingVersions || existingVersions.length === 0) {
    return '1.0'
  }

  // Sort versions to find the latest
  const sortedVersions = [...existingVersions].sort(compareVersions)
  const latestVersion = sortedVersions[sortedVersions.length - 1]
  const parsed = parseVersionNumber(latestVersion)

  if (!parsed) {
    return '1.0'
  }

  // Increment minor version
  return `${parsed.major}.${parsed.minor + 1}`
}
