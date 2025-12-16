/**
 * Tests for Term Utilities
 *
 * Story 5.2: Visual Agreement Builder - Task 2.5
 */

import { describe, it, expect } from 'vitest'
import type { SessionTermType, SessionTermStatus, SessionContributor } from '@fledgely/contracts'
import {
  TERM_CATEGORY_COLORS,
  getTermCategoryColors,
  getTermCardClasses,
  TERM_CATEGORY_ICONS,
  getTermCategoryIcon,
  TERM_TYPE_LABELS,
  getTermTypeLabel,
  TERM_EXPLANATIONS,
  getTermExplanation,
  TERM_STATUS_STYLES,
  getTermStatusStyle,
  CONTRIBUTOR_STYLES,
  getContributorStyle,
  formatTermContentPreview,
} from '../termUtils'

// ============================================
// CATEGORY COLORS TESTS
// ============================================

describe('getTermCategoryColors', () => {
  const termTypes: SessionTermType[] = [
    'screen_time',
    'bedtime',
    'monitoring',
    'rule',
    'consequence',
    'reward',
  ]

  it.each(termTypes)('returns color config for %s term type', (type) => {
    const colors = getTermCategoryColors(type)

    expect(colors).toBeDefined()
    expect(colors).toHaveProperty('bg')
    expect(colors).toHaveProperty('border')
    expect(colors).toHaveProperty('text')
    expect(colors).toHaveProperty('icon')
    expect(colors).toHaveProperty('hoverBg')
  })

  it('returns blue colors for screen_time', () => {
    const colors = getTermCategoryColors('screen_time')
    expect(colors.bg).toContain('blue')
    expect(colors.border).toContain('blue')
    expect(colors.text).toContain('blue')
  })

  it('returns purple colors for bedtime', () => {
    const colors = getTermCategoryColors('bedtime')
    expect(colors.bg).toContain('purple')
    expect(colors.border).toContain('purple')
    expect(colors.text).toContain('purple')
  })

  it('returns amber colors for monitoring', () => {
    const colors = getTermCategoryColors('monitoring')
    expect(colors.bg).toContain('amber')
    expect(colors.border).toContain('amber')
    expect(colors.text).toContain('amber')
  })

  it('returns green colors for rule', () => {
    const colors = getTermCategoryColors('rule')
    expect(colors.bg).toContain('green')
    expect(colors.border).toContain('green')
    expect(colors.text).toContain('green')
  })

  it('returns red colors for consequence', () => {
    const colors = getTermCategoryColors('consequence')
    expect(colors.bg).toContain('red')
    expect(colors.border).toContain('red')
    expect(colors.text).toContain('red')
  })

  it('returns emerald colors for reward', () => {
    const colors = getTermCategoryColors('reward')
    expect(colors.bg).toContain('emerald')
    expect(colors.border).toContain('emerald')
    expect(colors.text).toContain('emerald')
  })
})

describe('getTermCardClasses', () => {
  it('returns combined card classes for term type', () => {
    const classes = getTermCardClasses('screen_time')

    expect(classes).toContain('bg-blue')
    expect(classes).toContain('border-blue')
    expect(classes).toContain('hover:bg-blue')
    expect(classes).toContain('border-l-4')
  })

  it('includes all required class parts for each type', () => {
    const types: SessionTermType[] = ['screen_time', 'bedtime', 'monitoring', 'rule', 'consequence', 'reward']

    types.forEach(type => {
      const classes = getTermCardClasses(type)
      expect(classes).toContain('border-l-4')
      expect(classes).toMatch(/bg-/)
      expect(classes).toMatch(/border-/)
      expect(classes).toMatch(/hover:bg-/)
    })
  })
})

describe('TERM_CATEGORY_COLORS constant', () => {
  it('has entries for all 6 term types', () => {
    expect(Object.keys(TERM_CATEGORY_COLORS)).toHaveLength(6)
    expect(TERM_CATEGORY_COLORS).toHaveProperty('screen_time')
    expect(TERM_CATEGORY_COLORS).toHaveProperty('bedtime')
    expect(TERM_CATEGORY_COLORS).toHaveProperty('monitoring')
    expect(TERM_CATEGORY_COLORS).toHaveProperty('rule')
    expect(TERM_CATEGORY_COLORS).toHaveProperty('consequence')
    expect(TERM_CATEGORY_COLORS).toHaveProperty('reward')
  })
})

