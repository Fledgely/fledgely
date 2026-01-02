/**
 * Pre18 Export Consent Service Tests - Story 38.6 Task 2
 *
 * Tests for managing child consent to data export.
 * AC4: Child must consent to any export
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  requestExportConsent,
  getConsentRequest,
  grantExportConsent,
  denyExportConsent,
  hasChildConsented,
  isConsentPending,
  getConsentRequestsForChild,
  isConsentExpired,
  cleanupExpiredConsents,
  clearAllConsentData,
} from './pre18ExportConsentService'
import { EXPORT_REQUEST_VALID_DAYS } from '../contracts/pre18DataExport'

describe('Pre18ExportConsentService', () => {
  beforeEach(() => {
    clearAllConsentData()
  })

  // ============================================
  // Consent Request Tests
  // ============================================

  describe('requestExportConsent', () => {
    it('should create consent request for child', () => {
      const request = requestExportConsent('child-123', 'parent-456')

      expect(request.childId).toBe('child-123')
      expect(request.requestedBy).toBe('parent-456')
      expect(request.status).toBe('pending_consent')
    })

    it('should generate unique request IDs', () => {
      const request1 = requestExportConsent('child-1', 'parent-1')
      const request2 = requestExportConsent('child-2', 'parent-2')

      expect(request1.id).not.toBe(request2.id)
    })

    it('should set requestedAt to current time', () => {
      const before = new Date()
      const request = requestExportConsent('child-123', 'parent-456')
      const after = new Date()

      expect(request.requestedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(request.requestedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should set expiration date', () => {
      const request = requestExportConsent('child-123', 'parent-456')
      const expectedExpiry = new Date(request.requestedAt)
      expectedExpiry.setDate(expectedExpiry.getDate() + EXPORT_REQUEST_VALID_DAYS)

      expect(Math.abs(request.expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000)
    })
  })

  // ============================================
  // Get Consent Request Tests
  // ============================================

  describe('getConsentRequest', () => {
    it('should retrieve existing consent request', () => {
      const created = requestExportConsent('child-123', 'parent-456')
      const retrieved = getConsentRequest('child-123')

      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
    })

    it('should return null for non-existent child', () => {
      const result = getConsentRequest('non-existent-child')
      expect(result).toBeNull()
    })

    it('should return most recent request for child', () => {
      requestExportConsent('child-123', 'parent-1')
      const second = requestExportConsent('child-123', 'parent-2')
      const retrieved = getConsentRequest('child-123')

      expect(retrieved!.id).toBe(second.id)
    })
  })

  // ============================================
  // Grant Consent Tests (AC4)
  // ============================================

  describe('grantExportConsent (AC4)', () => {
    it('should update status to consent_granted', () => {
      requestExportConsent('child-123', 'parent-456')
      const updated = grantExportConsent('child-123')

      expect(updated.status).toBe('consent_granted')
    })

    it('should set childConsentedAt timestamp', () => {
      requestExportConsent('child-123', 'parent-456')
      const before = new Date()
      const updated = grantExportConsent('child-123')
      const after = new Date()

      expect(updated.childConsentedAt).not.toBeNull()
      expect(updated.childConsentedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(updated.childConsentedAt!.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should throw error if no pending request exists', () => {
      expect(() => grantExportConsent('child-no-request')).toThrow()
    })

    it('should throw error if request already processed', () => {
      requestExportConsent('child-123', 'parent-456')
      grantExportConsent('child-123')

      // Second grant should fail
      expect(() => grantExportConsent('child-123')).toThrow()
    })
  })

  // ============================================
  // Deny Consent Tests (AC4)
  // ============================================

  describe('denyExportConsent (AC4)', () => {
    it('should update status to consent_denied', () => {
      requestExportConsent('child-123', 'parent-456')
      const updated = denyExportConsent('child-123')

      expect(updated.status).toBe('consent_denied')
    })

    it('should set childConsentedAt to null (no consent given)', () => {
      requestExportConsent('child-123', 'parent-456')
      const updated = denyExportConsent('child-123')

      expect(updated.childConsentedAt).toBeNull()
    })

    it('should throw error if no pending request exists', () => {
      expect(() => denyExportConsent('child-no-request')).toThrow()
    })

    it('should throw error if request already processed', () => {
      requestExportConsent('child-123', 'parent-456')
      denyExportConsent('child-123')

      // Second deny should fail
      expect(() => denyExportConsent('child-123')).toThrow()
    })
  })

  // ============================================
  // Consent Status Tests
  // ============================================

  describe('hasChildConsented', () => {
    it('should return true if child has consented', () => {
      requestExportConsent('child-123', 'parent-456')
      grantExportConsent('child-123')

      expect(hasChildConsented('child-123')).toBe(true)
    })

    it('should return false if child denied consent', () => {
      requestExportConsent('child-123', 'parent-456')
      denyExportConsent('child-123')

      expect(hasChildConsented('child-123')).toBe(false)
    })

    it('should return false if consent pending', () => {
      requestExportConsent('child-123', 'parent-456')

      expect(hasChildConsented('child-123')).toBe(false)
    })

    it('should return false if no request exists', () => {
      expect(hasChildConsented('child-no-request')).toBe(false)
    })
  })

  describe('isConsentPending', () => {
    it('should return true if consent is pending', () => {
      requestExportConsent('child-123', 'parent-456')

      expect(isConsentPending('child-123')).toBe(true)
    })

    it('should return false after consent granted', () => {
      requestExportConsent('child-123', 'parent-456')
      grantExportConsent('child-123')

      expect(isConsentPending('child-123')).toBe(false)
    })

    it('should return false after consent denied', () => {
      requestExportConsent('child-123', 'parent-456')
      denyExportConsent('child-123')

      expect(isConsentPending('child-123')).toBe(false)
    })

    it('should return false if no request exists', () => {
      expect(isConsentPending('child-no-request')).toBe(false)
    })
  })

  // ============================================
  // Multiple Requests Tests
  // ============================================

  describe('getConsentRequestsForChild', () => {
    it('should return all requests for child', () => {
      requestExportConsent('child-123', 'parent-1')
      denyExportConsent('child-123') // Complete first request
      requestExportConsent('child-123', 'parent-2') // New request

      const requests = getConsentRequestsForChild('child-123')
      expect(requests).toHaveLength(2)
    })

    it('should return empty array if no requests', () => {
      const requests = getConsentRequestsForChild('child-no-requests')
      expect(requests).toHaveLength(0)
    })

    it('should return requests in chronological order', () => {
      requestExportConsent('child-123', 'parent-1')
      denyExportConsent('child-123')
      requestExportConsent('child-123', 'parent-2')

      const requests = getConsentRequestsForChild('child-123')
      expect(requests[0].requestedAt.getTime()).toBeLessThanOrEqual(
        requests[1].requestedAt.getTime()
      )
    })
  })

  // ============================================
  // Expiration Tests
  // ============================================

  describe('isConsentExpired', () => {
    it('should return false for valid request', () => {
      const request = requestExportConsent('child-123', 'parent-456')
      expect(isConsentExpired(request)).toBe(false)
    })

    it('should return true for expired request', () => {
      const request = requestExportConsent('child-123', 'parent-456')
      // Manually set expiration to past
      request.expiresAt = new Date(Date.now() - 1000)

      expect(isConsentExpired(request)).toBe(true)
    })
  })

  describe('cleanupExpiredConsents', () => {
    it('should mark expired requests as expired', () => {
      const request = requestExportConsent('child-123', 'parent-456')
      // Manually set expiration to past
      request.expiresAt = new Date(Date.now() - 1000)

      const count = cleanupExpiredConsents()

      expect(count).toBe(1)
      const updated = getConsentRequest('child-123')
      expect(updated!.status).toBe('expired')
    })

    it('should not affect valid requests', () => {
      requestExportConsent('child-123', 'parent-456')

      const count = cleanupExpiredConsents()

      expect(count).toBe(0)
      const request = getConsentRequest('child-123')
      expect(request!.status).toBe('pending_consent')
    })

    it('should return count of expired requests', () => {
      // Create multiple requests and expire some
      const r1 = requestExportConsent('child-1', 'parent-1')
      r1.expiresAt = new Date(Date.now() - 1000)

      const r2 = requestExportConsent('child-2', 'parent-2')
      r2.expiresAt = new Date(Date.now() - 1000)

      requestExportConsent('child-3', 'parent-3') // Valid

      const count = cleanupExpiredConsents()

      expect(count).toBe(2)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle requesting consent after previous denial', () => {
      requestExportConsent('child-123', 'parent-456')
      denyExportConsent('child-123')

      // Parent can request again
      const newRequest = requestExportConsent('child-123', 'parent-456')
      expect(newRequest.status).toBe('pending_consent')
    })

    it('should handle multiple children from same parent', () => {
      requestExportConsent('child-1', 'parent-123')
      requestExportConsent('child-2', 'parent-123')

      expect(getConsentRequest('child-1')).not.toBeNull()
      expect(getConsentRequest('child-2')).not.toBeNull()
    })

    it('should preserve other requests when one expires', () => {
      const expired = requestExportConsent('child-1', 'parent-1')
      expired.expiresAt = new Date(Date.now() - 1000)

      requestExportConsent('child-2', 'parent-2') // Valid

      cleanupExpiredConsents()

      expect(getConsentRequest('child-1')!.status).toBe('expired')
      expect(getConsentRequest('child-2')!.status).toBe('pending_consent')
    })
  })
})
