/**
 * ProportionalityResponseService - Story 38.4 Task 3
 *
 * Service for handling responses to proportionality checks.
 * AC2: Both parties prompted: "Is current monitoring appropriate?"
 * AC3: Questions include: "Has external risk changed?", "Has maturity increased?"
 * AC5: Parent and child respond separately (private)
 */

import {
  type ProportionalityResponse,
  type ResponseChoice,
  type RiskChange,
} from '../contracts/proportionalityCheck'
import { getCheckById, markCheckInProgress } from './proportionalityCheckService'

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const responseStore: Map<string, ProportionalityResponse> = new Map()
const checkResponseIndex: Map<string, string[]> = new Map()
const userResponseIndex: Map<string, string[]> = new Map()

// ============================================
// Types
// ============================================

export interface SubmitResponseInput {
  checkId: string
  respondentId: string
  respondentRole: 'child' | 'parent'
  isMonitoringAppropriate: ResponseChoice
  hasExternalRiskChanged: RiskChange | null
  hasMaturityIncreased: boolean | null
  freeformFeedback: string | null
  suggestedChanges: string[]
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate unique ID for response.
 */
function generateResponseId(): string {
  return `prop-resp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// ============================================
// Response Submission
// ============================================

/**
 * Submit a response to a proportionality check.
 *
 * AC2: Core question "Is current monitoring appropriate?"
 * AC3: Additional questions about risk and maturity
 * AC5: Response is always private
 */
export function submitResponse(input: SubmitResponseInput): ProportionalityResponse {
  // Validate check exists
  const check = getCheckById(input.checkId)
  if (!check) {
    throw new Error(`Check not found: ${input.checkId}`)
  }

  // Check for existing response
  const existingResponse = getResponseForCheck(input.checkId, input.respondentId)
  if (existingResponse) {
    throw new Error(`User ${input.respondentId} has already responded to this check`)
  }

  // Create response (always private per AC5)
  const id = generateResponseId()
  const response: ProportionalityResponse = {
    id,
    checkId: input.checkId,
    respondentId: input.respondentId,
    respondentRole: input.respondentRole,
    isMonitoringAppropriate: input.isMonitoringAppropriate,
    hasExternalRiskChanged: input.hasExternalRiskChanged,
    hasMaturityIncreased: input.hasMaturityIncreased,
    freeformFeedback: input.freeformFeedback,
    suggestedChanges: input.suggestedChanges,
    respondedAt: new Date(),
    isPrivate: true, // Always private (AC5)
  }

  // Store response
  responseStore.set(id, response)

  // Update indexes
  const checkResponses = checkResponseIndex.get(input.checkId) || []
  checkResponses.push(id)
  checkResponseIndex.set(input.checkId, checkResponses)

  const userResponses = userResponseIndex.get(input.respondentId) || []
  userResponses.push(id)
  userResponseIndex.set(input.respondentId, userResponses)

  // Mark check as in progress if this is first response
  if (check.status === 'pending') {
    markCheckInProgress(input.checkId)
  }

  return response
}

// ============================================
// Query Functions
// ============================================

/**
 * Get response for a specific respondent on a check.
 */
export function getResponseForCheck(
  checkId: string,
  respondentId: string
): ProportionalityResponse | null {
  const responseIds = checkResponseIndex.get(checkId) || []

  for (const id of responseIds) {
    const response = responseStore.get(id)
    if (response && response.respondentId === respondentId) {
      return response
    }
  }

  return null
}

/**
 * Get all responses for a check.
 * Note: This is for internal use - individual responses are private.
 */
export function getAllResponsesForCheck(checkId: string): ProportionalityResponse[] {
  const responseIds = checkResponseIndex.get(checkId) || []

  return responseIds
    .map((id) => responseStore.get(id))
    .filter((resp): resp is ProportionalityResponse => resp !== undefined)
}

/**
 * Get all responses by a user.
 */
export function getResponsesForUser(userId: string): ProportionalityResponse[] {
  const responseIds = userResponseIndex.get(userId) || []

  return responseIds
    .map((id) => responseStore.get(id))
    .filter((resp): resp is ProportionalityResponse => resp !== undefined)
}

// ============================================
// Privacy Functions (AC5)
// ============================================

/**
 * Check if a viewer can see a response.
 * AC5: Responses are always private - only the respondent can see their own.
 */
export function canViewResponse(viewerId: string, response: ProportionalityResponse): boolean {
  // Only the respondent can view their own response
  return viewerId === response.respondentId
}

// ============================================
// Completion Check
// ============================================

/**
 * Check if all required parties have responded.
 */
export function hasAllPartiesResponded(
  checkId: string,
  requiredChildIds: string[],
  requiredParentIds: string[]
): boolean {
  const responses = getAllResponsesForCheck(checkId)
  const respondentIds = new Set(responses.map((r) => r.respondentId))

  // Check all required children have responded
  for (const childId of requiredChildIds) {
    if (!respondentIds.has(childId)) {
      return false
    }
  }

  // Check all required parents have responded
  for (const parentId of requiredParentIds) {
    if (!respondentIds.has(parentId)) {
      return false
    }
  }

  return true
}

/**
 * Get response summary without revealing individual responses.
 */
export function getResponseSummary(checkId: string): {
  totalResponses: number
  childResponded: boolean
  parentResponseCount: number
} {
  const responses = getAllResponsesForCheck(checkId)

  return {
    totalResponses: responses.length,
    childResponded: responses.some((r) => r.respondentRole === 'child'),
    parentResponseCount: responses.filter((r) => r.respondentRole === 'parent').length,
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Clear all stored data (for testing).
 */
export function clearAllResponseData(): void {
  responseStore.clear()
  checkResponseIndex.clear()
  userResponseIndex.clear()
}
