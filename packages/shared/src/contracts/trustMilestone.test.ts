/**
 * Trust Milestone Data Model Tests - Story 37.1 Task 1
 *
 * Tests for trust milestone definitions and child milestone status.
 * AC1: Milestones defined: 80 (Growing), 90 (Maturing), 95 (Ready for independence)
 * AC2: Duration requirement: score maintained for 30+ days
 */

import { describe, it, expect } from 'vitest'
import {
  TRUST_MILESTONES,
  getMilestoneByLevel,
  trustMilestoneSchema,
  trustMilestoneLevelSchema,
  childMilestoneStatusSchema,
  milestoneHistoryEntrySchema,
  type TrustMilestone,
  type TrustMilestoneLevel,
  type ChildMilestoneStatus,
  MILESTONE_DURATION_DAYS,
  MILESTONE_THRESHOLDS,
} from './trustMilestone'

describe('TrustMilestone Data Model - Story 37.1 Task 1', () => {
  describe('AC1: Milestone definitions', () => {
    it('should define Growing milestone at 80', () => {
      const growing = getMilestoneByLevel('growing')

      expect(growing).toBeDefined()
      expect(growing?.threshold).toBe(80)
      expect(growing?.level).toBe('growing')
    })

    it('should define Maturing milestone at 90', () => {
      const maturing = getMilestoneByLevel('maturing')

      expect(maturing).toBeDefined()
      expect(maturing?.threshold).toBe(90)
      expect(maturing?.level).toBe('maturing')
    })

    it('should define Ready for Independence milestone at 95', () => {
      const readyForIndependence = getMilestoneByLevel('ready-for-independence')

      expect(readyForIndependence).toBeDefined()
      expect(readyForIndependence?.threshold).toBe(95)
      expect(readyForIndependence?.level).toBe('ready-for-independence')
    })

    it('should have milestone thresholds in correct order', () => {
      expect(MILESTONE_THRESHOLDS.growing).toBe(80)
      expect(MILESTONE_THRESHOLDS.maturing).toBe(90)
      expect(MILESTONE_THRESHOLDS['ready-for-independence']).toBe(95)

      // Ensure ascending order
      expect(MILESTONE_THRESHOLDS.growing).toBeLessThan(MILESTONE_THRESHOLDS.maturing)
      expect(MILESTONE_THRESHOLDS.maturing).toBeLessThan(
        MILESTONE_THRESHOLDS['ready-for-independence']
      )
    })

    it('should have exactly 3 milestones defined', () => {
      expect(TRUST_MILESTONES).toHaveLength(3)
    })

    it('should have all milestones with descriptions', () => {
      TRUST_MILESTONES.forEach((milestone) => {
        expect(milestone.description).toBeDefined()
        expect(milestone.description.length).toBeGreaterThan(0)
      })
    })

    it('should have all milestones with benefits', () => {
      TRUST_MILESTONES.forEach((milestone) => {
        expect(milestone.benefits).toBeDefined()
        expect(milestone.benefits.length).toBeGreaterThan(0)
      })
    })
  })

  describe('AC2: Duration requirement', () => {
    it('should require 30 days for all milestones', () => {
      expect(MILESTONE_DURATION_DAYS).toBe(30)

      TRUST_MILESTONES.forEach((milestone) => {
        expect(milestone.durationDays).toBe(30)
      })
    })
  })

  describe('Milestone level schema', () => {
    it('should validate growing level', () => {
      expect(trustMilestoneLevelSchema.safeParse('growing').success).toBe(true)
    })

    it('should validate maturing level', () => {
      expect(trustMilestoneLevelSchema.safeParse('maturing').success).toBe(true)
    })

    it('should validate ready-for-independence level', () => {
      expect(trustMilestoneLevelSchema.safeParse('ready-for-independence').success).toBe(true)
    })

    it('should reject invalid levels', () => {
      expect(trustMilestoneLevelSchema.safeParse('invalid').success).toBe(false)
      expect(trustMilestoneLevelSchema.safeParse('expert').success).toBe(false)
    })
  })

  describe('Milestone schema validation', () => {
    it('should validate a valid milestone', () => {
      const milestone: TrustMilestone = {
        level: 'growing',
        threshold: 80,
        durationDays: 30,
        description: 'Beginning to show consistent responsibility',
        benefits: ['Reduced screenshot frequency'],
      }

      expect(trustMilestoneSchema.safeParse(milestone).success).toBe(true)
    })

    it('should reject milestone with invalid threshold', () => {
      const milestone = {
        level: 'growing',
        threshold: -5,
        durationDays: 30,
        description: 'Test',
        benefits: ['Test'],
      }

      expect(trustMilestoneSchema.safeParse(milestone).success).toBe(false)
    })

    it('should reject milestone with threshold above 100', () => {
      const milestone = {
        level: 'growing',
        threshold: 150,
        durationDays: 30,
        description: 'Test',
        benefits: ['Test'],
      }

      expect(trustMilestoneSchema.safeParse(milestone).success).toBe(false)
    })

    it('should reject milestone with negative duration', () => {
      const milestone = {
        level: 'growing',
        threshold: 80,
        durationDays: -1,
        description: 'Test',
        benefits: ['Test'],
      }

      expect(trustMilestoneSchema.safeParse(milestone).success).toBe(false)
    })

    it('should reject milestone with empty benefits array', () => {
      const milestone = {
        level: 'growing',
        threshold: 80,
        durationDays: 30,
        description: 'Test',
        benefits: [],
      }

      expect(trustMilestoneSchema.safeParse(milestone).success).toBe(false)
    })
  })

  describe('Milestone history entry schema', () => {
    it('should validate a valid history entry', () => {
      const entry = {
        date: new Date(),
        fromMilestone: null,
        toMilestone: 'growing' as TrustMilestoneLevel,
        reason: 'Reached 80+ trust score for 30 consecutive days',
      }

      expect(milestoneHistoryEntrySchema.safeParse(entry).success).toBe(true)
    })

    it('should validate regression entry', () => {
      const entry = {
        date: new Date(),
        fromMilestone: 'growing' as TrustMilestoneLevel,
        toMilestone: null,
        reason: 'Trust score dropped below threshold after grace period',
      }

      expect(milestoneHistoryEntrySchema.safeParse(entry).success).toBe(true)
    })

    it('should validate progression entry', () => {
      const entry = {
        date: new Date(),
        fromMilestone: 'growing' as TrustMilestoneLevel,
        toMilestone: 'maturing' as TrustMilestoneLevel,
        reason: 'Reached 90+ trust score for 30 consecutive days',
      }

      expect(milestoneHistoryEntrySchema.safeParse(entry).success).toBe(true)
    })
  })

  describe('Child milestone status schema', () => {
    it('should validate status with no milestone', () => {
      const status: ChildMilestoneStatus = {
        childId: 'child-1',
        currentMilestone: null,
        milestoneHistory: [],
        streakStartDate: null,
        consecutiveDays: 0,
      }

      expect(childMilestoneStatusSchema.safeParse(status).success).toBe(true)
    })

    it('should validate status with active milestone', () => {
      const status: ChildMilestoneStatus = {
        childId: 'child-1',
        currentMilestone: 'growing',
        milestoneHistory: [
          {
            date: new Date(),
            fromMilestone: null,
            toMilestone: 'growing',
            reason: 'Reached milestone',
          },
        ],
        streakStartDate: new Date('2024-01-01'),
        consecutiveDays: 45,
      }

      expect(childMilestoneStatusSchema.safeParse(status).success).toBe(true)
    })

    it('should validate status with in-progress streak', () => {
      const status: ChildMilestoneStatus = {
        childId: 'child-1',
        currentMilestone: null,
        milestoneHistory: [],
        streakStartDate: new Date('2024-12-01'),
        consecutiveDays: 15,
      }

      expect(childMilestoneStatusSchema.safeParse(status).success).toBe(true)
    })

    it('should reject negative consecutive days', () => {
      const status = {
        childId: 'child-1',
        currentMilestone: null,
        milestoneHistory: [],
        streakStartDate: null,
        consecutiveDays: -5,
      }

      expect(childMilestoneStatusSchema.safeParse(status).success).toBe(false)
    })
  })

  describe('Milestone descriptions use developmental language', () => {
    it('should use recognition language, not reward language', () => {
      TRUST_MILESTONES.forEach((milestone) => {
        // Should not contain reward language
        expect(milestone.description.toLowerCase()).not.toContain('earned')
        expect(milestone.description.toLowerCase()).not.toContain('reward')
        expect(milestone.description.toLowerCase()).not.toContain('deserve')
      })
    })

    it('should use growth-focused language', () => {
      const allDescriptions = TRUST_MILESTONES.map((m) => m.description.toLowerCase()).join(' ')

      // Should contain growth/recognition language
      const hasGrowthLanguage =
        allDescriptions.includes('growth') ||
        allDescriptions.includes('growing') ||
        allDescriptions.includes('recogniz') ||
        allDescriptions.includes('maturi') ||
        allDescriptions.includes('responsibility')

      expect(hasGrowthLanguage).toBe(true)
    })
  })
})
