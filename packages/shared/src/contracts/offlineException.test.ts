/**
 * Offline Exception Schema Tests - Story 32.5
 *
 * Tests for offline time exception data models.
 */

import { describe, it, expect } from 'vitest'
import {
  OFFLINE_EXCEPTION_TYPE_VALUES,
  offlineExceptionTypeSchema,
  OFFLINE_EXCEPTION_STATUS_VALUES,
  offlineExceptionStatusSchema,
  offlineExceptionSchema,
  OFFLINE_EXCEPTION_MESSAGES,
  type OfflineException,
} from './index'

describe('offlineExceptionTypeSchema - Story 32.5', () => {
  it('accepts valid exception types', () => {
    expect(offlineExceptionTypeSchema.parse('pause')).toBe('pause')
    expect(offlineExceptionTypeSchema.parse('skip')).toBe('skip')
    expect(offlineExceptionTypeSchema.parse('work')).toBe('work')
    expect(offlineExceptionTypeSchema.parse('homework')).toBe('homework')
  })

  it('rejects invalid exception types', () => {
    expect(() => offlineExceptionTypeSchema.parse('invalid')).toThrow()
    expect(() => offlineExceptionTypeSchema.parse('')).toThrow()
    expect(() => offlineExceptionTypeSchema.parse(123)).toThrow()
  })

  it('has all expected type values', () => {
    expect(OFFLINE_EXCEPTION_TYPE_VALUES).toContain('pause')
    expect(OFFLINE_EXCEPTION_TYPE_VALUES).toContain('skip')
    expect(OFFLINE_EXCEPTION_TYPE_VALUES).toContain('work')
    expect(OFFLINE_EXCEPTION_TYPE_VALUES).toContain('homework')
    expect(OFFLINE_EXCEPTION_TYPE_VALUES).toHaveLength(4)
  })
})

describe('offlineExceptionStatusSchema - Story 32.5', () => {
  it('accepts valid status values', () => {
    expect(offlineExceptionStatusSchema.parse('active')).toBe('active')
    expect(offlineExceptionStatusSchema.parse('completed')).toBe('completed')
    expect(offlineExceptionStatusSchema.parse('cancelled')).toBe('cancelled')
  })

  it('rejects invalid status values', () => {
    expect(() => offlineExceptionStatusSchema.parse('invalid')).toThrow()
    expect(() => offlineExceptionStatusSchema.parse('pending')).toThrow()
  })

  it('has all expected status values', () => {
    expect(OFFLINE_EXCEPTION_STATUS_VALUES).toContain('active')
    expect(OFFLINE_EXCEPTION_STATUS_VALUES).toContain('completed')
    expect(OFFLINE_EXCEPTION_STATUS_VALUES).toContain('cancelled')
    expect(OFFLINE_EXCEPTION_STATUS_VALUES).toHaveLength(3)
  })
})

describe('offlineExceptionSchema - Story 32.5', () => {
  const validException: OfflineException = {
    id: 'exception-123',
    familyId: 'family-456',
    type: 'pause',
    requestedBy: 'parent-789',
    requestedByName: 'Mom',
    startTime: 1704067200000,
    endTime: 1704070800000,
    status: 'active',
    createdAt: 1704067200000,
  }

  it('validates complete exception record', () => {
    expect(() => offlineExceptionSchema.parse(validException)).not.toThrow()
  })

  it('allows null endTime for open-ended exceptions', () => {
    const openEndedException = { ...validException, endTime: null }
    expect(() => offlineExceptionSchema.parse(openEndedException)).not.toThrow()
  })

  it('allows optional fields to be missing', () => {
    const minimalException: OfflineException = {
      id: 'exception-123',
      familyId: 'family-456',
      type: 'skip',
      requestedBy: 'parent-789',
      startTime: 1704067200000,
      endTime: null,
      status: 'active',
      createdAt: 1704067200000,
    }
    expect(() => offlineExceptionSchema.parse(minimalException)).not.toThrow()
  })

  it('accepts whitelisted URLs for work exception', () => {
    const workException: OfflineException = {
      ...validException,
      type: 'work',
      whitelistedUrls: ['slack.com', 'github.com', 'jira.atlassian.com'],
    }
    expect(() => offlineExceptionSchema.parse(workException)).not.toThrow()
    const parsed = offlineExceptionSchema.parse(workException)
    expect(parsed.whitelistedUrls).toHaveLength(3)
  })

  it('accepts whitelisted categories for homework exception', () => {
    const homeworkException: OfflineException = {
      ...validException,
      type: 'homework',
      approvedBy: 'parent-789',
      whitelistedCategories: ['education', 'reference'],
    }
    expect(() => offlineExceptionSchema.parse(homeworkException)).not.toThrow()
    const parsed = offlineExceptionSchema.parse(homeworkException)
    expect(parsed.whitelistedCategories).toContain('education')
  })

  it('requires all mandatory fields', () => {
    expect(() => offlineExceptionSchema.parse({})).toThrow()
    expect(() => offlineExceptionSchema.parse({ id: 'test' })).toThrow()
    expect(() => offlineExceptionSchema.parse({ id: 'test', familyId: 'f' })).toThrow()
  })

  it('validates type enum', () => {
    const invalidTypeException = { ...validException, type: 'invalid' }
    expect(() => offlineExceptionSchema.parse(invalidTypeException)).toThrow()
  })

  it('validates status enum', () => {
    const invalidStatusException = { ...validException, status: 'invalid' }
    expect(() => offlineExceptionSchema.parse(invalidStatusException)).toThrow()
  })
})