// ============================================
// CATEGORY ICONS TESTS
// ============================================

describe('getTermCategoryIcon', () => {
  it.each(['screen_time', 'bedtime', 'monitoring', 'rule', 'consequence', 'reward'] as SessionTermType[])(
    'returns SVG path for %s',
    (type) => {
      const path = getTermCategoryIcon(type)
      expect(path).toBeDefined()
      expect(typeof path).toBe('string')
      expect(path.length).toBeGreaterThan(0)
    }
  )

  it('returns valid SVG path data', () => {
    const path = getTermCategoryIcon('screen_time')
    // SVG paths typically start with M (moveto)
    expect(path).toMatch(/^M|m/)
  })
})

describe('TERM_CATEGORY_ICONS constant', () => {
  it('has entries for all 6 term types', () => {
    expect(Object.keys(TERM_CATEGORY_ICONS)).toHaveLength(6)
  })

  it('all paths are non-empty strings', () => {
    Object.values(TERM_CATEGORY_ICONS).forEach(path => {
      expect(typeof path).toBe('string')
      expect(path.length).toBeGreaterThan(10)
    })
  })
})

// ============================================
// TERM TYPE LABELS TESTS
// ============================================

describe('getTermTypeLabel', () => {
  it('returns "Screen Time" for screen_time', () => {
    expect(getTermTypeLabel('screen_time')).toBe('Screen Time')
  })

  it('returns "Bedtime" for bedtime', () => {
    expect(getTermTypeLabel('bedtime')).toBe('Bedtime')
  })

  it('returns "Monitoring" for monitoring', () => {
    expect(getTermTypeLabel('monitoring')).toBe('Monitoring')
  })

  it('returns "Rule" for rule', () => {
    expect(getTermTypeLabel('rule')).toBe('Rule')
  })

  it('returns "Consequence" for consequence', () => {
    expect(getTermTypeLabel('consequence')).toBe('Consequence')
  })

  it('returns "Reward" for reward', () => {
    expect(getTermTypeLabel('reward')).toBe('Reward')
  })
})

describe('TERM_TYPE_LABELS constant', () => {
  it('has human-readable labels for all types', () => {
    expect(Object.keys(TERM_TYPE_LABELS)).toHaveLength(6)
    Object.values(TERM_TYPE_LABELS).forEach(label => {
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
      // Labels should be capitalized
      expect(label[0]).toBe(label[0].toUpperCase())
    })
  })
})

// ============================================
// CHILD-FRIENDLY EXPLANATIONS TESTS
// ============================================

describe('getTermExplanation', () => {
  it('returns child-friendly explanation for screen_time', () => {
    const explanation = getTermExplanation('screen_time')
    expect(explanation).toBe('How much time you can use screens each day')
  })

  it('returns child-friendly explanation for bedtime', () => {
    const explanation = getTermExplanation('bedtime')
    expect(explanation).toBe('When devices need to be put away for the night')
  })

  it('returns child-friendly explanation for monitoring', () => {
    const explanation = getTermExplanation('monitoring')
    expect(explanation).toBe('How your parents can see what you are doing online')
  })

  it('returns child-friendly explanation for rule', () => {
    const explanation = getTermExplanation('rule')
    expect(explanation).toBe('An agreement about how you will use technology')
  })

  it('returns child-friendly explanation for consequence', () => {
    const explanation = getTermExplanation('consequence')
    expect(explanation).toBe('What happens if the agreement is not followed')
  })

  it('returns child-friendly explanation for reward', () => {
    const explanation = getTermExplanation('reward')
    expect(explanation).toBe('Something good that happens when you follow the agreement')
  })
})

