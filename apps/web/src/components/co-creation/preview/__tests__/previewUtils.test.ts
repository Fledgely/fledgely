/**
 * Tests for Preview Utilities
 *
 * Story 5.5: Agreement Preview & Summary - Task 2.6
 *
 * Tests for utility functions used in agreement preview.
 */

import { describe, it, expect } from 'vitest'
import type { SessionTerm, ContributionSummary } from '@fledgely/contracts'
import {
  groupTermsByCategory,
  getSortedCategoryGroups,
  CATEGORY_DISPLAY_ORDER,
  getSectionDescription,
  getSectionHeaderInfo,
  formatCommitmentsForDisplay,
  getContributionForTerm,
  formatContributorName,
  getSimpleCategoryName,
  getTermCountsByStatus,
  getAcceptanceSummaryText,
  SECTION_DESCRIPTIONS,
  SIMPLE_CATEGORY_NAMES,
} from '../previewUtils'

// ============================================
// TEST FIXTURES
// ============================================

const createMockTerm = (overrides: Partial<SessionTerm> = {}): SessionTerm => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  type: 'screen_time',
  content: { minutes: 120 },
  status: 'accepted',
  addedBy: 'parent',
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
})

const createMockContribution = (
  overrides: Partial<ContributionSummary> = {}
): ContributionSummary => ({
  termId: '550e8400-e29b-41d4-a716-446655440000',
  addedBy: 'parent',
  termTitle: 'Screen Time',
  category: 'screen_time',
  ...overrides,
})

// ============================================
// groupTermsByCategory TESTS
// ============================================

describe('groupTermsByCategory', () => {
  it('groups empty array', () => {
    const result = groupTermsByCategory([])
    expect(result.size).toBe(0)
  })

  it('groups single term', () => {
    const terms = [createMockTerm({ type: 'screen_time' })]
    const result = groupTermsByCategory(terms)
    expect(result.size).toBe(1)
    expect(result.get('screen_time')).toHaveLength(1)
  })

  it('groups multiple terms of same type', () => {
    const terms = [
      createMockTerm({ id: 'id-1', type: 'rule' }),
      createMockTerm({ id: 'id-2', type: 'rule' }),
      createMockTerm({ id: 'id-3', type: 'rule' }),
    ]
    const result = groupTermsByCategory(terms)
    expect(result.size).toBe(1)
    expect(result.get('rule')).toHaveLength(3)
  })

  it('groups terms by different types', () => {
    const terms = [
      createMockTerm({ id: 'id-1', type: 'screen_time' }),
      createMockTerm({ id: 'id-2', type: 'bedtime' }),
      createMockTerm({ id: 'id-3', type: 'rule' }),
    ]
    const result = groupTermsByCategory(terms)
    expect(result.size).toBe(3)
    expect(result.get('screen_time')).toHaveLength(1)
    expect(result.get('bedtime')).toHaveLength(1)
    expect(result.get('rule')).toHaveLength(1)
  })

  it('handles all term types', () => {
    const terms = [
      createMockTerm({ id: 'id-1', type: 'screen_time' }),
      createMockTerm({ id: 'id-2', type: 'bedtime' }),
      createMockTerm({ id: 'id-3', type: 'monitoring' }),
      createMockTerm({ id: 'id-4', type: 'rule' }),
      createMockTerm({ id: 'id-5', type: 'consequence' }),
      createMockTerm({ id: 'id-6', type: 'reward' }),
    ]
    const result = groupTermsByCategory(terms)
    expect(result.size).toBe(6)
  })
})

// ============================================
// getSortedCategoryGroups TESTS
// ============================================

