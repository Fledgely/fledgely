/**
 * Pre18 Data Export Service Tests - Story 38.6 Task 3
 *
 * Tests for generating sanitized data exports.
 * AC2: Export option available (download all data)
 * AC3: Export includes: sanitized activity summaries (no screenshots)
 * AC5: No export of concerning flags or sensitive content
 * AC6: Export watermarked with date and purpose
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createExportRequest,
  generateExport,
  getExportStatus,
  sanitizeActivityLogs,
  sanitizeScreenTime,
  sanitizeAgreements,
  filterConcerningContent,
  addExportWatermark,
  validateWatermark,
  getExportUrl,
  isExportAvailable,
  markExportComplete,
  clearAllExportData,
} from './pre18DataExportService'
import { PRE18_EXPORT_PURPOSE } from '../contracts/pre18DataExport'

describe('Pre18DataExportService', () => {
  beforeEach(() => {
    clearAllExportData()
  })

  // ============================================
  // Export Request Tests (AC2)
  // ============================================

  describe('createExportRequest (AC2)', () => {
    it('should create export request with required fields', () => {
      const request = createExportRequest('child-123', 'parent-456')

      expect(request.childId).toBe('child-123')
      expect(request.requestedBy).toBe('parent-456')
      expect(request.status).toBe('pending_consent')
      expect(request.id).toBeDefined()
    })

    it('should generate unique request IDs', () => {
      const r1 = createExportRequest('child-1', 'parent-1')
      const r2 = createExportRequest('child-2', 'parent-2')

      expect(r1.id).not.toBe(r2.id)
    })

    it('should set expiration date', () => {
      const request = createExportRequest('child-123', 'parent-456')
      expect(request.expiresAt).toBeInstanceOf(Date)
      expect(request.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('getExportStatus', () => {
    it('should retrieve created export request', () => {
      const created = createExportRequest('child-123', 'parent-456')
      const status = getExportStatus(created.id)

      expect(status).not.toBeNull()
      expect(status!.id).toBe(created.id)
    })

    it('should return null for non-existent request', () => {
      const status = getExportStatus('non-existent-id')
      expect(status).toBeNull()
    })
  })

  // ============================================
  // Export Generation Tests (AC3)
  // ============================================

  describe('generateExport (AC3)', () => {
    it('should generate export with sanitized content', () => {
      const request = createExportRequest('child-123', 'parent-456')
      request.status = 'consent_granted'
      request.childConsentedAt = new Date()

      const content = generateExport(request.id)

      expect(content).not.toBeNull()
      expect(content!.childId).toBe('child-123')
      expect(content!.activitySummaries).toBeDefined()
      expect(content!.screenTimeSummaries).toBeDefined()
      expect(content!.agreementHistory).toBeDefined()
    })

    it('should include watermark (AC6)', () => {
      const request = createExportRequest('child-123', 'parent-456')
      request.status = 'consent_granted'
      request.childConsentedAt = new Date()

      const content = generateExport(request.id)

      expect(content!.watermark).toBeDefined()
      expect(content!.watermark.purpose).toBe(PRE18_EXPORT_PURPOSE)
      expect(content!.watermark.childConsent).toBe(true)
    })

    it('should return null if consent not granted', () => {
      const request = createExportRequest('child-123', 'parent-456')
      // Status is still pending_consent

      const content = generateExport(request.id)
      expect(content).toBeNull()
    })

    it('should return null for non-existent request', () => {
      const content = generateExport('non-existent-id')
      expect(content).toBeNull()
    })
  })

  // ============================================
  // Sanitization Tests (AC3, AC5)
  // ============================================

  describe('sanitizeActivityLogs (AC3)', () => {
    it('should return sanitized activity summaries', () => {
      const summaries = sanitizeActivityLogs('child-123')

      expect(Array.isArray(summaries)).toBe(true)
      for (const summary of summaries) {
        expect(summary.date).toBeInstanceOf(Date)
        expect(typeof summary.totalScreenTime).toBe('number')
        expect(Array.isArray(summary.topCategories)).toBe(true)
      }
    })

    it('should not include URLs or screenshots', () => {
      const summaries = sanitizeActivityLogs('child-123')

      for (const summary of summaries) {
        // Should not have URL-like properties
        expect(summary).not.toHaveProperty('url')
        expect(summary).not.toHaveProperty('urls')
        expect(summary).not.toHaveProperty('screenshot')
        expect(summary).not.toHaveProperty('screenshots')
      }
    })
  })

  describe('sanitizeScreenTime', () => {
    it('should return screen time summaries', () => {
      const summaries = sanitizeScreenTime('child-123')

      expect(Array.isArray(summaries)).toBe(true)
      for (const summary of summaries) {
        expect(summary.date).toBeInstanceOf(Date)
        expect(typeof summary.totalMinutes).toBe('number')
        expect(typeof summary.byCategory).toBe('object')
      }
    })
  })

  describe('sanitizeAgreements', () => {
    it('should return agreement summaries', () => {
      const summaries = sanitizeAgreements('child-123')

      expect(Array.isArray(summaries)).toBe(true)
      for (const summary of summaries) {
        expect(summary.agreementId).toBeDefined()
        expect(summary.createdAt).toBeInstanceOf(Date)
        expect(['active', 'expired', 'withdrawn']).toContain(summary.status)
      }
    })
  })

  describe('filterConcerningContent (AC5)', () => {
    it('should filter out flagged content', () => {
      const content = [
        { type: 'activity', data: 'normal activity' },
        { type: 'flag', data: 'concerning flag', flagged: true },
        { type: 'activity', data: 'another activity' },
      ]

      const filtered = filterConcerningContent(content)

      expect(filtered).toHaveLength(2)
      expect(filtered.every((item) => !item.flagged)).toBe(true)
    })

    it('should filter out sensitive content', () => {
      const content = [
        { type: 'activity', data: 'normal' },
        { type: 'activity', data: 'sensitive', sensitive: true },
        { type: 'activity', data: 'normal 2' },
      ]

      const filtered = filterConcerningContent(content)

      expect(filtered).toHaveLength(2)
      expect(filtered.every((item) => !item.sensitive)).toBe(true)
    })

    it('should return empty array for all concerning content', () => {
      const content = [
        { type: 'flag', flagged: true },
        { type: 'flag', flagged: true },
      ]

      const filtered = filterConcerningContent(content)
      expect(filtered).toHaveLength(0)
    })

    it('should handle empty array', () => {
      const filtered = filterConcerningContent([])
      expect(filtered).toHaveLength(0)
    })
  })

  // ============================================
  // Watermark Tests (AC6)
  // ============================================

  describe('addExportWatermark (AC6)', () => {
    it('should add watermark with correct purpose', () => {
      const request = createExportRequest('child-123', 'parent-456')
      request.status = 'consent_granted'
      request.childConsentedAt = new Date()

      const content = generateExport(request.id)
      const watermarked = addExportWatermark(content!, 'parent-456')

      expect(watermarked.watermark.purpose).toBe(PRE18_EXPORT_PURPOSE)
    })

    it('should include requestedBy in watermark', () => {
      const request = createExportRequest('child-123', 'parent-456')
      request.status = 'consent_granted'
      request.childConsentedAt = new Date()

      const content = generateExport(request.id)
      const watermarked = addExportWatermark(content!, 'parent-456')

      expect(watermarked.watermark.requestedBy).toBe('parent-456')
    })

    it('should include child consent status in watermark', () => {
      const request = createExportRequest('child-123', 'parent-456')
      request.status = 'consent_granted'
      request.childConsentedAt = new Date()

      const content = generateExport(request.id)
      const watermarked = addExportWatermark(content!, 'parent-456')

      expect(watermarked.watermark.childConsent).toBe(true)
    })

    it('should include export date in watermark', () => {
      const request = createExportRequest('child-123', 'parent-456')
      request.status = 'consent_granted'
      request.childConsentedAt = new Date()

      const content = generateExport(request.id)
      const before = new Date()
      const watermarked = addExportWatermark(content!, 'parent-456')
      const after = new Date()

      expect(watermarked.watermark.exportDate.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(watermarked.watermark.exportDate.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('validateWatermark', () => {
    it('should validate correct watermark', () => {
      const watermark = {
        exportDate: new Date(),
        purpose: PRE18_EXPORT_PURPOSE,
        requestedBy: 'parent-123',
        childConsent: true,
        watermarkId: 'watermark-123',
      }

      expect(validateWatermark(watermark)).toBe(true)
    })

    it('should reject watermark without required fields', () => {
      const invalidWatermark = {
        exportDate: new Date(),
        // Missing purpose, requestedBy, etc.
      }

      expect(validateWatermark(invalidWatermark as any)).toBe(false)
    })
  })

  // ============================================
  // Export URL Tests
  // ============================================

  describe('getExportUrl', () => {
    it('should return null for incomplete export', () => {
      const request = createExportRequest('child-123', 'parent-456')
      const url = getExportUrl(request.id)

      expect(url).toBeNull()
    })

    it('should return URL for completed export', () => {
      const request = createExportRequest('child-123', 'parent-456')
      request.status = 'consent_granted'
      request.childConsentedAt = new Date()

      generateExport(request.id)
      markExportComplete(request.id, 'https://export.example.com/file.zip')

      const url = getExportUrl(request.id)
      expect(url).toBe('https://export.example.com/file.zip')
    })
  })

  describe('isExportAvailable', () => {
    it('should return false for non-existent request', () => {
      expect(isExportAvailable('non-existent')).toBe(false)
    })

    it('should return false for pending export', () => {
      const request = createExportRequest('child-123', 'parent-456')
      expect(isExportAvailable(request.id)).toBe(false)
    })

    it('should return true for completed export', () => {
      const request = createExportRequest('child-123', 'parent-456')
      request.status = 'consent_granted'
      request.childConsentedAt = new Date()

      generateExport(request.id)
      markExportComplete(request.id, 'https://export.example.com/file.zip')

      expect(isExportAvailable(request.id)).toBe(true)
    })
  })

  describe('markExportComplete', () => {
    it('should update request status to completed', () => {
      const request = createExportRequest('child-123', 'parent-456')
      request.status = 'consent_granted'

      markExportComplete(request.id, 'https://export.example.com/file.zip')

      const updated = getExportStatus(request.id)
      expect(updated!.status).toBe('completed')
    })

    it('should set export URL', () => {
      const request = createExportRequest('child-123', 'parent-456')
      request.status = 'consent_granted'

      markExportComplete(request.id, 'https://export.example.com/file.zip')

      const updated = getExportStatus(request.id)
      expect(updated!.exportUrl).toBe('https://export.example.com/file.zip')
    })

    it('should set exportCompletedAt timestamp', () => {
      const request = createExportRequest('child-123', 'parent-456')
      request.status = 'consent_granted'

      const before = new Date()
      markExportComplete(request.id, 'https://export.example.com/file.zip')
      const after = new Date()

      const updated = getExportStatus(request.id)
      expect(updated!.exportCompletedAt).not.toBeNull()
      expect(updated!.exportCompletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(updated!.exportCompletedAt!.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle child with no activity data', () => {
      const summaries = sanitizeActivityLogs('child-with-no-data')
      expect(Array.isArray(summaries)).toBe(true)
    })

    it('should handle multiple export requests for same child', () => {
      const r1 = createExportRequest('child-123', 'parent-1')
      const r2 = createExportRequest('child-123', 'parent-2')

      expect(getExportStatus(r1.id)).not.toBeNull()
      expect(getExportStatus(r2.id)).not.toBeNull()
    })

    it('should not affect other requests when one completes', () => {
      const r1 = createExportRequest('child-1', 'parent-1')
      const r2 = createExportRequest('child-2', 'parent-2')

      r1.status = 'consent_granted'
      generateExport(r1.id)
      markExportComplete(r1.id, 'https://example.com/file1.zip')

      // r2 should be unaffected
      expect(getExportStatus(r2.id)!.status).toBe('pending_consent')
    })
  })
})
