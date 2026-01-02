/**
 * ProportionalityDisagreementService - Story 38.4 Task 5
 *
 * Service for detecting and surfacing disagreements.
 * AC6: Disagreement surfaces for family conversation
 */

import {
  type DisagreementRecord,
  type ResponseChoice,
  type DisagreementType,
} from '../contracts/proportionalityCheck'
import { getAllResponsesForCheck } from './proportionalityResponseService'

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const disagreementStore: Map<string, DisagreementRecord> = new Map()
const familyDisagreementIndex: Map<string, string[]> = new Map()

// ============================================
// Helper Functions
// ============================================

/**
 * Generate unique ID for disagreement.
 */
function generateDisagreementId(): string {
  return `disagree-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Check if two responses are significantly different.
 */
function areResponsesDifferent(response1: ResponseChoice, response2: ResponseChoice): boolean {
  // Same response = no difference
  if (response1 === response2) return false

  // Define response severity (lower = less monitoring)
  const severity: Record<ResponseChoice, number> = {
    graduate: 0,
    reduce: 1,
    discuss: 2, // Neutral
    appropriate: 3,
    increase: 4,
  }

  // Significant difference if severity differs by 1+ points
  // (changed from 2 to catch more disagreements)
  return Math.abs(severity[response1] - severity[response2]) >= 1
}

/**
 * Determine which direction the child wants vs parents.
 */
function getChildPreferenceDirection(childResponse: ResponseChoice): 'less' | 'more' | 'neutral' {
  if (childResponse === 'graduate' || childResponse === 'reduce') {
    return 'less'
  }
  if (childResponse === 'increase') {
    return 'more'
  }
  return 'neutral'
}

// ============================================
// Disagreement Detection
// ============================================

/**
 * Categorize the type of disagreement.
 * AC6: Detect and surface disagreements for family conversation.
 */
export function categorizeDisagreement(
  childResponse: ResponseChoice,
  parentResponses: ResponseChoice[]
): DisagreementType | null {
  if (parentResponses.length === 0) return null

  // Check if parents agree with each other
  const uniqueParentResponses = [...new Set(parentResponses)]
  const parentsDisagree =
    uniqueParentResponses.length > 1 &&
    uniqueParentResponses.some((r1) =>
      uniqueParentResponses.some((r2) => areResponsesDifferent(r1, r2))
    )

  if (parentsDisagree) {
    return 'mixed'
  }

  // All parents have same/similar response - compare with child
  const parentConsensus = parentResponses[0]

  if (!areResponsesDifferent(childResponse, parentConsensus)) {
    return null // No significant disagreement
  }

  const childDirection = getChildPreferenceDirection(childResponse)
  const parentDirection = getChildPreferenceDirection(parentConsensus)

  if (childDirection === 'less' && parentDirection !== 'less') {
    return 'child_wants_less'
  }

  if (parentDirection === 'more' && childDirection !== 'more') {
    return 'parent_wants_more'
  }

  // Default to mixed if unclear
  return areResponsesDifferent(childResponse, parentConsensus) ? 'child_wants_less' : null
}

/**
 * Detect if there's a disagreement in a check.
 * Returns disagreement details if found, null otherwise.
 */
export function detectDisagreement(checkId: string): {
  childResponse: ResponseChoice
  parentResponses: { parentId: string; response: ResponseChoice }[]
  disagreementType: DisagreementType
} | null {
  const responses = getAllResponsesForCheck(checkId)

  // Need at least one child and one parent response
  const childResponses = responses.filter((r) => r.respondentRole === 'child')
  const parentResponses = responses.filter((r) => r.respondentRole === 'parent')

  if (childResponses.length === 0 || parentResponses.length === 0) {
    return null
  }

  const childResponse = childResponses[0]
  const parentResponseChoices = parentResponses.map((r) => r.isMonitoringAppropriate)
  const disagreementType = categorizeDisagreement(
    childResponse.isMonitoringAppropriate,
    parentResponseChoices
  )

  if (!disagreementType) {
    return null
  }

  return {
    childResponse: childResponse.isMonitoringAppropriate,
    parentResponses: parentResponses.map((r) => ({
      parentId: r.respondentId,
      response: r.isMonitoringAppropriate,
    })),
    disagreementType,
  }
}

// ============================================
// Disagreement Record Management
// ============================================

/**
 * Create a disagreement record.
 * AC6: Surface disagreement for family conversation.
 */
export function createDisagreementRecord(
  checkId: string,
  familyId: string,
  childId: string
): DisagreementRecord | null {
  const disagreement = detectDisagreement(checkId)

  if (!disagreement) {
    return null
  }

  const id = generateDisagreementId()
  const record: DisagreementRecord = {
    id,
    checkId,
    familyId,
    childId,
    childResponse: disagreement.childResponse,
    parentResponses: disagreement.parentResponses,
    disagreementType: disagreement.disagreementType,
    surfacedAt: new Date(),
    resolvedAt: null,
    resolution: null,
  }

  // Store record
  disagreementStore.set(id, record)

  // Update family index
  const familyDisagreements = familyDisagreementIndex.get(familyId) || []
  familyDisagreements.push(id)
  familyDisagreementIndex.set(familyId, familyDisagreements)

  return record
}

/**
 * Get unresolved disagreements for a family.
 */
export function getUnresolvedDisagreements(familyId: string): DisagreementRecord[] {
  const disagreementIds = familyDisagreementIndex.get(familyId) || []

  return disagreementIds
    .map((id) => disagreementStore.get(id))
    .filter((record): record is DisagreementRecord => {
      return record !== undefined && record.resolvedAt === null
    })
}

/**
 * Mark a disagreement as resolved.
 */
export function markDisagreementResolved(
  disagreementId: string,
  resolution: string
): DisagreementRecord {
  const record = disagreementStore.get(disagreementId)

  if (!record) {
    throw new Error(`Disagreement not found: ${disagreementId}`)
  }

  const updated: DisagreementRecord = {
    ...record,
    resolvedAt: new Date(),
    resolution,
  }

  disagreementStore.set(disagreementId, updated)
  return updated
}

/**
 * Get a disagreement by ID.
 */
export function getDisagreementById(disagreementId: string): DisagreementRecord | null {
  return disagreementStore.get(disagreementId) || null
}

/**
 * Get all disagreements for a check.
 */
export function getDisagreementsForCheck(checkId: string): DisagreementRecord[] {
  return Array.from(disagreementStore.values()).filter((d) => d.checkId === checkId)
}

// ============================================
// Utility Functions
// ============================================

/**
 * Clear all stored data (for testing).
 */
export function clearAllDisagreementData(): void {
  disagreementStore.clear()
  familyDisagreementIndex.clear()
}
