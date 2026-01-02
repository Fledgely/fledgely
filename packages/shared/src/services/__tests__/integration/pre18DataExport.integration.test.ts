/**
 * Pre18 Data Export Integration Tests - Story 38.6 Task 8
 *
 * Integration tests for the complete pre-18 export flow.
 * Tests all ACs working together.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  requestExportConsent,
  grantExportConsent,
  denyExportConsent,
  hasChildConsented,
  clearAllConsentData,
} from '../../pre18ExportConsentService'
import {
  createExportRequest,
  generateExport,
  markExportComplete,
  isExportAvailable,
  clearAllExportData,
} from '../../pre18DataExportService'
import {
  sendPre18ExportAvailableNotification,
  sendConsentRequestToChild,
  sendExportReadyNotification,
  getPre18ExportMessage,
  clearAllNotificationData,
} from '../../pre18ExportNotificationService'
import {
  isEligibleForPre18Export,
  getDaysUntilDataDeletion,
  setChildBirthdateForTest,
  clearEligibilityTestData,
} from '../../pre18ExportEligibilityService'
import { PRE18_EXPORT_PURPOSE } from '../../../contracts/pre18DataExport'
import { PRE_DELETION_NOTICE_DAYS } from '../../../contracts/age18Deletion'

describe('Pre18 Data Export Integration', () => {
  beforeEach(() => {
    clearAllConsentData()
    clearAllExportData()
    clearAllNotificationData()
    clearEligibilityTestData()
  })

  // ============================================
  // Complete Export Flow Tests
  // ============================================

  describe('Complete export flow: request → consent → generate → download', () => {
    it('should execute full export flow successfully', () => {
      // Set up child who turns 18 in 20 days
      const almostEighteen = new Date()
      almostEighteen.setDate(almostEighteen.getDate() + 20)
      const birthdate = new Date(almostEighteen)
      birthdate.setFullYear(birthdate.getFullYear() - 18)
      setChildBirthdateForTest('child-123', birthdate)

      // Step 1: Check eligibility
      expect(isEligibleForPre18Export('child-123')).toBe(true)

      // Step 2: Parent requests export
      const exportRequest = createExportRequest('child-123', 'parent-456')
      expect(exportRequest.status).toBe('pending_consent')

      // Step 3: Notify child
      const consentNotification = sendConsentRequestToChild('child-123', 'parent-456')
      expect(consentNotification.type).toBe('export_consent_request')

      // Step 4: Child grants consent
      requestExportConsent('child-123', 'parent-456')
      grantExportConsent('child-123')
      expect(hasChildConsented('child-123')).toBe(true)

      // Step 5: Generate export
      exportRequest.status = 'consent_granted'
      exportRequest.childConsentedAt = new Date()
      const content = generateExport(exportRequest.id)

      expect(content).not.toBeNull()
      expect(content!.watermark.purpose).toBe(PRE18_EXPORT_PURPOSE)
      expect(content!.watermark.childConsent).toBe(true)

      // Step 6: Mark complete with URL
      markExportComplete(exportRequest.id, 'https://export.example.com/file.zip')

      // Step 7: Notify parent
      const readyNotification = sendExportReadyNotification(
        'parent-456',
        'https://export.example.com/file.zip'
      )
      expect(readyNotification.type).toBe('export_ready')

      // Step 8: Verify export available
      expect(isExportAvailable(exportRequest.id)).toBe(true)
    })
  })

  // ============================================
  // Consent Denial Flow Tests
  // ============================================

  describe('Consent denial flow', () => {
    it('should stop export flow when child denies consent', () => {
      // Set up eligible child
      const almostEighteen = new Date()
      almostEighteen.setDate(almostEighteen.getDate() + 15)
      const birthdate = new Date(almostEighteen)
      birthdate.setFullYear(birthdate.getFullYear() - 18)
      setChildBirthdateForTest('child-123', birthdate)

      // Parent requests export
      const exportRequest = createExportRequest('child-123', 'parent-456')

      // Child denies consent
      requestExportConsent('child-123', 'parent-456')
      denyExportConsent('child-123')

      expect(hasChildConsented('child-123')).toBe(false)

      // Export should not be generated
      const content = generateExport(exportRequest.id)
      expect(content).toBeNull()
    })
  })

  // ============================================
  // Sanitization Verification Tests (AC3, AC5)
  // ============================================

  describe('Sanitization verification (AC3, AC5)', () => {
    it('should not include screenshots in export', () => {
      // Set up child and complete consent flow
      const almostEighteen = new Date()
      almostEighteen.setDate(almostEighteen.getDate() + 10)
      const birthdate = new Date(almostEighteen)
      birthdate.setFullYear(birthdate.getFullYear() - 18)
      setChildBirthdateForTest('child-123', birthdate)

      const exportRequest = createExportRequest('child-123', 'parent-456')
      exportRequest.status = 'consent_granted'
      exportRequest.childConsentedAt = new Date()

      const content = generateExport(exportRequest.id)

      // Verify no screenshot data
      expect(content).not.toHaveProperty('screenshots')

      // Activity summaries should exist but not contain URLs
      for (const summary of content!.activitySummaries) {
        expect(summary).not.toHaveProperty('url')
        expect(summary).not.toHaveProperty('urls')
        expect(summary).not.toHaveProperty('screenshot')
      }
    })

    it('should not include flags in export', () => {
      const almostEighteen = new Date()
      almostEighteen.setDate(almostEighteen.getDate() + 10)
      const birthdate = new Date(almostEighteen)
      birthdate.setFullYear(birthdate.getFullYear() - 18)
      setChildBirthdateForTest('child-123', birthdate)

      const exportRequest = createExportRequest('child-123', 'parent-456')
      exportRequest.status = 'consent_granted'
      exportRequest.childConsentedAt = new Date()

      const content = generateExport(exportRequest.id)

      // Verify no flags data
      expect(content).not.toHaveProperty('flags')
      expect(content).not.toHaveProperty('concerningFlags')
    })
  })

  // ============================================
  // Watermark Verification Tests (AC6)
  // ============================================

  describe('Watermark verification (AC6)', () => {
    it('should include complete watermark in export', () => {
      const almostEighteen = new Date()
      almostEighteen.setDate(almostEighteen.getDate() + 10)
      const birthdate = new Date(almostEighteen)
      birthdate.setFullYear(birthdate.getFullYear() - 18)
      setChildBirthdateForTest('child-123', birthdate)

      const exportRequest = createExportRequest('child-123', 'parent-456')
      exportRequest.status = 'consent_granted'
      exportRequest.childConsentedAt = new Date()

      const content = generateExport(exportRequest.id)

      // Verify watermark structure
      expect(content!.watermark).toBeDefined()
      expect(content!.watermark.purpose).toBe(PRE18_EXPORT_PURPOSE)
      expect(content!.watermark.exportDate).toBeInstanceOf(Date)
      expect(content!.watermark.childConsent).toBe(true)
      expect(content!.watermark.watermarkId).toBeDefined()
    })
  })

  // ============================================
  // Eligibility Window Tests (AC1)
  // ============================================

  describe('Eligibility window (AC1)', () => {
    it('should only allow export within 30 days of 18', () => {
      // Child turns 18 in 40 days - not eligible
      const notYetEligible = new Date()
      notYetEligible.setDate(notYetEligible.getDate() + 40)
      const birthdate1 = new Date(notYetEligible)
      birthdate1.setFullYear(birthdate1.getFullYear() - 18)
      setChildBirthdateForTest('child-1', birthdate1)

      expect(isEligibleForPre18Export('child-1')).toBe(false)

      // Child turns 18 in 25 days - eligible
      const eligible = new Date()
      eligible.setDate(eligible.getDate() + 25)
      const birthdate2 = new Date(eligible)
      birthdate2.setFullYear(birthdate2.getFullYear() - 18)
      setChildBirthdateForTest('child-2', birthdate2)

      expect(isEligibleForPre18Export('child-2')).toBe(true)
    })

    it('should notify at exactly 30 days', () => {
      const message = getPre18ExportMessage(PRE_DELETION_NOTICE_DAYS)

      expect(message).toContain('30')
      expect(message.toLowerCase()).toContain('deleted')
    })
  })

  // ============================================
  // Multiple Request Tests
  // ============================================

  describe('Multiple export requests', () => {
    it('should allow new request after previous denial', () => {
      const almostEighteen = new Date()
      almostEighteen.setDate(almostEighteen.getDate() + 15)
      const birthdate = new Date(almostEighteen)
      birthdate.setFullYear(birthdate.getFullYear() - 18)
      setChildBirthdateForTest('child-123', birthdate)

      // First request denied
      requestExportConsent('child-123', 'parent-456')
      denyExportConsent('child-123')

      // Second request
      const newRequest = requestExportConsent('child-123', 'parent-456')
      expect(newRequest.status).toBe('pending_consent')

      // Child can grant this time
      grantExportConsent('child-123')
      expect(hasChildConsented('child-123')).toBe(true)
    })
  })

  // ============================================
  // Parent Notification Tests (AC1)
  // ============================================

  describe('Parent notification (AC1)', () => {
    it('should send notification when child approaching 18', () => {
      const daysUntil18 = 25

      const notification = sendPre18ExportAvailableNotification(
        'parent-123',
        'child-456',
        daysUntil18
      )

      expect(notification.type).toBe('pre18_export_available')
      expect(notification.daysUntil18).toBe(25)
    })

    it('should include correct message content', () => {
      const message = getPre18ExportMessage(30)

      expect(message.toLowerCase()).toContain('deleted')
      expect(message).toContain('30')
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge cases', () => {
    it('should handle child with no birthdate', () => {
      expect(isEligibleForPre18Export('child-no-birthdate')).toBe(false)
    })

    it('should handle already 18 child', () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 19)
      setChildBirthdateForTest('child-19', birthdate)

      expect(isEligibleForPre18Export('child-19')).toBe(false)
    })

    it('should handle child turning 18 today', () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 18)
      setChildBirthdateForTest('child-18-today', birthdate)

      // Should still be eligible on the day itself
      const days = getDaysUntilDataDeletion('child-18-today')
      expect(days).toBe(0)
    })
  })
})
