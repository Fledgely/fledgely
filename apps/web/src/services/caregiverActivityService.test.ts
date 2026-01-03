/**
 * Tests for Caregiver Activity Service
 *
 * Story 39.6: Caregiver Action Logging - AC1, AC2, AC3, AC4, AC5
 *
 * Tests cover:
 * - Formatting functions (pure functions, no Firebase needed)
 * - Activity log fetching (with mocks)
 * - Summary aggregation (with mocks)
 * - Child-friendly formatting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CaregiverAuditLog, CaregiverActivitySummary } from '@fledgely/shared'

// Mock declarations must be before imports
const mockGetDocs = vi.fn()
const mockOnSnapshot = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'auditLogsRef'),
  query: vi.fn(() => 'queryRef'),
  where: vi.fn(() => 'whereConstraint'),
  orderBy: vi.fn(() => 'orderByConstraint'),
  limit: vi.fn(() => 'limitConstraint'),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

// Import after mocks
import {
  getCaregiverActivity,
  getCaregiverActivitySummaries,
  formatActivitySummary,
  formatActivityDescription,
  formatActivityForChild,
  getActivityForChild,
  getWeeklyActivitySummaries,
} from './caregiverActivityService'

describe('caregiverActivityService', () => {
  const mockLogs: CaregiverAuditLog[] = [
    {
      id: 'log-1',
      familyId: 'family-123',
      caregiverUid: 'caregiver-1',
      caregiverName: 'Grandma',
      action: 'time_extension',
      changedByUid: 'caregiver-1',
      changes: { extensionMinutes: 30, childId: 'child-1' },
      childUid: 'child-1',
      childName: 'Emma',
      createdAt: new Date('2025-12-30T14:00:00'),
    },
    {
      id: 'log-2',
      familyId: 'family-123',
      caregiverUid: 'caregiver-1',
      caregiverName: 'Grandma',
      action: 'flag_viewed',
      changedByUid: 'caregiver-1',
      changes: { flagId: 'flag-1' },
      childUid: 'child-1',
      childName: 'Emma',
      createdAt: new Date('2025-12-30T15:00:00'),
    },
    {
      id: 'log-3',
      familyId: 'family-123',
      caregiverUid: 'caregiver-2',
      caregiverName: 'Grandpa',
      action: 'time_extension',
      changedByUid: 'caregiver-2',
      changes: { extensionMinutes: 15, childId: 'child-2' },
      childUid: 'child-2',
      childName: 'Liam',
      createdAt: new Date('2025-12-30T16:00:00'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup getDocs mock to return mock logs
    mockGetDocs.mockResolvedValue({
      forEach: (cb: (doc: { id: string; data: () => unknown }) => void) => {
        mockLogs.forEach((log) => {
          cb({
            id: log.id,
            data: () => ({
              ...log,
              createdAt: { toDate: () => log.createdAt },
            }),
          })
        })
      },
    })
  })

  describe('getCaregiverActivity', () => {
    it('should fetch all activity for a family', async () => {
      const logs = await getCaregiverActivity({ familyId: 'family-123' })

      expect(logs).toHaveLength(3)
      expect(logs[0].id).toBe('log-1')
    })

    it('should filter by caregiver UID', async () => {
      const logs = await getCaregiverActivity({
        familyId: 'family-123',
        caregiverUid: 'caregiver-1',
      })

      expect(logs).toHaveLength(2)
      expect(logs.every((l) => l.caregiverUid === 'caregiver-1')).toBe(true)
    })

    it('should filter by child UID', async () => {
      const logs = await getCaregiverActivity({
        familyId: 'family-123',
        childUid: 'child-1',
      })

      expect(logs).toHaveLength(2)
      expect(logs.every((l) => l.childUid === 'child-1')).toBe(true)
    })

    it('should filter by action type', async () => {
      const logs = await getCaregiverActivity({
        familyId: 'family-123',
        action: 'time_extension',
      })

      expect(logs).toHaveLength(2)
      expect(logs.every((l) => l.action === 'time_extension')).toBe(true)
    })

    it('should respect limit', async () => {
      const logs = await getCaregiverActivity({
        familyId: 'family-123',
        limit: 2,
      })

      expect(logs).toHaveLength(2)
    })
  })

  describe('getCaregiverActivitySummaries', () => {
    it('should aggregate by caregiver', async () => {
      const caregiverNames = {
        'caregiver-1': 'Grandma',
        'caregiver-2': 'Grandpa',
      }

      const summaries = await getCaregiverActivitySummaries(
        { familyId: 'family-123' },
        caregiverNames
      )

      expect(summaries).toHaveLength(2)
    })

    it('should count actions correctly', async () => {
      const caregiverNames = { 'caregiver-1': 'Grandma' }

      const summaries = await getCaregiverActivitySummaries(
        { familyId: 'family-123' },
        caregiverNames
      )

      const grandmaSummary = summaries.find((s) => s.caregiverUid === 'caregiver-1')
      expect(grandmaSummary?.actionCounts.time_extension).toBe(1)
      expect(grandmaSummary?.actionCounts.flag_viewed).toBe(1)
      expect(grandmaSummary?.totalActions).toBe(2)
    })

    it('should track last active time', async () => {
      const caregiverNames = { 'caregiver-1': 'Grandma' }

      const summaries = await getCaregiverActivitySummaries(
        { familyId: 'family-123' },
        caregiverNames
      )

      const grandmaSummary = summaries.find((s) => s.caregiverUid === 'caregiver-1')
      // log-2 is most recent for Grandma (15:00)
      expect(grandmaSummary?.lastActiveAt.getHours()).toBe(15)
    })
  })

  describe('formatActivitySummary', () => {
    it('should format single action type', () => {
      const summary: CaregiverActivitySummary = {
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        actionCounts: {
          time_extension: 2,
          flag_viewed: 0,
          flag_marked_reviewed: 0,
          permission_change: 0,
        },
        lastActiveAt: new Date(),
        totalActions: 2,
      }

      const result = formatActivitySummary(summary)
      expect(result).toBe('Grandma: 2 time extensions')
    })

    it('should format multiple action types', () => {
      const summary: CaregiverActivitySummary = {
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        actionCounts: {
          time_extension: 2,
          flag_viewed: 1,
          flag_marked_reviewed: 0,
          permission_change: 0,
        },
        lastActiveAt: new Date(),
        totalActions: 3,
      }

      const result = formatActivitySummary(summary)
      expect(result).toBe('Grandma: 2 time extensions, 1 flag viewed')
    })

    it('should handle singular counts', () => {
      const summary: CaregiverActivitySummary = {
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        actionCounts: {
          time_extension: 1,
          flag_viewed: 0,
          flag_marked_reviewed: 0,
          permission_change: 0,
        },
        lastActiveAt: new Date(),
        totalActions: 1,
      }

      const result = formatActivitySummary(summary)
      expect(result).toBe('Grandma: 1 time extension')
    })

    it('should handle no activity', () => {
      const summary: CaregiverActivitySummary = {
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        actionCounts: {
          time_extension: 0,
          flag_viewed: 0,
          flag_marked_reviewed: 0,
          permission_change: 0,
        },
        lastActiveAt: new Date(),
        totalActions: 0,
      }

      const result = formatActivitySummary(summary)
      expect(result).toBe('Grandma: No recent activity')
    })
  })

  describe('formatActivityDescription', () => {
    it('should format time_extension', () => {
      const log: CaregiverAuditLog = {
        id: 'log-1',
        familyId: 'family-123',
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        action: 'time_extension',
        changedByUid: 'caregiver-1',
        changes: { extensionMinutes: 30 },
        childUid: 'child-1',
        childName: 'Emma',
        createdAt: new Date(),
      }

      const result = formatActivityDescription(log)
      expect(result).toBe('Grandma extended screen time by 30 min for Emma')
    })

    it('should format flag_viewed', () => {
      const log: CaregiverAuditLog = {
        id: 'log-1',
        familyId: 'family-123',
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        action: 'flag_viewed',
        changedByUid: 'caregiver-1',
        changes: {},
        childUid: 'child-1',
        childName: 'Emma',
        createdAt: new Date(),
      }

      const result = formatActivityDescription(log)
      expect(result).toBe('Grandma viewed a flag for Emma')
    })

    it('should format flag_marked_reviewed', () => {
      const log: CaregiverAuditLog = {
        id: 'log-1',
        familyId: 'family-123',
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        action: 'flag_marked_reviewed',
        changedByUid: 'caregiver-1',
        changes: { flagCategory: 'Violence' },
        childUid: 'child-1',
        childName: 'Emma',
        createdAt: new Date(),
      }

      const result = formatActivityDescription(log)
      expect(result).toBe('Grandma marked Violence flag as reviewed for Emma')
    })

    it('should format permission_change', () => {
      const log: CaregiverAuditLog = {
        id: 'log-1',
        familyId: 'family-123',
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        action: 'permission_change',
        changedByUid: 'parent-1',
        changes: {},
        createdAt: new Date(),
      }

      const result = formatActivityDescription(log)
      expect(result).toBe("Grandma's permissions were updated")
    })
  })

  describe('formatActivityForChild', () => {
    it('should format time_extension in child-friendly way', () => {
      const log: CaregiverAuditLog = {
        id: 'log-1',
        familyId: 'family-123',
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        action: 'time_extension',
        changedByUid: 'caregiver-1',
        changes: { extensionMinutes: 30 },
        childUid: 'child-1',
        createdAt: new Date(),
      }

      const result = formatActivityForChild(log)
      expect(result).toBe('Grandma extended your screen time by 30 min')
    })

    it('should format flag_viewed in child-friendly way', () => {
      const log: CaregiverAuditLog = {
        id: 'log-1',
        familyId: 'family-123',
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        action: 'flag_viewed',
        changedByUid: 'caregiver-1',
        changes: {},
        childUid: 'child-1',
        createdAt: new Date(),
      }

      const result = formatActivityForChild(log)
      expect(result).toBe('Grandma looked at a flagged item')
    })

    it('should format flag_marked_reviewed in child-friendly way', () => {
      const log: CaregiverAuditLog = {
        id: 'log-1',
        familyId: 'family-123',
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        action: 'flag_marked_reviewed',
        changedByUid: 'caregiver-1',
        changes: {},
        childUid: 'child-1',
        createdAt: new Date(),
      }

      const result = formatActivityForChild(log)
      expect(result).toBe('Grandma marked something as reviewed')
    })

    it('should format permission_change in child-friendly way', () => {
      const log: CaregiverAuditLog = {
        id: 'log-1',
        familyId: 'family-123',
        caregiverUid: 'caregiver-1',
        caregiverName: 'Grandma',
        action: 'permission_change',
        changedByUid: 'parent-1',
        changes: {},
        createdAt: new Date(),
      }

      const result = formatActivityForChild(log)
      expect(result).toBe("Grandma's access was updated")
    })

    it('should use fallback for missing caregiver name', () => {
      const log: CaregiverAuditLog = {
        id: 'log-1',
        familyId: 'family-123',
        caregiverUid: 'caregiver-1',
        action: 'flag_viewed',
        changedByUid: 'caregiver-1',
        changes: {},
        childUid: 'child-1',
        createdAt: new Date(),
      }

      const result = formatActivityForChild(log)
      expect(result).toBe('Your caregiver looked at a flagged item')
    })
  })

  describe('getActivityForChild', () => {
    it('should filter logs for specific child', async () => {
      const logs = await getActivityForChild('family-123', 'child-1')

      expect(logs).toHaveLength(2)
      expect(logs.every((l) => l.childUid === 'child-1')).toBe(true)
    })
  })

  describe('getWeeklyActivitySummaries', () => {
    it('should return summaries for current week', async () => {
      const caregiverNames = { 'caregiver-1': 'Grandma' }

      const summaries = await getWeeklyActivitySummaries('family-123', caregiverNames)

      expect(summaries).toBeDefined()
      expect(Array.isArray(summaries)).toBe(true)
    })
  })
})
