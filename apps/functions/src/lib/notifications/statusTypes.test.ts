/**
 * Tests for status notification types
 *
 * Story 19A.4: Status Push Notifications
 */

import { describe, it, expect } from 'vitest'
import {
  isUrgentTransition,
  createTransition,
  THRESHOLDS,
  THROTTLE_DURATION_MS,
} from './statusTypes'

describe('statusTypes', () => {
  describe('isUrgentTransition', () => {
    it('should return true for transitions ending in action', () => {
      expect(isUrgentTransition('good_to_action')).toBe(true)
      expect(isUrgentTransition('attention_to_action')).toBe(true)
    })

    it('should return false for non-urgent transitions', () => {
      expect(isUrgentTransition('good_to_attention')).toBe(false)
      expect(isUrgentTransition('attention_to_good')).toBe(false)
      expect(isUrgentTransition('action_to_attention')).toBe(false)
      expect(isUrgentTransition('action_to_good')).toBe(false)
    })
  })

  describe('createTransition', () => {
    it('should create valid transition strings', () => {
      expect(createTransition('good', 'attention')).toBe('good_to_attention')
      expect(createTransition('good', 'action')).toBe('good_to_action')
      expect(createTransition('attention', 'action')).toBe('attention_to_action')
      expect(createTransition('attention', 'good')).toBe('attention_to_good')
      expect(createTransition('action', 'attention')).toBe('action_to_attention')
      expect(createTransition('action', 'good')).toBe('action_to_good')
    })

    it('should return null if no status change', () => {
      expect(createTransition('good', 'good')).toBeNull()
      expect(createTransition('attention', 'attention')).toBeNull()
      expect(createTransition('action', 'action')).toBeNull()
    })
  })

  describe('THRESHOLDS', () => {
    it('should have correct threshold values', () => {
      expect(THRESHOLDS.OFFLINE_CRITICAL_HOURS).toBe(24)
      expect(THRESHOLDS.SYNC_WARNING_MINUTES).toBe(60)
      expect(THRESHOLDS.BATTERY_WARNING_PERCENT).toBe(20)
    })
  })

  describe('THROTTLE_DURATION_MS', () => {
    it('should be 1 hour in milliseconds', () => {
      expect(THROTTLE_DURATION_MS).toBe(60 * 60 * 1000)
    })
  })
})
