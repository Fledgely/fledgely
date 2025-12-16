import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  initiateDissolution,
  acknowledgeDissolution,
  cancelDissolution,
  getDissolutionStatus,
  DissolutionServiceError,
  getErrorMessage,
} from './dissolutionService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
  },
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

import { doc, getDoc, collection, writeBatch } from 'firebase/firestore'

const mockDoc = vi.mocked(doc)
const mockCollection = vi.mocked(collection)

describe('dissolutionService', () => {
  const mockUserId = 'user-123'
  const mockFamilyId = 'family-456'
  const mockReauthToken = 'valid-token'

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up doc mock to return an object with id (for audit log refs)
    mockCollection.mockReturnValue({ id: 'auditLog' } as ReturnType<typeof collection>)
    mockDoc.mockReturnValue({ id: 'mock-audit-id' } as ReturnType<typeof doc>)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('DissolutionServiceError', () => {
    it('should create error with code and message', () => {
      const error = new DissolutionServiceError('test-code', 'Test message')

      expect(error.code).toBe('test-code')
      expect(error.message).toBe('Test message')
      expect(error.name).toBe('DissolutionServiceError')
    })
  })

  describe('getErrorMessage', () => {
    it('should return correct messages for known codes', () => {
      expect(getErrorMessage('family-not-found')).toBe(
        'We could not find this family.'
      )
      expect(getErrorMessage('not-a-guardian')).toBe(
        'You are not a member of this family.'
      )
      expect(getErrorMessage('reauth-required')).toBe(
        'Please sign in again to confirm this action.'
      )
    })

    it('should return default message for unknown codes', () => {
      expect(getErrorMessage('unknown')).toBe('Something went wrong. Please try again.')
    })
  })

  // ============================================================================
  // initiateDissolution Tests
  // ============================================================================

  describe('initiateDissolution', () => {
    it('should throw when family not found', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      } as never)

      await expect(
        initiateDissolution(mockFamilyId, mockUserId, 'delete_all', mockReauthToken)
      ).rejects.toThrow('We could not find this family.')
    })

    it('should throw when user is not a guardian', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: 'other-user', role: 'primary', permissions: 'full' }],
        }),
      } as never)

      await expect(
        initiateDissolution(mockFamilyId, mockUserId, 'delete_all', mockReauthToken)
      ).rejects.toThrow('You are not a member of this family.')
    })

    it('should throw when dissolution already in progress', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
          dissolution: { status: 'cooling_period' },
        }),
      } as never)

      await expect(
        initiateDissolution(mockFamilyId, mockUserId, 'delete_all', mockReauthToken)
      ).rejects.toThrow('This family is already being dissolved.')
    })

    it('should throw when reauth token missing', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
        }),
      } as never)

      await expect(
        initiateDissolution(mockFamilyId, mockUserId, 'delete_all', '')
      ).rejects.toThrow('Please sign in again to confirm this action.')
    })

    it('should create dissolution for single guardian family', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(writeBatch).mockReturnValue(mockBatch as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
        }),
      } as never)

      const result = await initiateDissolution(
        mockFamilyId,
        mockUserId,
        'delete_all',
        mockReauthToken
      )

      expect(result.status).toBe('cooling_period')
      expect(result.initiatedBy).toBe(mockUserId)
      expect(result.dataHandlingOption).toBe('delete_all')
      expect(result.scheduledDeletionAt).not.toBeNull()
      expect(mockBatch.commit).toHaveBeenCalled()
    })

    it('should create dissolution with pending_acknowledgment for shared custody', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(writeBatch).mockReturnValue(mockBatch as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [
            { uid: mockUserId, role: 'primary', permissions: 'full' },
            { uid: 'other-guardian', role: 'co-parent', permissions: 'full' },
          ],
        }),
      } as never)

      const result = await initiateDissolution(
        mockFamilyId,
        mockUserId,
        'export_first',
        mockReauthToken
      )

      expect(result.status).toBe('pending_acknowledgment')
      expect(result.scheduledDeletionAt).toBeNull()
      expect(result.allAcknowledgedAt).toBeNull()
    })

    it('should allow re-initiation of cancelled dissolution', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(writeBatch).mockReturnValue(mockBatch as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
          dissolution: { status: 'cancelled' },
        }),
      } as never)

      const result = await initiateDissolution(
        mockFamilyId,
        mockUserId,
        'delete_all',
        mockReauthToken
      )

      expect(result.status).toBe('cooling_period')
    })

    it('should create audit log entry', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(writeBatch).mockReturnValue(mockBatch as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
        }),
      } as never)

      await initiateDissolution(mockFamilyId, mockUserId, 'delete_all', mockReauthToken)

      // Check audit log was created
      expect(mockBatch.set).toHaveBeenCalled()
      const setCall = mockBatch.set.mock.calls[0]
      expect(setCall[1]).toMatchObject({
        action: 'dissolution_initiated',
        entityType: 'family',
        performedBy: mockUserId,
      })
    })
  })

  // ============================================================================
  // acknowledgeDissolution Tests
  // ============================================================================

  describe('acknowledgeDissolution', () => {
    const mockOtherGuardianId = 'other-guardian'
    const mockInitiatorId = 'initiator-user'

    it('should throw when family not found', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      } as never)

      await expect(
        acknowledgeDissolution(mockFamilyId, mockOtherGuardianId)
      ).rejects.toThrow('We could not find this family.')
    })

    it('should throw when user is not a guardian', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockInitiatorId, role: 'primary', permissions: 'full' }],
          dissolution: {
            status: 'pending_acknowledgment',
            initiatedBy: mockInitiatorId,
            initiatedAt: { toDate: () => new Date() },
            dataHandlingOption: 'delete_all',
            acknowledgments: [],
          },
        }),
      } as never)

      await expect(
        acknowledgeDissolution(mockFamilyId, mockOtherGuardianId)
      ).rejects.toThrow('You are not a member of this family.')
    })

    it('should throw when dissolution is not pending', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [
            { uid: mockInitiatorId, role: 'primary', permissions: 'full' },
            { uid: mockOtherGuardianId, role: 'co-parent', permissions: 'full' },
          ],
          dissolution: {
            status: 'cooling_period',
            initiatedBy: mockInitiatorId,
            initiatedAt: { toDate: () => new Date() },
            dataHandlingOption: 'delete_all',
            acknowledgments: [],
          },
        }),
      } as never)

      await expect(
        acknowledgeDissolution(mockFamilyId, mockOtherGuardianId)
      ).rejects.toThrow('This family is not being dissolved.')
    })

    it('should throw when initiator tries to acknowledge', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [
            { uid: mockInitiatorId, role: 'primary', permissions: 'full' },
            { uid: mockOtherGuardianId, role: 'co-parent', permissions: 'full' },
          ],
          dissolution: {
            status: 'pending_acknowledgment',
            initiatedBy: mockInitiatorId,
            initiatedAt: { toDate: () => new Date() },
            dataHandlingOption: 'delete_all',
            acknowledgments: [],
          },
        }),
      } as never)

      await expect(
        acknowledgeDissolution(mockFamilyId, mockInitiatorId)
      ).rejects.toThrow('You started this dissolution. You do not need to acknowledge.')
    })

    it('should throw when user already acknowledged', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [
            { uid: mockInitiatorId, role: 'primary', permissions: 'full' },
            { uid: mockOtherGuardianId, role: 'co-parent', permissions: 'full' },
          ],
          dissolution: {
            status: 'pending_acknowledgment',
            initiatedBy: mockInitiatorId,
            initiatedAt: { toDate: () => new Date() },
            dataHandlingOption: 'delete_all',
            acknowledgments: [
              {
                guardianId: mockOtherGuardianId,
                acknowledgedAt: { toDate: () => new Date() },
              },
            ],
          },
        }),
      } as never)

      await expect(
        acknowledgeDissolution(mockFamilyId, mockOtherGuardianId)
      ).rejects.toThrow('You have already acknowledged this.')
    })

    it('should add acknowledgment and transition to cooling_period when all acknowledged', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(writeBatch).mockReturnValue(mockBatch as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [
            { uid: mockInitiatorId, role: 'primary', permissions: 'full' },
            { uid: mockOtherGuardianId, role: 'co-parent', permissions: 'full' },
          ],
          dissolution: {
            status: 'pending_acknowledgment',
            initiatedBy: mockInitiatorId,
            initiatedAt: { toDate: () => new Date() },
            dataHandlingOption: 'delete_all',
            acknowledgments: [],
            allAcknowledgedAt: null,
            scheduledDeletionAt: null,
            cancelledBy: null,
            cancelledAt: null,
          },
        }),
      } as never)

      const result = await acknowledgeDissolution(mockFamilyId, mockOtherGuardianId)

      expect(result.status).toBe('cooling_period')
      expect(result.acknowledgments).toHaveLength(1)
      expect(result.acknowledgments[0].guardianId).toBe(mockOtherGuardianId)
      expect(result.scheduledDeletionAt).not.toBeNull()
      expect(result.allAcknowledgedAt).not.toBeNull()
    })

    it('should remain pending when more acknowledgments needed', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(writeBatch).mockReturnValue(mockBatch as never)

      const thirdGuardianId = 'third-guardian'

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [
            { uid: mockInitiatorId, role: 'primary', permissions: 'full' },
            { uid: mockOtherGuardianId, role: 'co-parent', permissions: 'full' },
            { uid: thirdGuardianId, role: 'caregiver', permissions: 'readonly' },
          ],
          dissolution: {
            status: 'pending_acknowledgment',
            initiatedBy: mockInitiatorId,
            initiatedAt: { toDate: () => new Date() },
            dataHandlingOption: 'delete_all',
            acknowledgments: [],
            allAcknowledgedAt: null,
            scheduledDeletionAt: null,
            cancelledBy: null,
            cancelledAt: null,
          },
        }),
      } as never)

      const result = await acknowledgeDissolution(mockFamilyId, mockOtherGuardianId)

      expect(result.status).toBe('pending_acknowledgment')
      expect(result.allAcknowledgedAt).toBeNull()
      expect(result.scheduledDeletionAt).toBeNull()
    })
  })

  // ============================================================================
  // cancelDissolution Tests
  // ============================================================================

  describe('cancelDissolution', () => {
    it('should throw when family not found', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      } as never)

      await expect(cancelDissolution(mockFamilyId, mockUserId)).rejects.toThrow(
        'We could not find this family.'
      )
    })

    it('should throw when user is not a guardian', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: 'other-user', role: 'primary', permissions: 'full' }],
          dissolution: { status: 'cooling_period' },
        }),
      } as never)

      await expect(cancelDissolution(mockFamilyId, mockUserId)).rejects.toThrow(
        'You are not a member of this family.'
      )
    })

    it('should throw when no dissolution exists', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
        }),
      } as never)

      await expect(cancelDissolution(mockFamilyId, mockUserId)).rejects.toThrow(
        'This family is not being dissolved.'
      )
    })

    it('should throw when dissolution already completed', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
          dissolution: { status: 'completed' },
        }),
      } as never)

      await expect(cancelDissolution(mockFamilyId, mockUserId)).rejects.toThrow(
        'This dissolution cannot be cancelled right now.'
      )
    })

    it('should cancel dissolution in pending_acknowledgment status', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(writeBatch).mockReturnValue(mockBatch as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
          dissolution: {
            status: 'pending_acknowledgment',
            initiatedBy: mockUserId,
            initiatedAt: { toDate: () => new Date() },
            dataHandlingOption: 'delete_all',
            acknowledgments: [],
            allAcknowledgedAt: null,
            scheduledDeletionAt: null,
            cancelledBy: null,
            cancelledAt: null,
          },
        }),
      } as never)

      const result = await cancelDissolution(mockFamilyId, mockUserId)

      expect(result.status).toBe('cancelled')
      expect(result.cancelledBy).toBe(mockUserId)
      expect(result.cancelledAt).not.toBeNull()
    })

    it('should cancel dissolution in cooling_period status', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(writeBatch).mockReturnValue(mockBatch as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
          dissolution: {
            status: 'cooling_period',
            initiatedBy: mockUserId,
            initiatedAt: { toDate: () => new Date() },
            dataHandlingOption: 'delete_all',
            acknowledgments: [],
            allAcknowledgedAt: { toDate: () => new Date() },
            scheduledDeletionAt: { toDate: () => new Date() },
            cancelledBy: null,
            cancelledAt: null,
          },
        }),
      } as never)

      const result = await cancelDissolution(mockFamilyId, mockUserId)

      expect(result.status).toBe('cancelled')
    })

    it('should create audit log entry on cancellation', async () => {
      const mockBatch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(writeBatch).mockReturnValue(mockBatch as never)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
          dissolution: {
            status: 'cooling_period',
            initiatedBy: mockUserId,
            initiatedAt: { toDate: () => new Date() },
            dataHandlingOption: 'delete_all',
            acknowledgments: [],
            allAcknowledgedAt: { toDate: () => new Date() },
            scheduledDeletionAt: { toDate: () => new Date() },
            cancelledBy: null,
            cancelledAt: null,
          },
        }),
      } as never)

      await cancelDissolution(mockFamilyId, mockUserId)

      expect(mockBatch.set).toHaveBeenCalled()
      const setCall = mockBatch.set.mock.calls[0]
      expect(setCall[1]).toMatchObject({
        action: 'dissolution_cancelled',
        entityType: 'family',
        performedBy: mockUserId,
      })
    })
  })

  // ============================================================================
  // getDissolutionStatus Tests
  // ============================================================================

  describe('getDissolutionStatus', () => {
    it('should return null when family not found', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      } as never)

      const result = await getDissolutionStatus(mockFamilyId)

      expect(result).toBeNull()
    })

    it('should return null when no dissolution', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
        }),
      } as never)

      const result = await getDissolutionStatus(mockFamilyId)

      expect(result).toBeNull()
    })

    it('should return dissolution status', async () => {
      const now = new Date()
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
          dissolution: {
            status: 'cooling_period',
            initiatedBy: mockUserId,
            initiatedAt: { toDate: () => now },
            dataHandlingOption: 'delete_all',
            acknowledgments: [],
            allAcknowledgedAt: { toDate: () => now },
            scheduledDeletionAt: { toDate: () => new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
            cancelledBy: null,
            cancelledAt: null,
          },
        }),
      } as never)

      const result = await getDissolutionStatus(mockFamilyId)

      expect(result).not.toBeNull()
      expect(result?.status).toBe('cooling_period')
      expect(result?.initiatedBy).toBe(mockUserId)
      expect(result?.dataHandlingOption).toBe('delete_all')
    })

    it('should parse acknowledgments correctly', async () => {
      const now = new Date()
      const ackDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
          dissolution: {
            status: 'cooling_period',
            initiatedBy: mockUserId,
            initiatedAt: { toDate: () => now },
            dataHandlingOption: 'delete_all',
            acknowledgments: [
              {
                guardianId: 'other-guardian',
                acknowledgedAt: { toDate: () => ackDate },
              },
            ],
            allAcknowledgedAt: { toDate: () => now },
            scheduledDeletionAt: { toDate: () => new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
            cancelledBy: null,
            cancelledAt: null,
          },
        }),
      } as never)

      const result = await getDissolutionStatus(mockFamilyId)

      expect(result?.acknowledgments).toHaveLength(1)
      expect(result?.acknowledgments[0].guardianId).toBe('other-guardian')
    })
  })

  // ============================================================================
  // Adversarial Tests
  // ============================================================================

  describe('adversarial tests', () => {
    it('should prevent cross-family dissolution', async () => {
      // User is not a guardian of this family
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: 'family-owner', role: 'primary', permissions: 'full' }],
        }),
      } as never)

      await expect(
        initiateDissolution(mockFamilyId, mockUserId, 'delete_all', mockReauthToken)
      ).rejects.toThrow('You are not a member of this family.')
    })

    it('should prevent double initiation', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
          dissolution: { status: 'pending_acknowledgment' },
        }),
      } as never)

      await expect(
        initiateDissolution(mockFamilyId, mockUserId, 'delete_all', mockReauthToken)
      ).rejects.toThrow('This family is already being dissolved.')
    })

    it('should prevent acknowledgment of completed dissolution', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [
            { uid: 'initiator', role: 'primary', permissions: 'full' },
            { uid: mockUserId, role: 'co-parent', permissions: 'full' },
          ],
          dissolution: {
            status: 'completed',
            initiatedBy: 'initiator',
            initiatedAt: { toDate: () => new Date() },
            dataHandlingOption: 'delete_all',
            acknowledgments: [],
          },
        }),
      } as never)

      await expect(acknowledgeDissolution(mockFamilyId, mockUserId)).rejects.toThrow(
        'This family is not being dissolved.'
      )
    })

    it('should prevent cancellation of already cancelled dissolution', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardians: [{ uid: mockUserId, role: 'primary', permissions: 'full' }],
          dissolution: { status: 'cancelled' },
        }),
      } as never)

      await expect(cancelDissolution(mockFamilyId, mockUserId)).rejects.toThrow(
        'This dissolution cannot be cancelled right now.'
      )
    })
  })
})
