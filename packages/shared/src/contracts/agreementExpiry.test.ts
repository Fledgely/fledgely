/**
 * Agreement Expiry Types and Constants Tests - Story 35.1
 *
 * Tests for agreement expiry configuration types and constants.
 * AC1: Expiry options (3 months, 6 months, 1 year, no expiry)
 * AC2: Age-based recommendations
 */

import { describe, it, expect } from 'vitest'
import {
  expiryDurationSchema,
  EXPIRY_DURATIONS,
  EXPIRY_DURATION_LABELS,
  EXPIRY_MESSAGES,
  getRecommendedExpiry,
  calculateExpiryDate,
  isExpiringSoon,
  getDaysUntilExpiry,
  getAnnualReviewDate,
} from './agreementExpiry'

describe('Agreement Expiry Types - Story 35.1', () => {
  describe('expiryDurationSchema', () => {
    it('should validate "3-months" duration', () => {
      const result = expiryDurationSchema.safeParse('3-months')
      expect(result.success).toBe(true)
    })

    it('should validate "6-months" duration', () => {
      const result = expiryDurationSchema.safeParse('6-months')
      expect(result.success).toBe(true)
    })

    it('should validate "1-year" duration', () => {
      const result = expiryDurationSchema.safeParse('1-year')
      expect(result.success).toBe(true)
    })

    it('should validate "no-expiry" duration', () => {
      const result = expiryDurationSchema.safeParse('no-expiry')
      expect(result.success).toBe(true)
    })

    it('should reject invalid durations', () => {
      const result = expiryDurationSchema.safeParse('2-months')
      expect(result.success).toBe(false)
    })
  })

  describe('EXPIRY_DURATIONS (AC1)', () => {
    it('should have 4 duration options', () => {
      expect(EXPIRY_DURATIONS).toHaveLength(4)
    })

    it('should include 3 months option', () => {
      const threeMonths = EXPIRY_DURATIONS.find((d) => d.id === '3-months')
      expect(threeMonths).toBeDefined()
      expect(threeMonths?.months).toBe(3)
    })

    it('should include 6 months option', () => {
      const sixMonths = EXPIRY_DURATIONS.find((d) => d.id === '6-months')
      expect(sixMonths).toBeDefined()
      expect(sixMonths?.months).toBe(6)
    })

    it('should include 1 year option', () => {
      const oneYear = EXPIRY_DURATIONS.find((d) => d.id === '1-year')
      expect(oneYear).toBeDefined()
      expect(oneYear?.months).toBe(12)
    })

    it('should include no expiry option', () => {
      const noExpiry = EXPIRY_DURATIONS.find((d) => d.id === 'no-expiry')
      expect(noExpiry).toBeDefined()
      expect(noExpiry?.months).toBeNull()
    })
  })

  describe('EXPIRY_DURATION_LABELS', () => {
    it('should have label for each duration', () => {
      expect(EXPIRY_DURATION_LABELS['3-months']).toBeDefined()
      expect(EXPIRY_DURATION_LABELS['6-months']).toBeDefined()
      expect(EXPIRY_DURATION_LABELS['1-year']).toBeDefined()
      expect(EXPIRY_DURATION_LABELS['no-expiry']).toBeDefined()
    })

    it('should have readable labels', () => {
      expect(EXPIRY_DURATION_LABELS['3-months']).toContain('3')
      expect(EXPIRY_DURATION_LABELS['6-months']).toContain('6')
      expect(EXPIRY_DURATION_LABELS['1-year']).toContain('year')
      expect(EXPIRY_DURATION_LABELS['no-expiry'].toLowerCase()).toContain('no')
    })
  })

  describe('EXPIRY_MESSAGES', () => {
    it('should have selector messages', () => {
      expect(EXPIRY_MESSAGES.selector.header).toBeDefined()
      expect(EXPIRY_MESSAGES.selector.description).toBeDefined()
    })

    it('should have recommendation messages (AC2)', () => {
      expect(EXPIRY_MESSAGES.recommendations.youngerChildren).toBeDefined()
      expect(EXPIRY_MESSAGES.recommendations.teens).toBeDefined()
    })

    it('should have display messages', () => {
      expect(EXPIRY_MESSAGES.display.expiresOn).toBeDefined()
      expect(EXPIRY_MESSAGES.display.noExpiry).toBeDefined()
    })

    it('should have annual review message (AC4)', () => {
      expect(EXPIRY_MESSAGES.annualReview).toBeDefined()
    })
  })

  describe('getRecommendedExpiry (AC2)', () => {
    it('should recommend 6 months for children under 13', () => {
      expect(getRecommendedExpiry(10)).toBe('6-months')
      expect(getRecommendedExpiry(12)).toBe('6-months')
    })

    it('should recommend 1 year for teens 13+', () => {
      expect(getRecommendedExpiry(13)).toBe('1-year')
      expect(getRecommendedExpiry(16)).toBe('1-year')
      expect(getRecommendedExpiry(17)).toBe('1-year')
    })

    it('should handle edge case at 13', () => {
      expect(getRecommendedExpiry(13)).toBe('1-year')
    })
  })

  describe('calculateExpiryDate', () => {
    it('should calculate date 3 months from start', () => {
      const startDate = new Date('2024-01-01')
      const expiryDate = calculateExpiryDate('3-months', startDate)

      expect(expiryDate?.getMonth()).toBe(3) // April (0-indexed)
      expect(expiryDate?.getFullYear()).toBe(2024)
    })

    it('should calculate date 6 months from start', () => {
      const startDate = new Date('2024-01-01')
      const expiryDate = calculateExpiryDate('6-months', startDate)

      expect(expiryDate?.getMonth()).toBe(6) // July
      expect(expiryDate?.getFullYear()).toBe(2024)
    })

    it('should calculate date 1 year from start', () => {
      const startDate = new Date('2024-01-01')
      const expiryDate = calculateExpiryDate('1-year', startDate)

      expect(expiryDate?.getMonth()).toBe(0) // January
      expect(expiryDate?.getFullYear()).toBe(2025)
    })

    it('should return null for no-expiry', () => {
      const startDate = new Date('2024-01-01')
      const expiryDate = calculateExpiryDate('no-expiry', startDate)

      expect(expiryDate).toBeNull()
    })

    it('should use current date if no start date provided', () => {
      const expiryDate = calculateExpiryDate('3-months')

      expect(expiryDate).toBeDefined()
      expect(expiryDate).toBeInstanceOf(Date)
    })
  })

  describe('isExpiringSoon', () => {
    it('should return true when expiry is within 30 days', () => {
      const now = new Date()
      const expiry = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 days

      expect(isExpiringSoon(expiry)).toBe(true)
    })

    it('should return false when expiry is more than 30 days away', () => {
      const now = new Date()
      const expiry = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) // 60 days

      expect(isExpiringSoon(expiry)).toBe(false)
    })

    it('should return true for custom threshold', () => {
      const now = new Date()
      const expiry = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days

      expect(isExpiringSoon(expiry, 7)).toBe(true)
    })

    it('should return false for null expiry', () => {
      expect(isExpiringSoon(null)).toBe(false)
    })
  })

  describe('getDaysUntilExpiry', () => {
    it('should return correct days remaining', () => {
      const now = new Date()
      const expiry = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) // 10 days

      const days = getDaysUntilExpiry(expiry)
      expect(days).toBeGreaterThanOrEqual(9)
      expect(days).toBeLessThanOrEqual(10)
    })

    it('should return negative for past dates', () => {
      const now = new Date()
      const expiry = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago

      const days = getDaysUntilExpiry(expiry)
      expect(days).toBeLessThan(0)
    })

    it('should return null for null expiry', () => {
      expect(getDaysUntilExpiry(null)).toBeNull()
    })
  })

  describe('getAnnualReviewDate (AC4)', () => {
    it('should return date 1 year from start for no-expiry', () => {
      const startDate = new Date('2024-01-15')
      const reviewDate = getAnnualReviewDate(startDate)

      expect(reviewDate.getFullYear()).toBe(2025)
      expect(reviewDate.getMonth()).toBe(0) // January
      expect(reviewDate.getDate()).toBe(15)
    })

    it('should use current date if no start date provided', () => {
      const reviewDate = getAnnualReviewDate()

      expect(reviewDate).toBeInstanceOf(Date)
      expect(reviewDate.getFullYear()).toBe(new Date().getFullYear() + 1)
    })
  })
})
