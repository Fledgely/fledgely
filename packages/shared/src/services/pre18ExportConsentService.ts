/**
 * Pre18 Export Consent Service - Story 38.6 Task 2
 *
 * Service for managing child consent to data export.
 * AC4: Child must consent to any export
 */

import { createExportRequest, type Pre18ExportRequest } from '../contracts/pre18DataExport'

// ============================================
// In-Memory Storage (would be Firestore in production)
// ============================================

/**
 * Store of consent requests by child ID.
 * Each child can have multiple requests (historical).
 */
const consentRequestStore = new Map<string, Pre18ExportRequest[]>()

// ============================================
// Consent Request Functions
// ============================================

/**
 * Request export consent from a child.
 * AC4: Child must consent to any export
 *
 * @param childId - The child's ID
 * @param parentId - The requesting parent's ID
 * @returns The created consent request
 */
export function requestExportConsent(childId: string, parentId: string): Pre18ExportRequest {
  // Get family ID from existing data or use placeholder
  // In real implementation, this would look up the family
  const familyId = `family-${childId.split('-')[1] || 'unknown'}`

  const request = createExportRequest(childId, familyId, parentId)

  // Store the request
  const existingRequests = consentRequestStore.get(childId) || []
  existingRequests.push(request)
  consentRequestStore.set(childId, existingRequests)

  return request
}

/**
 * Get the most recent consent request for a child.
 *
 * @param childId - The child's ID
 * @returns The most recent request or null
 */
export function getConsentRequest(childId: string): Pre18ExportRequest | null {
  const requests = consentRequestStore.get(childId)
  if (!requests || requests.length === 0) {
    return null
  }

  // Return most recent (last in array)
  return requests[requests.length - 1]
}

/**
 * Grant export consent.
 * AC4: Child must consent to any export
 *
 * @param childId - The child's ID
 * @returns The updated request
 * @throws Error if no pending request exists
 */
export function grantExportConsent(childId: string): Pre18ExportRequest {
  const request = getConsentRequest(childId)

  if (!request) {
    throw new Error(`No consent request found for child: ${childId}`)
  }

  if (request.status !== 'pending_consent') {
    throw new Error(`Request is not pending consent. Current status: ${request.status}`)
  }

  // Update the request
  request.status = 'consent_granted'
  request.childConsentedAt = new Date()

  return request
}

/**
 * Deny export consent.
 * AC4: Child must consent to any export - denial is child's right
 *
 * @param childId - The child's ID
 * @returns The updated request
 * @throws Error if no pending request exists
 */
export function denyExportConsent(childId: string): Pre18ExportRequest {
  const request = getConsentRequest(childId)

  if (!request) {
    throw new Error(`No consent request found for child: ${childId}`)
  }

  if (request.status !== 'pending_consent') {
    throw new Error(`Request is not pending consent. Current status: ${request.status}`)
  }

  // Update the request
  request.status = 'consent_denied'
  request.childConsentedAt = null // Explicitly no consent

  return request
}

// ============================================
// Consent Status Functions
// ============================================

/**
 * Check if child has consented to export.
 * AC4: Child must consent to any export
 *
 * @param childId - The child's ID
 * @returns True if child has granted consent
 */
export function hasChildConsented(childId: string): boolean {
  const request = getConsentRequest(childId)
  return request?.status === 'consent_granted'
}

/**
 * Check if consent is pending.
 *
 * @param childId - The child's ID
 * @returns True if consent request is pending
 */
export function isConsentPending(childId: string): boolean {
  const request = getConsentRequest(childId)
  return request?.status === 'pending_consent'
}

/**
 * Get all consent requests for a child.
 *
 * @param childId - The child's ID
 * @returns Array of consent requests in chronological order
 */
export function getConsentRequestsForChild(childId: string): Pre18ExportRequest[] {
  return consentRequestStore.get(childId) || []
}

// ============================================
// Expiration Functions
// ============================================

/**
 * Check if a consent request has expired.
 *
 * @param request - The consent request
 * @returns True if request has expired
 */
export function isConsentExpired(request: Pre18ExportRequest): boolean {
  return request.expiresAt < new Date()
}

/**
 * Clean up expired consent requests.
 * Marks expired pending requests as 'expired' status.
 *
 * @returns Number of requests marked as expired
 */
export function cleanupExpiredConsents(): number {
  let expiredCount = 0
  const now = new Date()

  for (const [_childId, requests] of consentRequestStore) {
    for (const request of requests) {
      if (request.status === 'pending_consent' && request.expiresAt < now) {
        request.status = 'expired'
        expiredCount++
      }
    }
  }

  return expiredCount
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all consent data (for testing).
 */
export function clearAllConsentData(): void {
  consentRequestStore.clear()
}

/**
 * Get consent store size (for testing).
 */
export function getConsentStoreSize(): number {
  return consentRequestStore.size
}
