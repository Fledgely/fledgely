/**
 * Tests for Child Notification Preferences Service.
 *
 * Story 41.7: Child Notification Preferences - AC4, AC6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Create mock functions before using them in mock
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockDelete = vi.fn().mockResolvedValue(undefined)
const mockGet = vi.fn()
const mockTransactionGet = vi.fn()
const mockTransactionSet = vi.fn()

// Mock firebase-admin/firestore using factory
vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({
              set: mockSet,
              get: mockGet,
              delete: mockDelete,
            })),
          })),
        })),
      })),
      runTransaction: vi.fn(async (callback) => {
        const transaction = {
          get: mockTransactionGet,
          set: mockTransactionSet,
        }
        return callback(transaction)
      }),
    })),
  }
})

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

import {
  getChildNotificationPreferences,
  updateChildNotificationPreferences,
  initializeChildPreferences,
  deleteChildPreferences,
  childPreferencesExist,
  _resetDbForTesting,
} from './childNotificationPreferencesService'
import { CHILD_QUIET_HOURS_DEFAULTS } from '@fledgely/shared'

describe('childNotificationPreferencesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransactionGet.mockReset()
    mockTransactionSet.mockReset()
    _resetDbForTesting()
  })

  afterEach(() => {
    _resetDbForTesting()
  })

  describe('getChildNotificationPreferences', () => {
    it('returns existing preferences', async () => {
      const existingPrefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: true,
        weeklySummaryEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '20:00',
        quietHoursEnd: '08:00',
        updatedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      }

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => existingPrefs,
      })

      const result = await getChildNotificationPreferences('child-123', 'family-456')

      expect(result.childId).toBe('child-123')
      expect(result.trustScoreChangesEnabled).toBe(true)
      expect(result.weeklySummaryEnabled).toBe(false)
      expect(result.quietHoursEnabled).toBe(true)
      expect(result.quietHoursStart).toBe('20:00')
    })

    it('creates default preferences if not exists', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      })

      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10) // 10-year-old

      const result = await getChildNotificationPreferences('child-123', 'family-456', birthDate)

      expect(result.childId).toBe('child-123')
      expect(result.familyId).toBe('family-456')
      expect(result.timeLimitWarningsEnabled).toBe(true) // Always true
      expect(result.agreementChangesEnabled).toBe(true) // Always true
      expect(result.trustScoreChangesEnabled).toBe(false) // Age 10 = minimal
      expect(result.weeklySummaryEnabled).toBe(false) // Age 10 = minimal
      expect(result.quietHoursEnabled).toBe(false)
      expect(result.quietHoursStart).toBe(CHILD_QUIET_HOURS_DEFAULTS.start)
      expect(result.quietHoursEnd).toBe(CHILD_QUIET_HOURS_DEFAULTS.end)

      expect(mockSet).toHaveBeenCalled()
    })

    it('creates default preferences with age 12 default when no birthDate', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      })

      const result = await getChildNotificationPreferences('child-123', 'family-456')

      expect(result.trustScoreChangesEnabled).toBe(false) // Age 12 = minimal
      expect(result.weeklySummaryEnabled).toBe(false) // Age 12 = minimal
    })

    it('enforces required notifications are always true', async () => {
      const existingPrefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: false, // Stored as false
        agreementChangesEnabled: false, // Stored as false
        trustScoreChangesEnabled: true,
        weeklySummaryEnabled: true,
        quietHoursEnabled: false,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        updatedAt: new Date(),
        createdAt: new Date(),
      }

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => existingPrefs,
      })

      const result = await getChildNotificationPreferences('child-123', 'family-456')

      // Should always be true regardless of stored value
      expect(result.timeLimitWarningsEnabled).toBe(true)
      expect(result.agreementChangesEnabled).toBe(true)
    })

    it('handles Firestore timestamp conversion', async () => {
      const firestoreTimestamp = {
        toDate: () => new Date('2024-01-15T10:00:00Z'),
      }

      const existingPrefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: false,
        weeklySummaryEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        updatedAt: firestoreTimestamp,
        createdAt: firestoreTimestamp,
      }

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => existingPrefs,
      })

      const result = await getChildNotificationPreferences('child-123', 'family-456')

      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(result.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('updateChildNotificationPreferences', () => {
    it('updates optional notification settings', async () => {
      const existingPrefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: false,
        weeklySummaryEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        updatedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      }

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => existingPrefs,
      })

      const result = await updateChildNotificationPreferences('child-123', 'family-456', {
        trustScoreChangesEnabled: true,
        weeklySummaryEnabled: true,
      })

      expect(result.trustScoreChangesEnabled).toBe(true)
      expect(result.weeklySummaryEnabled).toBe(true)
      expect(mockSet).toHaveBeenCalled()
    })

    it('updates quiet hours settings', async () => {
      const existingPrefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: false,
        weeklySummaryEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        updatedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      }

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => existingPrefs,
      })

      const result = await updateChildNotificationPreferences('child-123', 'family-456', {
        quietHoursEnabled: true,
        quietHoursStart: '20:00',
        quietHoursEnd: '08:00',
      })

      expect(result.quietHoursEnabled).toBe(true)
      expect(result.quietHoursStart).toBe('20:00')
      expect(result.quietHoursEnd).toBe('08:00')
    })

    it('preserves required notifications as true', async () => {
      const existingPrefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: false,
        weeklySummaryEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        updatedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      }

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => existingPrefs,
      })

      const result = await updateChildNotificationPreferences('child-123', 'family-456', {
        trustScoreChangesEnabled: true,
      })

      // Required fields should always be true
      expect(result.timeLimitWarningsEnabled).toBe(true)
      expect(result.agreementChangesEnabled).toBe(true)
    })

    it('updates timestamp on update', async () => {
      const oldDate = new Date('2024-01-01')
      const existingPrefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: false,
        weeklySummaryEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        updatedAt: oldDate,
        createdAt: oldDate,
      }

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => existingPrefs,
      })

      const result = await updateChildNotificationPreferences('child-123', 'family-456', {
        trustScoreChangesEnabled: true,
      })

      expect(result.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime())
      expect(result.createdAt).toEqual(oldDate)
    })
  })

  describe('initializeChildPreferences', () => {
    it('creates preferences with age-appropriate defaults for young child', async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: false,
      })

      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const result = await initializeChildPreferences('child-123', 'family-456', birthDate)

      expect(result.trustScoreChangesEnabled).toBe(false) // Age 10 = minimal
      expect(result.weeklySummaryEnabled).toBe(false) // Age 10 = minimal
      expect(mockTransactionSet).toHaveBeenCalled()
    })

    it('creates preferences with age-appropriate defaults for teen', async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: false,
      })

      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 14)

      const result = await initializeChildPreferences('child-123', 'family-456', birthDate)

      expect(result.trustScoreChangesEnabled).toBe(true) // Age 14 = moderate
      expect(result.weeklySummaryEnabled).toBe(false) // Age 14 = moderate
    })

    it('creates preferences with age-appropriate defaults for older teen', async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: false,
      })

      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 17)

      const result = await initializeChildPreferences('child-123', 'family-456', birthDate)

      expect(result.trustScoreChangesEnabled).toBe(true) // Age 17 = full
      expect(result.weeklySummaryEnabled).toBe(true) // Age 17 = full
    })

    it('skips initialization if preferences already exist', async () => {
      const existingPrefs = {
        id: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: true,
        weeklySummaryEnabled: true,
        quietHoursEnabled: false,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        updatedAt: { toDate: () => new Date() },
        createdAt: { toDate: () => new Date() },
      }

      // Transaction get returns existing document
      mockTransactionGet.mockResolvedValueOnce({
        exists: true,
        data: () => existingPrefs,
      })

      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const result = await initializeChildPreferences('child-123', 'family-456', birthDate)

      // Should return existing preferences, not create new ones
      expect(result.trustScoreChangesEnabled).toBe(true)
      expect(result.weeklySummaryEnabled).toBe(true)
      // Transaction set should not be called since it already exists
      expect(mockTransactionSet).not.toHaveBeenCalled()
    })
  })

  describe('deleteChildPreferences', () => {
    it('deletes preferences', async () => {
      await deleteChildPreferences('child-123')

      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe('childPreferencesExist', () => {
    it('returns true when preferences exist', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
      })

      const result = await childPreferencesExist('child-123')

      expect(result).toBe(true)
    })

    it('returns false when preferences do not exist', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      })

      const result = await childPreferencesExist('child-123')

      expect(result).toBe(false)
    })
  })
})
