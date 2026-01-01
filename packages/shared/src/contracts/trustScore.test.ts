/**
 * Trust Score Types Tests - Story 36.1
 *
 * Tests for trust score data model types and constants.
 * AC1: Schema includes childId, currentScore, history, factors
 * AC2: Score range 0-100 (100 = highest trust)
 * AC3: Zod schema: trustScoreSchema in @fledgely/shared
 * AC4: History tracks score changes over time with reasons
 * AC5: Factors breakdown: which behaviors contributed
 */

import { describe, it, expect } from 'vitest'
import {
  TRUST_SCORE_MIN,
  TRUST_SCORE_MAX,
  TRUST_SCORE_DEFAULT,
  trustFactorTypeSchema,
  trustFactorCategorySchema,
  trustFactorSchema,
  trustScoreHistoryEntrySchema,
  trustScoreSchema,
  type TrustFactor,
  type TrustScoreHistoryEntry,
  type TrustScore,
} from './trustScore'

describe('Trust Score Constants - Story 36.1', () => {
  describe('score range (AC2)', () => {
    it('should have minimum score of 0', () => {
      expect(TRUST_SCORE_MIN).toBe(0)
    })

    it('should have maximum score of 100', () => {
      expect(TRUST_SCORE_MAX).toBe(100)
    })

    it('should have default starting score of 70', () => {
      expect(TRUST_SCORE_DEFAULT).toBe(70)
    })
  })
})

describe('Trust Factor Type Schema - Story 36.1', () => {
  describe('positive factors', () => {
    it('should accept time-limit-compliance', () => {
      expect(trustFactorTypeSchema.safeParse('time-limit-compliance').success).toBe(true)
    })

    it('should accept focus-mode-usage', () => {
      expect(trustFactorTypeSchema.safeParse('focus-mode-usage').success).toBe(true)
    })

    it('should accept no-bypass-attempts', () => {
      expect(trustFactorTypeSchema.safeParse('no-bypass-attempts').success).toBe(true)
    })
  })

  describe('neutral factors', () => {
    it('should accept normal-app-usage', () => {
      expect(trustFactorTypeSchema.safeParse('normal-app-usage').success).toBe(true)
    })
  })

  describe('concerning factors', () => {
    it('should accept bypass-attempt', () => {
      expect(trustFactorTypeSchema.safeParse('bypass-attempt').success).toBe(true)
    })

    it('should accept monitoring-disabled', () => {
      expect(trustFactorTypeSchema.safeParse('monitoring-disabled').success).toBe(true)
    })
  })

  describe('invalid values', () => {
    it('should reject unknown factor types', () => {
      expect(trustFactorTypeSchema.safeParse('invalid-type').success).toBe(false)
    })

    it('should reject empty string', () => {
      expect(trustFactorTypeSchema.safeParse('').success).toBe(false)
    })
  })
})

describe('Trust Factor Category Schema - Story 36.1', () => {
  it('should accept positive category', () => {
    expect(trustFactorCategorySchema.safeParse('positive').success).toBe(true)
  })

  it('should accept neutral category', () => {
    expect(trustFactorCategorySchema.safeParse('neutral').success).toBe(true)
  })

  it('should accept concerning category', () => {
    expect(trustFactorCategorySchema.safeParse('concerning').success).toBe(true)
  })

  it('should reject invalid categories', () => {
    expect(trustFactorCategorySchema.safeParse('negative').success).toBe(false)
    expect(trustFactorCategorySchema.safeParse('bad').success).toBe(false)
  })
})

describe('Trust Factor Schema (AC5) - Story 36.1', () => {
  const validFactor: TrustFactor = {
    type: 'time-limit-compliance',
    category: 'positive',
    value: 5,
    description: 'Following time limits',
    occurredAt: new Date('2024-01-15'),
  }

  it('should accept valid factor', () => {
    const result = trustFactorSchema.safeParse(validFactor)
    expect(result.success).toBe(true)
  })

  it('should require type field', () => {
    const { type: _, ...withoutType } = validFactor
    expect(trustFactorSchema.safeParse(withoutType).success).toBe(false)
  })

  it('should require category field', () => {
    const { category: _, ...withoutCategory } = validFactor
    expect(trustFactorSchema.safeParse(withoutCategory).success).toBe(false)
  })

  it('should require value field', () => {
    const { value: _, ...withoutValue } = validFactor
    expect(trustFactorSchema.safeParse(withoutValue).success).toBe(false)
  })

  it('should require description field', () => {
    const { description: _, ...withoutDescription } = validFactor
    expect(trustFactorSchema.safeParse(withoutDescription).success).toBe(false)
  })

  it('should require occurredAt field', () => {
    const { occurredAt: _, ...withoutDate } = validFactor
    expect(trustFactorSchema.safeParse(withoutDate).success).toBe(false)
  })

  it('should allow negative values for concerning factors', () => {
    const concerningFactor = {
      ...validFactor,
      type: 'bypass-attempt',
      category: 'concerning',
      value: -5,
    }
    expect(trustFactorSchema.safeParse(concerningFactor).success).toBe(true)
  })

  it('should allow zero value for neutral factors', () => {
    const neutralFactor = {
      ...validFactor,
      type: 'normal-app-usage',
      category: 'neutral',
      value: 0,
    }
    expect(trustFactorSchema.safeParse(neutralFactor).success).toBe(true)
  })
})

