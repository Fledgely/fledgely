import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  activateAgreement,
  archiveAgreement,
  getActiveAgreement,
  getAgreementHistory,
  type ActivateAgreementParams,
  type ArchiveAgreementParams,
} from '../agreementActivationService'
import type { AgreementStatus, ArchiveReason } from '@fledgely/contracts'

// Mock Firebase Firestore
const mockDoc = vi.fn()
const mockGetDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockCollection = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockGetDocs = vi.fn()
const mockAddDoc = vi.fn()
const mockServerTimestamp = vi.fn(() => ({ _serverTimestamp: true }))

// Transaction mock
const mockTransactionGet = vi.fn()
const mockTransactionUpdate = vi.fn()
const mockRunTransaction = vi.fn(
  async (db: unknown, callback: (transaction: unknown) => Promise<unknown>) => {
    const mockTransaction = {
      get: mockTransactionGet,
      update: mockTransactionUpdate,
    }
    return callback(mockTransaction)
  }
)

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

describe('agreementActivationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateDoc.mockResolvedValue(undefined)
    mockAddDoc.mockResolvedValue({ id: 'audit-log-123' })
  })

  // ============================================
  // ACTIVATE AGREEMENT TESTS (Task 2.1-2.6)
  // ============================================

  describe('activateAgreement (Task 2.1)', () => {
    const params: ActivateAgreementParams = {
      familyId: 'family-123',
      agreementId: 'agreement-123',
    }

    it('activates agreement when all signatures are present (AC: 1)', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'complete',
          status: 'pending_signatures',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: { signature: { signedAt: '2025-12-16T12:00:00Z' } },
          },
        }),
      })
      // Mock query for existing versions
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      })

      await activateAgreement(params)

      expect(mockTransactionUpdate).toHaveBeenCalled()
      const updateData = mockTransactionUpdate.mock.calls[0][1]
      expect(updateData.status).toBe('active')
    })

    it('assigns version number 1.0 for first agreement (AC: 2)', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'complete',
          status: 'pending_signatures',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: { signature: { signedAt: '2025-12-16T12:00:00Z' } },
          },
        }),
      })
      // No existing agreements
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      })

      await activateAgreement(params)

      const updateData = mockTransactionUpdate.mock.calls[0][1]
      expect(updateData.version).toBe('1.0')
    })

    it('increments version number for subsequent agreements (AC: 2)', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'complete',
          status: 'pending_signatures',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: { signature: { signedAt: '2025-12-16T12:00:00Z' } },
          },
        }),
      })
      // First call: findActiveAgreement - no active agreements
      // Second call: getExistingVersions - existing agreements with versions
      mockGetDocs
        .mockResolvedValueOnce({
          docs: [],
          empty: true,
        })
        .mockResolvedValueOnce({
          docs: [
            { data: () => ({ version: '1.0' }) },
            { data: () => ({ version: '1.1' }) },
          ],
          empty: false,
        })

      await activateAgreement(params)

      const updateData = mockTransactionUpdate.mock.calls[0][1]
      expect(updateData.version).toBe('1.2')
    })

    it('records activation timestamp (AC: 3)', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'complete',
          status: 'pending_signatures',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: { signature: { signedAt: '2025-12-16T12:00:00Z' } },
          },
        }),
      })
      mockGetDocs.mockResolvedValue({ docs: [], empty: true })

      await activateAgreement(params)

      const updateData = mockTransactionUpdate.mock.calls[0][1]
      expect(updateData.activatedAt).toEqual({ _serverTimestamp: true })
    })

    it('validates all required signatures before activation (Task 2.2)', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'parent_signed', // Not complete!
          status: 'pending_signatures',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: null,
          },
        }),
      })

      await expect(activateAgreement(params)).rejects.toThrow(
        /signatures.*not.*complete/i
      )
    })

    it('archives previous active agreement if exists (AC: 7, Task 2.5)', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'complete',
          status: 'pending_signatures',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: { signature: { signedAt: '2025-12-16T12:00:00Z' } },
          },
        }),
      })

      // Mock that there's an existing active agreement
      const mockActiveAgreementDoc = {
        id: 'old-agreement-123',
        data: () => ({ status: 'active', version: '1.0' }),
      }
      mockGetDocs
        .mockResolvedValueOnce({
          // Query for active agreements
          docs: [mockActiveAgreementDoc],
          empty: false,
        })
        .mockResolvedValueOnce({
          // Query for versions
          docs: [{ data: () => ({ version: '1.0' }) }],
          empty: false,
        })

      await activateAgreement(params)

      // Should have two update calls - one for archiving old, one for activating new
      expect(mockTransactionUpdate).toHaveBeenCalledTimes(2)
    })

    it('creates audit log entry for activation (Task 2.6)', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'complete',
          status: 'pending_signatures',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: { signature: { signedAt: '2025-12-16T12:00:00Z' } },
          },
        }),
      })
      mockGetDocs.mockResolvedValue({ docs: [], empty: true })

      await activateAgreement(params)

      expect(mockAddDoc).toHaveBeenCalled()
      const auditData = mockAddDoc.mock.calls[0][1]
      expect(auditData.action).toBe('agreement_activated')
      expect(auditData.agreementId).toBe('agreement-123')
    })

    it('throws error if agreement not found', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => false,
      })

      await expect(activateAgreement(params)).rejects.toThrow(
        /agreement.*not.*found/i
      )
    })

    it('throws error if agreement already active', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'complete',
          status: 'active', // Already active!
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: { signature: { signedAt: '2025-12-16T12:00:00Z' } },
          },
        }),
      })

      await expect(activateAgreement(params)).rejects.toThrow(
        /already.*active/i
      )
    })

    describe('shared custody validation (Task 2.2, 3.4)', () => {
      it('validates both parents signed for shared custody', async () => {
        mockTransactionGet.mockResolvedValue({
          exists: () => true,
          data: () => ({
            signingStatus: 'both_parents_signed', // Missing child
            status: 'pending_signatures',
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
              coParent: { signature: { signedAt: '2025-12-16T11:30:00Z' } },
              child: null,
            },
          }),
        })

        await expect(activateAgreement(params)).rejects.toThrow(
          /signatures.*not.*complete/i
        )
      })

      it('activates when all parties have signed in shared custody', async () => {
        mockTransactionGet.mockResolvedValue({
          exists: () => true,
          data: () => ({
            signingStatus: 'complete',
            status: 'pending_signatures',
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
              coParent: { signature: { signedAt: '2025-12-16T11:30:00Z' } },
              child: { signature: { signedAt: '2025-12-16T12:00:00Z' } },
            },
          }),
        })
        mockGetDocs.mockResolvedValue({ docs: [], empty: true })

        await activateAgreement(params)

        expect(mockTransactionUpdate).toHaveBeenCalled()
        const updateData = mockTransactionUpdate.mock.calls[0][1]
        expect(updateData.status).toBe('active')
      })
    })
  })

  // ============================================
  // ARCHIVE AGREEMENT TESTS (Task 7.1-7.5)
  // ============================================

  describe('archiveAgreement (Task 7.1)', () => {
    const params: ArchiveAgreementParams = {
      familyId: 'family-123',
      agreementId: 'agreement-123',
      reason: 'manual_archive' as ArchiveReason,
    }

    it('sets agreement status to archived (Task 7.2)', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'active',
          version: '1.0',
        }),
      })

      await archiveAgreement(params)

      expect(mockUpdateDoc).toHaveBeenCalled()
      const updateData = mockUpdateDoc.mock.calls[0][1]
      expect(updateData.status).toBe('archived')
    })

    it('sets status to superseded when reason is new_version (Task 7.2)', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'active',
          version: '1.0',
        }),
      })

      await archiveAgreement({
        ...params,
        reason: 'new_version' as ArchiveReason,
        supersededBy: 'new-agreement-456',
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
      const updateData = mockUpdateDoc.mock.calls[0][1]
      expect(updateData.status).toBe('superseded')
      expect(updateData.supersededBy).toBe('new-agreement-456')
    })

    it('records archive timestamp (Task 7.3)', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'active',
          version: '1.0',
        }),
      })

      await archiveAgreement(params)

      const updateData = mockUpdateDoc.mock.calls[0][1]
      expect(updateData.archivedAt).toEqual({ _serverTimestamp: true })
    })

    it('records archive reason (Task 7.3)', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'active',
          version: '1.0',
        }),
      })

      await archiveAgreement(params)

      const updateData = mockUpdateDoc.mock.calls[0][1]
      expect(updateData.archiveReason).toBe('manual_archive')
    })

    it('creates audit log entry for archive', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'active',
          version: '1.0',
        }),
      })

      await archiveAgreement(params)

      expect(mockAddDoc).toHaveBeenCalled()
      const auditData = mockAddDoc.mock.calls[0][1]
      expect(auditData.action).toBe('agreement_archived')
    })

    it('throws error if agreement not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      await expect(archiveAgreement(params)).rejects.toThrow(
        /agreement.*not.*found/i
      )
    })

    it('throws error if agreement already archived', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'archived',
          version: '1.0',
        }),
      })

      await expect(archiveAgreement(params)).rejects.toThrow(
        /already.*archived/i
      )
    })
  })

  // ============================================
  // GET ACTIVE AGREEMENT TESTS (Task 7.5)
  // ============================================

  describe('getActiveAgreement (Task 7.5)', () => {
    it('returns active agreement for family', async () => {
      const mockActiveAgreement = {
        id: 'agreement-123',
        data: () => ({
          status: 'active',
          version: '1.0',
          activatedAt: '2025-12-16T12:00:00Z',
        }),
      }
      mockGetDocs.mockResolvedValue({
        docs: [mockActiveAgreement],
        empty: false,
      })

      const result = await getActiveAgreement('family-123')

      expect(result).toBeDefined()
      expect(result?.id).toBe('agreement-123')
      expect(result?.status).toBe('active')
    })

    it('returns null if no active agreement', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      })

      const result = await getActiveAgreement('family-123')

      expect(result).toBeNull()
    })

    it('queries only for active status', async () => {
      mockGetDocs.mockResolvedValue({ docs: [], empty: true })

      await getActiveAgreement('family-123')

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active')
    })
  })

  // ============================================
  // GET AGREEMENT HISTORY TESTS (Task 7.6)
  // ============================================

  describe('getAgreementHistory (Task 7.6)', () => {
    it('returns all agreements for family including archived', async () => {
      const mockAgreements = [
        {
          id: 'agreement-3',
          data: () => ({
            status: 'active',
            version: '1.2',
            activatedAt: '2025-12-16T12:00:00Z',
          }),
        },
        {
          id: 'agreement-2',
          data: () => ({
            status: 'superseded',
            version: '1.1',
            activatedAt: '2025-12-10T12:00:00Z',
            archivedAt: '2025-12-16T11:00:00Z',
          }),
        },
        {
          id: 'agreement-1',
          data: () => ({
            status: 'superseded',
            version: '1.0',
            activatedAt: '2025-12-01T12:00:00Z',
            archivedAt: '2025-12-10T11:00:00Z',
          }),
        },
      ]
      mockGetDocs.mockResolvedValue({
        docs: mockAgreements,
        empty: false,
      })

      const result = await getAgreementHistory('family-123')

      expect(result).toHaveLength(3)
      expect(result[0].version).toBe('1.2') // Latest first
    })

    it('returns empty array if no agreements', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      })

      const result = await getAgreementHistory('family-123')

      expect(result).toEqual([])
    })

    it('orders by activatedAt descending', async () => {
      mockGetDocs.mockResolvedValue({ docs: [], empty: true })

      await getAgreementHistory('family-123')

      expect(mockOrderBy).toHaveBeenCalledWith('activatedAt', 'desc')
    })
  })
})
