/**
 * Trust Regression Service Tests - Story 37.6 Task 2
 *
 * Tests for trust regression management service.
 * AC1: 2-week grace period before monitoring increases
 * AC3: Conversation-first approach, not automatic punishment
 * AC4: Parent-child discussion encouraged before changes
 * AC5: Child can explain circumstances
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  createRegressionEvent,
  getRegressionEventById,
  getRegressionStatus,
  isInGracePeriod,
  isConversationRequired,
  getGraceDaysRemaining,
  recordChildExplanation,
  markConversationHeld,
  resolveRegression,
  revertMonitoring,
  updateEventStatus,
  canChangeMonitoring,
  getRegressionSummary,
  clearAllEvents,
  getAllEventsForChild,
} from './trustRegressionService'
import { DEFAULT_REGRESSION_CONFIG } from '../contracts/trustRegression'

describe('TrustRegressionService - Story 37.6 Task 2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))
    clearAllEvents()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createRegressionEvent (AC1)', () => {
    it('should create event with 2-week grace period', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')

      expect(event.childId).toBe('child-123')
      expect(event.previousMilestone).toBe('maturing')
      expect(event.currentMilestone).toBe('growing')
      expect(event.status).toBe('grace_period')
      expect(event.conversationHeld).toBe(false)

      // Check grace period is ~14 days
      const graceDays = Math.round(
        (event.graceExpiresAt.getTime() - event.occurredAt.getTime()) / (24 * 60 * 60 * 1000)
      )
      expect(graceDays).toBe(14)
    })

    it('should reject invalid regression (progression)', () => {
      expect(() => createRegressionEvent('child-123', 'growing', 'maturing')).toThrow(
        'Invalid regression'
      )
    })

    it('should reject same milestone', () => {
      expect(() => createRegressionEvent('child-123', 'maturing', 'maturing')).toThrow(
        'Invalid regression'
      )
    })

    it('should allow custom grace period via config', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing', {
        ...DEFAULT_REGRESSION_CONFIG,
        gracePeriodDays: 21,
      })

      const graceDays = Math.round(
        (event.graceExpiresAt.getTime() - event.occurredAt.getTime()) / (24 * 60 * 60 * 1000)
      )
      expect(graceDays).toBe(21)
    })
  })

  describe('getRegressionEventById', () => {
    it('should return event by ID', () => {
      const created = createRegressionEvent('child-123', 'maturing', 'growing')
      const retrieved = getRegressionEventById(created.id)

      expect(retrieved).toEqual(created)
    })

    it('should return null for unknown ID', () => {
      expect(getRegressionEventById('unknown-id')).toBeNull()
    })
  })

  describe('getRegressionStatus', () => {
    it('should return active regression for child', () => {
      const created = createRegressionEvent('child-123', 'maturing', 'growing')
      const status = getRegressionStatus('child-123')

      expect(status).toEqual(created)
    })

    it('should return null for child without regression', () => {
      expect(getRegressionStatus('child-456')).toBeNull()
    })

    it('should return null for resolved regression', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event.id)
      resolveRegression(event.id)

      expect(getRegressionStatus('child-123')).toBeNull()
    })
  })

  describe('isInGracePeriod (AC1)', () => {
    it('should return true during grace period', () => {
      createRegressionEvent('child-123', 'maturing', 'growing')

      expect(isInGracePeriod('child-123')).toBe(true)
    })

    it('should return false after grace period expires', () => {
      createRegressionEvent('child-123', 'maturing', 'growing')

      // Advance 15 days
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))

      expect(isInGracePeriod('child-123')).toBe(false)
    })

    it('should return false for child without regression', () => {
      expect(isInGracePeriod('child-456')).toBe(false)
    })
  })

  describe('isConversationRequired (AC3)', () => {
    it('should return true when conversation not held', () => {
      createRegressionEvent('child-123', 'maturing', 'growing')

      expect(isConversationRequired('child-123')).toBe(true)
    })

    it('should return false after conversation held', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event.id)

      expect(isConversationRequired('child-123')).toBe(false)
    })

    it('should return false for child without regression', () => {
      expect(isConversationRequired('child-456')).toBe(false)
    })
  })

  describe('getGraceDaysRemaining', () => {
    it('should return correct days remaining', () => {
      createRegressionEvent('child-123', 'maturing', 'growing')

      expect(getGraceDaysRemaining('child-123')).toBe(14)

      // Advance 7 days
      vi.setSystemTime(new Date('2025-01-08T12:00:00Z'))
      expect(getGraceDaysRemaining('child-123')).toBe(7)
    })

    it('should return 0 after grace period', () => {
      createRegressionEvent('child-123', 'maturing', 'growing')

      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))
      expect(getGraceDaysRemaining('child-123')).toBe(0)
    })

    it('should return 0 for child without regression', () => {
      expect(getGraceDaysRemaining('child-456')).toBe(0)
    })
  })

  describe('recordChildExplanation (AC5)', () => {
    it('should record child explanation', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      const explanation = 'I was stressed about exams and made poor choices.'

      const updated = recordChildExplanation(event.id, explanation)

      expect(updated.childExplanation).toBe(explanation)
    })

    it('should throw for unknown event', () => {
      expect(() => recordChildExplanation('unknown-id', 'explanation')).toThrow('not found')
    })

    it('should throw for resolved event', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event.id)
      resolveRegression(event.id)

      expect(() => recordChildExplanation(event.id, 'explanation')).toThrow('resolved/reverted')
    })
  })

  describe('markConversationHeld (AC3, AC4)', () => {
    it('should mark conversation as held', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')

      const updated = markConversationHeld(event.id)

      expect(updated.conversationHeld).toBe(true)
      expect(updated.conversationHeldAt).toBeDefined()
    })

    it('should accept optional parent notes', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      const notes = 'We discussed stress management strategies.'

      const updated = markConversationHeld(event.id, notes)

      expect(updated.parentNotes).toBe(notes)
    })

    it('should throw for unknown event', () => {
      expect(() => markConversationHeld('unknown-id')).toThrow('not found')
    })

    it('should throw for resolved event', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event.id)
      resolveRegression(event.id)

      expect(() => markConversationHeld(event.id)).toThrow('resolved/reverted')
    })
  })

  describe('resolveRegression', () => {
    it('should resolve regression after conversation', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event.id)

      const resolved = resolveRegression(event.id)

      expect(resolved.status).toBe('resolved')
    })

    it('should require conversation first (AC3)', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')

      expect(() => resolveRegression(event.id)).toThrow('Conversation must be held')
    })

    it('should throw for unknown event', () => {
      expect(() => resolveRegression('unknown-id')).toThrow('not found')
    })

    it('should throw if already resolved', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event.id)
      resolveRegression(event.id)

      expect(() => resolveRegression(event.id)).toThrow('already resolved')
    })
  })

  describe('revertMonitoring (AC3)', () => {
    it('should revert monitoring after conversation', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event.id)

      const reverted = revertMonitoring(event.id)

      expect(reverted.status).toBe('reverted')
    })

    it('should require conversation first - not automatic (AC3)', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')

      expect(() => revertMonitoring(event.id)).toThrow('Conversation must be held')
    })

    it('should throw for unknown event', () => {
      expect(() => revertMonitoring('unknown-id')).toThrow('not found')
    })

    it('should throw if already reverted', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event.id)
      revertMonitoring(event.id)

      expect(() => revertMonitoring(event.id)).toThrow('already resolved')
    })
  })

  describe('updateEventStatus', () => {
    it('should update status when grace period expires', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')

      // Advance 15 days
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))

      const updated = updateEventStatus(event.id)

      expect(updated?.status).toBe('awaiting_conversation')
    })

    it('should not change status during grace period', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')

      const updated = updateEventStatus(event.id)

      expect(updated?.status).toBe('grace_period')
    })

    it('should return null for unknown event', () => {
      expect(updateEventStatus('unknown-id')).toBeNull()
    })
  })

  describe('canChangeMonitoring', () => {
    it('should return true for child without regression', () => {
      expect(canChangeMonitoring('child-456')).toBe(true)
    })

    it('should return false during grace period', () => {
      createRegressionEvent('child-123', 'maturing', 'growing')

      expect(canChangeMonitoring('child-123')).toBe(false)
    })

    it('should return false without conversation even after grace', () => {
      createRegressionEvent('child-123', 'maturing', 'growing')

      // Advance 15 days
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))

      expect(canChangeMonitoring('child-123')).toBe(false)
    })

    it('should return true after grace period + conversation', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')

      // Advance 15 days
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))

      markConversationHeld(event.id)

      expect(canChangeMonitoring('child-123')).toBe(true)
    })
  })

  describe('getRegressionSummary', () => {
    it('should return no regression for child without events', () => {
      const summary = getRegressionSummary('child-456')

      expect(summary.hasActiveRegression).toBe(false)
      expect(summary.isInGracePeriod).toBe(false)
      expect(summary.daysRemaining).toBe(0)
      expect(summary.conversationHeld).toBe(false)
      expect(summary.childExplained).toBe(false)
      expect(summary.status).toBeNull()
    })

    it('should return full summary for active regression', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      recordChildExplanation(event.id, 'My explanation')

      const summary = getRegressionSummary('child-123')

      expect(summary.hasActiveRegression).toBe(true)
      expect(summary.isInGracePeriod).toBe(true)
      expect(summary.daysRemaining).toBe(14)
      expect(summary.conversationHeld).toBe(false)
      expect(summary.childExplained).toBe(true)
      expect(summary.status).toBe('grace_period')
    })

    it('should reflect conversation status', () => {
      const event = createRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event.id)

      const summary = getRegressionSummary('child-123')

      expect(summary.conversationHeld).toBe(true)
    })
  })

  describe('getAllEventsForChild', () => {
    it('should return all events for child', () => {
      const event1 = createRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event1.id)
      resolveRegression(event1.id)

      // Create a new regression after resolution
      vi.setSystemTime(new Date('2025-02-01T12:00:00Z'))
      createRegressionEvent('child-123', 'readyForIndependence', 'maturing')

      const events = getAllEventsForChild('child-123')

      expect(events.length).toBe(2)
    })

    it('should return empty array for child without events', () => {
      expect(getAllEventsForChild('child-456')).toEqual([])
    })

    it('should sort by occurredAt descending', () => {
      const event1 = createRegressionEvent('child-123', 'maturing', 'growing')
      markConversationHeld(event1.id)
      resolveRegression(event1.id)

      vi.setSystemTime(new Date('2025-02-01T12:00:00Z'))
      const event2 = createRegressionEvent('child-123', 'readyForIndependence', 'maturing')

      const events = getAllEventsForChild('child-123')

      expect(events[0].id).toBe(event2.id) // Most recent first
    })
  })

  describe('AC Verification', () => {
    describe('AC1: 2-week grace period', () => {
      it('should enforce 2-week grace period', () => {
        createRegressionEvent('child-123', 'maturing', 'growing')

        // Day 0: In grace period
        expect(isInGracePeriod('child-123')).toBe(true)
        expect(getGraceDaysRemaining('child-123')).toBe(14)

        // Day 7: Still in grace period
        vi.setSystemTime(new Date('2025-01-08T12:00:00Z'))
        expect(isInGracePeriod('child-123')).toBe(true)
        expect(getGraceDaysRemaining('child-123')).toBe(7)

        // Day 14: Still in grace period (boundary)
        vi.setSystemTime(new Date('2025-01-15T11:00:00Z'))
        expect(isInGracePeriod('child-123')).toBe(true)

        // Day 15: Grace period expired
        vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))
        expect(isInGracePeriod('child-123')).toBe(false)
        expect(getGraceDaysRemaining('child-123')).toBe(0)
      })
    })

    describe('AC3: Conversation-first approach', () => {
      it('should require conversation before any changes', () => {
        const event = createRegressionEvent('child-123', 'maturing', 'growing')

        // Cannot change without conversation
        expect(() => resolveRegression(event.id)).toThrow('Conversation must be held')
        expect(() => revertMonitoring(event.id)).toThrow('Conversation must be held')

        // After conversation, can change
        markConversationHeld(event.id)
        expect(() => resolveRegression(event.id)).not.toThrow()
      })

      it('should not automatically revert monitoring', () => {
        const event = createRegressionEvent('child-123', 'maturing', 'growing')

        // Advance past grace period
        vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))
        updateEventStatus(event.id)

        // Status should be awaiting_conversation, not reverted
        const updated = getRegressionEventById(event.id)
        expect(updated?.status).toBe('awaiting_conversation')
        expect(updated?.status).not.toBe('reverted')
      })
    })

    describe('AC4: Parent-child discussion encouraged', () => {
      it('should allow marking conversation with notes', () => {
        const event = createRegressionEvent('child-123', 'maturing', 'growing')

        const updated = markConversationHeld(
          event.id,
          'We discussed strategies for managing stress.'
        )

        expect(updated.conversationHeld).toBe(true)
        expect(updated.parentNotes).toContain('strategies')
      })
    })

    describe('AC5: Child can explain circumstances', () => {
      it('should allow child to provide explanation', () => {
        const event = createRegressionEvent('child-123', 'maturing', 'growing')

        const explanation = 'I was going through a hard time with school and friends.'
        const updated = recordChildExplanation(event.id, explanation)

        expect(updated.childExplanation).toBe(explanation)
      })

      it('should include child explanation in summary', () => {
        const event = createRegressionEvent('child-123', 'maturing', 'growing')
        recordChildExplanation(event.id, 'My explanation')

        const summary = getRegressionSummary('child-123')
        expect(summary.childExplained).toBe(true)
      })
    })
  })
})
