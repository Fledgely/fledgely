import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  recordChildSignature,
  recordParentSignature,
  getAgreementSigningStatus,
  type RecordSignatureParams,
} from '../signatureService'
import type { SignatureType, AgreementSignature } from '@fledgely/contracts'

// Mock Firebase Firestore
const mockDoc = vi.fn()
const mockGetDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockCollection = vi.fn()
const mockAddDoc = vi.fn()
const mockServerTimestamp = vi.fn(() => ({ _serverTimestamp: true }))
const mockGetDocs = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()

// Transaction mock - captures the callback and executes it with a mock transaction
const mockTransactionGet = vi.fn()
const mockTransactionUpdate = vi.fn()
const mockRunTransaction = vi.fn(async (db: unknown, callback: (transaction: unknown) => Promise<unknown>) => {
  const mockTransaction = {
    get: mockTransactionGet,
    update: mockTransactionUpdate,
  }
  return callback(mockTransaction)
})

// Batch mock
const mockBatchSet = vi.fn()
const mockBatchCommit = vi.fn()
const mockWriteBatch = vi.fn(() => ({
  set: mockBatchSet,
  commit: mockBatchCommit,
}))

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

describe('signatureService', () => {
  const mockSignature: AgreementSignature = {
    agreementId: 'agreement-123',
    signature: {
      id: 'sig-uuid-123',
      type: 'typed' as SignatureType,
      value: 'Alex Smith',
      signedBy: 'child',
      signedAt: '2025-12-16T12:00:00Z',
    },
    consentCheckboxChecked: true,
    commitmentsReviewed: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateDoc.mockResolvedValue(undefined)
    mockAddDoc.mockResolvedValue({ id: 'audit-log-123' })
    mockBatchCommit.mockResolvedValue(undefined)
    // Default getDocs returns empty (no existing versions, no active agreements)
    mockGetDocs.mockResolvedValue({ docs: [], empty: true })
  })

  describe('recordChildSignature (Task 7.2)', () => {
    const params: RecordSignatureParams = {
      familyId: 'family-123',
      agreementId: 'agreement-123',
      signature: mockSignature,
    }

    it('stores signature with timestamp in Firestore (Task 7.3)', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'parent_signed',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: null,
          },
        }),
      })

      await recordChildSignature(params)

      // Verify transaction.update was called with signature data
      expect(mockTransactionUpdate).toHaveBeenCalled()
      const updateCall = mockTransactionUpdate.mock.calls[0][1]
      expect(updateCall['signatures.child']).toEqual(mockSignature)
    })

    it('updates agreement status to complete (Task 7.4)', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'parent_signed',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: null,
          },
        }),
      })

      await recordChildSignature(params)

      // Verify transaction.update was called with complete status
      expect(mockTransactionUpdate).toHaveBeenCalled()
      const updateCall = mockTransactionUpdate.mock.calls[0][1]
      expect(updateCall.signingStatus).toBe('complete')
    })

    it('creates audit log entry for child signature (Task 7.5)', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'parent_signed',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: null,
          },
        }),
      })

      await recordChildSignature(params)

      // Verify batch.set was called with child_signed action
      expect(mockBatchSet).toHaveBeenCalled()
      const batchSetCall = mockBatchSet.mock.calls[0][1]
      expect(batchSetCall.action).toBe('child_signed')
      expect(batchSetCall.agreementId).toBe('agreement-123')
    })

    it('throws error if parent has not signed first (AC: 7)', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'pending',
          signatures: {
            parent: null,
            child: null,
          },
        }),
      })

      await expect(recordChildSignature(params)).rejects.toThrow(
        /parent.*sign.*first/i
      )
    })

    it('throws error if agreement not found', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => false,
      })

      await expect(recordChildSignature(params)).rejects.toThrow(
        /agreement.*not.*found/i
      )
    })

    it('throws error if child already signed', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'complete',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: { signature: { signedAt: '2025-12-16T12:00:00Z' } },
          },
        }),
      })

      await expect(recordChildSignature(params)).rejects.toThrow(
        /already.*signed/i
      )
    })

    // Story 6.3 Task 3: Agreement Activation Integration Tests
    describe('Agreement Activation (Story 6.3)', () => {
      it('sets agreement status to active when signing completes (AC: 1)', async () => {
        mockTransactionGet.mockResolvedValue({
          exists: () => true,
          data: () => ({
            signingStatus: 'parent_signed',
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
              child: null,
            },
          }),
        })
        // First call: findActiveAgreement (no active), Second: getExistingVersions (empty)
        mockGetDocs.mockResolvedValue({ docs: [], empty: true })

        await recordChildSignature(params)

        const updateCall = mockTransactionUpdate.mock.calls[0][1]
        expect(updateCall.status).toBe('active')
      })

      it('assigns version number 1.0 for first agreement (AC: 2)', async () => {
        mockTransactionGet.mockResolvedValue({
          exists: () => true,
          data: () => ({
            signingStatus: 'parent_signed',
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
              child: null,
            },
          }),
        })
        mockGetDocs.mockResolvedValue({ docs: [], empty: true })

        await recordChildSignature(params)

        const updateCall = mockTransactionUpdate.mock.calls[0][1]
        expect(updateCall.version).toBe('1.0')
      })

      it('increments version for subsequent agreements (AC: 2)', async () => {
        mockTransactionGet.mockResolvedValue({
          exists: () => true,
          data: () => ({
            signingStatus: 'parent_signed',
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
              child: null,
            },
          }),
        })
        // First call: getExistingVersions (1.0, 1.1), Second: findActiveAgreement (empty)
        mockGetDocs
          .mockResolvedValueOnce({
            docs: [
              { data: () => ({ version: '1.0' }) },
              { data: () => ({ version: '1.1' }) },
            ],
            empty: false,
          })
          .mockResolvedValueOnce({ docs: [], empty: true })

        await recordChildSignature(params)

        const updateCall = mockTransactionUpdate.mock.calls[0][1]
        expect(updateCall.version).toBe('1.2')
      })

      it('records activatedAt timestamp (AC: 3)', async () => {
        mockTransactionGet.mockResolvedValue({
          exists: () => true,
          data: () => ({
            signingStatus: 'parent_signed',
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
              child: null,
            },
          }),
        })
        mockGetDocs.mockResolvedValue({ docs: [], empty: true })

        await recordChildSignature(params)

        const updateCall = mockTransactionUpdate.mock.calls[0][1]
        expect(updateCall.activatedAt).toEqual({ _serverTimestamp: true })
      })

      it('archives previous active agreement when new one activates (AC: 7)', async () => {
        mockTransactionGet.mockResolvedValue({
          exists: () => true,
          data: () => ({
            signingStatus: 'parent_signed',
            signatures: {
              parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
              child: null,
            },
          }),
        })
        // First call: getExistingVersions
        // Second call: findActiveAgreement (returns old agreement)
        mockGetDocs
          .mockResolvedValueOnce({
            docs: [{ data: () => ({ version: '1.0' }) }],
            empty: false,
          })
          .mockResolvedValueOnce({
            docs: [{ id: 'old-agreement-123', data: () => ({ status: 'active' }) }],
            empty: false,
          })

        await recordChildSignature(params)

        // Should have two update calls: one for archiving old, one for activating new
        expect(mockTransactionUpdate).toHaveBeenCalledTimes(2)

        // First call should archive the old agreement
        const archiveCall = mockTransactionUpdate.mock.calls[0][1]
        expect(archiveCall.status).toBe('superseded')
        expect(archiveCall.archiveReason).toBe('new_version')
        expect(archiveCall.supersededBy).toBe('agreement-123')
      })
    })
  })

  describe('recordParentSignature (Task 7.2 - parent variant)', () => {
    const parentSignature: AgreementSignature = {
      ...mockSignature,
      signature: {
        ...mockSignature.signature,
        signedBy: 'parent',
      },
    }

    const params: RecordSignatureParams = {
      familyId: 'family-123',
      agreementId: 'agreement-123',
      signature: parentSignature,
    }

    it('stores parent signature in Firestore', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'pending',
          signatures: {
            parent: null,
            child: null,
          },
        }),
      })

      await recordParentSignature(params)

      // Verify transaction.update was called with parent signature
      expect(mockTransactionUpdate).toHaveBeenCalled()
      const updateCall = mockTransactionUpdate.mock.calls[0][1]
      expect(updateCall['signatures.parent']).toEqual(parentSignature)
    })

    it('updates agreement status to parent_signed', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'pending',
          signatures: {
            parent: null,
            child: null,
          },
        }),
      })

      await recordParentSignature(params)

      // Verify transaction.update was called with parent_signed status
      expect(mockTransactionUpdate).toHaveBeenCalled()
      const updateCall = mockTransactionUpdate.mock.calls[0][1]
      expect(updateCall.signingStatus).toBe('parent_signed')
    })

    it('creates audit log entry for parent signature', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'pending',
          signatures: {
            parent: null,
            child: null,
          },
        }),
      })

      await recordParentSignature(params)

      // Verify addDoc was called with parent_signed action
      expect(mockAddDoc).toHaveBeenCalled()
      const addDocCall = mockAddDoc.mock.calls[0][1]
      expect(addDocCall.action).toBe('parent_signed')
      expect(addDocCall.agreementId).toBe('agreement-123')
    })

    it('throws error if parent already signed', async () => {
      mockTransactionGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'parent_signed',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: null,
          },
        }),
      })

      await expect(recordParentSignature(params)).rejects.toThrow(
        /already.*signed/i
      )
    })
  })

  describe('getAgreementSigningStatus', () => {
    const params = {
      familyId: 'family-123',
      agreementId: 'agreement-123',
    }

    it('returns current signing status', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'parent_signed',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: null,
          },
        }),
      })

      const result = await getAgreementSigningStatus(params)

      expect(result.signingStatus).toBe('parent_signed')
    })

    it('returns signatures object', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          signingStatus: 'parent_signed',
          signatures: {
            parent: { signature: { signedAt: '2025-12-16T11:00:00Z' } },
            child: null,
          },
        }),
      })

      const result = await getAgreementSigningStatus(params)

      expect(result.signatures.parent).toBeDefined()
      expect(result.signatures.child).toBeNull()
    })

    it('throws error if agreement not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      await expect(getAgreementSigningStatus(params)).rejects.toThrow(
        /agreement.*not.*found/i
      )
    })
  })
})
