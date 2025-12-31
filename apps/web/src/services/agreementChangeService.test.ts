/**
 * Agreement Change Request Service Tests - Story 19C.5
 *
 * Task 7.4: Test service layer (mock Firestore)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitChangeRequest, createParentNotification } from './agreementChangeService'

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

// Mock Firestore
const mockAddDoc = vi.fn()
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, path) => ({ path })),
  addDoc: (collectionRef: unknown, data: unknown) => mockAddDoc(collectionRef, data),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}))

describe('agreementChangeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddDoc.mockResolvedValue({ id: 'test-request-id' })
  })

  describe('submitChangeRequest', () => {
    const validInput = {
      childId: 'child-123',
      familyId: 'family-456',
      agreementId: 'agreement-789',
      whatToChange: 'I want more screen time',
      why: 'I finished all my homework',
      childName: 'Alex',
    }

    it('should create a change request document', async () => {
      await submitChangeRequest(validInput)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'agreementChangeRequests' }),
        expect.objectContaining({
          familyId: 'family-456',
          childId: 'child-123',
          agreementId: 'agreement-789',
          whatToChange: 'I want more screen time',
          why: 'I finished all my homework',
          status: 'pending',
        })
      )
    })

    it('should include server timestamp for createdAt', async () => {
      await submitChangeRequest(validInput)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'agreementChangeRequests' }),
        expect.objectContaining({
          createdAt: expect.objectContaining({ _serverTimestamp: true }),
        })
      )
    })

    it('should log request to family activity (AC5)', async () => {
      await submitChangeRequest(validInput)

      // Second call should be to familyActivity
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'familyActivity' }),
        expect.objectContaining({
          familyId: 'family-456',
          type: 'agreement_change_request',
          actorId: 'child-123',
          actorName: 'Alex',
          actorType: 'child',
          description: 'Alex requested a change to the agreement',
        })
      )
    })

    it('should include request metadata in activity log', async () => {
      await submitChangeRequest(validInput)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'familyActivity' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            requestId: 'test-request-id',
            agreementId: 'agreement-789',
            whatToChange: 'I want more screen time',
          }),
        })
      )
    })

    it('should return the request ID', async () => {
      const result = await submitChangeRequest(validInput)

      expect(result.requestId).toBe('test-request-id')
    })

    it('should handle null why field', async () => {
      const inputWithNullWhy = { ...validInput, why: null }
      await submitChangeRequest(inputWithNullWhy)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'agreementChangeRequests' }),
        expect.objectContaining({
          why: null,
        })
      )
    })
  })

  describe('createParentNotification', () => {
    beforeEach(() => {
      mockAddDoc.mockResolvedValue({ id: 'notification-id' })
    })

    it('should create a notification document', async () => {
      await createParentNotification('family-123', 'request-456', 'Emma')

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'notifications' }),
        expect.objectContaining({
          familyId: 'family-123',
          type: 'agreement_change_request',
          title: 'Agreement Change Request',
        })
      )
    })

    it('should include child name in notification body', async () => {
      await createParentNotification('family-123', 'request-456', 'Emma')

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'notifications' }),
        expect.objectContaining({
          body: 'Emma wants to discuss a change to your agreement',
        })
      )
    })

    it('should include request ID in notification data', async () => {
      await createParentNotification('family-123', 'request-456', 'Emma')

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'notifications' }),
        expect.objectContaining({
          data: expect.objectContaining({
            requestId: 'request-456',
            action: 'view_change_request',
          }),
        })
      )
    })

    it('should return the notification ID', async () => {
      const result = await createParentNotification('family-123', 'request-456', 'Emma')

      expect(result).toBe('notification-id')
    })

    it('should set notification as unread', async () => {
      await createParentNotification('family-123', 'request-456', 'Emma')

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'notifications' }),
        expect.objectContaining({
          read: false,
        })
      )
    })
  })
})
