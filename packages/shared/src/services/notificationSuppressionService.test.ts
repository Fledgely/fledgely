/**
 * NotificationSuppressionService Tests - Story 7.5.7 Task 2
 *
 * TDD tests for notification suppression during blackout.
 * AC1: No family notifications during blackout
 * AC2: Family audit trail shows no unusual entries
 *
 * CRITICAL SAFETY:
 * - All notifications suppressed during blackout
 * - Suppression rules stored in isolated collection
 * - Family cannot access suppression data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  shouldSuppressNotification,
  createSuppression,
  filterNotificationRecipients,
  suppressAuditEntry,
  extendSuppression,
  NOTIFICATION_SUPPRESSIONS_COLLECTION,
  type NotificationSuppression,
} from './notificationSuppressionService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}))

describe('NotificationSuppressionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('NOTIFICATION_SUPPRESSIONS_COLLECTION', () => {
    it('should be named notificationSuppressions', () => {
      expect(NOTIFICATION_SUPPRESSIONS_COLLECTION).toBe('notificationSuppressions')
    })

    it('should be a root-level collection (not under families)', () => {
      expect(NOTIFICATION_SUPPRESSIONS_COLLECTION).not.toContain('/')
      expect(NOTIFICATION_SUPPRESSIONS_COLLECTION).not.toContain('families')
    })
  })

  describe('createSuppression', () => {
    it('should create a suppression rule for signal', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const result = await createSuppression('signal-123', 'child-456', expiresAt)

      expect(result.signalId).toBe('signal-123')
      expect(result.childId).toBe('child-456')
      expect(result.active).toBe(true)
    })

    it('should set suppressionType to all by default', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const result = await createSuppression('signal-123', 'child-456', expiresAt)

      expect(result.suppressionType).toBe('all')
    })

    it('should require signalId', async () => {
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await expect(createSuppression('', 'child-456', expiresAt)).rejects.toThrow(
        'signalId is required'
      )
    })

    it('should require childId', async () => {
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await expect(createSuppression('signal-123', '', expiresAt)).rejects.toThrow(
        'childId is required'
      )
    })

    it('should require expiresAt', async () => {
      await expect(createSuppression('signal-123', 'child-456', null as any)).rejects.toThrow(
        'expiresAt is required'
      )
    })

    it('should store suppression in isolated collection', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await createSuppression('signal-123', 'child-456', expiresAt)

      expect(firestore.doc).toHaveBeenCalledWith(
        undefined,
        'notificationSuppressions',
        expect.any(String)
      )
    })
  })

  describe('shouldSuppressNotification', () => {
    it('should return true when active suppression exists', async () => {
      const mockSuppression: NotificationSuppression = {
        id: 'supp-123',
        signalId: 'signal-123',
        childId: 'child-456',
        suppressionType: 'all',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        active: true,
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockSuppression }],
      } as any)

      const result = await shouldSuppressNotification('child-456', 'flag_alert')

      expect(result).toBe(true)
    })

    it('should return false when no suppression exists', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const result = await shouldSuppressNotification('child-456', 'flag_alert')

      expect(result).toBe(false)
    })

    it('should return false when suppression is expired', async () => {
      const mockSuppression: NotificationSuppression = {
        id: 'supp-123',
        signalId: 'signal-123',
        childId: 'child-456',
        suppressionType: 'all',
        startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        active: true,
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockSuppression }],
      } as any)

      const result = await shouldSuppressNotification('child-456', 'flag_alert')

      expect(result).toBe(false)
    })

    it('should return false when suppression is inactive', async () => {
      const mockSuppression: NotificationSuppression = {
        id: 'supp-123',
        signalId: 'signal-123',
        childId: 'child-456',
        suppressionType: 'all',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        active: false,
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockSuppression }],
      } as any)

      const result = await shouldSuppressNotification('child-456', 'flag_alert')

      expect(result).toBe(false)
    })

    it('should require childId', async () => {
      await expect(shouldSuppressNotification('', 'flag_alert')).rejects.toThrow(
        'childId is required'
      )
    })

    it('should require notificationType', async () => {
      await expect(shouldSuppressNotification('child-456', '')).rejects.toThrow(
        'notificationType is required'
      )
    })
  })

  describe('filterNotificationRecipients', () => {
    it('should remove child from recipients when suppression active', async () => {
      const mockSuppression: NotificationSuppression = {
        id: 'supp-123',
        signalId: 'signal-123',
        childId: 'child-456',
        suppressionType: 'all',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        active: true,
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockSuppression }],
      } as any)

      const notification = { type: 'flag_alert', data: {} }
      const recipients = ['parent-1', 'parent-2', 'child-456']

      const result = await filterNotificationRecipients(notification, recipients)

      expect(result).not.toContain('child-456')
      expect(result).not.toContain('parent-1')
      expect(result).not.toContain('parent-2')
      expect(result).toEqual([])
    })

    it('should keep recipients when no suppression active', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const notification = { type: 'flag_alert', data: {} }
      const recipients = ['parent-1', 'parent-2']

      const result = await filterNotificationRecipients(notification, recipients)

      expect(result).toEqual(['parent-1', 'parent-2'])
    })

    it('should handle empty recipients array', async () => {
      const notification = { type: 'flag_alert', data: {} }
      const result = await filterNotificationRecipients(notification, [])

      expect(result).toEqual([])
    })
  })

  describe('suppressAuditEntry', () => {
    it('should return null when suppression is active for child', async () => {
      const mockSuppression: NotificationSuppression = {
        id: 'supp-123',
        signalId: 'signal-123',
        childId: 'child-456',
        suppressionType: 'all',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        active: true,
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockSuppression }],
      } as any)

      const auditEntry = {
        id: 'audit-1',
        childId: 'child-456',
        type: 'signal_triggered',
        timestamp: new Date(),
      }

      const result = await suppressAuditEntry(auditEntry, 'family-789')

      expect(result).toBeNull()
    })

    it('should return audit entry when no suppression active', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const auditEntry = {
        id: 'audit-1',
        childId: 'child-456',
        type: 'normal_activity',
        timestamp: new Date(),
      }

      const result = await suppressAuditEntry(auditEntry, 'family-789')

      expect(result).toEqual(auditEntry)
    })

    it('should require auditEntry', async () => {
      await expect(suppressAuditEntry(null as any, 'family-789')).rejects.toThrow(
        'auditEntry is required'
      )
    })

    it('should require familyId', async () => {
      const auditEntry = {
        id: 'audit-1',
        childId: 'child-456',
        type: 'test',
        timestamp: new Date(),
      }
      await expect(suppressAuditEntry(auditEntry, '')).rejects.toThrow('familyId is required')
    })
  })

  describe('extendSuppression', () => {
    it('should extend suppression expiry', async () => {
      const originalExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const mockSuppression: NotificationSuppression = {
        id: 'supp-123',
        signalId: 'signal-123',
        childId: 'child-456',
        suppressionType: 'all',
        startedAt: new Date(),
        expiresAt: originalExpiry,
        active: true,
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ id: 'supp-123', data: () => mockSuppression, ref: {} }],
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await extendSuppression('signal-123', newExpiry)

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          expiresAt: newExpiry,
        })
      )
    })

    it('should require signalId', async () => {
      const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await expect(extendSuppression('', newExpiry)).rejects.toThrow('signalId is required')
    })

    it('should require newExpiresAt', async () => {
      await expect(extendSuppression('signal-123', null as any)).rejects.toThrow(
        'newExpiresAt is required'
      )
    })

    it('should throw when suppression not found', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await expect(extendSuppression('nonexistent', newExpiry)).rejects.toThrow(
        'Suppression not found'
      )
    })
  })
})
