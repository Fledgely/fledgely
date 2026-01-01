/**
 * Expiry Service Tests - Story 35.1
 *
 * Tests for calculating and validating expiry dates.
 * AC1: Expiry options (3 months, 6 months, 1 year, no expiry)
 * AC2: Age-based recommendations
 * AC4: Annual review for no-expiry
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getExpiryConfig,
  validateExpiryDate,
  formatExpiryStatus,
  getExpiryWarningLevel,
  calculateNextReviewDate,
  getExpiryRecommendation,
} from './expiryService'

describe('Expiry Service - Story 35.1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getExpiryConfig (AC1)', () => {
    it('should return config for 3-months', () => {
      const config = getExpiryConfig('3-months')

      expect(config.id).toBe('3-months')
      expect(config.months).toBe(3)
    })

    it('should return config for 6-months', () => {
      const config = getExpiryConfig('6-months')

      expect(config.id).toBe('6-months')
      expect(config.months).toBe(6)
    })

    it('should return config for 1-year', () => {
      const config = getExpiryConfig('1-year')

      expect(config.id).toBe('1-year')
      expect(config.months).toBe(12)
    })

    it('should return config for no-expiry', () => {
      const config = getExpiryConfig('no-expiry')

      expect(config.id).toBe('no-expiry')
      expect(config.months).toBeNull()
    })
  })

  describe('validateExpiryDate', () => {
    it('should validate a future date', () => {
      const futureDate = new Date('2024-12-01')
      const result = validateExpiryDate(futureDate)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject a past date', () => {
      const pastDate = new Date('2024-01-01')
      const result = validateExpiryDate(pastDate)

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject today as expiry date', () => {
      const today = new Date('2024-06-01')
      const result = validateExpiryDate(today)

      expect(result.valid).toBe(false)
    })

    it('should allow null for no-expiry', () => {
      const result = validateExpiryDate(null)

      expect(result.valid).toBe(true)
    })
  })

  describe('formatExpiryStatus', () => {
    it('should format active agreement status', () => {
      const expiryDate = new Date('2024-12-01')
      const status = formatExpiryStatus(expiryDate)

      expect(status).toContain('Dec')
      expect(status).toContain('2024')
    })

    it('should indicate expiring soon', () => {
      const expiryDate = new Date('2024-06-15') // 14 days away
      const status = formatExpiryStatus(expiryDate)

      expect(status.toLowerCase()).toContain('soon')
    })

    it('should indicate expired', () => {
      const expiryDate = new Date('2024-05-01')
      const status = formatExpiryStatus(expiryDate)

      expect(status.toLowerCase()).toContain('expired')
    })

    it('should handle no expiry', () => {
      const status = formatExpiryStatus(null)

      expect(status.toLowerCase()).toContain('no expiry')
    })
  })

  describe('getExpiryWarningLevel', () => {
    it('should return none for far future dates', () => {
      const expiryDate = new Date('2024-12-01')
      const level = getExpiryWarningLevel(expiryDate)

      expect(level).toBe('none')
    })

    it('should return warning for dates within 30 days', () => {
      const expiryDate = new Date('2024-06-20')
      const level = getExpiryWarningLevel(expiryDate)

      expect(level).toBe('warning')
    })

    it('should return critical for dates within 7 days', () => {
      const expiryDate = new Date('2024-06-05')
      const level = getExpiryWarningLevel(expiryDate)

      expect(level).toBe('critical')
    })

    it('should return expired for past dates', () => {
      const expiryDate = new Date('2024-05-01')
      const level = getExpiryWarningLevel(expiryDate)

      expect(level).toBe('expired')
    })

    it('should return none for null expiry', () => {
      const level = getExpiryWarningLevel(null)

      expect(level).toBe('none')
    })
  })

  describe('calculateNextReviewDate (AC4)', () => {
    it('should calculate review date 1 year from start', () => {
      const startDate = new Date('2024-06-01')
      const reviewDate = calculateNextReviewDate(startDate)

      expect(reviewDate.getFullYear()).toBe(2025)
      expect(reviewDate.getMonth()).toBe(5) // June
    })

    it('should use current date if no start date provided', () => {
      const reviewDate = calculateNextReviewDate()

      expect(reviewDate.getFullYear()).toBe(2025)
    })
  })

  describe('getExpiryRecommendation (AC2)', () => {
    it('should recommend 6 months for children under 13', () => {
      const recommendation = getExpiryRecommendation(10)

      expect(recommendation.duration).toBe('6-months')
      expect(recommendation.reason).toContain('younger')
    })

    it('should recommend 1 year for teens 13+', () => {
      const recommendation = getExpiryRecommendation(15)

      expect(recommendation.duration).toBe('1-year')
      expect(recommendation.reason).toContain('teen')
    })

    it('should handle edge case at 13', () => {
      const recommendation = getExpiryRecommendation(13)

      expect(recommendation.duration).toBe('1-year')
    })
  })
})
