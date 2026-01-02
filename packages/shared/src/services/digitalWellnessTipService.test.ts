/**
 * Digital Wellness Tip Service Tests - Story 38.7 Task 3
 *
 * Tests for digital wellness tips.
 * AC1: Optional digital wellness tips available
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getWellnessTips,
  getTipsByCategory,
  getTipOfTheDay,
  saveTipPreference,
  getDismissedTips,
  dismissTip,
  getActiveTips,
  initializeDefaultTips,
  clearAllTipData,
  getTipCount,
} from './digitalWellnessTipService'
import { WELLNESS_TIP_CATEGORIES } from '../contracts/postGraduation'

describe('DigitalWellnessTipService', () => {
  beforeEach(() => {
    clearAllTipData()
    initializeDefaultTips()
  })

  // ============================================
  // Get Tips Tests (AC1)
  // ============================================

  describe('getWellnessTips (AC1)', () => {
    it('should return all wellness tips', () => {
      const tips = getWellnessTips()

      expect(tips.length).toBeGreaterThan(0)
    })

    it('should return tips with required fields', () => {
      const tips = getWellnessTips()

      for (const tip of tips) {
        expect(tip.id).toBeDefined()
        expect(tip.category).toBeDefined()
        expect(tip.title).toBeDefined()
        expect(tip.content).toBeDefined()
      }
    })

    it('should return only active tips by default', () => {
      const tips = getWellnessTips()

      for (const tip of tips) {
        expect(tip.isActive).toBe(true)
      }
    })
  })

  // ============================================
  // Tips By Category Tests (AC1)
  // ============================================

  describe('getTipsByCategory (AC1)', () => {
    it('should return tips for screen_time category', () => {
      const tips = getTipsByCategory('screen_time')

      expect(tips.length).toBeGreaterThan(0)
      for (const tip of tips) {
        expect(tip.category).toBe('screen_time')
      }
    })

    it('should return tips for digital_balance category', () => {
      const tips = getTipsByCategory('digital_balance')

      expect(tips.length).toBeGreaterThan(0)
      for (const tip of tips) {
        expect(tip.category).toBe('digital_balance')
      }
    })

    it('should return tips for online_safety category', () => {
      const tips = getTipsByCategory('online_safety')

      expect(tips.length).toBeGreaterThan(0)
      for (const tip of tips) {
        expect(tip.category).toBe('online_safety')
      }
    })

    it('should return tips for productivity category', () => {
      const tips = getTipsByCategory('productivity')

      expect(tips.length).toBeGreaterThan(0)
      for (const tip of tips) {
        expect(tip.category).toBe('productivity')
      }
    })

    it('should have tips for all categories', () => {
      for (const category of WELLNESS_TIP_CATEGORIES) {
        const tips = getTipsByCategory(category)
        expect(tips.length).toBeGreaterThan(0)
      }
    })
  })

  // ============================================
  // Tip Of The Day Tests (AC1)
  // ============================================

  describe('getTipOfTheDay (AC1)', () => {
    it('should return a tip', () => {
      const tip = getTipOfTheDay('alumni-123')

      expect(tip).not.toBeNull()
      expect(tip!.title).toBeDefined()
    })

    it('should return consistent tip for same day', () => {
      const tip1 = getTipOfTheDay('alumni-123')
      const tip2 = getTipOfTheDay('alumni-123')

      expect(tip1!.id).toBe(tip2!.id)
    })

    it('should not return dismissed tips', () => {
      const tip = getTipOfTheDay('alumni-123')
      dismissTip('alumni-123', tip!.id)

      const newTip = getTipOfTheDay('alumni-123')

      // Should get a different tip (or null if all dismissed)
      if (newTip) {
        expect(newTip.id).not.toBe(tip!.id)
      }
    })
  })

  // ============================================
  // Tip Preference Tests (AC1)
  // ============================================

  describe('saveTipPreference', () => {
    it('should save tip preference', () => {
      const result = saveTipPreference('alumni-123', 'screen_time', true)

      expect(result).toBe(true)
    })

    it('should save multiple preferences', () => {
      saveTipPreference('alumni-123', 'screen_time', true)
      saveTipPreference('alumni-123', 'digital_balance', false)

      // Both should be saved
      expect(saveTipPreference('alumni-123', 'productivity', true)).toBe(true)
    })
  })

  // ============================================
  // Dismissed Tips Tests
  // ============================================

  describe('getDismissedTips', () => {
    it('should return empty array initially', () => {
      const dismissed = getDismissedTips('alumni-123')

      expect(dismissed).toHaveLength(0)
    })

    it('should return dismissed tips', () => {
      const tips = getWellnessTips()
      dismissTip('alumni-123', tips[0].id)

      const dismissed = getDismissedTips('alumni-123')

      expect(dismissed).toHaveLength(1)
      expect(dismissed[0]).toBe(tips[0].id)
    })

    it('should accumulate dismissed tips', () => {
      const tips = getWellnessTips()
      dismissTip('alumni-123', tips[0].id)
      dismissTip('alumni-123', tips[1].id)

      const dismissed = getDismissedTips('alumni-123')

      expect(dismissed).toHaveLength(2)
    })
  })

  describe('dismissTip', () => {
    it('should mark tip as dismissed', () => {
      const tips = getWellnessTips()
      const result = dismissTip('alumni-123', tips[0].id)

      expect(result).toBe(true)
    })

    it('should not duplicate dismissed tips', () => {
      const tips = getWellnessTips()
      dismissTip('alumni-123', tips[0].id)
      dismissTip('alumni-123', tips[0].id) // Dismiss again

      const dismissed = getDismissedTips('alumni-123')
      expect(dismissed).toHaveLength(1)
    })
  })

  // ============================================
  // Active Tips Tests
  // ============================================

  describe('getActiveTips', () => {
    it('should exclude dismissed tips', () => {
      const allTips = getWellnessTips()
      dismissTip('alumni-123', allTips[0].id)

      const activeTips = getActiveTips('alumni-123')

      expect(activeTips.length).toBe(allTips.length - 1)
      expect(activeTips.find((t) => t.id === allTips[0].id)).toBeUndefined()
    })

    it('should return all tips if none dismissed', () => {
      const allTips = getWellnessTips()
      const activeTips = getActiveTips('alumni-new')

      expect(activeTips.length).toBe(allTips.length)
    })
  })

  // ============================================
  // Testing Utilities
  // ============================================

  describe('Testing Utilities', () => {
    it('should initialize default tips', () => {
      clearAllTipData()
      expect(getTipCount()).toBe(0)

      initializeDefaultTips()
      expect(getTipCount()).toBeGreaterThan(0)
    })

    it('should clear all data', () => {
      dismissTip('alumni-123', 'tip-1')

      clearAllTipData()

      expect(getDismissedTips('alumni-123')).toHaveLength(0)
    })
  })
})