describe('getSortedCategoryGroups', () => {
  it('returns empty array for empty input', () => {
    const result = getSortedCategoryGroups([])
    expect(result).toHaveLength(0)
  })

  it('sorts categories in correct order', () => {
    const terms = [
      createMockTerm({ id: 'id-1', type: 'reward' }),
      createMockTerm({ id: 'id-2', type: 'screen_time' }),
      createMockTerm({ id: 'id-3', type: 'rule' }),
    ]
    const result = getSortedCategoryGroups(terms)

    expect(result).toHaveLength(3)
    expect(result[0][0]).toBe('rule')
    expect(result[1][0]).toBe('screen_time')
    expect(result[2][0]).toBe('reward')
  })

  it('follows CATEGORY_DISPLAY_ORDER', () => {
    const terms = CATEGORY_DISPLAY_ORDER.map((type, index) =>
      createMockTerm({ id: `id-${index}`, type })
    )
    const result = getSortedCategoryGroups(terms)

    expect(result).toHaveLength(6)
    result.forEach(([category], index) => {
      expect(category).toBe(CATEGORY_DISPLAY_ORDER[index])
    })
  })

  it('excludes categories with no terms', () => {
    const terms = [createMockTerm({ type: 'screen_time' })]
    const result = getSortedCategoryGroups(terms)

    expect(result).toHaveLength(1)
    expect(result[0][0]).toBe('screen_time')
  })
})

// ============================================
// SECTION DESCRIPTION TESTS
// ============================================

describe('getSectionDescription', () => {
  it('returns description for screen_time', () => {
    expect(getSectionDescription('screen_time')).toBe(SECTION_DESCRIPTIONS.screen_time)
    expect(getSectionDescription('screen_time')).toContain('screen')
  })

  it('returns description for bedtime', () => {
    expect(getSectionDescription('bedtime')).toContain('devices')
  })

  it('returns description for all types', () => {
    const types = ['screen_time', 'bedtime', 'monitoring', 'rule', 'consequence', 'reward'] as const
    for (const type of types) {
      expect(getSectionDescription(type)).toBeTruthy()
      expect(typeof getSectionDescription(type)).toBe('string')
    }
  })
})

describe('getSectionHeaderInfo', () => {
  it('returns complete header info', () => {
    const info = getSectionHeaderInfo('screen_time')

    expect(info).toHaveProperty('label')
    expect(info).toHaveProperty('description')
    expect(info).toHaveProperty('colors')
    expect(info).toHaveProperty('iconPath')
  })

  it('returns correct label', () => {
    const info = getSectionHeaderInfo('screen_time')
    expect(info.label).toBe('Screen Time')
  })

  it('returns colors object', () => {
    const info = getSectionHeaderInfo('rule')
    expect(info.colors).toHaveProperty('bg')
    expect(info.colors).toHaveProperty('border')
    expect(info.colors).toHaveProperty('text')
    expect(info.colors).toHaveProperty('icon')
  })

  it('returns icon path', () => {
    const info = getSectionHeaderInfo('bedtime')
    expect(info.iconPath).toBeTruthy()
    expect(typeof info.iconPath).toBe('string')
  })
})

// ============================================
// COMMITMENT DISPLAY TESTS
// ============================================

