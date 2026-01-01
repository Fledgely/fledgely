/**
 * Agreement History Types and Constants Tests - Story 34.6
 *
 * Tests for agreement change history types and messaging constants.
 * AC1: Timeline with versions and dates
 * AC2: Who proposed, who accepted, what changed
 * AC4: "Updated X times" summary
 * AC5: Growth and trust-building messaging
 */

import { describe, it, expect } from 'vitest'
import {
  agreementVersionSchema,
  agreementChangeSchema,
  HISTORY_MESSAGES,
  getUpdateCountMessage,
  getGrowthMessage,
  type AgreementVersion,
  type AgreementChange,
} from './agreementHistory'

describe('Agreement History Types - Story 34.6', () => {
  describe('agreementChangeSchema', () => {
    it('should validate a valid field change', () => {
      const change: AgreementChange = {
        fieldPath: 'screenTime.weekday',
        fieldLabel: 'Weekday Screen Time',
        previousValue: '2 hours',
        newValue: '3 hours',
      }

      const result = agreementChangeSchema.safeParse(change)
      expect(result.success).toBe(true)
    })

    it('should validate a change with null previous value (new field)', () => {
      const change: AgreementChange = {
        fieldPath: 'chores.newTask',
        fieldLabel: 'New Chore',
        previousValue: null,
        newValue: 'Take out trash',
      }

      const result = agreementChangeSchema.safeParse(change)
      expect(result.success).toBe(true)
    })

    it('should validate a change with null new value (removed field)', () => {
      const change: AgreementChange = {
        fieldPath: 'bedtime.exception',
        fieldLabel: 'Bedtime Exception',
        previousValue: 'Weekends 10pm',
        newValue: null,
      }

      const result = agreementChangeSchema.safeParse(change)
      expect(result.success).toBe(true)
    })

    it('should require fieldPath', () => {
      const change = {
        fieldLabel: 'Some Field',
        previousValue: 'old',
        newValue: 'new',
      }

      const result = agreementChangeSchema.safeParse(change)
      expect(result.success).toBe(false)
    })

    it('should require fieldLabel', () => {
      const change = {
        fieldPath: 'some.path',
        previousValue: 'old',
        newValue: 'new',
      }

      const result = agreementChangeSchema.safeParse(change)
      expect(result.success).toBe(false)
    })
  })

  describe('agreementVersionSchema', () => {
    it('should validate a complete version record', () => {
      const version: AgreementVersion = {
        id: 'version-1',
        versionNumber: 1,
        proposerId: 'parent-1',
        proposerName: 'Mom',
        accepterId: 'parent-2',
        accepterName: 'Dad',
        changes: [
          {
            fieldPath: 'screenTime.weekday',
            fieldLabel: 'Weekday Screen Time',
            previousValue: '2 hours',
            newValue: '3 hours',
          },
        ],
        createdAt: new Date(),
        note: 'Discussed and agreed during family meeting',
      }

      const result = agreementVersionSchema.safeParse(version)
      expect(result.success).toBe(true)
    })

    it('should validate version without optional note', () => {
      const version: AgreementVersion = {
        id: 'version-2',
        versionNumber: 2,
        proposerId: 'parent-1',
        proposerName: 'Mom',
        accepterId: 'parent-2',
        accepterName: 'Dad',
        changes: [],
        createdAt: new Date(),
      }

      const result = agreementVersionSchema.safeParse(version)
      expect(result.success).toBe(true)
    })

    it('should require proposerId and proposerName (AC2: who proposed)', () => {
      const version = {
        id: 'version-1',
        versionNumber: 1,
        accepterId: 'parent-2',
        accepterName: 'Dad',
        changes: [],
        createdAt: new Date(),
      }

      const result = agreementVersionSchema.safeParse(version)
      expect(result.success).toBe(false)
    })

    it('should require accepterId and accepterName (AC2: who accepted)', () => {
      const version = {
        id: 'version-1',
        versionNumber: 1,
        proposerId: 'parent-1',
        proposerName: 'Mom',
        changes: [],
        createdAt: new Date(),
      }

      const result = agreementVersionSchema.safeParse(version)
      expect(result.success).toBe(false)
    })

    it('should require changes array (AC2: what changed)', () => {
      const version = {
        id: 'version-1',
        versionNumber: 1,
        proposerId: 'parent-1',
        proposerName: 'Mom',
        accepterId: 'parent-2',
        accepterName: 'Dad',
        createdAt: new Date(),
      }

      const result = agreementVersionSchema.safeParse(version)
      expect(result.success).toBe(false)
    })

    it('should require createdAt date (AC1: dates)', () => {
      const version = {
        id: 'version-1',
        versionNumber: 1,
        proposerId: 'parent-1',
        proposerName: 'Mom',
        accepterId: 'parent-2',
        accepterName: 'Dad',
        changes: [],
      }

      const result = agreementVersionSchema.safeParse(version)
      expect(result.success).toBe(false)
    })
  })

  describe('HISTORY_MESSAGES', () => {
    it('should have timeline section header', () => {
      expect(HISTORY_MESSAGES.timeline.header).toBeDefined()
      expect(typeof HISTORY_MESSAGES.timeline.header).toBe('string')
    })

    it('should have empty state message', () => {
      expect(HISTORY_MESSAGES.timeline.emptyState).toBeDefined()
      expect(typeof HISTORY_MESSAGES.timeline.emptyState).toBe('string')
    })

    it('should have growth-focused messages (AC5)', () => {
      expect(HISTORY_MESSAGES.growth).toBeDefined()
      expect(HISTORY_MESSAGES.growth.milestone).toBeDefined()
      expect(HISTORY_MESSAGES.growth.collaboration).toBeDefined()
      expect(HISTORY_MESSAGES.growth.evolution).toBeDefined()
    })

    it('should have diff section labels', () => {
      expect(HISTORY_MESSAGES.diff.header).toBeDefined()
      expect(HISTORY_MESSAGES.diff.previous).toBeDefined()
      expect(HISTORY_MESSAGES.diff.current).toBeDefined()
    })

    it('should have export section labels', () => {
      expect(HISTORY_MESSAGES.export.button).toBeDefined()
      expect(HISTORY_MESSAGES.export.success).toBeDefined()
    })

    it('should use positive, non-judgmental language', () => {
      const allMessages = JSON.stringify(HISTORY_MESSAGES).toLowerCase()
      expect(allMessages).not.toContain('failed')
      expect(allMessages).not.toContain('wrong')
      expect(allMessages).not.toContain('bad')
    })
  })

  describe('getUpdateCountMessage (AC4)', () => {
    it('should return singular message for 1 update', () => {
      const message = getUpdateCountMessage(1)
      expect(message).toContain('1')
      expect(message).toContain('time')
      expect(message).not.toContain('times')
    })

    it('should return plural message for multiple updates', () => {
      const message = getUpdateCountMessage(5)
      expect(message).toContain('5')
      expect(message).toContain('times')
    })

    it('should handle zero updates', () => {
      const message = getUpdateCountMessage(0)
      expect(message).toBeDefined()
      expect(typeof message).toBe('string')
    })

    it('should use encouraging language', () => {
      const message = getUpdateCountMessage(3)
      expect(message.toLowerCase()).toMatch(/updated|evolved|grown|changed/)
    })
  })

  describe('getGrowthMessage (AC5)', () => {
    it('should return milestone message for 5+ versions', () => {
      const message = getGrowthMessage(5)
      expect(message).toBeDefined()
      expect(message.length).toBeGreaterThan(0)
    })

    it('should return milestone message for 10+ versions', () => {
      const message = getGrowthMessage(10)
      expect(message).toBeDefined()
      expect(message.length).toBeGreaterThan(0)
    })

    it('should return different messages for different milestones', () => {
      const message5 = getGrowthMessage(5)
      const message10 = getGrowthMessage(10)
      expect(message5).not.toBe(message10)
    })

    it('should return collaboration message for fewer versions', () => {
      const message = getGrowthMessage(2)
      expect(message).toBeDefined()
    })

    it('should emphasize trust-building', () => {
      const message = getGrowthMessage(7)
      const lowerMessage = message.toLowerCase()
      expect(
        lowerMessage.includes('trust') ||
          lowerMessage.includes('together') ||
          lowerMessage.includes('collaboration') ||
          lowerMessage.includes('growing') ||
          lowerMessage.includes('evolving')
      ).toBe(true)
    })
  })
})