describe('Trust Score History Entry Schema (AC4) - Story 36.1', () => {
  const validHistoryEntry: TrustScoreHistoryEntry = {
    date: new Date('2024-01-15'),
    score: 75,
    previousScore: 70,
    reason: 'Daily update: time limit compliance',
    factors: [
      {
        type: 'time-limit-compliance',
        category: 'positive',
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date('2024-01-15'),
      },
    ],
  }

  it('should accept valid history entry', () => {
    const result = trustScoreHistoryEntrySchema.safeParse(validHistoryEntry)
    expect(result.success).toBe(true)
  })

  it('should require date field', () => {
    const { date: _, ...withoutDate } = validHistoryEntry
    expect(trustScoreHistoryEntrySchema.safeParse(withoutDate).success).toBe(false)
  })

  it('should require score field', () => {
    const { score: _, ...withoutScore } = validHistoryEntry
    expect(trustScoreHistoryEntrySchema.safeParse(withoutScore).success).toBe(false)
  })

  it('should require previousScore field', () => {
    const { previousScore: _, ...withoutPrevious } = validHistoryEntry
    expect(trustScoreHistoryEntrySchema.safeParse(withoutPrevious).success).toBe(false)
  })

  it('should require reason field', () => {
    const { reason: _, ...withoutReason } = validHistoryEntry
    expect(trustScoreHistoryEntrySchema.safeParse(withoutReason).success).toBe(false)
  })

  it('should enforce score minimum of 0', () => {
    const invalidEntry = { ...validHistoryEntry, score: -1 }
    expect(trustScoreHistoryEntrySchema.safeParse(invalidEntry).success).toBe(false)
  })

  it('should enforce score maximum of 100', () => {
    const invalidEntry = { ...validHistoryEntry, score: 101 }
    expect(trustScoreHistoryEntrySchema.safeParse(invalidEntry).success).toBe(false)
  })

  it('should enforce previousScore minimum of 0', () => {
    const invalidEntry = { ...validHistoryEntry, previousScore: -1 }
    expect(trustScoreHistoryEntrySchema.safeParse(invalidEntry).success).toBe(false)
  })

  it('should enforce previousScore maximum of 100', () => {
    const invalidEntry = { ...validHistoryEntry, previousScore: 101 }
    expect(trustScoreHistoryEntrySchema.safeParse(invalidEntry).success).toBe(false)
  })

  it('should allow empty factors array', () => {
    const entryWithNoFactors = { ...validHistoryEntry, factors: [] }
    expect(trustScoreHistoryEntrySchema.safeParse(entryWithNoFactors).success).toBe(true)
  })

  it('should allow multiple factors', () => {
    const entryWithMultipleFactors = {
      ...validHistoryEntry,
      factors: [
        ...validHistoryEntry.factors,
        {
          type: 'focus-mode-usage' as const,
          category: 'positive' as const,
          value: 3,
          description: 'Using focus mode',
          occurredAt: new Date('2024-01-15'),
        },
      ],
    }
    expect(trustScoreHistoryEntrySchema.safeParse(entryWithMultipleFactors).success).toBe(true)
  })
})

