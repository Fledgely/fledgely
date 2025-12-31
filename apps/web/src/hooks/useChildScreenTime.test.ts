/**
 * useChildScreenTime Hook Tests - Story 29.4
 *
 * Tests for the screen time data hook.
 */

import { describe, it, expect } from 'vitest'
import { formatDuration, getCategoryColor, getCategoryLabel } from './useChildScreenTime'

describe('useChildScreenTime - Story 29.4', () => {
  describe('formatDuration', () => {
    it('should format 0 minutes', () => {
      expect(formatDuration(0)).toBe('0m')
    })

    it('should format minutes only', () => {
      expect(formatDuration(45)).toBe('45m')
    })

    it('should format hours only', () => {
      expect(formatDuration(120)).toBe('2h')
    })

    it('should format hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m')
    })

    it('should round fractional minutes', () => {
      expect(formatDuration(90.6)).toBe('1h 31m')
    })

    it('should handle large values', () => {
      expect(formatDuration(480)).toBe('8h')
    })
  })

  describe('getCategoryColor', () => {
    it('should return green for education', () => {
      expect(getCategoryColor('education')).toBe('#16a34a')
    })

    it('should return blue for productivity', () => {
      expect(getCategoryColor('productivity')).toBe('#3b82f6')
    })

    it('should return amber for entertainment', () => {
      expect(getCategoryColor('entertainment')).toBe('#d97706')
    })

    it('should return pink for social_media', () => {
      expect(getCategoryColor('social_media')).toBe('#ec4899')
    })

    it('should return purple for gaming', () => {
      expect(getCategoryColor('gaming')).toBe('#8b5cf6')
    })

    it('should return cyan for communication', () => {
      expect(getCategoryColor('communication')).toBe('#0891b2')
    })

    it('should return indigo for news', () => {
      expect(getCategoryColor('news')).toBe('#6366f1')
    })

    it('should return teal for shopping', () => {
      expect(getCategoryColor('shopping')).toBe('#0d9488')
    })

    it('should return gray for other', () => {
      expect(getCategoryColor('other')).toBe('#6b7280')
    })

    it('should return gray for unknown category', () => {
      expect(getCategoryColor('unknown_category' as 'other')).toBe('#6b7280')
    })
  })

  describe('getCategoryLabel', () => {
    it('should return label for education', () => {
      expect(getCategoryLabel('education')).toBe('Education')
    })

    it('should return label for productivity', () => {
      expect(getCategoryLabel('productivity')).toBe('Productivity')
    })

    it('should return label for entertainment', () => {
      expect(getCategoryLabel('entertainment')).toBe('Entertainment')
    })

    it('should return label for social_media', () => {
      expect(getCategoryLabel('social_media')).toBe('Social Media')
    })

    it('should return label for gaming', () => {
      expect(getCategoryLabel('gaming')).toBe('Gaming')
    })

    it('should return label for communication', () => {
      expect(getCategoryLabel('communication')).toBe('Communication')
    })

    it('should return label for news', () => {
      expect(getCategoryLabel('news')).toBe('News')
    })

    it('should return label for shopping', () => {
      expect(getCategoryLabel('shopping')).toBe('Shopping')
    })

    it('should return label for other', () => {
      expect(getCategoryLabel('other')).toBe('Other')
    })

    it('should return Other for unknown category', () => {
      expect(getCategoryLabel('unknown_category' as 'other')).toBe('Other')
    })
  })
})
