/**
 * Tests for Time Limit Warning System
 *
 * Story 31.1: Countdown Warning System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DEFAULT_WARNING_THRESHOLDS,
  determineWarningLevel,
  getWarningMessage,
  getWarningTitle,
  type WarningLevel,
  type WarningThresholds,
} from './time-limit-warnings'

describe('Time Limit Warning System - Story 31.1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DEFAULT_WARNING_THRESHOLDS', () => {
    it('has correct default values', () => {
      expect(DEFAULT_WARNING_THRESHOLDS.firstWarningMinutes).toBe(15)
      expect(DEFAULT_WARNING_THRESHOLDS.secondWarningMinutes).toBe(5)
      expect(DEFAULT_WARNING_THRESHOLDS.finalWarningMinutes).toBe(1)
      expect(DEFAULT_WARNING_THRESHOLDS.showCountdownBadge).toBe(true)
      expect(DEFAULT_WARNING_THRESHOLDS.showToastNotifications).toBe(true)
    })
  })

  describe('determineWarningLevel', () => {
    const thresholds: WarningThresholds = {
      firstWarningMinutes: 15,
      secondWarningMinutes: 5,
      finalWarningMinutes: 1,
      showCountdownBadge: true,
      showToastNotifications: true,
    }

    it('returns "none" for unlimited (null remaining)', () => {
      const result = determineWarningLevel(null, thresholds)
      expect(result).toBe('none')
    })

    it('returns "none" when more than 15 minutes remaining', () => {
      expect(determineWarningLevel(60, thresholds)).toBe('none')
      expect(determineWarningLevel(30, thresholds)).toBe('none')
      expect(determineWarningLevel(16, thresholds)).toBe('none')
    })

    it('returns "first" when 15 minutes or less remaining (AC1)', () => {
      expect(determineWarningLevel(15, thresholds)).toBe('first')
      expect(determineWarningLevel(14, thresholds)).toBe('first')
      expect(determineWarningLevel(10, thresholds)).toBe('first')
      expect(determineWarningLevel(6, thresholds)).toBe('first')
    })

    it('returns "second" when 5 minutes or less remaining (AC2)', () => {
      expect(determineWarningLevel(5, thresholds)).toBe('second')
      expect(determineWarningLevel(4, thresholds)).toBe('second')
      expect(determineWarningLevel(3, thresholds)).toBe('second')
      expect(determineWarningLevel(2, thresholds)).toBe('second')
    })

    it('returns "final" when 1 minute or less remaining (AC3)', () => {
      expect(determineWarningLevel(1, thresholds)).toBe('final')
      expect(determineWarningLevel(0.5, thresholds)).toBe('final')
    })

    it('returns "exceeded" when 0 or negative minutes remaining', () => {
      expect(determineWarningLevel(0, thresholds)).toBe('exceeded')
      expect(determineWarningLevel(-5, thresholds)).toBe('exceeded')
    })

    it('respects custom thresholds (AC6)', () => {
      const customThresholds: WarningThresholds = {
        firstWarningMinutes: 30,
        secondWarningMinutes: 10,
        finalWarningMinutes: 2,
        showCountdownBadge: true,
        showToastNotifications: true,
      }

      expect(determineWarningLevel(25, customThresholds)).toBe('first')
      expect(determineWarningLevel(8, customThresholds)).toBe('second')
      expect(determineWarningLevel(2, customThresholds)).toBe('final')
      expect(determineWarningLevel(31, customThresholds)).toBe('none')
    })
  })

  describe('getWarningMessage', () => {
    it('returns correct message for first warning (AC1)', () => {
      const message = getWarningMessage('first', 15)
      expect(message).toBe('15 minutes left')
    })

    it('returns correct message for second warning (AC2)', () => {
      const message = getWarningMessage('second', 5)
      expect(message).toBe('5 minutes left')
    })

    it('returns correct message for final warning with plural (AC3)', () => {
      const message = getWarningMessage('final', 2)
      expect(message).toBe('2 minutes - save your work')
    })

    it('returns correct message for final warning with singular', () => {
      const message = getWarningMessage('final', 1)
      expect(message).toBe('1 minute - save your work')
    })

    it('returns correct message for exceeded', () => {
      const message = getWarningMessage('exceeded', 0)
      expect(message).toBe('Screen time is up!')
    })

    it('returns empty string for none level', () => {
      const message = getWarningMessage('none', 60)
      expect(message).toBe('')
    })
  })

  describe('getWarningTitle', () => {
    it('returns correct titles for each level', () => {
      expect(getWarningTitle('first')).toBe('Screen Time Reminder')
      expect(getWarningTitle('second')).toBe('Screen Time Warning')
      expect(getWarningTitle('final')).toBe('Screen Time Almost Up')
      expect(getWarningTitle('exceeded')).toBe('Screen Time Limit Reached')
      expect(getWarningTitle('none')).toBe('Fledgely')
    })
  })

  describe('Warning progression', () => {
    const thresholds: WarningThresholds = DEFAULT_WARNING_THRESHOLDS

    it('progresses correctly from 60 minutes to 0', () => {
      const expected: Array<[number, WarningLevel]> = [
        [60, 'none'],
        [30, 'none'],
        [16, 'none'],
        [15, 'first'],
        [10, 'first'],
        [6, 'first'],
        [5, 'second'],
        [3, 'second'],
        [2, 'second'],
        [1, 'final'],
        [0.5, 'final'],
        [0, 'exceeded'],
      ]

      for (const [minutes, expectedLevel] of expected) {
        const result = determineWarningLevel(minutes, thresholds)
        expect(result).toBe(expectedLevel)
      }
    })
  })

  describe('Non-intrusive warnings (AC5)', () => {
    it('warning messages do not contain disruptive language', () => {
      const levels: WarningLevel[] = ['first', 'second', 'final']

      for (const level of levels) {
        const message = getWarningMessage(level, 5)
        // Should not contain alarming language
        expect(message).not.toMatch(/urgent/i)
        expect(message).not.toMatch(/immediately/i)
        expect(message).not.toMatch(/now!/i)
      }
    })

    it('titles are informative but not alarming', () => {
      const title = getWarningTitle('first')
      expect(title).not.toMatch(/urgent/i)
      expect(title).not.toMatch(/alert/i)
      expect(title).toBe('Screen Time Reminder')
    })
  })
})
