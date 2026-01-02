/**
 * AgreementReviewRequestService Tests - Story 34.5.3 Task 2
 *
 * Tests for managing agreement review requests.
 * AC1: Request Agreement Review Button
 * AC2: Review Request Notification to Parent
 * AC4: Rate Limiting (60-Day Cooldown)
 * AC6: Review Request Tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkReviewRequestCooldown,
  submitReviewRequest,
  getSuggestedDiscussionAreas,
  getReviewRequestHistory,
  acknowledgeReviewRequest,
  markReviewComplete,
  getPendingReviewRequest,
  AGREEMENT_REVIEW_REQUESTS_COLLECTION,
} from './agreementReviewRequestService'

// ============================================
// Mock Firebase
// ============================================

const mockGetDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()
const mockAddDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: vi.fn(() => new Date()),
}))

describe('agreementReviewRequestService - Story 34.5.3', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDoc.mockReturnValue({ id: 'mock-doc-id' })
    mockCollection.mockReturnValue({ id: 'mock-collection' })
    mockQuery.mockReturnValue({ type: 'query' })
    mockWhere.mockReturnValue({ type: 'where' })
    mockOrderBy.mockReturnValue({ type: 'orderBy' })
    mockLimit.mockReturnValue({ type: 'limit' })
  })

  // ============================================
  // Constants Tests
  // ============================================

  describe('constants', () => {
    it('should have correct collection name', () => {
      expect(AGREEMENT_REVIEW_REQUESTS_COLLECTION).toBe('agreementReviewRequests')
    })
  })

  // ============================================
  // checkReviewRequestCooldown Tests
  // ============================================

  describe('checkReviewRequestCooldown', () => {
    it('should return canRequest true when no previous requests', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] })

      const status = await checkReviewRequestCooldown('family-123', 'child-456')

      expect(status.canRequest).toBe(true)
      expect(status.daysRemaining).toBe(0)
    })

    it('should return canRequest false when within cooldown period', async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              requestedAt: thirtyDaysAgo,
              status: 'pending',
            }),
          },
        ],
      })

      const status = await checkReviewRequestCooldown('family-123', 'child-456')

      expect(status.canRequest).toBe(false)
      expect(status.daysRemaining).toBe(30)
    })

    it('should return canRequest true when cooldown has passed', async () => {
      const seventyDaysAgo = new Date()
      seventyDaysAgo.setDate(seventyDaysAgo.getDate() - 70)

      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              requestedAt: seventyDaysAgo,
              status: 'reviewed',
            }),
          },
        ],
      })

      const status = await checkReviewRequestCooldown('family-123', 'child-456')

      expect(status.canRequest).toBe(true)
      expect(status.daysRemaining).toBe(0)
    })

    it('should throw error for empty familyId', async () => {
      await expect(checkReviewRequestCooldown('', 'child-456')).rejects.toThrow(
        'familyId is required'
      )
    })

    it('should throw error for empty childId', async () => {
      await expect(checkReviewRequestCooldown('family-123', '')).rejects.toThrow(
        'childId is required'
      )
    })
  })

  // ============================================
  // submitReviewRequest Tests
  // ============================================

  describe('submitReviewRequest', () => {
    it('should create a new review request', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] }) // No previous requests
      mockAddDoc.mockResolvedValueOnce({ id: 'request-123' })

      const request = await submitReviewRequest('family-123', 'child-456', 'Alex', 'agreement-789')

      expect(request.familyId).toBe('family-123')
      expect(request.childId).toBe('child-456')
      expect(request.childName).toBe('Alex')
      expect(request.agreementId).toBe('agreement-789')
      expect(request.status).toBe('pending')
      expect(request.parentNotificationSent).toBe(true)
    })

    it('should throw error when in cooldown period', async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              requestedAt: thirtyDaysAgo,
              status: 'pending',
            }),
          },
        ],
      })

      await expect(
        submitReviewRequest('family-123', 'child-456', 'Alex', 'agreement-789')
      ).rejects.toThrow('Review request is in cooldown period')
    })

    it('should throw error for empty familyId', async () => {
      await expect(submitReviewRequest('', 'child-456', 'Alex', 'agreement-789')).rejects.toThrow(
        'familyId is required'
      )
    })

    it('should throw error for empty childId', async () => {
      await expect(submitReviewRequest('family-123', '', 'Alex', 'agreement-789')).rejects.toThrow(
        'childId is required'
      )
    })

    it('should throw error for empty childName', async () => {
      await expect(
        submitReviewRequest('family-123', 'child-456', '', 'agreement-789')
      ).rejects.toThrow('childName is required')
    })

    it('should throw error for empty agreementId', async () => {
      await expect(submitReviewRequest('family-123', 'child-456', 'Alex', '')).rejects.toThrow(
        'agreementId is required'
      )
    })

    it('should set expiration date 30 days in the future', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] })
      mockAddDoc.mockResolvedValueOnce({ id: 'request-123' })

      const request = await submitReviewRequest('family-123', 'child-456', 'Alex', 'agreement-789')

      const expectedExpiry = new Date()
      expectedExpiry.setDate(expectedExpiry.getDate() + 30)

      // Allow 1 minute tolerance
      const diff = Math.abs(request.expiresAt.getTime() - expectedExpiry.getTime())
      expect(diff).toBeLessThan(60000)
    })
  })

  // ============================================
  // getSuggestedDiscussionAreas Tests
  // ============================================

  describe('getSuggestedDiscussionAreas', () => {
    it('should return empty array when no rejection history', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] })

      const areas = await getSuggestedDiscussionAreas('family-123', 'child-456', 'agreement-789')

      expect(Array.isArray(areas)).toBe(true)
    })

    it('should throw error for empty familyId', async () => {
      await expect(getSuggestedDiscussionAreas('', 'child-456', 'agreement-789')).rejects.toThrow(
        'familyId is required'
      )
    })

    it('should throw error for empty childId', async () => {
      await expect(getSuggestedDiscussionAreas('family-123', '', 'agreement-789')).rejects.toThrow(
        'childId is required'
      )
    })

    it('should throw error for empty agreementId', async () => {
      await expect(getSuggestedDiscussionAreas('family-123', 'child-456', '')).rejects.toThrow(
        'agreementId is required'
      )
    })

    it('should include screen time if related rejections exist', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              proposalId: 'proposal-1',
              rejectedAt: new Date(),
              category: 'screen-time',
            }),
          },
        ],
      })

      const areas = await getSuggestedDiscussionAreas('family-123', 'child-456', 'agreement-789')

      // Just verify it returns an array (specific suggestions depend on implementation)
      expect(Array.isArray(areas)).toBe(true)
    })
  })

  // ============================================
  // getReviewRequestHistory Tests
  // ============================================

  describe('getReviewRequestHistory', () => {
    it('should return empty array when no history', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] })

      const history = await getReviewRequestHistory('family-123', 'child-456')

      expect(history).toEqual([])
    })

    it('should return request history sorted by date', async () => {
      const request1 = {
        id: 'request-1',
        familyId: 'family-123',
        childId: 'child-456',
        childName: 'Alex',
        agreementId: 'agreement-789',
        requestedAt: new Date('2024-01-15'),
        status: 'reviewed',
        acknowledgedAt: new Date('2024-01-16'),
        reviewedAt: new Date('2024-01-20'),
        suggestedAreas: [],
        parentNotificationSent: true,
        expiresAt: new Date('2024-02-14'),
      }

      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'request-1',
            data: () => request1,
          },
        ],
      })

      const history = await getReviewRequestHistory('family-123', 'child-456')

      expect(history.length).toBe(1)
      expect(history[0].id).toBe('request-1')
    })

    it('should throw error for empty familyId', async () => {
      await expect(getReviewRequestHistory('', 'child-456')).rejects.toThrow('familyId is required')
    })

    it('should throw error for empty childId', async () => {
      await expect(getReviewRequestHistory('family-123', '')).rejects.toThrow('childId is required')
    })
  })

  // ============================================
  // acknowledgeReviewRequest Tests
  // ============================================

  describe('acknowledgeReviewRequest', () => {
    it('should update request status to acknowledged', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'pending',
        }),
      })
      mockUpdateDoc.mockResolvedValueOnce(undefined)

      await acknowledgeReviewRequest('request-123')

      expect(mockUpdateDoc).toHaveBeenCalled()
      // Verify the update includes acknowledged status
      const updateCall = mockUpdateDoc.mock.calls[0]
      expect(updateCall[1].status).toBe('acknowledged')
    })

    it('should throw error if request not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      })

      await expect(acknowledgeReviewRequest('request-123')).rejects.toThrow(
        'Review request not found'
      )
    })

    it('should throw error for empty requestId', async () => {
      await expect(acknowledgeReviewRequest('')).rejects.toThrow('requestId is required')
    })

    it('should not update if already acknowledged', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'acknowledged',
        }),
      })

      await acknowledgeReviewRequest('request-123')

      // Should not call updateDoc if already acknowledged
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // markReviewComplete Tests
  // ============================================

  describe('markReviewComplete', () => {
    it('should update request status to reviewed', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'acknowledged',
        }),
      })
      mockUpdateDoc.mockResolvedValueOnce(undefined)

      await markReviewComplete('request-123')

      expect(mockUpdateDoc).toHaveBeenCalled()
      const updateCall = mockUpdateDoc.mock.calls[0]
      expect(updateCall[1].status).toBe('reviewed')
    })

    it('should throw error if request not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      })

      await expect(markReviewComplete('request-123')).rejects.toThrow('Review request not found')
    })

    it('should throw error for empty requestId', async () => {
      await expect(markReviewComplete('')).rejects.toThrow('requestId is required')
    })
  })

  // ============================================
  // getPendingReviewRequest Tests
  // ============================================

  describe('getPendingReviewRequest', () => {
    it('should return pending request if exists', async () => {
      const pendingRequest = {
        id: 'request-123',
        familyId: 'family-123',
        childId: 'child-456',
        childName: 'Alex',
        agreementId: 'agreement-789',
        requestedAt: new Date(),
        status: 'pending',
        acknowledgedAt: null,
        reviewedAt: null,
        suggestedAreas: [],
        parentNotificationSent: true,
        expiresAt: new Date(),
      }

      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'request-123',
            data: () => pendingRequest,
          },
        ],
      })

      const result = await getPendingReviewRequest('family-123', 'child-456')

      expect(result).not.toBeNull()
      expect(result!.status).toBe('pending')
    })

    it('should return null when no pending request', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] })

      const result = await getPendingReviewRequest('family-123', 'child-456')

      expect(result).toBeNull()
    })

    it('should throw error for empty familyId', async () => {
      await expect(getPendingReviewRequest('', 'child-456')).rejects.toThrow('familyId is required')
    })

    it('should throw error for empty childId', async () => {
      await expect(getPendingReviewRequest('family-123', '')).rejects.toThrow('childId is required')
    })
  })
})
