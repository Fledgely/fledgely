/**
 * FamilyMeetingReminderService Tests - Story 34.5.4 Task 3
 *
 * Tests for family meeting reminder service.
 * AC4: Meeting Reminder (Optional)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  scheduleMeetingReminder,
  cancelMeetingReminder,
  getPendingReminders,
  acknowledgeReminder,
  FAMILY_MEETING_REMINDERS_COLLECTION,
} from './familyMeetingReminderService'
import type { AgeTier } from '../contracts/mediationResources'

// ============================================
// Firebase Mocks
// ============================================

const mockAddDoc = vi.fn()
const mockGetDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockUpdateDoc = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockGetFirestore = vi.fn()

vi.mock('firebase/firestore', () => ({
  getFirestore: () => mockGetFirestore(),
  addDoc: (ref: unknown, data: unknown) => mockAddDoc(ref, data),
  getDoc: (ref: unknown) => mockGetDoc(ref),
  getDocs: (q: unknown) => mockGetDocs(q),
  updateDoc: (ref: unknown, data: unknown) => mockUpdateDoc(ref, data),
  collection: (db: unknown, name: string) => mockCollection(db, name),
  doc: (db: unknown, collName: string, docId: string) => mockDoc(db, collName, docId),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (field: string, op: string, value: unknown) => mockWhere(field, op, value),
  orderBy: (field: string, direction?: string) => mockOrderBy(field, direction),
}))

describe('FamilyMeetingReminderService - Story 34.5.4', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFirestore.mockReturnValue({})
    mockCollection.mockReturnValue('mockCollection')
    mockDoc.mockReturnValue('mockDocRef')
    mockQuery.mockReturnValue('mockQuery')
    mockWhere.mockReturnValue('mockWhere')
    mockOrderBy.mockReturnValue('mockOrderBy')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================
  // Collection Name Tests
  // ============================================

  describe('Collection Name', () => {
    it('should export collection name constant', () => {
      expect(FAMILY_MEETING_REMINDERS_COLLECTION).toBe('familyMeetingReminders')
    })
  })

  // ============================================
  // scheduleMeetingReminder Tests
  // ============================================

  describe('scheduleMeetingReminder', () => {
    const validInput = {
      familyId: 'family-123',
      scheduledAt: new Date('2024-01-15T18:00:00Z'),
      createdBy: 'child-456',
      templateId: 'tween-template-001',
      ageTier: 'tween-12-14' as AgeTier,
    }

    it('should create a reminder in Firestore', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'reminder-abc' })

      const result = await scheduleMeetingReminder(validInput)

      expect(mockAddDoc).toHaveBeenCalled()
      expect(result.id).toBe('reminder-abc')
    })

    it('should set status to pending', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'reminder-abc' })

      const result = await scheduleMeetingReminder(validInput)

      expect(result.status).toBe('pending')
    })

    it('should set notificationSentAt to null', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'reminder-abc' })

      const result = await scheduleMeetingReminder(validInput)

      expect(result.notificationSentAt).toBeNull()
    })

    it('should set createdAt to current time', async () => {
      const now = new Date('2024-01-10T10:00:00Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)

      mockAddDoc.mockResolvedValueOnce({ id: 'reminder-abc' })

      const result = await scheduleMeetingReminder(validInput)

      expect(result.createdAt.getTime()).toBe(now.getTime())
    })

    it('should return the complete reminder object', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'reminder-abc' })

      const result = await scheduleMeetingReminder(validInput)

      expect(result.familyId).toBe(validInput.familyId)
      expect(result.scheduledAt).toEqual(validInput.scheduledAt)
      expect(result.createdBy).toBe(validInput.createdBy)
      expect(result.templateId).toBe(validInput.templateId)
      expect(result.ageTier).toBe(validInput.ageTier)
    })

    it('should throw error for empty familyId', async () => {
      await expect(scheduleMeetingReminder({ ...validInput, familyId: '' })).rejects.toThrow(
        'familyId is required'
      )
    })

    it('should throw error for empty createdBy', async () => {
      await expect(scheduleMeetingReminder({ ...validInput, createdBy: '' })).rejects.toThrow(
        'createdBy is required'
      )
    })

    it('should throw error for empty templateId', async () => {
      await expect(scheduleMeetingReminder({ ...validInput, templateId: '' })).rejects.toThrow(
        'templateId is required'
      )
    })
  })

  // ============================================
  // cancelMeetingReminder Tests
  // ============================================

  describe('cancelMeetingReminder', () => {
    it('should update reminder status to cancelled', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'pending' }),
      })
      mockUpdateDoc.mockResolvedValueOnce(undefined)

      await cancelMeetingReminder('reminder-123')

      expect(mockUpdateDoc).toHaveBeenCalledWith('mockDocRef', { status: 'cancelled' })
    })

    it('should throw error if reminder not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      })

      await expect(cancelMeetingReminder('nonexistent')).rejects.toThrow('Reminder not found')
    })

    it('should throw error for empty reminderId', async () => {
      await expect(cancelMeetingReminder('')).rejects.toThrow('reminderId is required')
    })

    it('should not update if already cancelled', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'cancelled' }),
      })

      await cancelMeetingReminder('reminder-123')

      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // getPendingReminders Tests
  // ============================================

  describe('getPendingReminders', () => {
    it('should return pending reminders for family', async () => {
      const mockData = {
        familyId: 'family-123',
        scheduledAt: { toDate: () => new Date('2024-01-15T18:00:00Z') },
        createdAt: { toDate: () => new Date('2024-01-10T10:00:00Z') },
        createdBy: 'child-456',
        templateId: 'tween-template-001',
        ageTier: 'tween-12-14',
        status: 'pending',
        notificationSentAt: null,
      }

      mockGetDocs.mockResolvedValueOnce({
        docs: [{ id: 'reminder-abc', data: () => mockData }],
      })

      const result = await getPendingReminders('family-123')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('reminder-abc')
      expect(result[0].status).toBe('pending')
    })

    it('should return empty array if no pending reminders', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] })

      const result = await getPendingReminders('family-123')

      expect(result).toEqual([])
    })

    it('should query with correct filters', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] })

      await getPendingReminders('family-123')

      expect(mockWhere).toHaveBeenCalledWith('familyId', '==', 'family-123')
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending')
    })

    it('should throw error for empty familyId', async () => {
      await expect(getPendingReminders('')).rejects.toThrow('familyId is required')
    })

    it('should convert Firestore timestamps to dates', async () => {
      const scheduledDate = new Date('2024-01-15T18:00:00Z')
      const createdDate = new Date('2024-01-10T10:00:00Z')

      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'reminder-abc',
            data: () => ({
              familyId: 'family-123',
              scheduledAt: { toDate: () => scheduledDate },
              createdAt: { toDate: () => createdDate },
              createdBy: 'child-456',
              templateId: 'template-001',
              ageTier: 'tween-12-14',
              status: 'pending',
              notificationSentAt: null,
            }),
          },
        ],
      })

      const result = await getPendingReminders('family-123')

      expect(result[0].scheduledAt).toEqual(scheduledDate)
      expect(result[0].createdAt).toEqual(createdDate)
    })
  })

  // ============================================
  // acknowledgeReminder Tests
  // ============================================

  describe('acknowledgeReminder', () => {
    it('should update reminder status to acknowledged', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'sent' }),
      })
      mockUpdateDoc.mockResolvedValueOnce(undefined)

      await acknowledgeReminder('reminder-123')

      expect(mockUpdateDoc).toHaveBeenCalled()
      const updateCall = mockUpdateDoc.mock.calls[0][1]
      expect(updateCall.status).toBe('acknowledged')
    })

    it('should set acknowledged timestamp', async () => {
      const now = new Date('2024-01-15T19:00:00Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'sent' }),
      })
      mockUpdateDoc.mockResolvedValueOnce(undefined)

      await acknowledgeReminder('reminder-123')

      const updateCall = mockUpdateDoc.mock.calls[0][1]
      expect(updateCall.acknowledgedAt.getTime()).toBe(now.getTime())
    })

    it('should throw error if reminder not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      })

      await expect(acknowledgeReminder('nonexistent')).rejects.toThrow('Reminder not found')
    })

    it('should throw error for empty reminderId', async () => {
      await expect(acknowledgeReminder('')).rejects.toThrow('reminderId is required')
    })

    it('should not update if already acknowledged', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'acknowledged' }),
      })

      await acknowledgeReminder('reminder-123')

      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })
  })
})
