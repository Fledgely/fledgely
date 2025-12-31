/**
 * Child-Friendly Language Tests - Story 19C.2
 *
 * Task 1.4: Add unit tests for translation function
 */

import { describe, it, expect } from 'vitest'
import {
  translateToChildFriendly,
  formatMonitoringForChild,
  getTermExplanation,
  validateReadingLevel,
} from './childFriendlyLanguage'

describe('translateToChildFriendly', () => {
  it('should translate "Screenshot capture interval: 5 minutes"', () => {
    const result = translateToChildFriendly('Screenshot capture interval: 5 minutes')
    expect(result).toBe('How often pictures are saved: 5 minutes')
  })

  it('should translate "Retention period: 30 days"', () => {
    const result = translateToChildFriendly('Retention period: 30 days')
    expect(result).toBe('How long pictures are kept: 30 days')
  })

  it('should translate "Screenshots are taken every 5 minutes"', () => {
    const result = translateToChildFriendly('Screenshots are taken every 5 minutes')
    expect(result).toBe('Pictures of your screen are saved every 5 minutes')
  })

  it('should translate "monitoring enabled"', () => {
    const result = translateToChildFriendly('monitoring enabled')
    expect(result).toBe('watching is turned on')
  })

  it('should translate "monitoring disabled"', () => {
    const result = translateToChildFriendly('monitoring disabled')
    expect(result).toBe('watching is turned off')
  })

  it('should preserve capitalization at start of sentence', () => {
    const result = translateToChildFriendly('Screenshots are saved')
    expect(result.charAt(0)).toBe('P')
  })

  it('should handle empty string', () => {
    const result = translateToChildFriendly('')
    expect(result).toBe('')
  })

  it('should handle text without translations', () => {
    const result = translateToChildFriendly('Hello world')
    expect(result).toBe('Hello world')
  })

  it('should handle multiple translations in one string', () => {
    const result = translateToChildFriendly(
      'Screenshot capture interval is 5 minutes, retention period is 30 days'
    )
    // Case may vary based on position - use case-insensitive check
    expect(result.toLowerCase()).toContain('how often pictures are saved')
    expect(result.toLowerCase()).toContain('how long pictures are kept')
  })
})

describe('formatMonitoringForChild', () => {
  it('should format enabled screenshots correctly', () => {
    const result = formatMonitoringForChild({
      screenshotsEnabled: true,
      captureFrequency: 'Every 5 minutes',
      retentionPeriod: '30 days',
    })

    expect(result.screenshotsDescription).toBe('Yes, pictures of your screen are being saved')
    expect(result.frequencyDescription).toBe('A picture is saved every 5 minutes')
    expect(result.retentionDescription).toBe('Pictures are kept for 30 days, then deleted')
  })

  it('should format disabled screenshots correctly', () => {
    const result = formatMonitoringForChild({
      screenshotsEnabled: false,
      captureFrequency: null,
      retentionPeriod: null,
    })

    expect(result.screenshotsDescription).toBe('No pictures are being saved right now')
    expect(result.frequencyDescription).toBe('Not saving pictures right now')
    expect(result.retentionDescription).toBe('Pictures are deleted when no longer needed')
  })

  it('should handle null frequency gracefully', () => {
    const result = formatMonitoringForChild({
      screenshotsEnabled: true,
      captureFrequency: null,
      retentionPeriod: '30 days',
    })

    expect(result.frequencyDescription).toBe('Not saving pictures right now')
  })
})

describe('getTermExplanation', () => {
  it('should return explanation for "screenshots"', () => {
    const result = getTermExplanation('screenshots')
    expect(result).toBe("Pictures of what's on your screen, like taking a photo of it.")
  })

  it('should return explanation for "monitoring"', () => {
    const result = getTermExplanation('monitoring')
    expect(result).toBe('When your parent can see what you do on your device.')
  })

  it('should return explanation for "retention"', () => {
    const result = getTermExplanation('retention')
    expect(result).toBe('How long the pictures are kept before being deleted.')
  })

  it('should be case-insensitive', () => {
    const result = getTermExplanation('Screenshots')
    expect(result).toBe("Pictures of what's on your screen, like taking a photo of it.")
  })

  it('should return null for unknown term', () => {
    const result = getTermExplanation('unknownterm')
    expect(result).toBeNull()
  })

  it('should find partial matches', () => {
    // "screenshot capture" should match "screenshots" explanation
    const result = getTermExplanation('screenshots taken')
    expect(result).not.toBeNull()
  })
})

describe('validateReadingLevel', () => {
  it('should validate simple text as appropriate', () => {
    const result = validateReadingLevel(
      'Pictures are saved every 5 minutes. They are kept for 30 days.'
    )
    expect(result.isAppropriate).toBe(true)
  })

  it('should flag complex text as inappropriate', () => {
    const result = validateReadingLevel(
      'The screenshot capturing functionality operates continuously utilizing sophisticated algorithmic processes to systematically document and preserve chronological visual representations of user interface interactions across multiple concurrent application environments.'
    )
    expect(result.isAppropriate).toBe(false)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('should handle empty text', () => {
    const result = validateReadingLevel('')
    expect(result.isAppropriate).toBe(true)
    expect(result.avgWordLength).toBe(0)
  })

  it('should calculate average word length correctly', () => {
    const result = validateReadingLevel('cat dog')
    expect(result.avgWordLength).toBe(3)
  })

  it('should suggest shorter words for complex text', () => {
    const result = validateReadingLevel(
      'Sophisticated algorithmic representations continuously systematically'
    )
    expect(result.suggestions).toContain('Use shorter, simpler words')
  })

  it('should suggest shorter sentences for long sentences', () => {
    const result = validateReadingLevel(
      'Pictures of your screen are saved by the application when you are using your device and the monitoring feature is enabled and active on your account'
    )
    expect(result.suggestions).toContain('Break long sentences into shorter ones')
  })
})