describe('formatCommitmentsForDisplay', () => {
  it('formats empty array', () => {
    const result = formatCommitmentsForDisplay([])
    expect(result).toHaveLength(0)
  })

  it('formats single commitment', () => {
    const result = formatCommitmentsForDisplay(['I will follow the rules'])
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('text')
    expect(result[0].text).toBe('I will follow the rules')
  })

  it('formats multiple commitments with unique IDs', () => {
    const result = formatCommitmentsForDisplay(['Rule 1', 'Rule 2', 'Rule 3'])
    expect(result).toHaveLength(3)

    const ids = result.map((c) => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
  })
})

// ============================================
// CONTRIBUTION ATTRIBUTION TESTS
// ============================================

describe('getContributionForTerm', () => {
  it('returns null for empty contributions', () => {
    const result = getContributionForTerm('term-id', [])
    expect(result).toBeNull()
  })

  it('returns null for non-matching term', () => {
    const contributions = [createMockContribution({ termId: 'other-id' })]
    const result = getContributionForTerm('term-id', contributions)
    expect(result).toBeNull()
  })

  it('returns matching contribution', () => {
    const contributions = [
      createMockContribution({ termId: 'id-1' }),
      createMockContribution({ termId: 'id-2' }),
    ]
    const result = getContributionForTerm('id-2', contributions)
    expect(result).toBeTruthy()
    expect(result?.termId).toBe('id-2')
  })
})

describe('formatContributorName', () => {
  it('formats parent', () => {
    expect(formatContributorName('parent')).toBe('Parent')
  })

  it('formats child', () => {
    expect(formatContributorName('child')).toBe('Child')
  })
})

// ============================================
// READING LEVEL UTILITIES TESTS
// ============================================

describe('getSimpleCategoryName', () => {
  it('returns simplified names', () => {
    expect(getSimpleCategoryName('rule')).toBe('Rules')
    expect(getSimpleCategoryName('screen_time')).toBe('Screen Time')
    expect(getSimpleCategoryName('monitoring')).toBe('Safety Checks')
    expect(getSimpleCategoryName('consequence')).toBe('What Happens If...')
    expect(getSimpleCategoryName('reward')).toBe('Good Things')
  })

  it('returns simple name for all types', () => {
    for (const type of Object.keys(SIMPLE_CATEGORY_NAMES)) {
      const name = getSimpleCategoryName(type as keyof typeof SIMPLE_CATEGORY_NAMES)
      expect(name).toBeTruthy()
      expect(name.length).toBeLessThan(25) // Keep names short
    }
  })
})

// ============================================
// TERM COUNT UTILITIES TESTS
// ============================================

describe('getTermCountsByStatus', () => {
  it('counts empty array', () => {
    const result = getTermCountsByStatus([])
    expect(result.accepted).toBe(0)
    expect(result.discussion).toBe(0)
    expect(result.removed).toBe(0)
    expect(result.total).toBe(0)
  })

  it('counts accepted terms', () => {
    const terms = [
      createMockTerm({ id: 'id-1', status: 'accepted' }),
      createMockTerm({ id: 'id-2', status: 'accepted' }),
    ]
    const result = getTermCountsByStatus(terms)
    expect(result.accepted).toBe(2)
    expect(result.total).toBe(2)
  })

  it('counts all statuses', () => {
    const terms = [
      createMockTerm({ id: 'id-1', status: 'accepted' }),
      createMockTerm({ id: 'id-2', status: 'discussion' }),
      createMockTerm({ id: 'id-3', status: 'removed' }),
    ]
    const result = getTermCountsByStatus(terms)
    expect(result.accepted).toBe(1)
    expect(result.discussion).toBe(1)
    expect(result.removed).toBe(1)
    expect(result.total).toBe(3)
  })
})

describe('getAcceptanceSummaryText', () => {
  it('returns text for all accepted', () => {
    const result = getAcceptanceSummaryText({ accepted: 5, total: 5 })
    expect(result).toBe('5 of 5 terms accepted (100%)')
  })

  it('returns text for partial acceptance', () => {
    const result = getAcceptanceSummaryText({ accepted: 3, total: 5 })
    expect(result).toBe('3 of 5 terms accepted (60%)')
  })

  it('returns text for none accepted', () => {
    const result = getAcceptanceSummaryText({ accepted: 0, total: 5 })
    expect(result).toBe('0 of 5 terms accepted (0%)')
  })

  it('handles zero total', () => {
    const result = getAcceptanceSummaryText({ accepted: 0, total: 0 })
    expect(result).toBe('0 of 0 terms accepted (0%)')
  })
})

// ============================================
// CATEGORY DISPLAY ORDER TESTS
// ============================================

describe('CATEGORY_DISPLAY_ORDER', () => {
  it('contains all term types', () => {
    expect(CATEGORY_DISPLAY_ORDER).toContain('rule')
    expect(CATEGORY_DISPLAY_ORDER).toContain('screen_time')
    expect(CATEGORY_DISPLAY_ORDER).toContain('bedtime')
    expect(CATEGORY_DISPLAY_ORDER).toContain('monitoring')
    expect(CATEGORY_DISPLAY_ORDER).toContain('consequence')
    expect(CATEGORY_DISPLAY_ORDER).toContain('reward')
  })

  it('has no duplicates', () => {
    const uniqueItems = new Set(CATEGORY_DISPLAY_ORDER)
    expect(uniqueItems.size).toBe(CATEGORY_DISPLAY_ORDER.length)
  })

  it('starts with rules', () => {
    expect(CATEGORY_DISPLAY_ORDER[0]).toBe('rule')
  })

  it('ends with rewards', () => {
    expect(CATEGORY_DISPLAY_ORDER[CATEGORY_DISPLAY_ORDER.length - 1]).toBe('reward')
  })
})
