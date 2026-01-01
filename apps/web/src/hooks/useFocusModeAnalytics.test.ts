/**
 * useFocusModeAnalytics Hook Tests - Story 33.5
 *
 * Tests for the focus mode analytics data hook helper functions.
 */

import { describe, it, expect } from 'vitest'
import { formatFocusDuration, getDayLabel, getTimeOfDayLabel } from './useFocusModeAnalytics'

describe('useFocusModeAnalytics - Story 33.5', () => {
  describe('formatFocusDuration', () => {
    it('should format 0 minutes', () => {
      expect(formatFocusDuration(0)).toBe('0m')
    })

    it('should format minutes only', () => {
      expect(formatFocusDuration(25)).toBe('25m')
      expect(formatFocusDuration(45)).toBe('45m')
    })

    it('should format hours only', () => {
      expect(formatFocusDuration(60)).toBe('1h')
      expect(formatFocusDuration(120)).toBe('2h')
    })

    it('should format hours and minutes', () => {
      expect(formatFocusDuration(90)).toBe('1h 30m')
      expect(formatFocusDuration(75)).toBe('1h 15m')
    })

    it('should round fractional minutes', () => {
      expect(formatFocusDuration(90.6)).toBe('1h 31m')
      expect(formatFocusDuration(45.4)).toBe('45m')
    })

    it('should handle large values', () => {
      expect(formatFocusDuration(180)).toBe('3h')
      expect(formatFocusDuration(195)).toBe('3h 15m')
    })
  })

  describe('getDayLabel', () => {
    it('should return short label for sunday', () => {
      expect(getDayLabel('sunday')).toBe('Sun')
    })

    it('should return short label for monday', () => {
      expect(getDayLabel('monday')).toBe('Mon')
    })

    it('should return short label for tuesday', () => {
      expect(getDayLabel('tuesday')).toBe('Tue')
    })

    it('should return short label for wednesday', () => {
      expect(getDayLabel('wednesday')).toBe('Wed')
    })

    it('should return short label for thursday', () => {
      expect(getDayLabel('thursday')).toBe('Thu')
    })

    it('should return short label for friday', () => {
      expect(getDayLabel('friday')).toBe('Fri')
    })

    it('should return short label for saturday', () => {
      expect(getDayLabel('saturday')).toBe('Sat')
    })
  })

  describe('getTimeOfDayLabel', () => {
    it('should return label for morning', () => {
      expect(getTimeOfDayLabel('morning')).toBe('Morning (6am-12pm)')
    })

    it('should return label for afternoon', () => {
      expect(getTimeOfDayLabel('afternoon')).toBe('Afternoon (12pm-5pm)')
    })

    it('should return label for evening', () => {
      expect(getTimeOfDayLabel('evening')).toBe('Evening (5pm-9pm)')
    })

    it('should return label for night', () => {
      expect(getTimeOfDayLabel('night')).toBe('Night (9pm-6am)')
    })
  })
})
