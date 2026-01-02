/**
 * SignalAccessAuthorizationService Tests - Story 7.5.6 Task 4
 *
 * TDD tests for admin authorization for signal access.
 * AC5: Admin access requires authorization with separate approver.
 *
 * CRITICAL SAFETY:
 * - Authorization requires separate approver (not self-approve)
 * - All operations logged to admin audit
 * - Authorizations expire after configurable period
 * - Each authorization can only be used once
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  requestSignalAccessAuthorization,
  approveAuthorization,
  denyAuthorization,
  validateAuthorization,
  markAuthorizationUsed,
  getAuthorization,
  SIGNAL_ACCESS_AUTHORIZATIONS_COLLECTION,
  type SignalAccessAuthorization,
} from './signalAccessAuthorizationService'

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

describe('SignalAccessAuthorizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SIGNAL_ACCESS_AUTHORIZATIONS_COLLECTION', () => {
    it('should be named signalAccessAuthorizations', () => {
      expect(SIGNAL_ACCESS_AUTHORIZATIONS_COLLECTION).toBe('signalAccessAuthorizations')
    })

    it('should be a root-level collection', () => {
      expect(SIGNAL_ACCESS_AUTHORIZATIONS_COLLECTION).not.toContain('/')
      expect(SIGNAL_ACCESS_AUTHORIZATIONS_COLLECTION).not.toContain('families')
    })
  })

  describe('requestSignalAccessAuthorization', () => {
    it('should create authorization request with pending status', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await requestSignalAccessAuthorization(
        'admin-user-1',
        'signal-123',
        'legal_request',
        'Court order #12345'
      )

      expect(result.status).toBe('pending')
      expect(result.adminUserId).toBe('admin-user-1')
      expect(result.signalId).toBe('signal-123')
      expect(result.authorizationType).toBe('legal_request')
      expect(result.reason).toBe('Court order #12345')
    })

    it('should require adminUserId', async () => {
      await expect(
        requestSignalAccessAuthorization('', 'signal-123', 'legal_request', 'reason')
      ).rejects.toThrow('adminUserId is required')
    })

    it('should require signalId', async () => {
      await expect(
        requestSignalAccessAuthorization('admin-1', '', 'legal_request', 'reason')
      ).rejects.toThrow('signalId is required')
    })

    it('should require reason', async () => {
      await expect(
        requestSignalAccessAuthorization('admin-1', 'signal-123', 'legal_request', '')
      ).rejects.toThrow('reason is required')
    })

    it('should generate unique authorization ID', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result1 = await requestSignalAccessAuthorization(
        'admin-1',
        'signal-123',
        'legal_request',
        'reason'
      )
      const result2 = await requestSignalAccessAuthorization(
        'admin-1',
        'signal-456',
        'legal_request',
        'reason'
      )

      expect(result1.id).toBeDefined()
      expect(result2.id).toBeDefined()
      expect(result1.id).not.toBe(result2.id)
    })

    it('should set requestedAt timestamp', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await requestSignalAccessAuthorization(
        'admin-1',
        'signal-123',
        'legal_request',
        'reason'
      )

      expect(result.requestedAt).toBeInstanceOf(Date)
    })

    it('should set expiresAt with default 24 hours', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const before = Date.now()
      const result = await requestSignalAccessAuthorization(
        'admin-1',
        'signal-123',
        'legal_request',
        'reason'
      )
      const after = Date.now()

      // Expires in approximately 24 hours
      const expectedExpiry = before + 24 * 60 * 60 * 1000
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000)
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000 + 1000)
    })

    it('should store authorization in isolated collection', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await requestSignalAccessAuthorization('admin-1', 'signal-123', 'legal_request', 'reason')

      expect(firestore.doc).toHaveBeenCalledWith(
        undefined,
        'signalAccessAuthorizations',
        expect.any(String)
      )
    })

    it('should support legal_request authorization type', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await requestSignalAccessAuthorization(
        'admin-1',
        'signal-123',
        'legal_request',
        'reason'
      )

      expect(result.authorizationType).toBe('legal_request')
    })

    it('should support compliance_review authorization type', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await requestSignalAccessAuthorization(
        'admin-1',
        'signal-123',
        'compliance_review',
        'reason'
      )

      expect(result.authorizationType).toBe('compliance_review')
    })

    it('should support law_enforcement authorization type', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await requestSignalAccessAuthorization(
        'admin-1',
        'signal-123',
        'law_enforcement',
        'reason'
      )

      expect(result.authorizationType).toBe('law_enforcement')
    })
  })

  describe('approveAuthorization', () => {
    it('should require authorizationId', async () => {
      await expect(approveAuthorization('', 'approver-1')).rejects.toThrow(
        'authorizationId is required'
      )
    })

    it('should require approverId', async () => {
      await expect(approveAuthorization('auth-123', '')).rejects.toThrow('approverId is required')
    })

    it('should update status to approved', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'pending',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        approvedBy: null,
        approvedAt: null,
        used: false,
        usedAt: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const result = await approveAuthorization('auth-123', 'approver-1')

      expect(result.status).toBe('approved')
      expect(result.approvedBy).toBe('approver-1')
      expect(result.approvedAt).toBeInstanceOf(Date)
    })

    it('should prevent self-approval', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'pending',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        approvedBy: null,
        approvedAt: null,
        used: false,
        usedAt: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)

      await expect(approveAuthorization('auth-123', 'admin-1')).rejects.toThrow(
        'Cannot self-approve authorization'
      )
    })

    it('should throw when authorization not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      await expect(approveAuthorization('nonexistent', 'approver-1')).rejects.toThrow(
        'Authorization not found'
      )
    })

    it('should throw when already approved', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'approved',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        approvedBy: 'approver-1',
        approvedAt: new Date(),
        used: false,
        usedAt: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)

      await expect(approveAuthorization('auth-123', 'approver-2')).rejects.toThrow(
        'Authorization is not pending'
      )
    })
  })

  describe('denyAuthorization', () => {
    it('should require authorizationId', async () => {
      await expect(denyAuthorization('', 'denier-1', 'reason')).rejects.toThrow(
        'authorizationId is required'
      )
    })

    it('should require denierId', async () => {
      await expect(denyAuthorization('auth-123', '', 'reason')).rejects.toThrow(
        'denierId is required'
      )
    })

    it('should update status to denied', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'pending',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        approvedBy: null,
        approvedAt: null,
        used: false,
        usedAt: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const result = await denyAuthorization('auth-123', 'denier-1', 'Insufficient justification')

      expect(result.status).toBe('denied')
    })
  })

  describe('validateAuthorization', () => {
    it('should return true for valid approved authorization', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'approved',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        approvedBy: 'approver-1',
        approvedAt: new Date(),
        used: false,
        usedAt: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)

      const result = await validateAuthorization('auth-123', 'signal-123')

      expect(result).toBe(true)
    })

    it('should return false for pending authorization', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'pending',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        approvedBy: null,
        approvedAt: null,
        used: false,
        usedAt: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)

      const result = await validateAuthorization('auth-123', 'signal-123')

      expect(result).toBe(false)
    })

    it('should return false for expired authorization', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'approved',
        requestedAt: new Date(Date.now() - 86400000 * 2),
        expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
        approvedBy: 'approver-1',
        approvedAt: new Date(Date.now() - 86400000 * 2),
        used: false,
        usedAt: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)

      const result = await validateAuthorization('auth-123', 'signal-123')

      expect(result).toBe(false)
    })

    it('should return false for already used authorization', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'approved',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        approvedBy: 'approver-1',
        approvedAt: new Date(),
        used: true,
        usedAt: new Date(),
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)

      const result = await validateAuthorization('auth-123', 'signal-123')

      expect(result).toBe(false)
    })

    it('should return false for mismatched signalId', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'approved',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        approvedBy: 'approver-1',
        approvedAt: new Date(),
        used: false,
        usedAt: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)

      const result = await validateAuthorization('auth-123', 'wrong-signal-id')

      expect(result).toBe(false)
    })

    it('should return false when authorization not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await validateAuthorization('nonexistent', 'signal-123')

      expect(result).toBe(false)
    })
  })

  describe('markAuthorizationUsed', () => {
    it('should update used flag to true', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'approved',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        approvedBy: 'approver-1',
        approvedAt: new Date(),
        used: false,
        usedAt: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await markAuthorizationUsed('auth-123')

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          used: true,
          usedAt: expect.any(Date),
        })
      )
    })

    it('should require authorizationId', async () => {
      await expect(markAuthorizationUsed('')).rejects.toThrow('authorizationId is required')
    })

    it('should throw when authorization not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      await expect(markAuthorizationUsed('nonexistent')).rejects.toThrow('Authorization not found')
    })

    it('should throw when authorization already used', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'approved',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        approvedBy: 'approver-1',
        approvedAt: new Date(),
        used: true,
        usedAt: new Date(),
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)

      await expect(markAuthorizationUsed('auth-123')).rejects.toThrow('Authorization already used')
    })
  })

  describe('getAuthorization', () => {
    it('should return authorization by ID', async () => {
      const mockAuth: SignalAccessAuthorization = {
        id: 'auth-123',
        adminUserId: 'admin-1',
        signalId: 'signal-123',
        authorizationType: 'legal_request',
        reason: 'reason',
        status: 'approved',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        approvedBy: 'approver-1',
        approvedAt: new Date(),
        used: false,
        usedAt: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockAuth,
      } as any)

      const result = await getAuthorization('auth-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('auth-123')
    })

    it('should return null when not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await getAuthorization('nonexistent')

      expect(result).toBeNull()
    })

    it('should require authorizationId', async () => {
      await expect(getAuthorization('')).rejects.toThrow('authorizationId is required')
    })
  })
})
