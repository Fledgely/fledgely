/**
 * Pre-18 Data Export Contracts Tests - Story 38.6 Task 1
 *
 * Tests for Zod schemas and types for pre-18 data export.
 * AC2: Export option available (download all data)
 * AC3: Export includes: sanitized activity summaries (no screenshots)
 * AC6: Export watermarked with date and purpose
 */

import { describe, it, expect } from 'vitest'
import {
  pre18ExportRequestSchema,
  pre18ExportContentSchema,
  sanitizedActivitySummarySchema,
  screenTimeSummarySchema,
  agreementSummarySchema,
  exportWatermarkSchema,
  exportRequestStatusSchema,
  EXPORT_REQUEST_VALID_DAYS,
  EXPORT_URL_VALID_HOURS,
  PRE18_EXPORT_PURPOSE,
  createExportRequest,
  createExportWatermark,
  isValidExportRequest,
  type ExportRequestStatus,
} from './pre18DataExport'

describe('Pre18DataExport Contracts', () => {
  // ============================================
  // Configuration Constants Tests
  // ============================================

  describe('Configuration Constants', () => {
    it('should define export request validity period as 30 days', () => {
      expect(EXPORT_REQUEST_VALID_DAYS).toBe(30)
    })

    it('should define export URL validity as 24 hours', () => {
      expect(EXPORT_URL_VALID_HOURS).toBe(24)
    })

    it('should define export purpose string', () => {
      expect(PRE18_EXPORT_PURPOSE).toBe('Pre-18 Data Export')
    })
  })

  // ============================================
  // Export Request Status Schema Tests
  // ============================================

  describe('ExportRequestStatus Schema', () => {
    const validStatuses: ExportRequestStatus[] = [
      'pending_consent',
      'consent_granted',
      'consent_denied',
      'processing',
      'completed',
      'expired',
    ]

    it.each(validStatuses)('should accept valid status: %s', (status) => {
      const result = exportRequestStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = exportRequestStatusSchema.safeParse('invalid_status')
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Export Watermark Schema Tests (AC6)
  // ============================================

  describe('ExportWatermark Schema (AC6)', () => {
    const validWatermark = {
      exportDate: new Date(),
      purpose: 'Pre-18 Data Export',
      requestedBy: 'parent-123',
      childConsent: true,
      watermarkId: 'watermark-abc123',
    }

    it('should validate complete watermark', () => {
      const result = exportWatermarkSchema.safeParse(validWatermark)
      expect(result.success).toBe(true)
    })

    it('should require exportDate', () => {
      const { exportDate: _exportDate, ...incomplete } = validWatermark
      const result = exportWatermarkSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require purpose', () => {
      const { purpose: _purpose, ...incomplete } = validWatermark
      const result = exportWatermarkSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require requestedBy', () => {
      const { requestedBy: _requestedBy, ...incomplete } = validWatermark
      const result = exportWatermarkSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require childConsent boolean', () => {
      const { childConsent: _childConsent, ...incomplete } = validWatermark
      const result = exportWatermarkSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require watermarkId', () => {
      const { watermarkId: _watermarkId, ...incomplete } = validWatermark
      const result = exportWatermarkSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Sanitized Activity Summary Schema Tests (AC3)
  // ============================================

  describe('SanitizedActivitySummary Schema (AC3)', () => {
    const validSummary = {
      date: new Date(),
      totalScreenTime: 120, // minutes
      topCategories: ['Education', 'Entertainment', 'Social'],
    }

    it('should validate complete sanitized summary', () => {
      const result = sanitizedActivitySummarySchema.safeParse(validSummary)
      expect(result.success).toBe(true)
    })

    it('should require date', () => {
      const { date: _date, ...incomplete } = validSummary
      const result = sanitizedActivitySummarySchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require totalScreenTime', () => {
      const { totalScreenTime: _totalScreenTime, ...incomplete } = validSummary
      const result = sanitizedActivitySummarySchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should reject negative screen time', () => {
      const result = sanitizedActivitySummarySchema.safeParse({
        ...validSummary,
        totalScreenTime: -10,
      })
      expect(result.success).toBe(false)
    })

    it('should require topCategories array', () => {
      const { topCategories: _topCategories, ...incomplete } = validSummary
      const result = sanitizedActivitySummarySchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should allow empty topCategories array', () => {
      const result = sanitizedActivitySummarySchema.safeParse({
        ...validSummary,
        topCategories: [],
      })
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // Screen Time Summary Schema Tests
  // ============================================

  describe('ScreenTimeSummary Schema', () => {
    const validSummary = {
      date: new Date(),
      totalMinutes: 180,
      byCategory: {
        Education: 60,
        Entertainment: 80,
        Social: 40,
      },
    }

    it('should validate complete screen time summary', () => {
      const result = screenTimeSummarySchema.safeParse(validSummary)
      expect(result.success).toBe(true)
    })

    it('should require totalMinutes', () => {
      const { totalMinutes: _totalMinutes, ...incomplete } = validSummary
      const result = screenTimeSummarySchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should reject negative totalMinutes', () => {
      const result = screenTimeSummarySchema.safeParse({
        ...validSummary,
        totalMinutes: -5,
      })
      expect(result.success).toBe(false)
    })

    it('should allow empty byCategory object', () => {
      const result = screenTimeSummarySchema.safeParse({
        ...validSummary,
        byCategory: {},
      })
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // Agreement Summary Schema Tests
  // ============================================

  describe('AgreementSummary Schema', () => {
    const validSummary = {
      agreementId: 'agreement-123',
      createdAt: new Date(),
      status: 'active',
      signedBy: ['parent-1', 'child-1'],
    }

    it('should validate complete agreement summary', () => {
      const result = agreementSummarySchema.safeParse(validSummary)
      expect(result.success).toBe(true)
    })

    it('should require agreementId', () => {
      const { agreementId: _agreementId, ...incomplete } = validSummary
      const result = agreementSummarySchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should accept valid agreement statuses', () => {
      const statuses = ['active', 'expired', 'withdrawn']
      for (const status of statuses) {
        const result = agreementSummarySchema.safeParse({
          ...validSummary,
          status,
        })
        expect(result.success).toBe(true)
      }
    })
  })

  // ============================================
  // Pre18 Export Request Schema Tests (AC2)
  // ============================================

  describe('Pre18ExportRequest Schema (AC2)', () => {
    const validRequest = {
      id: 'export-request-123',
      childId: 'child-456',
      familyId: 'family-789',
      requestedBy: 'parent-abc',
      requestedAt: new Date(),
      status: 'pending_consent' as ExportRequestStatus,
      childConsentedAt: null,
      exportCompletedAt: null,
      exportUrl: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }

    it('should validate complete export request', () => {
      const result = pre18ExportRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should require id', () => {
      const { id: _id, ...incomplete } = validRequest
      const result = pre18ExportRequestSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require childId', () => {
      const { childId: _childId, ...incomplete } = validRequest
      const result = pre18ExportRequestSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require familyId', () => {
      const { familyId: _familyId, ...incomplete } = validRequest
      const result = pre18ExportRequestSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require requestedBy', () => {
      const { requestedBy: _requestedBy, ...incomplete } = validRequest
      const result = pre18ExportRequestSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require status', () => {
      const { status: _status, ...incomplete } = validRequest
      const result = pre18ExportRequestSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should allow null for optional dates', () => {
      const result = pre18ExportRequestSchema.safeParse({
        ...validRequest,
        childConsentedAt: null,
        exportCompletedAt: null,
        exportUrl: null,
      })
      expect(result.success).toBe(true)
    })

    it('should accept completed request with all dates', () => {
      const completedRequest = {
        ...validRequest,
        status: 'completed' as ExportRequestStatus,
        childConsentedAt: new Date(),
        exportCompletedAt: new Date(),
        exportUrl: 'https://example.com/export/abc123',
      }
      const result = pre18ExportRequestSchema.safeParse(completedRequest)
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // Pre18 Export Content Schema Tests (AC3, AC6)
  // ============================================

  describe('Pre18ExportContent Schema (AC3, AC6)', () => {
    const validWatermark = {
      exportDate: new Date(),
      purpose: 'Pre-18 Data Export',
      requestedBy: 'parent-123',
      childConsent: true,
      watermarkId: 'watermark-abc',
    }

    const validContent = {
      id: 'export-content-123',
      exportRequestId: 'export-request-456',
      childId: 'child-789',
      familyId: 'family-abc',
      activitySummaries: [
        {
          date: new Date(),
          totalScreenTime: 120,
          topCategories: ['Education'],
        },
      ],
      screenTimeSummaries: [
        {
          date: new Date(),
          totalMinutes: 120,
          byCategory: { Education: 120 },
        },
      ],
      agreementHistory: [
        {
          agreementId: 'agreement-1',
          createdAt: new Date(),
          status: 'active',
          signedBy: ['parent-1', 'child-1'],
        },
      ],
      createdAt: new Date(),
      watermark: validWatermark,
    }

    it('should validate complete export content', () => {
      const result = pre18ExportContentSchema.safeParse(validContent)
      expect(result.success).toBe(true)
    })

    it('should require watermark (AC6)', () => {
      const { watermark: _watermark, ...incomplete } = validContent
      const result = pre18ExportContentSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require activitySummaries (AC3)', () => {
      const { activitySummaries: _activitySummaries, ...incomplete } = validContent
      const result = pre18ExportContentSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should allow empty arrays for summaries', () => {
      const result = pre18ExportContentSchema.safeParse({
        ...validContent,
        activitySummaries: [],
        screenTimeSummaries: [],
        agreementHistory: [],
      })
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // Factory Function Tests
  // ============================================

  describe('Factory Functions', () => {
    describe('createExportRequest', () => {
      it('should create valid export request with required fields', () => {
        const request = createExportRequest('child-123', 'family-456', 'parent-789')

        expect(request.childId).toBe('child-123')
        expect(request.familyId).toBe('family-456')
        expect(request.requestedBy).toBe('parent-789')
        expect(request.status).toBe('pending_consent')
        expect(request.id).toBeDefined()
        expect(request.requestedAt).toBeInstanceOf(Date)
        expect(request.expiresAt).toBeInstanceOf(Date)
        expect(request.childConsentedAt).toBeNull()
        expect(request.exportCompletedAt).toBeNull()
        expect(request.exportUrl).toBeNull()
      })

      it('should set expiration date 30 days from request', () => {
        const request = createExportRequest('child-1', 'family-1', 'parent-1')
        const expectedExpiry = new Date(request.requestedAt)
        expectedExpiry.setDate(expectedExpiry.getDate() + EXPORT_REQUEST_VALID_DAYS)

        // Compare dates within 1 second tolerance
        expect(Math.abs(request.expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000)
      })

      it('should generate unique IDs', () => {
        const request1 = createExportRequest('child-1', 'family-1', 'parent-1')
        const request2 = createExportRequest('child-1', 'family-1', 'parent-1')

        expect(request1.id).not.toBe(request2.id)
      })
    })

    describe('createExportWatermark', () => {
      it('should create valid watermark with required fields', () => {
        const watermark = createExportWatermark('parent-123', true)

        expect(watermark.requestedBy).toBe('parent-123')
        expect(watermark.childConsent).toBe(true)
        expect(watermark.purpose).toBe(PRE18_EXPORT_PURPOSE)
        expect(watermark.exportDate).toBeInstanceOf(Date)
        expect(watermark.watermarkId).toBeDefined()
      })

      it('should handle consent denied', () => {
        const watermark = createExportWatermark('parent-123', false)

        expect(watermark.childConsent).toBe(false)
      })

      it('should generate unique watermark IDs', () => {
        const watermark1 = createExportWatermark('parent-1', true)
        const watermark2 = createExportWatermark('parent-1', true)

        expect(watermark1.watermarkId).not.toBe(watermark2.watermarkId)
      })
    })
  })

  // ============================================
  // Validation Function Tests
  // ============================================

  describe('Validation Functions', () => {
    describe('isValidExportRequest', () => {
      it('should return true for valid non-expired request', () => {
        const request = createExportRequest('child-1', 'family-1', 'parent-1')
        expect(isValidExportRequest(request)).toBe(true)
      })

      it('should return false for expired request', () => {
        const request = createExportRequest('child-1', 'family-1', 'parent-1')
        // Set expiration to past
        request.expiresAt = new Date(Date.now() - 1000)
        expect(isValidExportRequest(request)).toBe(false)
      })

      it('should return false for already completed request', () => {
        const request = createExportRequest('child-1', 'family-1', 'parent-1')
        request.status = 'completed'
        expect(isValidExportRequest(request)).toBe(false)
      })

      it('should return false for consent denied request', () => {
        const request = createExportRequest('child-1', 'family-1', 'parent-1')
        request.status = 'consent_denied'
        expect(isValidExportRequest(request)).toBe(false)
      })

      it('should return true for pending consent request', () => {
        const request = createExportRequest('child-1', 'family-1', 'parent-1')
        request.status = 'pending_consent'
        expect(isValidExportRequest(request)).toBe(true)
      })

      it('should return true for consent granted request', () => {
        const request = createExportRequest('child-1', 'family-1', 'parent-1')
        request.status = 'consent_granted'
        expect(isValidExportRequest(request)).toBe(true)
      })

      it('should return true for processing request', () => {
        const request = createExportRequest('child-1', 'family-1', 'parent-1')
        request.status = 'processing'
        expect(isValidExportRequest(request)).toBe(true)
      })
    })
  })

  // ============================================
  // Edge Case Tests
  // ============================================

  describe('Edge Cases', () => {
    it('should handle request with all fields populated', () => {
      const fullRequest = {
        id: 'export-123',
        childId: 'child-456',
        familyId: 'family-789',
        requestedBy: 'parent-abc',
        requestedAt: new Date(),
        status: 'completed' as ExportRequestStatus,
        childConsentedAt: new Date(),
        exportCompletedAt: new Date(),
        exportUrl: 'https://export.example.com/file.zip',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }

      const result = pre18ExportRequestSchema.safeParse(fullRequest)
      expect(result.success).toBe(true)
    })

    it('should handle activity summary with many categories', () => {
      const manyCategories = Array.from({ length: 10 }, (_, i) => `Category${i}`)
      const summary = {
        date: new Date(),
        totalScreenTime: 600,
        topCategories: manyCategories,
      }

      const result = sanitizedActivitySummarySchema.safeParse(summary)
      expect(result.success).toBe(true)
    })

    it('should handle zero screen time', () => {
      const summary = {
        date: new Date(),
        totalScreenTime: 0,
        topCategories: [],
      }

      const result = sanitizedActivitySummarySchema.safeParse(summary)
      expect(result.success).toBe(true)
    })
  })
})