describe('TERM_EXPLANATIONS constant', () => {
  it('all explanations use simple language (6th-grade level)', () => {
    Object.values(TERM_EXPLANATIONS).forEach(explanation => {
      // Check for simple sentence structure (no complex vocabulary)
      expect(explanation.length).toBeLessThan(80)
      // Should not contain complex words
      expect(explanation).not.toMatch(/surveillance|regulation|stipulation|provisions/)
    })
  })
})

// ============================================
// TERM STATUS STYLING TESTS
// ============================================

describe('getTermStatusStyle', () => {
  const statuses: SessionTermStatus[] = ['accepted', 'discussion', 'removed']

  it.each(statuses)('returns style config for %s status', (status) => {
    const style = getTermStatusStyle(status)

    expect(style).toBeDefined()
    expect(style).toHaveProperty('bg')
    expect(style).toHaveProperty('text')
    expect(style).toHaveProperty('border')
    expect(style).toHaveProperty('label')
  })

  it('returns green styling for accepted', () => {
    const style = getTermStatusStyle('accepted')
    expect(style.bg).toContain('green')
    expect(style.label).toBe('Accepted')
  })

  it('returns yellow styling for discussion', () => {
    const style = getTermStatusStyle('discussion')
    expect(style.bg).toContain('yellow')
    expect(style.label).toBe('Needs Discussion')
  })

  it('returns gray styling for removed', () => {
    const style = getTermStatusStyle('removed')
    expect(style.bg).toContain('gray')
    expect(style.label).toBe('Removed')
  })
})

describe('TERM_STATUS_STYLES constant', () => {
  it('has entries for all 3 status values', () => {
    expect(Object.keys(TERM_STATUS_STYLES)).toHaveLength(3)
    expect(TERM_STATUS_STYLES).toHaveProperty('accepted')
    expect(TERM_STATUS_STYLES).toHaveProperty('discussion')
    expect(TERM_STATUS_STYLES).toHaveProperty('removed')
  })
})

// ============================================
// CONTRIBUTOR ATTRIBUTION TESTS
// ============================================

describe('getContributorStyle', () => {
  const contributors: SessionContributor[] = ['parent', 'child']

  it.each(contributors)('returns style config for %s contributor', (contributor) => {
    const style = getContributorStyle(contributor)

    expect(style).toBeDefined()
    expect(style).toHaveProperty('bg')
    expect(style).toHaveProperty('text')
    expect(style).toHaveProperty('border')
    expect(style).toHaveProperty('label')
    expect(style).toHaveProperty('icon')
  })

  it('returns indigo styling for parent', () => {
    const style = getContributorStyle('parent')
    expect(style.bg).toContain('indigo')
    expect(style.label).toBe('Parent suggested')
    expect(style.icon).toBe('P')
  })

  it('returns pink styling for child', () => {
    const style = getContributorStyle('child')
    expect(style.bg).toContain('pink')
    expect(style.label).toBe('Child suggested')
    expect(style.icon).toBe('C')
  })
})

describe('CONTRIBUTOR_STYLES constant', () => {
  it('has entries for both contributor types', () => {
    expect(Object.keys(CONTRIBUTOR_STYLES)).toHaveLength(2)
    expect(CONTRIBUTOR_STYLES).toHaveProperty('parent')
    expect(CONTRIBUTOR_STYLES).toHaveProperty('child')
  })
})

// ============================================
// CONTENT PREVIEW FORMATTING TESTS
// ============================================

