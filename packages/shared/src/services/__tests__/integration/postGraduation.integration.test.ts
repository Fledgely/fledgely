/**
 * Post-Graduation Integration Tests - Story 38.7 Task 9
 *
 * Integration tests for complete post-graduation flow.
 * Tests all ACs working together.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createAlumniProfile,
  getAlumniProfile,
  checkRejoinEligibility,
  processRejoin,
  verifyNoDataCollection,
  clearAllAlumniData,
} from '../../alumniProfileService'
import {
  createSelfTrackingSession,
  logPersonalGoal,
  getProgressSummary,
  verifyLocalDataOnly,
  clearAllSelfTrackingData,
} from '../../selfTrackingService'
import {
  getWellnessTips,
  getTipOfTheDay,
  dismissTip,
  getActiveTips,
  initializeDefaultTips,
  clearAllTipData,
} from '../../digitalWellnessTipService'
import {
  getParentResources,
  getResourcesByCategory,
  markResourceRead,
  getReadResources,
  initializeDefaultResources,
  clearAllResourceData,
} from '../../parentResourceService'
import {
  getCelebrationMessage,
  getTransitionMessage,
  getNextStepsMessage,
} from '../../graduationCelebrationService'

describe('Post-Graduation Integration', () => {
  beforeEach(() => {
    clearAllAlumniData()
    clearAllSelfTrackingData()
    clearAllTipData()
    clearAllResourceData()
    initializeDefaultTips()
    initializeDefaultResources()
  })

  // ============================================
  // Complete Graduation Flow Tests
  // ============================================

  describe('Complete graduation to alumni flow', () => {
    it('should execute full graduation to alumni transition', () => {
      // Step 1: Create alumni profile
      const alumni = createAlumniProfile('child-123', 'family-456')
      expect(alumni.status).toBe('active')

      // Step 2: Verify no monitoring data collected (AC4)
      expect(verifyNoDataCollection(alumni.id)).toBe(true)

      // Step 3: Alumni status preserved (AC3)
      expect(checkRejoinEligibility(alumni.id)).toBe(true)

      // Step 4: Get celebration message (AC5)
      const celebrationMessage = getCelebrationMessage('child', 'Alex')
      expect(celebrationMessage).toContain('Congratulations')

      // Step 5: Get transition message
      const transitionMessage = getTransitionMessage('child')
      expect(transitionMessage).toMatch(/alumni/i)

      // Step 6: Get next steps
      const nextSteps = getNextStepsMessage('child')
      expect(nextSteps).toMatch(/resources/i)
    })
  })

  // ============================================
  // Wellness Tips Flow Tests (AC1)
  // ============================================

  describe('Wellness tips flow (AC1)', () => {
    it('should provide wellness tips to alumni', () => {
      const alumni = createAlumniProfile('child-123', 'family-456')

      // Get wellness tips
      const tips = getWellnessTips()
      expect(tips.length).toBeGreaterThan(0)

      // Get tip of the day
      const tipOfDay = getTipOfTheDay(alumni.id)
      expect(tipOfDay).not.toBeNull()

      // Dismiss a tip
      dismissTip(alumni.id, tipOfDay!.id)

      // Active tips should not include dismissed
      const activeTips = getActiveTips(alumni.id)
      expect(activeTips.find((t) => t.id === tipOfDay!.id)).toBeUndefined()
    })

    it('should have tips for all categories', () => {
      const screenTimeTips = getWellnessTips().filter((t) => t.category === 'screen_time')
      const balanceTips = getWellnessTips().filter((t) => t.category === 'digital_balance')
      const safetyTips = getWellnessTips().filter((t) => t.category === 'online_safety')
      const productivityTips = getWellnessTips().filter((t) => t.category === 'productivity')

      expect(screenTimeTips.length).toBeGreaterThan(0)
      expect(balanceTips.length).toBeGreaterThan(0)
      expect(safetyTips.length).toBeGreaterThan(0)
      expect(productivityTips.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Self-Tracking Flow Tests (AC2, AC4)
  // ============================================

  describe('Self-tracking flow (AC2, AC4)', () => {
    it('should enable self-tracking with local-only data', () => {
      const alumni = createAlumniProfile('child-123', 'family-456')

      // Create self-tracking session
      const session = createSelfTrackingSession(alumni.id)
      expect(session.dataStoredLocally).toBe(true) // AC4

      // Verify local-only data
      expect(verifyLocalDataOnly(alumni.id)).toBe(true) // AC4

      // Log personal goals (AC2)
      const goal = logPersonalGoal(alumni.id, 'Limit social media to 1 hour', 60)
      expect(goal).not.toBeNull()

      // Get progress summary
      const progress = getProgressSummary(alumni.id)
      expect(progress!.totalGoals).toBe(1)
    })

    it('should track progress without external monitoring', () => {
      const alumni = createAlumniProfile('child-123', 'family-456')
      createSelfTrackingSession(alumni.id)

      // Create multiple goals
      logPersonalGoal(alumni.id, 'Goal 1', 60)
      logPersonalGoal(alumni.id, 'Goal 2', 30)

      const progress = getProgressSummary(alumni.id)

      expect(progress!.totalGoals).toBe(2)
      // All data stays local (AC4)
      expect(verifyLocalDataOnly(alumni.id)).toBe(true)
    })
  })

  // ============================================
  // Rejoin Flow Tests (AC3)
  // ============================================

  describe('Rejoin flow (AC3)', () => {
    it('should allow alumni to rejoin voluntarily', () => {
      // Create alumni
      const alumni = createAlumniProfile('child-123', 'family-456')

      // Check rejoin eligibility
      expect(checkRejoinEligibility(alumni.id)).toBe(true)

      // Process rejoin
      const result = processRejoin(alumni.id)
      expect(result).toBe(true)

      // Status should be rejoined
      const updated = getAlumniProfile(alumni.id)
      expect(updated!.status).toBe('rejoined')

      // Cannot rejoin again
      expect(checkRejoinEligibility(alumni.id)).toBe(false)
    })
  })

  // ============================================
  // Parent Resources Flow Tests (AC6)
  // ============================================

  describe('Parent resources flow (AC6)', () => {
    it('should provide resources for parents', () => {
      // Get all resources
      const resources = getParentResources()
      expect(resources.length).toBeGreaterThan(0)

      // Check for supporting independence category
      const independenceResources = getResourcesByCategory('supporting_independence')
      expect(independenceResources.length).toBeGreaterThan(0)
      expect(independenceResources[0].title.toLowerCase()).toContain('support')

      // Mark as read
      markResourceRead('parent-123', resources[0].id)

      // Check read status
      const readResources = getReadResources('parent-123')
      expect(readResources).toContain(resources[0].id)
    })

    it('should have resources for all parent categories', () => {
      const independence = getResourcesByCategory('supporting_independence')
      const transition = getResourcesByCategory('transition_tips')
      const communication = getResourcesByCategory('communication')

      expect(independence.length).toBeGreaterThan(0)
      expect(transition.length).toBeGreaterThan(0)
      expect(communication.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Celebration Flow Tests (AC5)
  // ============================================

  describe('Celebration flow (AC5)', () => {
    it('should provide celebration messages', () => {
      // Get celebration messages
      const childMessage = getCelebrationMessage('child', 'Alex')
      const parentMessage = getCelebrationMessage('parent', 'Alex')

      // Both should celebrate graduation
      expect(childMessage.toLowerCase()).toContain('congratulations')
      expect(parentMessage.toLowerCase()).toContain('congratulations')

      // Transition messages
      const childTransition = getTransitionMessage('child')
      expect(childTransition.toLowerCase()).toContain('alumni')

      // Next steps
      const childNextSteps = getNextStepsMessage('child')
      const parentNextSteps = getNextStepsMessage('parent')

      expect(childNextSteps.toLowerCase()).toContain('resources')
      expect(parentNextSteps.toLowerCase()).toContain('resources')
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge cases', () => {
    it('should handle alumni with no self-tracking', () => {
      const alumni = createAlumniProfile('child-123', 'family-456')

      // Alumni exists but no self-tracking session
      expect(getProgressSummary(alumni.id)).toBeNull()
    })

    it('should handle multiple alumni in same family', () => {
      createAlumniProfile('child-1', 'family-123')
      createAlumniProfile('child-2', 'family-123')

      // Both should have their own sessions
      createSelfTrackingSession('child-1')
      createSelfTrackingSession('child-2')

      logPersonalGoal('child-1', 'Goal for child 1', 60)
      logPersonalGoal('child-2', 'Goal for child 2', 30)

      expect(getProgressSummary('child-1')!.totalGoals).toBe(1)
      expect(getProgressSummary('child-2')!.totalGoals).toBe(1)
    })

    it('should handle alumni preferences independently', () => {
      const alumni1 = createAlumniProfile('child-1', 'family-1')
      const alumni2 = createAlumniProfile('child-2', 'family-2')

      // Dismiss tips independently
      const tips = getWellnessTips()
      dismissTip(alumni1.id, tips[0].id)

      // Alumni 2 should still see the tip
      const active1 = getActiveTips(alumni1.id)
      const active2 = getActiveTips(alumni2.id)

      expect(active1.find((t) => t.id === tips[0].id)).toBeUndefined()
      expect(active2.find((t) => t.id === tips[0].id)).toBeDefined()
    })
  })
})
