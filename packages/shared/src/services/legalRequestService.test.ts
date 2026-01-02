/**
 * LegalRequestService Tests - Story 7.5.5 Task 5
 *
 * TDD tests for law enforcement data request handling.
 * AC5: Law enforcement cooperation protocol
 *
 * CRITICAL SAFETY:
 * - Legal requests ALWAYS require human review
 * - No automated fulfillment of law enforcement requests
 * - Must have valid subpoena/warrant
 * - Response handled through legal team, not automated
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  logLegalRequest,
  fulfillLegalRequest,
  approveLegalRequest,
  denyLegalRequest,
  getLegalRequest,
  validateLegalRequest,
  LEGAL_REQUESTS_COLLECTION,
} from './legalRequestService'
import { type LegalRequest } from '../contracts/crisisPartner'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}))

describe('LegalRequestService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================
  // Constants Tests
  // ============================================

  describe('LEGAL_REQUESTS_COLLECTION', () => {
    it('should be named legalRequests', () => {
      expect(LEGAL_REQUESTS_COLLECTION).toBe('legalRequests')
    })
  })

  // ============================================
  // logLegalRequest Tests
  // ============================================

  describe('logLegalRequest', () => {
    it('should log a new legal request with pending status', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const request = await logLegalRequest({
        requestType: 'subpoena',
        requestingAgency: 'Los Angeles Police Department',
        jurisdiction: 'US-CA',
        documentReference: 'DOC-2024-12345',
        receivedAt: new Date(),
        signalIds: ['sig_123', 'sig_456'],
      })

      expect(request.status).toBe('pending_legal_review')
      expect(request.fulfilledAt).toBeNull()
      expect(request.fulfilledBy).toBeNull()
      expect(request.id).toBeTruthy()
      expect(firestore.setDoc).toHaveBeenCalled()
    })

    it('should generate unique request id', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const req1 = await logLegalRequest({
        requestType: 'subpoena',
        requestingAgency: 'LAPD',
        jurisdiction: 'US-CA',
        documentReference: 'DOC-001',
        receivedAt: new Date(),
        signalIds: ['sig_123'],
      })

      const req2 = await logLegalRequest({
        requestType: 'warrant',
        requestingAgency: 'FBI',
        jurisdiction: 'US',
        documentReference: 'DOC-002',
        receivedAt: new Date(),
        signalIds: ['sig_456'],
      })

      expect(req1.id).not.toBe(req2.id)
    })

    it('should throw for empty requestingAgency', async () => {
      await expect(
        logLegalRequest({
          requestType: 'subpoena',
          requestingAgency: '',
          jurisdiction: 'US-CA',
          documentReference: 'DOC-001',
          receivedAt: new Date(),
          signalIds: ['sig_123'],
        })
      ).rejects.toThrow('requestingAgency is required')
    })

    it('should throw for empty documentReference', async () => {
      await expect(
        logLegalRequest({
          requestType: 'subpoena',
          requestingAgency: 'LAPD',
          jurisdiction: 'US-CA',
          documentReference: '',
          receivedAt: new Date(),
          signalIds: ['sig_123'],
        })
      ).rejects.toThrow('documentReference is required')
    })

    it('should throw for empty signalIds', async () => {
      await expect(
        logLegalRequest({
          requestType: 'subpoena',
          requestingAgency: 'LAPD',
          jurisdiction: 'US-CA',
          documentReference: 'DOC-001',
          receivedAt: new Date(),
          signalIds: [],
        })
      ).rejects.toThrow('At least one signalId is required')
    })

    it('should support all legal request types', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const subpoena = await logLegalRequest({
        requestType: 'subpoena',
        requestingAgency: 'LAPD',
        jurisdiction: 'US-CA',
        documentReference: 'DOC-001',
        receivedAt: new Date(),
        signalIds: ['sig_123'],
      })
      expect(subpoena.requestType).toBe('subpoena')

      const warrant = await logLegalRequest({
        requestType: 'warrant',
        requestingAgency: 'FBI',
        jurisdiction: 'US',
        documentReference: 'DOC-002',
        receivedAt: new Date(),
        signalIds: ['sig_456'],
      })
      expect(warrant.requestType).toBe('warrant')

      const courtOrder = await logLegalRequest({
        requestType: 'court_order',
        requestingAgency: 'Superior Court',
        jurisdiction: 'US-CA',
        documentReference: 'DOC-003',
        receivedAt: new Date(),
        signalIds: ['sig_789'],
      })
      expect(courtOrder.requestType).toBe('court_order')

      const emergency = await logLegalRequest({
        requestType: 'emergency_disclosure',
        requestingAgency: 'CHP',
        jurisdiction: 'US-CA',
        documentReference: 'DOC-004',
        receivedAt: new Date(),
        signalIds: ['sig_000'],
      })
      expect(emergency.requestType).toBe('emergency_disclosure')
    })
  })

  // ============================================
  // approveLegalRequest Tests
  // ============================================

  describe('approveLegalRequest', () => {
    it('should approve a pending request', async () => {
      const mockRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          status: 'pending_legal_review',
          signalIds: ['sig_123'],
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockRequest as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const result = await approveLegalRequest('legal_123', 'admin_user_456')

      expect(result.status).toBe('approved')
      expect(result.approvedBy).toBe('admin_user_456')
      expect(result.approvedAt).toBeInstanceOf(Date)
      expect(firestore.updateDoc).toHaveBeenCalled()
    })

    it('should throw if request not found', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      await expect(approveLegalRequest('nonexistent', 'admin_456')).rejects.toThrow(
        'Legal request not found'
      )
    })

    it('should throw if request already approved', async () => {
      const mockRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          status: 'approved',
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockRequest as any)

      await expect(approveLegalRequest('legal_123', 'admin_456')).rejects.toThrow(
        'Request is not in pending status'
      )
    })

    it('should throw if request already denied', async () => {
      const mockRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          status: 'denied',
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockRequest as any)

      await expect(approveLegalRequest('legal_123', 'admin_456')).rejects.toThrow(
        'Request is not in pending status'
      )
    })

    it('should throw for empty requestId', async () => {
      await expect(approveLegalRequest('', 'admin_456')).rejects.toThrow('requestId is required')
    })

    it('should throw for empty approvedBy', async () => {
      await expect(approveLegalRequest('legal_123', '')).rejects.toThrow('approvedBy is required')
    })
  })

  // ============================================
  // denyLegalRequest Tests
  // ============================================

  describe('denyLegalRequest', () => {
    it('should deny a pending request with reason', async () => {
      const mockRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          status: 'pending_legal_review',
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockRequest as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const result = await denyLegalRequest('legal_123', 'admin_456', 'Insufficient documentation')

      expect(result.status).toBe('denied')
      expect(result.deniedBy).toBe('admin_456')
      expect(result.denialReason).toBe('Insufficient documentation')
      expect(result.deniedAt).toBeInstanceOf(Date)
    })

    it('should throw for empty denial reason', async () => {
      await expect(denyLegalRequest('legal_123', 'admin_456', '')).rejects.toThrow(
        'denialReason is required'
      )
    })
  })

  // ============================================
  // fulfillLegalRequest Tests
  // ============================================

  describe('fulfillLegalRequest', () => {
    it('should fulfill an approved request and return sealed signal data', async () => {
      const mockRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          status: 'approved',
          signalIds: ['sig_123'],
        }),
      }

      const mockSealedSignal = {
        exists: () => true,
        data: () => ({
          signalId: 'sig_123',
          childId: 'child_456',
          familyId: 'family_789',
          sealedAt: new Date(),
        }),
      }

      vi.mocked(firestore.getDoc)
        .mockResolvedValueOnce(mockRequest as any)
        .mockResolvedValueOnce(mockSealedSignal as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const result = await fulfillLegalRequest('legal_123', 'admin_user_456')

      expect(result.success).toBe(true)
      expect(result.signalData).toHaveLength(1)
      expect(result.signalData![0].signalId).toBe('sig_123')
      expect(firestore.updateDoc).toHaveBeenCalled()
    })

    it('should NEVER fulfill a pending request (requires human approval)', async () => {
      const mockRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          status: 'pending_legal_review',
          signalIds: ['sig_123'],
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockRequest as any)

      const result = await fulfillLegalRequest('legal_123', 'admin_456')

      expect(result.success).toBe(false)
      expect(result.signalData).toBeNull()
      expect(result.error).toBe('Request must be approved before fulfillment')
    })

    it('should not fulfill a denied request', async () => {
      const mockRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          status: 'denied',
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockRequest as any)

      const result = await fulfillLegalRequest('legal_123', 'admin_456')

      expect(result.success).toBe(false)
      expect(result.signalData).toBeNull()
    })

    it('should not fulfill an already fulfilled request', async () => {
      const mockRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          status: 'fulfilled',
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockRequest as any)

      const result = await fulfillLegalRequest('legal_123', 'admin_456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Request already fulfilled')
    })

    it('should mark request as fulfilled with timestamp and user', async () => {
      const mockRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          status: 'approved',
          signalIds: ['sig_123'],
        }),
      }

      const mockSealedSignal = {
        exists: () => true,
        data: () => ({
          signalId: 'sig_123',
          childId: 'child_456',
          familyId: 'family_789',
          sealedAt: new Date(),
        }),
      }

      vi.mocked(firestore.getDoc)
        .mockResolvedValueOnce(mockRequest as any)
        .mockResolvedValueOnce(mockSealedSignal as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const before = new Date()
      await fulfillLegalRequest('legal_123', 'admin_user_456')
      const after = new Date()

      expect(firestore.updateDoc).toHaveBeenCalled()
      const updateCall = vi.mocked(firestore.updateDoc).mock.calls[0]
      const updateData = updateCall[1] as { status: string; fulfilledAt: Date; fulfilledBy: string }
      expect(updateData.status).toBe('fulfilled')
      expect(updateData.fulfilledBy).toBe('admin_user_456')
      expect(updateData.fulfilledAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(updateData.fulfilledAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should throw for empty requestId', async () => {
      await expect(fulfillLegalRequest('', 'admin_456')).rejects.toThrow('requestId is required')
    })

    it('should throw for empty fulfilledBy', async () => {
      await expect(fulfillLegalRequest('legal_123', '')).rejects.toThrow('fulfilledBy is required')
    })
  })

  // ============================================
  // getLegalRequest Tests
  // ============================================

  describe('getLegalRequest', () => {
    it('should return legal request by id', async () => {
      const mockRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          requestType: 'subpoena',
          status: 'pending_legal_review',
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockRequest as any)

      const result = await getLegalRequest('legal_123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('legal_123')
      expect(result?.requestType).toBe('subpoena')
    })

    it('should return null for non-existent request', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await getLegalRequest('nonexistent')
      expect(result).toBeNull()
    })

    it('should throw for empty requestId', async () => {
      await expect(getLegalRequest('')).rejects.toThrow('requestId is required')
    })
  })

  // ============================================
  // validateLegalRequest Tests
  // ============================================

  describe('validateLegalRequest', () => {
    it('should return true for valid request with all required fields', () => {
      const request: LegalRequest = {
        id: 'legal_123',
        requestType: 'subpoena',
        requestingAgency: 'LAPD',
        jurisdiction: 'US-CA',
        documentReference: 'DOC-001',
        receivedAt: new Date(),
        signalIds: ['sig_123'],
        status: 'pending_legal_review',
        fulfilledAt: null,
        fulfilledBy: null,
      }

      expect(validateLegalRequest(request)).toBe(true)
    })

    it('should return false for missing id', () => {
      const request = {
        requestType: 'subpoena',
        requestingAgency: 'LAPD',
        jurisdiction: 'US-CA',
        documentReference: 'DOC-001',
        receivedAt: new Date(),
        signalIds: ['sig_123'],
        status: 'pending_legal_review',
        fulfilledAt: null,
        fulfilledBy: null,
      } as LegalRequest

      expect(validateLegalRequest(request)).toBe(false)
    })

    it('should return false for empty signalIds', () => {
      const request: LegalRequest = {
        id: 'legal_123',
        requestType: 'subpoena',
        requestingAgency: 'LAPD',
        jurisdiction: 'US-CA',
        documentReference: 'DOC-001',
        receivedAt: new Date(),
        signalIds: [],
        status: 'pending_legal_review',
        fulfilledAt: null,
        fulfilledBy: null,
      }

      expect(validateLegalRequest(request)).toBe(false)
    })

    it('should return false for invalid request type', () => {
      const request = {
        id: 'legal_123',
        requestType: 'invalid_type',
        requestingAgency: 'LAPD',
        jurisdiction: 'US-CA',
        documentReference: 'DOC-001',
        receivedAt: new Date(),
        signalIds: ['sig_123'],
        status: 'pending_legal_review',
        fulfilledAt: null,
        fulfilledBy: null,
      } as LegalRequest

      expect(validateLegalRequest(request)).toBe(false)
    })

    it('should return false for invalid status', () => {
      const request = {
        id: 'legal_123',
        requestType: 'subpoena',
        requestingAgency: 'LAPD',
        jurisdiction: 'US-CA',
        documentReference: 'DOC-001',
        receivedAt: new Date(),
        signalIds: ['sig_123'],
        status: 'invalid_status',
        fulfilledAt: null,
        fulfilledBy: null,
      } as LegalRequest

      expect(validateLegalRequest(request)).toBe(false)
    })
  })
})
