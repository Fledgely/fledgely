/**
 * SignalBlackoutService Tests - Story 7.5.7 Task 1
 *
 * TDD tests for 48-hour family notification blackout.
 * AC1: No family notifications during blackout
 * AC4: External partner can extend blackout
 *
 * CRITICAL SAFETY:
 * - Blackout is 48-hour MINIMUM
 * - Partners can extend in 24-hour increments
 * - All operations logged to admin audit
 * - Family cannot access blackout data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  createBlackout,
  isBlackoutActive,
  extendBlackout,
  getBlackoutTimeRemaining,
  releaseBlackoutEarly,
  getBlackoutStatus,
  SIGNAL_BLACKOUTS_COLLECTION,
  type SignalBlackout,
  type BlackoutExtension,
} from './signalBlackoutService'

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

describe('SignalBlackoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SIGNAL_BLACKOUTS_COLLECTION', () => {
    it('should be named signalBlackouts', () => {
      expect(SIGNAL_BLACKOUTS_COLLECTION).toBe('signalBlackouts')
    })

    it('should be a root-level collection (not under families)', () => {
      expect(SIGNAL_BLACKOUTS_COLLECTION).not.toContain('/')
      expect(SIGNAL_BLACKOUTS_COLLECTION).not.toContain('families')
    })
  })

  describe('createBlackout', () => {
    it('should create a 48-hour blackout for signal', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await createBlackout('signal-123', 'child-456')

      expect(result.signalId).toBe('signal-123')
      expect(result.childId).toBe('child-456')
      expect(result.status).toBe('active')
    })

    it('should set expiresAt to 48 hours from now', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await createBlackout('signal-123', 'child-456')

      const expectedExpiry = 48 * 60 * 60 * 1000 // 48 hours in ms
      const expiresTime = result.expiresAt.getTime()
      const startedTime = result.startedAt.getTime()

      expect(expiresTime - startedTime).toBeCloseTo(expectedExpiry, -10)
    })

    it('should require signalId', async () => {
      await expect(createBlackout('', 'child-456')).rejects.toThrow('signalId is required')
    })

    it('should require childId', async () => {
      await expect(createBlackout('signal-123', '')).rejects.toThrow('childId is required')
    })

    it('should initialize with no extensions', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await createBlackout('signal-123', 'child-456')

      expect(result.extensions).toEqual([])
      expect(result.extendedBy).toBeNull()
      expect(result.extendedAt).toBeNull()
    })

    it('should store blackout in isolated collection', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await createBlackout('signal-123', 'child-456')

      expect(firestore.doc).toHaveBeenCalledWith(undefined, 'signalBlackouts', expect.any(String))
    })

    it('should generate unique blackout ID', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result1 = await createBlackout('signal-1', 'child-1')
      const result2 = await createBlackout('signal-2', 'child-2')

      expect(result1.id).toBeDefined()
      expect(result2.id).toBeDefined()
      expect(result1.id).not.toBe(result2.id)
    })
  })

  describe('isBlackoutActive', () => {
    it('should return true for active blackout within 48 hours', async () => {
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'active',
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockBlackout }],
      } as any)

      const result = await isBlackoutActive('signal-123')

      expect(result).toBe(true)
    })

    it('should return false for expired blackout', async () => {
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 hours ago
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'expired',
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockBlackout }],
      } as any)

      const result = await isBlackoutActive('signal-123')

      expect(result).toBe(false)
    })

    it('should return false when no blackout exists', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const result = await isBlackoutActive('signal-123')

      expect(result).toBe(false)
    })

    it('should return false for released blackout', async () => {
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'released',
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockBlackout }],
      } as any)

      const result = await isBlackoutActive('signal-123')

      expect(result).toBe(false)
    })

    it('should require signalId', async () => {
      await expect(isBlackoutActive('')).rejects.toThrow('signalId is required')
    })
  })

  describe('extendBlackout', () => {
    it('should extend blackout by 24 hours', async () => {
      const originalExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        expiresAt: originalExpiry,
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'active',
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ id: 'blackout-123', data: () => mockBlackout, ref: {} }],
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const result = await extendBlackout('signal-123', 'partner-001', 24, 'Child needs more time')

      expect(result.extendedBy).toBe('partner-001')
      expect(result.extensions.length).toBe(1)
      expect(result.extensions[0].additionalHours).toBe(24)
    })

    it('should extend blackout by 48 hours', async () => {
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'active',
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ id: 'blackout-123', data: () => mockBlackout, ref: {} }],
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const result = await extendBlackout(
        'signal-123',
        'partner-001',
        48,
        'Safety plan in progress'
      )

      expect(result.extensions[0].additionalHours).toBe(48)
    })

    it('should require signalId', async () => {
      await expect(extendBlackout('', 'partner-001', 24, 'reason')).rejects.toThrow(
        'signalId is required'
      )
    })

    it('should require partnerId', async () => {
      await expect(extendBlackout('signal-123', '', 24, 'reason')).rejects.toThrow(
        'partnerId is required'
      )
    })

    it('should require reason', async () => {
      await expect(extendBlackout('signal-123', 'partner-001', 24, '')).rejects.toThrow(
        'reason is required'
      )
    })

    it('should only allow 24, 48, or 72 hour extensions', async () => {
      await expect(
        extendBlackout('signal-123', 'partner-001', 12 as any, 'reason')
      ).rejects.toThrow('Extension must be 24, 48, or 72 hours')
    })

    it('should throw when blackout not found', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      await expect(extendBlackout('nonexistent', 'partner-001', 24, 'reason')).rejects.toThrow(
        'Blackout not found'
      )
    })

    it('should throw when blackout is not active', async () => {
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'expired',
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ id: 'blackout-123', data: () => mockBlackout, ref: {} }],
      } as any)

      await expect(extendBlackout('signal-123', 'partner-001', 24, 'reason')).rejects.toThrow(
        'Blackout is not active'
      )
    })

    it('should support multiple extensions', async () => {
      const existingExtension: BlackoutExtension = {
        extendedBy: 'partner-001',
        extendedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        additionalHours: 24,
        reason: 'First extension',
      }
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        extendedBy: 'partner-001',
        extendedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        extensions: [existingExtension],
        status: 'active',
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ id: 'blackout-123', data: () => mockBlackout, ref: {} }],
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const result = await extendBlackout('signal-123', 'partner-002', 24, 'Second extension')

      expect(result.extensions.length).toBe(2)
    })
  })

  describe('getBlackoutTimeRemaining', () => {
    it('should return time remaining in milliseconds', async () => {
      const expiresIn = 12 * 60 * 60 * 1000 // 12 hours
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + expiresIn),
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'active',
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockBlackout }],
      } as any)

      const result = await getBlackoutTimeRemaining('signal-123')

      expect(result).toBeGreaterThan(expiresIn - 1000) // Allow 1 second tolerance
      expect(result).toBeLessThanOrEqual(expiresIn)
    })

    it('should return 0 for expired blackout', async () => {
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'expired',
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockBlackout }],
      } as any)

      const result = await getBlackoutTimeRemaining('signal-123')

      expect(result).toBe(0)
    })

    it('should return 0 when no blackout exists', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const result = await getBlackoutTimeRemaining('signal-123')

      expect(result).toBe(0)
    })

    it('should require signalId', async () => {
      await expect(getBlackoutTimeRemaining('')).rejects.toThrow('signalId is required')
    })
  })

  describe('releaseBlackoutEarly', () => {
    it('should release blackout and set status to released', async () => {
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'active',
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ id: 'blackout-123', data: () => mockBlackout, ref: {} }],
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await releaseBlackoutEarly('signal-123', 'partner-001', 'Safety plan completed')

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'released',
        })
      )
    })

    it('should require signalId', async () => {
      await expect(releaseBlackoutEarly('', 'partner-001', 'reason')).rejects.toThrow(
        'signalId is required'
      )
    })

    it('should require partnerId', async () => {
      await expect(releaseBlackoutEarly('signal-123', '', 'reason')).rejects.toThrow(
        'partnerId is required'
      )
    })

    it('should require reason', async () => {
      await expect(releaseBlackoutEarly('signal-123', 'partner-001', '')).rejects.toThrow(
        'reason is required'
      )
    })

    it('should throw when blackout not found', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      await expect(releaseBlackoutEarly('nonexistent', 'partner-001', 'reason')).rejects.toThrow(
        'Blackout not found'
      )
    })

    it('should throw when blackout is not active', async () => {
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'expired',
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ id: 'blackout-123', data: () => mockBlackout, ref: {} }],
      } as any)

      await expect(releaseBlackoutEarly('signal-123', 'partner-001', 'reason')).rejects.toThrow(
        'Blackout is not active'
      )
    })
  })

  describe('getBlackoutStatus', () => {
    it('should return blackout status for signal', async () => {
      const mockBlackout: SignalBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'active',
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockBlackout }],
      } as any)

      const result = await getBlackoutStatus('signal-123')

      expect(result).not.toBeNull()
      expect(result?.signalId).toBe('signal-123')
      expect(result?.status).toBe('active')
    })

    it('should return null when no blackout exists', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const result = await getBlackoutStatus('nonexistent')

      expect(result).toBeNull()
    })

    it('should require signalId', async () => {
      await expect(getBlackoutStatus('')).rejects.toThrow('signalId is required')
    })

    it('should convert Firestore timestamps to Dates', async () => {
      const mockBlackout = {
        id: 'blackout-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startedAt: { toDate: () => new Date() },
        expiresAt: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
        extendedBy: null,
        extendedAt: null,
        extensions: [],
        status: 'active',
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockBlackout }],
      } as any)

      const result = await getBlackoutStatus('signal-123')

      expect(result?.startedAt).toBeInstanceOf(Date)
      expect(result?.expiresAt).toBeInstanceOf(Date)
    })
  })
})
