/**
 * Graduation Certificate Service Tests - Story 38.3 Task 6
 *
 * Tests for generating graduation certificates.
 * AC7: Graduation certificate/record generated for family
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateCertificate,
  getCertificate,
  getCertificateDisplayData,
  getCertificateForChild,
  validateCertificate,
  getAllCertificates,
  clearAllCertificateData,
} from './graduationCertificateService'

describe('GraduationCertificateService', () => {
  beforeEach(() => {
    clearAllCertificateData()
  })

  // ============================================
  // generateCertificate Tests
  // ============================================

  describe('generateCertificate', () => {
    it('should generate certificate with correct data', () => {
      const cert = generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      expect(cert.id).toBeDefined()
      expect(cert.childId).toBe('child-456')
      expect(cert.familyId).toBe('family-789')
      expect(cert.childName).toBe('Alex')
      expect(cert.monthsAtPerfectTrust).toBe(12)
      expect(cert.totalMonitoringDuration).toBe(24)
    })

    it('should set generatedAt to current time', () => {
      const beforeGenerate = Date.now()

      const cert = generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      const afterGenerate = Date.now()

      expect(cert.generatedAt.getTime()).toBeGreaterThanOrEqual(beforeGenerate)
      expect(cert.generatedAt.getTime()).toBeLessThanOrEqual(afterGenerate)
    })

    it('should generate unique IDs', () => {
      const cert1 = generateCertificate('child-1', 'family-1', 'Alex', {
        graduationDate: new Date(),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      const cert2 = generateCertificate('child-2', 'family-2', 'Jordan', {
        graduationDate: new Date(),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      expect(cert1.id).not.toBe(cert2.id)
    })
  })

  // ============================================
  // getCertificate Tests
  // ============================================

  describe('getCertificate', () => {
    it('should return certificate by ID', () => {
      const cert = generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      const found = getCertificate(cert.id)
      expect(found).not.toBeNull()
      expect(found?.id).toBe(cert.id)
      expect(found?.childName).toBe('Alex')
    })

    it('should return null for non-existent certificate', () => {
      const found = getCertificate('nonexistent-cert')
      expect(found).toBeNull()
    })
  })

  // ============================================
  // getCertificateDisplayData Tests
  // ============================================

  describe('getCertificateDisplayData', () => {
    it('should return formatted display data', () => {
      const cert = generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      const displayData = getCertificateDisplayData(cert)

      expect(displayData.title).toBeDefined()
      expect(displayData.childName).toBe('Alex')
      expect(displayData.dateFormatted).toBeDefined()
      expect(displayData.achievementText).toBeDefined()
      expect(displayData.journeyText).toBeDefined()
    })

    it('should format date correctly', () => {
      const cert = generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      const displayData = getCertificateDisplayData(cert)

      expect(displayData.dateFormatted).toContain('June')
      expect(displayData.dateFormatted).toContain('15')
      expect(displayData.dateFormatted).toContain('2025')
    })

    it('should include months in achievement text', () => {
      const cert = generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      const displayData = getCertificateDisplayData(cert)

      expect(displayData.achievementText).toContain('12')
    })
  })

  // ============================================
  // getCertificateForChild Tests
  // ============================================

  describe('getCertificateForChild', () => {
    it('should return certificate for child', () => {
      generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      const cert = getCertificateForChild('child-456')
      expect(cert).not.toBeNull()
      expect(cert?.childId).toBe('child-456')
    })

    it('should return null for child without certificate', () => {
      const cert = getCertificateForChild('unknown-child')
      expect(cert).toBeNull()
    })

    it('should return the most recent certificate if multiple exist', () => {
      generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2024-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 15,
        totalMonitoringDuration: 30,
      })

      const cert = getCertificateForChild('child-456')
      expect(cert?.monthsAtPerfectTrust).toBe(15)
    })
  })

  // ============================================
  // validateCertificate Tests
  // ============================================

  describe('validateCertificate', () => {
    it('should return true for valid certificate', () => {
      const cert = generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      expect(validateCertificate(cert.id)).toBe(true)
    })

    it('should return false for non-existent certificate', () => {
      expect(validateCertificate('fake-cert-id')).toBe(false)
    })
  })

  // ============================================
  // getAllCertificates Tests
  // ============================================

  describe('getAllCertificates', () => {
    it('should return all certificates', () => {
      generateCertificate('child-1', 'family-1', 'Alex', {
        graduationDate: new Date(),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      generateCertificate('child-2', 'family-2', 'Jordan', {
        graduationDate: new Date(),
        monthsAtPerfectTrust: 15,
        totalMonitoringDuration: 30,
      })

      const all = getAllCertificates()
      expect(all).toHaveLength(2)
    })

    it('should return empty array when no certificates exist', () => {
      const all = getAllCertificates()
      expect(all).toHaveLength(0)
    })
  })
})