describe('OFFLINE_EXCEPTION_MESSAGES - Story 32.5', () => {
  describe('type labels', () => {
    it('has labels for all exception types', () => {
      expect(OFFLINE_EXCEPTION_MESSAGES.pause).toBe('Pause')
      expect(OFFLINE_EXCEPTION_MESSAGES.skip).toBe('Skip Tonight')
      expect(OFFLINE_EXCEPTION_MESSAGES.work).toBe('Work Exception')
      expect(OFFLINE_EXCEPTION_MESSAGES.homework).toBe('Homework Exception')
    })
  })

  describe('action messages', () => {
    it('generates pause messages', () => {
      expect(OFFLINE_EXCEPTION_MESSAGES.pauseStarted('Mom')).toBe('Mom paused offline time')
      expect(OFFLINE_EXCEPTION_MESSAGES.pauseEnded('Dad')).toBe('Dad resumed offline time')
    })

    it('generates skip message', () => {
      expect(OFFLINE_EXCEPTION_MESSAGES.skipActivated('Mom')).toBe(
        "Mom skipped tonight's offline time"
      )
    })

    it('generates work exception message', () => {
      expect(OFFLINE_EXCEPTION_MESSAGES.workExceptionStarted('Dad')).toBe(
        'Dad is working during offline time'
      )
    })

    it('generates homework messages', () => {
      expect(OFFLINE_EXCEPTION_MESSAGES.homeworkRequested('Emma')).toBe(
        'Emma requested homework time'
      )
      expect(OFFLINE_EXCEPTION_MESSAGES.homeworkApproved('Mom', 'Emma')).toBe(
        "Mom approved Emma's homework request"
      )
      expect(OFFLINE_EXCEPTION_MESSAGES.homeworkDenied('Dad', 'Jack')).toBe(
        "Dad denied Jack's homework request"
      )
    })
  })

  describe('time messages', () => {
    it('handles singular minute', () => {
      expect(OFFLINE_EXCEPTION_MESSAGES.timeRemaining(1)).toBe('1 minute remaining')
    })

    it('handles plural minutes', () => {
      expect(OFFLINE_EXCEPTION_MESSAGES.timeRemaining(5)).toBe('5 minutes remaining')
      expect(OFFLINE_EXCEPTION_MESSAGES.timeRemaining(30)).toBe('30 minutes remaining')
    })
  })

  describe('child-friendly messages', () => {
    it('has pause message for children', () => {
      expect(OFFLINE_EXCEPTION_MESSAGES.childPauseMessage).toContain('paused')
    })

    it('has skip message for children', () => {
      expect(OFFLINE_EXCEPTION_MESSAGES.childSkipMessage).toContain('skipped')
      expect(OFFLINE_EXCEPTION_MESSAGES.childSkipMessage).toContain('Enjoy')
    })

    it('has work message for children', () => {
      expect(OFFLINE_EXCEPTION_MESSAGES.childWorkMessage('Dad')).toContain('Dad')
      expect(OFFLINE_EXCEPTION_MESSAGES.childWorkMessage('Dad')).toContain('working')
    })

    it('has homework active message for children', () => {
      expect(OFFLINE_EXCEPTION_MESSAGES.childHomeworkActive).toContain('homework mode')
    })
  })
})
