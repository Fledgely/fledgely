/**
 * Post-Graduation Support Contracts Tests - Story 38.7 Task 1
 *
 * Tests for Zod schemas and types for post-graduation support.
 * AC1: Optional digital wellness tips available
 * AC2: Self-tracking tools (non-monitored) offered
 * AC3: "Alumni" status preserved (can rejoin voluntarily if desired)
 * AC4: No monitoring data collected post-graduation
 */

import { describe, it, expect } from 'vitest'
import {
  alumniProfileSchema,
  digitalWellnessTipSchema,
  selfTrackingPreferencesSchema,
  parentResourceSchema,
  graduationCelebrationSchema,
  alumniStatusSchema,
  ALUMNI_STATUS,
  WELLNESS_TIP_CATEGORIES,
  PARENT_RESOURCE_CATEGORIES,
  createAlumniProfile,
  createWellnessTip,
  createParentResource,
  isAlumniEligibleForRejoin,
  type AlumniStatus,
} from './postGraduation'

describe('PostGraduation Contracts', () => {
  // ============================================
  // Configuration Constants Tests
  // ============================================

  describe('Configuration Constants', () => {
    it('should define alumni status values', () => {
      expect(ALUMNI_STATUS).toEqual({
        ACTIVE: 'active',
        INACTIVE: 'inactive',
        REJOINED: 'rejoined',
      })
    })

    it('should define wellness tip categories (AC1)', () => {
      expect(WELLNESS_TIP_CATEGORIES).toContain('screen_time')
      expect(WELLNESS_TIP_CATEGORIES).toContain('digital_balance')
      expect(WELLNESS_TIP_CATEGORIES).toContain('online_safety')
      expect(WELLNESS_TIP_CATEGORIES).toContain('productivity')
    })

    it('should define parent resource categories (AC6)', () => {
      expect(PARENT_RESOURCE_CATEGORIES).toContain('supporting_independence')
      expect(PARENT_RESOURCE_CATEGORIES).toContain('transition_tips')
      expect(PARENT_RESOURCE_CATEGORIES).toContain('communication')
    })
  })

  // ============================================
  // Alumni Status Schema Tests (AC3)
  // ============================================

  describe('AlumniStatus Schema (AC3)', () => {
    const validStatuses: AlumniStatus[] = ['active', 'inactive', 'rejoined']

    it.each(validStatuses)('should accept valid status: %s', (status) => {
      const result = alumniStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = alumniStatusSchema.safeParse('invalid_status')
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Alumni Profile Schema Tests (AC3, AC4)
  // ============================================

  describe('AlumniProfile Schema (AC3, AC4)', () => {
    const validProfile = {
      id: 'alumni-123',
      childId: 'child-456',
      familyId: 'family-789',
      graduatedAt: new Date(),
      status: 'active' as AlumniStatus,
      canRejoin: true,
      wellnessTipsEnabled: true,
      selfTrackingEnabled: false,
      lastActiveAt: new Date(),
      celebrationCompleted: true,
    }

    it('should validate complete alumni profile', () => {
      const result = alumniProfileSchema.safeParse(validProfile)
      expect(result.success).toBe(true)
    })

    it('should require id', () => {
      const { id: _id, ...incomplete } = validProfile
      const result = alumniProfileSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require childId', () => {
      const { childId: _childId, ...incomplete } = validProfile
      const result = alumniProfileSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require graduatedAt date', () => {
      const { graduatedAt: _graduatedAt, ...incomplete } = validProfile
      const result = alumniProfileSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require status', () => {
      const { status: _status, ...incomplete } = validProfile
      const result = alumniProfileSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require canRejoin boolean (AC3)', () => {
      const { canRejoin: _canRejoin, ...incomplete } = validProfile
      const result = alumniProfileSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should allow null for lastActiveAt', () => {
      const result = alumniProfileSchema.safeParse({
        ...validProfile,
        lastActiveAt: null,
      })
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // Digital Wellness Tip Schema Tests (AC1)
  // ============================================

  describe('DigitalWellnessTip Schema (AC1)', () => {
    const validTip = {
      id: 'tip-123',
      category: 'screen_time',
      title: 'Take regular breaks',
      content: 'Every 30 minutes, look away from your screen for 20 seconds.',
      order: 1,
      isActive: true,
    }

    it('should validate complete wellness tip', () => {
      const result = digitalWellnessTipSchema.safeParse(validTip)
      expect(result.success).toBe(true)
    })

    it('should require category', () => {
      const { category: _category, ...incomplete } = validTip
      const result = digitalWellnessTipSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require title', () => {
      const { title: _title, ...incomplete } = validTip
      const result = digitalWellnessTipSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require content', () => {
      const { content: _content, ...incomplete } = validTip
      const result = digitalWellnessTipSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should accept all valid categories', () => {
      for (const category of WELLNESS_TIP_CATEGORIES) {
        const result = digitalWellnessTipSchema.safeParse({
          ...validTip,
          category,
        })
        expect(result.success).toBe(true)
      }
    })
  })

  // ============================================
  // Self-Tracking Preferences Schema Tests (AC2, AC4)
  // ============================================

  describe('SelfTrackingPreferences Schema (AC2, AC4)', () => {
    const validPrefs = {
      alumniId: 'alumni-123',
      screenTimeGoalMinutes: 120,
      breakReminderEnabled: true,
      dailyReflectionEnabled: false,
      goalsVisible: true,
      dataStoredLocally: true, // AC4: No monitoring data collected
    }

    it('should validate complete preferences', () => {
      const result = selfTrackingPreferencesSchema.safeParse(validPrefs)
      expect(result.success).toBe(true)
    })

    it('should require alumniId', () => {
      const { alumniId: _alumniId, ...incomplete } = validPrefs
      const result = selfTrackingPreferencesSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require dataStoredLocally boolean (AC4)', () => {
      const { dataStoredLocally: _dataStoredLocally, ...incomplete } = validPrefs
      const result = selfTrackingPreferencesSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should reject negative screen time goal', () => {
      const result = selfTrackingPreferencesSchema.safeParse({
        ...validPrefs,
        screenTimeGoalMinutes: -10,
      })
      expect(result.success).toBe(false)
    })

    it('should allow zero screen time goal', () => {
      const result = selfTrackingPreferencesSchema.safeParse({
        ...validPrefs,
        screenTimeGoalMinutes: 0,
      })
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // Parent Resource Schema Tests (AC6)
  // ============================================

  describe('ParentResource Schema (AC6)', () => {
    const validResource = {
      id: 'resource-123',
      category: 'supporting_independence',
      title: 'Supporting Your Independent Teen',
      summary: 'Tips for parents adjusting to reduced oversight',
      content: 'Full article content here...',
      order: 1,
      isActive: true,
    }

    it('should validate complete parent resource', () => {
      const result = parentResourceSchema.safeParse(validResource)
      expect(result.success).toBe(true)
    })

    it('should require category', () => {
      const { category: _category, ...incomplete } = validResource
      const result = parentResourceSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require title', () => {
      const { title: _title, ...incomplete } = validResource
      const result = parentResourceSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should accept all valid categories', () => {
      for (const category of PARENT_RESOURCE_CATEGORIES) {
        const result = parentResourceSchema.safeParse({
          ...validResource,
          category,
        })
        expect(result.success).toBe(true)
      }
    })
  })

  // ============================================
  // Graduation Celebration Schema Tests (AC5)
  // ============================================

  describe('GraduationCelebration Schema (AC5)', () => {
    const validCelebration = {
      id: 'celebration-123',
      alumniId: 'alumni-456',
      familyId: 'family-789',
      celebratedAt: new Date(),
      message: 'Congratulations on your graduation!',
      parentAcknowledged: true,
      childAcknowledged: true,
    }

    it('should validate complete celebration', () => {
      const result = graduationCelebrationSchema.safeParse(validCelebration)
      expect(result.success).toBe(true)
    })

    it('should require alumniId', () => {
      const { alumniId: _alumniId, ...incomplete } = validCelebration
      const result = graduationCelebrationSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require celebratedAt date', () => {
      const { celebratedAt: _celebratedAt, ...incomplete } = validCelebration
      const result = graduationCelebrationSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })

    it('should require message', () => {
      const { message: _message, ...incomplete } = validCelebration
      const result = graduationCelebrationSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Factory Function Tests
  // ============================================

  describe('Factory Functions', () => {
    describe('createAlumniProfile', () => {
      it('should create valid alumni profile with defaults', () => {
        const profile = createAlumniProfile('child-123', 'family-456')

        expect(profile.childId).toBe('child-123')
        expect(profile.familyId).toBe('family-456')
        expect(profile.status).toBe('active')
        expect(profile.canRejoin).toBe(true)
        expect(profile.wellnessTipsEnabled).toBe(true)
        expect(profile.selfTrackingEnabled).toBe(false)
        expect(profile.celebrationCompleted).toBe(false)
        expect(profile.id).toBeDefined()
        expect(profile.graduatedAt).toBeInstanceOf(Date)
      })

      it('should generate unique IDs', () => {
        const profile1 = createAlumniProfile('child-1', 'family-1')
        const profile2 = createAlumniProfile('child-2', 'family-2')

        expect(profile1.id).not.toBe(profile2.id)
      })
    })

    describe('createWellnessTip', () => {
      it('should create valid wellness tip', () => {
        const tip = createWellnessTip(
          'screen_time',
          'Take breaks',
          'Look away from your screen every 30 minutes.'
        )

        expect(tip.category).toBe('screen_time')
        expect(tip.title).toBe('Take breaks')
        expect(tip.content).toBe('Look away from your screen every 30 minutes.')
        expect(tip.isActive).toBe(true)
        expect(tip.id).toBeDefined()
      })

      it('should generate unique IDs', () => {
        const tip1 = createWellnessTip('screen_time', 'Tip 1', 'Content 1')
        const tip2 = createWellnessTip('screen_time', 'Tip 2', 'Content 2')

        expect(tip1.id).not.toBe(tip2.id)
      })
    })

    describe('createParentResource', () => {
      it('should create valid parent resource', () => {
        const resource = createParentResource(
          'supporting_independence',
          'Supporting Your Teen',
          'Summary here',
          'Full content here'
        )

        expect(resource.category).toBe('supporting_independence')
        expect(resource.title).toBe('Supporting Your Teen')
        expect(resource.summary).toBe('Summary here')
        expect(resource.content).toBe('Full content here')
        expect(resource.isActive).toBe(true)
        expect(resource.id).toBeDefined()
      })
    })
  })

  // ============================================
  // Validation Function Tests (AC3)
  // ============================================

  describe('Validation Functions', () => {
    describe('isAlumniEligibleForRejoin (AC3)', () => {
      it('should return true for active alumni with canRejoin', () => {
        const profile = createAlumniProfile('child-1', 'family-1')
        expect(isAlumniEligibleForRejoin(profile)).toBe(true)
      })

      it('should return false for alumni who already rejoined', () => {
        const profile = createAlumniProfile('child-1', 'family-1')
        profile.status = 'rejoined'
        expect(isAlumniEligibleForRejoin(profile)).toBe(false)
      })

      it('should return false for alumni with canRejoin=false', () => {
        const profile = createAlumniProfile('child-1', 'family-1')
        profile.canRejoin = false
        expect(isAlumniEligibleForRejoin(profile)).toBe(false)
      })

      it('should return false for inactive alumni', () => {
        const profile = createAlumniProfile('child-1', 'family-1')
        profile.status = 'inactive'
        expect(isAlumniEligibleForRejoin(profile)).toBe(false)
      })
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle alumni profile with all optional fields', () => {
      const profile = createAlumniProfile('child-1', 'family-1')
      profile.lastActiveAt = null

      const result = alumniProfileSchema.safeParse(profile)
      expect(result.success).toBe(true)
    })

    it('should handle wellness tip with minimum required fields', () => {
      const tip = {
        id: 'tip-1',
        category: 'screen_time',
        title: 'T',
        content: 'C',
        order: 0,
        isActive: true,
      }

      const result = digitalWellnessTipSchema.safeParse(tip)
      expect(result.success).toBe(true)
    })

    it('should handle self-tracking with maximum screen time goal', () => {
      const prefs = {
        alumniId: 'alumni-1',
        screenTimeGoalMinutes: 1440, // 24 hours
        breakReminderEnabled: true,
        dailyReflectionEnabled: true,
        goalsVisible: true,
        dataStoredLocally: true,
      }

      const result = selfTrackingPreferencesSchema.safeParse(prefs)
      expect(result.success).toBe(true)
    })
  })
})