describe('formatTermContentPreview', () => {
  describe('screen_time formatting', () => {
    it('formats minutes under 60', () => {
      const preview = formatTermContentPreview('screen_time', { minutes: 45 })
      expect(preview).toBe('45 minutes per day')
    })

    it('formats exactly 60 minutes as 1 hour', () => {
      const preview = formatTermContentPreview('screen_time', { minutes: 60 })
      expect(preview).toBe('1 hour per day')
    })

    it('formats multiple hours', () => {
      const preview = formatTermContentPreview('screen_time', { minutes: 120 })
      expect(preview).toBe('2 hours per day')
    })

    it('formats hours with remaining minutes', () => {
      const preview = formatTermContentPreview('screen_time', { minutes: 90 })
      expect(preview).toBe('1 hour 30 min')
    })

    it('returns default text when no minutes provided', () => {
      const preview = formatTermContentPreview('screen_time', {})
      expect(preview).toBe('Screen time limit')
    })
  })

  describe('bedtime formatting', () => {
    it('formats 24-hour time to 12-hour format', () => {
      const preview = formatTermContentPreview('bedtime', { time: '20:00' })
      expect(preview).toBe('Devices off at 8:00 PM')
    })

    it('formats AM times correctly', () => {
      const preview = formatTermContentPreview('bedtime', { time: '09:30' })
      expect(preview).toBe('Devices off at 9:30 AM')
    })

    it('handles noon correctly', () => {
      const preview = formatTermContentPreview('bedtime', { time: '12:00' })
      expect(preview).toBe('Devices off at 12:00 PM')
    })

    it('returns default text when no time provided', () => {
      const preview = formatTermContentPreview('bedtime', {})
      expect(preview).toBe('Device bedtime')
    })
  })

  describe('monitoring formatting', () => {
    it('formats light monitoring level', () => {
      const preview = formatTermContentPreview('monitoring', { level: 'light' })
      expect(preview).toBe('Light monitoring')
    })

    it('formats moderate monitoring level', () => {
      const preview = formatTermContentPreview('monitoring', { level: 'moderate' })
      expect(preview).toBe('Regular check-ins')
    })

    it('formats comprehensive monitoring level', () => {
      const preview = formatTermContentPreview('monitoring', { level: 'comprehensive' })
      expect(preview).toBe('Close monitoring')
    })

    it('handles unknown monitoring level', () => {
      const preview = formatTermContentPreview('monitoring', { level: 'custom' })
      expect(preview).toBe('custom monitoring')
    })

    it('returns default text when no level provided', () => {
      const preview = formatTermContentPreview('monitoring', {})
      expect(preview).toBe('Monitoring settings')
    })
  })

  describe('rule formatting', () => {
    it('displays short rule text', () => {
      const preview = formatTermContentPreview('rule', { text: 'No phones at dinner' })
      expect(preview).toBe('No phones at dinner')
    })

    it('truncates long rule text', () => {
      const longText = 'This is a very long rule that explains many different things about using devices and should be truncated'
      const preview = formatTermContentPreview('rule', { text: longText })
      expect(preview.length).toBeLessThanOrEqual(50)
      expect(preview).toContain('...')
    })

    it('returns default text when no rule text provided', () => {
      const preview = formatTermContentPreview('rule', {})
      expect(preview).toBe('Custom rule')
    })
  })

  describe('consequence formatting', () => {
    it('displays consequence text', () => {
      const preview = formatTermContentPreview('consequence', { text: 'Device taken for 1 hour' })
      expect(preview).toBe('Device taken for 1 hour')
    })

    it('truncates long consequence text', () => {
      const longText = 'If the agreement is broken, the device will be taken away for an extended period of time'
      const preview = formatTermContentPreview('consequence', { text: longText })
      expect(preview.length).toBeLessThanOrEqual(50)
      expect(preview).toContain('...')
    })

    it('returns default text when no consequence text provided', () => {
      const preview = formatTermContentPreview('consequence', {})
      expect(preview).toBe('Consequence')
    })
  })

  describe('reward formatting', () => {
    it('displays reward text', () => {
      const preview = formatTermContentPreview('reward', { text: 'Extra 30 minutes on weekends' })
      expect(preview).toBe('Extra 30 minutes on weekends')
    })

    it('truncates long reward text', () => {
      const longText = 'If you follow all the rules for a whole week, you get to pick a new game to download'
      const preview = formatTermContentPreview('reward', { text: longText })
      expect(preview.length).toBeLessThanOrEqual(50)
      expect(preview).toContain('...')
    })

    it('returns default text when no reward text provided', () => {
      const preview = formatTermContentPreview('reward', {})
      expect(preview).toBe('Reward')
    })
  })
})