describe('Trust Score Schema (AC1, AC3) - Story 36.1', () => {
  const validTrustScore: TrustScore = {
    id: 'ts-123',
    childId: 'child-456',
    currentScore: 75,
    history: [
      {
        date: new Date('2024-01-15'),
        score: 75,
        previousScore: 70,
        reason: 'Daily update',
        factors: [],
      },
    ],
    factors: [
      {
        type: 'time-limit-compliance',
        category: 'positive',
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date('2024-01-15'),
      },
    ],
    lastUpdatedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
  }

  it('should accept valid trust score (AC3)', () => {
    const result = trustScoreSchema.safeParse(validTrustScore)
    expect(result.success).toBe(true)
  })

  it('should require id field (AC1)', () => {
    const { id: _, ...withoutId } = validTrustScore
    expect(trustScoreSchema.safeParse(withoutId).success).toBe(false)
  })

  it('should require childId field (AC1)', () => {
    const { childId: _, ...withoutChildId } = validTrustScore
    expect(trustScoreSchema.safeParse(withoutChildId).success).toBe(false)
  })

  it('should require currentScore field (AC1)', () => {
    const { currentScore: _, ...withoutScore } = validTrustScore
    expect(trustScoreSchema.safeParse(withoutScore).success).toBe(false)
  })

  it('should require history field (AC1)', () => {
    const { history: _, ...withoutHistory } = validTrustScore
    expect(trustScoreSchema.safeParse(withoutHistory).success).toBe(false)
  })

  it('should require factors field (AC1)', () => {
    const { factors: _, ...withoutFactors } = validTrustScore
    expect(trustScoreSchema.safeParse(withoutFactors).success).toBe(false)
  })

  it('should require lastUpdatedAt field', () => {
    const { lastUpdatedAt: _, ...withoutUpdate } = validTrustScore
    expect(trustScoreSchema.safeParse(withoutUpdate).success).toBe(false)
  })

  it('should require createdAt field', () => {
    const { createdAt: _, ...withoutCreated } = validTrustScore
    expect(trustScoreSchema.safeParse(withoutCreated).success).toBe(false)
  })

  it('should enforce currentScore minimum of 0 (AC2)', () => {
    const invalidScore = { ...validTrustScore, currentScore: -1 }
    expect(trustScoreSchema.safeParse(invalidScore).success).toBe(false)
  })

  it('should enforce currentScore maximum of 100 (AC2)', () => {
    const invalidScore = { ...validTrustScore, currentScore: 101 }
    expect(trustScoreSchema.safeParse(invalidScore).success).toBe(false)
  })

  it('should allow score of 0', () => {
    const zeroScore = { ...validTrustScore, currentScore: 0 }
    expect(trustScoreSchema.safeParse(zeroScore).success).toBe(true)
  })

  it('should allow score of 100', () => {
    const maxScore = { ...validTrustScore, currentScore: 100 }
    expect(trustScoreSchema.safeParse(maxScore).success).toBe(true)
  })

  it('should allow empty history array', () => {
    const emptyHistory = { ...validTrustScore, history: [] }
    expect(trustScoreSchema.safeParse(emptyHistory).success).toBe(true)
  })

  it('should allow empty factors array', () => {
    const emptyFactors = { ...validTrustScore, factors: [] }
    expect(trustScoreSchema.safeParse(emptyFactors).success).toBe(true)
  })

  it('should accept trust score with multiple history entries (AC4)', () => {
    const multipleHistory = {
      ...validTrustScore,
      history: [
        ...validTrustScore.history,
        {
          date: new Date('2024-01-14'),
          score: 70,
          previousScore: 70,
          reason: 'Initial score',
          factors: [],
        },
      ],
    }
    expect(trustScoreSchema.safeParse(multipleHistory).success).toBe(true)
  })

  it('should accept trust score with multiple factors (AC5)', () => {
    const multipleFactors = {
      ...validTrustScore,
      factors: [
        ...validTrustScore.factors,
        {
          type: 'focus-mode-usage' as const,
          category: 'positive' as const,
          value: 3,
          description: 'Using focus mode',
          occurredAt: new Date('2024-01-15'),
        },
        {
          type: 'bypass-attempt' as const,
          category: 'concerning' as const,
          value: -5,
          description: 'Bypass attempt detected',
          occurredAt: new Date('2024-01-14'),
        },
      ],
    }
    expect(trustScoreSchema.safeParse(multipleFactors).success).toBe(true)
  })
})

describe('Type Exports - Story 36.1', () => {
  it('should export TrustFactor type', () => {
    const factor: TrustFactor = {
      type: 'time-limit-compliance',
      category: 'positive',
      value: 5,
      description: 'Test',
      occurredAt: new Date(),
    }
    expect(factor.type).toBe('time-limit-compliance')
  })

  it('should export TrustScoreHistoryEntry type', () => {
    const entry: TrustScoreHistoryEntry = {
      date: new Date(),
      score: 75,
      previousScore: 70,
      reason: 'Test',
      factors: [],
    }
    expect(entry.score).toBe(75)
  })

  it('should export TrustScore type', () => {
    const score: TrustScore = {
      id: 'ts-1',
      childId: 'child-1',
      currentScore: 70,
      history: [],
      factors: [],
      lastUpdatedAt: new Date(),
      createdAt: new Date(),
    }
    expect(score.childId).toBe('child-1')
  })
})
