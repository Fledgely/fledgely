/**
 * Self-Tracking Service Tests - Story 38.7 Task 4
 *
 * Tests for self-tracking tools.
 * AC2: Self-tracking tools (non-monitored) offered
 * AC4: No monitoring data collected post-graduation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSelfTrackingSession,
  getSelfTrackingSession,
  logPersonalGoal,
  getGoals,
  updateGoalProgress,
  getProgressSummary,
  verifyLocalDataOnly,
  deleteSelfTrackingData,
  clearAllSelfTrackingData,
} from './selfTrackingService'

describe('SelfTrackingService', () => {
  beforeEach(() => {
    clearAllSelfTrackingData()
  })

  // ============================================
  // Session Creation Tests (AC2)
  // ============================================

  describe('createSelfTrackingSession (AC2)', () => {
    it('should create self-tracking session for alumni', () => {
      const session = createSelfTrackingSession('alumni-123')

      expect(session).not.toBeNull()
      expect(session.alumniId).toBe('alumni-123')
    })

    it('should set local-only data flag (AC4)', () => {
      const session = createSelfTrackingSession('alumni-123')

      expect(session.dataStoredLocally).toBe(true)
    })

    it('should set default preferences', () => {
      const session = createSelfTrackingSession('alumni-123')

      expect(session.screenTimeGoalMinutes).toBeGreaterThan(0)
      expect(session.breakReminderEnabled).toBe(true)
    })
  })

  // ============================================
  // Session Retrieval Tests
  // ============================================

  describe('getSelfTrackingSession', () => {
    it('should retrieve existing session', () => {
      createSelfTrackingSession('alumni-123')
      const session = getSelfTrackingSession('alumni-123')

      expect(session).not.toBeNull()
      expect(session!.alumniId).toBe('alumni-123')
    })

    it('should return null for non-existent session', () => {
      const session = getSelfTrackingSession('non-existent')
      expect(session).toBeNull()
    })
  })

  // ============================================
  // Personal Goals Tests (AC2)
  // ============================================

  describe('logPersonalGoal (AC2)', () => {
    it('should log a personal goal', () => {
      createSelfTrackingSession('alumni-123')

      const goal = logPersonalGoal('alumni-123', 'Limit social media', 60)

      expect(goal).not.toBeNull()
      expect(goal!.description).toBe('Limit social media')
      expect(goal!.targetMinutes).toBe(60)
    })

    it('should return null if no session exists', () => {
      const goal = logPersonalGoal('non-existent', 'Goal', 60)
      expect(goal).toBeNull()
    })

    it('should generate unique goal IDs', () => {
      createSelfTrackingSession('alumni-123')

      const goal1 = logPersonalGoal('alumni-123', 'Goal 1', 60)
      const goal2 = logPersonalGoal('alumni-123', 'Goal 2', 30)

      expect(goal1!.id).not.toBe(goal2!.id)
    })
  })

  describe('getGoals', () => {
    it('should return all goals for alumni', () => {
      createSelfTrackingSession('alumni-123')
      logPersonalGoal('alumni-123', 'Goal 1', 60)
      logPersonalGoal('alumni-123', 'Goal 2', 30)

      const goals = getGoals('alumni-123')

      expect(goals).toHaveLength(2)
    })

    it('should return empty array if no goals', () => {
      createSelfTrackingSession('alumni-123')
      const goals = getGoals('alumni-123')

      expect(goals).toHaveLength(0)
    })

    it('should return empty array if no session', () => {
      const goals = getGoals('non-existent')
      expect(goals).toHaveLength(0)
    })
  })

  // ============================================
  // Progress Tracking Tests (AC2)
  // ============================================

  describe('updateGoalProgress', () => {
    it('should update goal progress', () => {
      createSelfTrackingSession('alumni-123')
      const goal = logPersonalGoal('alumni-123', 'Limit social media', 60)

      const result = updateGoalProgress('alumni-123', goal!.id, 45)

      expect(result).toBe(true)
    })

    it('should return false for non-existent goal', () => {
      createSelfTrackingSession('alumni-123')

      const result = updateGoalProgress('alumni-123', 'non-existent', 45)

      expect(result).toBe(false)
    })
  })

  describe('getProgressSummary (AC2)', () => {
    it('should return progress summary', () => {
      createSelfTrackingSession('alumni-123')
      logPersonalGoal('alumni-123', 'Goal 1', 60)

      const summary = getProgressSummary('alumni-123')

      expect(summary).not.toBeNull()
      expect(summary!.totalGoals).toBe(1)
    })

    it('should calculate completion percentage', () => {
      createSelfTrackingSession('alumni-123')
      const goal = logPersonalGoal('alumni-123', 'Goal', 100)
      updateGoalProgress('alumni-123', goal!.id, 50)

      const summary = getProgressSummary('alumni-123')

      expect(summary!.averageProgress).toBe(50)
    })

    it('should return null if no session', () => {
      const summary = getProgressSummary('non-existent')
      expect(summary).toBeNull()
    })
  })

  // ============================================
  // Local Data Verification Tests (AC4)
  // ============================================

  describe('verifyLocalDataOnly (AC4)', () => {
    it('should return true - all data stored locally', () => {
      createSelfTrackingSession('alumni-123')

      const result = verifyLocalDataOnly('alumni-123')

      expect(result).toBe(true)
    })

    it('should return false for non-existent session', () => {
      const result = verifyLocalDataOnly('non-existent')
      expect(result).toBe(false)
    })
  })

  // ============================================
  // Data Deletion Tests (AC4)
  // ============================================

  describe('deleteSelfTrackingData (AC4)', () => {
    it('should delete all self-tracking data for alumni', () => {
      createSelfTrackingSession('alumni-123')
      logPersonalGoal('alumni-123', 'Goal', 60)

      const result = deleteSelfTrackingData('alumni-123')

      expect(result).toBe(true)
      expect(getSelfTrackingSession('alumni-123')).toBeNull()
      expect(getGoals('alumni-123')).toHaveLength(0)
    })

    it('should return false for non-existent session', () => {
      const result = deleteSelfTrackingData('non-existent')
      expect(result).toBe(false)
    })
  })
})
