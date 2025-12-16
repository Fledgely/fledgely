import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  notifyAgreementActivation,
  type NotifyActivationParams,
} from '../notificationService'

// Mock Firebase Firestore
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockAddDoc = vi.fn()
const mockServerTimestamp = vi.fn(() => ({ _serverTimestamp: true }))
const mockWriteBatch = vi.fn()
const mockBatchSet = vi.fn()
const mockBatchCommit = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: () => ({
    set: mockBatchSet,
    commit: mockBatchCommit,
  }),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddDoc.mockResolvedValue({ id: 'notification-123' })
    mockBatchCommit.mockResolvedValue(undefined)
  })

  describe('notifyAgreementActivation (Task 4.1)', () => {
    const params: NotifyActivationParams = {
      familyId: 'family-123',
      agreementId: 'agreement-123',
      agreementVersion: '1.0',
      recipientUserIds: ['parent-user-123', 'child-user-456'],
    }

    it('creates notification for each recipient (AC: 4)', async () => {
      await notifyAgreementActivation(params)

      // Should have called batch.set for each recipient
      expect(mockBatchSet).toHaveBeenCalledTimes(2)
    })

    it('includes correct notification type', async () => {
      await notifyAgreementActivation(params)

      // Check first notification
      const notificationData = mockBatchSet.mock.calls[0][1]
      expect(notificationData.type).toBe('agreement_activated')
    })

    it('includes agreement details in notification', async () => {
      await notifyAgreementActivation(params)

      const notificationData = mockBatchSet.mock.calls[0][1]
      expect(notificationData.familyId).toBe('family-123')
      expect(notificationData.agreementId).toBe('agreement-123')
      expect(notificationData.agreementVersion).toBe('1.0')
    })

    it('includes user-friendly message', async () => {
      await notifyAgreementActivation(params)

      const notificationData = mockBatchSet.mock.calls[0][1]
      expect(notificationData.message).toContain('agreement')
      expect(notificationData.message.toLowerCase()).toContain('active')
    })

    it('sets notification as unread by default', async () => {
      await notifyAgreementActivation(params)

      const notificationData = mockBatchSet.mock.calls[0][1]
      expect(notificationData.read).toBe(false)
    })

    it('records timestamp', async () => {
      await notifyAgreementActivation(params)

      const notificationData = mockBatchSet.mock.calls[0][1]
      expect(notificationData.createdAt).toEqual({ _serverTimestamp: true })
    })

    it('commits batch to save all notifications', async () => {
      await notifyAgreementActivation(params)

      expect(mockBatchCommit).toHaveBeenCalled()
    })

    it('handles single recipient', async () => {
      await notifyAgreementActivation({
        ...params,
        recipientUserIds: ['single-user-123'],
      })

      expect(mockBatchSet).toHaveBeenCalledTimes(1)
    })

    it('handles empty recipient list gracefully', async () => {
      await notifyAgreementActivation({
        ...params,
        recipientUserIds: [],
      })

      // Should not call batch.set if no recipients
      expect(mockBatchSet).not.toHaveBeenCalled()
      // But should still commit (empty batch)
      expect(mockBatchCommit).toHaveBeenCalled()
    })
  })
})
