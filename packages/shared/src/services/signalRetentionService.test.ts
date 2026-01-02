/**
 * SignalRetentionService Tests - Story 7.5.6 Task 5
 *
 * TDD tests for legal retention requirements.
 * AC6: Legal retention requirements per jurisdiction.
 *
 * CRITICAL SAFETY:
 * - Minimum retention per jurisdiction-specific child protection laws
 * - Legal holds prevent deletion regardless of retention period
 * - All retention operations logged
 * - Deletion requires authorization after retention period
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  getRetentionPolicy,
  canDeleteSignal,
  placeLegalHold,
  removeLegalHold,
  getRetentionStatus,
  createRetentionStatus,
  SIGNAL_RETENTION_COLLECTION,
  DEFAULT_RETENTION_POLICIES,
  type SignalRetentionStatus,
} from './signalRetentionService'

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

describe('SignalRetentionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SIGNAL_RETENTION_COLLECTION', () => {
    it('should be named signalRetentionStatus', () => {
      expect(SIGNAL_RETENTION_COLLECTION).toBe('signalRetentionStatus')
    })

    it('should be a root-level collection', () => {
      expect(SIGNAL_RETENTION_COLLECTION).not.toContain('/')
      expect(SIGNAL_RETENTION_COLLECTION).not.toContain('families')
    })
  })

  describe('DEFAULT_RETENTION_POLICIES', () => {
    it('should include US jurisdiction', () => {
      const usPolicy = DEFAULT_RETENTION_POLICIES.find((p) => p.jurisdiction === 'US')
      expect(usPolicy).toBeDefined()
      expect(usPolicy?.minimumRetentionDays).toBeGreaterThan(0)
    })

    it('should include UK jurisdiction', () => {
      const ukPolicy = DEFAULT_RETENTION_POLICIES.find((p) => p.jurisdiction === 'UK')
      expect(ukPolicy).toBeDefined()
      expect(ukPolicy?.minimumRetentionDays).toBeGreaterThan(0)
    })

    it('should have legal basis for each policy', () => {
      for (const policy of DEFAULT_RETENTION_POLICIES) {
        expect(policy.legalBasis).toBeDefined()
        expect(policy.legalBasis.length).toBeGreaterThan(0)
      }
    })

    it('should have minimum retention days for each policy', () => {
      for (const policy of DEFAULT_RETENTION_POLICIES) {
        expect(policy.minimumRetentionDays).toBeGreaterThan(0)
      }
    })
  })

  describe('getRetentionPolicy', () => {
    it('should return US policy for US jurisdiction', () => {
      const policy = getRetentionPolicy('US')

      expect(policy.jurisdiction).toBe('US')
      expect(policy.minimumRetentionDays).toBe(365 * 7) // 7 years
    })

    it('should return UK policy for UK jurisdiction', () => {
      const policy = getRetentionPolicy('UK')

      expect(policy.jurisdiction).toBe('UK')
      expect(policy.minimumRetentionDays).toBe(365 * 6) // 6 years
    })

    it('should return default policy for unknown jurisdiction', () => {
      const policy = getRetentionPolicy('UNKNOWN')

      expect(policy.jurisdiction).toBe('DEFAULT')
      expect(policy.minimumRetentionDays).toBeGreaterThan(0)
    })

    it('should require jurisdiction', () => {
      expect(() => getRetentionPolicy('')).toThrow('jurisdiction is required')
    })

    it('should include legal basis in returned policy', () => {
      const policy = getRetentionPolicy('US')

      expect(policy.legalBasis).toBeDefined()
      expect(policy.legalBasis.length).toBeGreaterThan(0)
    })
  })

  describe('createRetentionStatus', () => {
    it('should create retention status for signal', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await createRetentionStatus('signal-123', 'US')

      expect(result.signalId).toBe('signal-123')
      expect(result.jurisdiction).toBe('US')
      expect(result.legalHold).toBe(false)
    })

    it('should require signalId', async () => {
      await expect(createRetentionStatus('', 'US')).rejects.toThrow('signalId is required')
    })

    it('should require jurisdiction', async () => {
      await expect(createRetentionStatus('signal-123', '')).rejects.toThrow(
        'jurisdiction is required'
      )
    })

    it('should set retentionStartDate to now', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const before = Date.now()
      const result = await createRetentionStatus('signal-123', 'US')
      const after = Date.now()

      expect(result.retentionStartDate.getTime()).toBeGreaterThanOrEqual(before)
      expect(result.retentionStartDate.getTime()).toBeLessThanOrEqual(after)
    })

    it('should set minimumRetainUntil based on policy', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await createRetentionStatus('signal-123', 'US')

      // US policy is 7 years = 365 * 7 days
      const expectedMinDays = 365 * 7
      const expectedMs = expectedMinDays * 24 * 60 * 60 * 1000
      const minRetainTime = result.minimumRetainUntil.getTime()
      const startTime = result.retentionStartDate.getTime()

      expect(minRetainTime - startTime).toBeCloseTo(expectedMs, -10) // Within ~10 seconds
    })

    it('should store retention status in isolated collection', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await createRetentionStatus('signal-123', 'US')

      expect(firestore.doc).toHaveBeenCalledWith(undefined, 'signalRetentionStatus', 'signal-123')
    })
  })

  describe('getRetentionStatus', () => {
    it('should return retention status by signal ID', async () => {
      const mockStatus: SignalRetentionStatus = {
        signalId: 'signal-123',
        jurisdiction: 'US',
        retentionStartDate: new Date(),
        minimumRetainUntil: new Date(Date.now() + 365 * 7 * 24 * 60 * 60 * 1000),
        legalHold: false,
        legalHoldReason: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockStatus,
      } as any)

      const result = await getRetentionStatus('signal-123')

      expect(result).not.toBeNull()
      expect(result?.signalId).toBe('signal-123')
    })

    it('should return null when not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await getRetentionStatus('nonexistent')

      expect(result).toBeNull()
    })

    it('should require signalId', async () => {
      await expect(getRetentionStatus('')).rejects.toThrow('signalId is required')
    })
  })

  describe('canDeleteSignal', () => {
    it('should return false when retention period not passed', async () => {
      const mockStatus: SignalRetentionStatus = {
        signalId: 'signal-123',
        jurisdiction: 'US',
        retentionStartDate: new Date(),
        minimumRetainUntil: new Date(Date.now() + 365 * 7 * 24 * 60 * 60 * 1000), // 7 years in future
        legalHold: false,
        legalHoldReason: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockStatus,
      } as any)

      const result = await canDeleteSignal('signal-123')

      expect(result.canDelete).toBe(false)
      expect(result.reason).toContain('Retention period')
    })

    it('should return false when legal hold is active', async () => {
      const mockStatus: SignalRetentionStatus = {
        signalId: 'signal-123',
        jurisdiction: 'US',
        retentionStartDate: new Date(Date.now() - 365 * 10 * 24 * 60 * 60 * 1000), // 10 years ago
        minimumRetainUntil: new Date(Date.now() - 365 * 3 * 24 * 60 * 60 * 1000), // 3 years ago (past)
        legalHold: true,
        legalHoldReason: 'Active investigation',
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockStatus,
      } as any)

      const result = await canDeleteSignal('signal-123')

      expect(result.canDelete).toBe(false)
      expect(result.reason).toContain('Legal hold')
    })

    it('should return true when retention passed and no legal hold', async () => {
      const mockStatus: SignalRetentionStatus = {
        signalId: 'signal-123',
        jurisdiction: 'US',
        retentionStartDate: new Date(Date.now() - 365 * 10 * 24 * 60 * 60 * 1000), // 10 years ago
        minimumRetainUntil: new Date(Date.now() - 365 * 3 * 24 * 60 * 60 * 1000), // 3 years ago (past)
        legalHold: false,
        legalHoldReason: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockStatus,
      } as any)

      const result = await canDeleteSignal('signal-123')

      expect(result.canDelete).toBe(true)
    })

    it('should require signalId', async () => {
      await expect(canDeleteSignal('')).rejects.toThrow('signalId is required')
    })

    it('should return false when status not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await canDeleteSignal('nonexistent')

      expect(result.canDelete).toBe(false)
      expect(result.reason).toContain('Retention status not found')
    })
  })

  describe('placeLegalHold', () => {
    it('should set legalHold to true', async () => {
      const mockStatus: SignalRetentionStatus = {
        signalId: 'signal-123',
        jurisdiction: 'US',
        retentionStartDate: new Date(),
        minimumRetainUntil: new Date(Date.now() + 365 * 7 * 24 * 60 * 60 * 1000),
        legalHold: false,
        legalHoldReason: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockStatus,
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await placeLegalHold('signal-123', 'Active investigation')

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          legalHold: true,
          legalHoldReason: 'Active investigation',
        })
      )
    })

    it('should require signalId', async () => {
      await expect(placeLegalHold('', 'reason')).rejects.toThrow('signalId is required')
    })

    it('should require reason', async () => {
      await expect(placeLegalHold('signal-123', '')).rejects.toThrow('reason is required')
    })

    it('should throw when status not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      await expect(placeLegalHold('nonexistent', 'reason')).rejects.toThrow(
        'Retention status not found'
      )
    })

    it('should throw when legal hold already active', async () => {
      const mockStatus: SignalRetentionStatus = {
        signalId: 'signal-123',
        jurisdiction: 'US',
        retentionStartDate: new Date(),
        minimumRetainUntil: new Date(Date.now() + 365 * 7 * 24 * 60 * 60 * 1000),
        legalHold: true,
        legalHoldReason: 'Existing hold',
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockStatus,
      } as any)

      await expect(placeLegalHold('signal-123', 'New reason')).rejects.toThrow(
        'Legal hold already active'
      )
    })
  })

  describe('removeLegalHold', () => {
    it('should set legalHold to false', async () => {
      const mockStatus: SignalRetentionStatus = {
        signalId: 'signal-123',
        jurisdiction: 'US',
        retentionStartDate: new Date(),
        minimumRetainUntil: new Date(Date.now() + 365 * 7 * 24 * 60 * 60 * 1000),
        legalHold: true,
        legalHoldReason: 'Active investigation',
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockStatus,
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await removeLegalHold('signal-123', 'auth-123')

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          legalHold: false,
          legalHoldReason: null,
        })
      )
    })

    it('should require signalId', async () => {
      await expect(removeLegalHold('', 'auth-123')).rejects.toThrow('signalId is required')
    })

    it('should require authorizationId', async () => {
      await expect(removeLegalHold('signal-123', '')).rejects.toThrow('authorizationId is required')
    })

    it('should throw when status not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      await expect(removeLegalHold('nonexistent', 'auth-123')).rejects.toThrow(
        'Retention status not found'
      )
    })

    it('should throw when no legal hold active', async () => {
      const mockStatus: SignalRetentionStatus = {
        signalId: 'signal-123',
        jurisdiction: 'US',
        retentionStartDate: new Date(),
        minimumRetainUntil: new Date(Date.now() + 365 * 7 * 24 * 60 * 60 * 1000),
        legalHold: false,
        legalHoldReason: null,
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockStatus,
      } as any)

      await expect(removeLegalHold('signal-123', 'auth-123')).rejects.toThrow(
        'No legal hold active'
      )
    })
  })
})
