/**
 * Co-Parent Proposal Approval Service Tests - Story 3A.3
 *
 * Tests for two-parent approval workflow for agreement changes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  requiresCoParentApproval,
  approveAsCoParent,
  declineAsCoParent,
  getCoParentApprovalStatus,
  checkAndExpireProposals,
  getPendingCoParentApprovals,
  canChildRespond,
  getCoParentStatusMessage,
  calculateExpirationDate,
  CO_PARENT_APPROVAL_EXPIRY_MS,
  CO_PARENT_APPROVAL_MESSAGES,
} from './coParentProposalApprovalService'
import type { AgreementProposal } from '@fledgely/shared'

// =============================================================================
// Mocks
// =============================================================================

const mockGetDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockAddDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: () => ({ _serverTimestamp: true }),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

// Mock notification functions
const mockNotifyProposerOfCoParentResponse = vi.fn()
const mockNotifyProposerOfExpiration = vi.fn()
vi.mock('./agreementProposalService', () => ({
  notifyProposerOfCoParentResponse: (...args: unknown[]) =>
    mockNotifyProposerOfCoParentResponse(...args),
  notifyProposerOfExpiration: (...args: unknown[]) => mockNotifyProposerOfExpiration(...args),
}))

// =============================================================================
// Test Data
// =============================================================================

const mockChildWithSharedCustody = {
  id: 'child-1',
  custodyArrangement: { type: 'shared' },
  guardians: [
    { uid: 'parent-1', displayName: 'Mom' },
    { uid: 'parent-2', displayName: 'Dad' },
  ],
}

const mockChildWithSoleCustody = {
  id: 'child-2',
  custodyArrangement: { type: 'sole' },
  guardians: [{ uid: 'parent-1', displayName: 'Mom' }],
}

const mockProposalPendingCoParent: Partial<AgreementProposal> = {
  id: 'proposal-1',
  familyId: 'family-1',
  childId: 'child-1',
  proposerId: 'parent-1',
  proposerName: 'Mom',
  status: 'pending_coparent_approval',
  coParentApprovalRequired: true,
  coParentApprovalStatus: 'pending',
  expiresAt: Date.now() + CO_PARENT_APPROVAL_EXPIRY_MS,
}

const mockProposalApproved: Partial<AgreementProposal> = {
  id: 'proposal-2',
  familyId: 'family-1',
  childId: 'child-1',
  proposerId: 'parent-1',
  proposerName: 'Mom',
  status: 'pending',
  coParentApprovalRequired: true,
  coParentApprovalStatus: 'approved',
  coParentApprovedByUid: 'parent-2',
  coParentApprovedAt: Date.now(),
  expiresAt: Date.now() + CO_PARENT_APPROVAL_EXPIRY_MS,
}

// =============================================================================
// Tests
// =============================================================================

describe('coParentProposalApprovalService - Story 3A.3', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDoc.mockReturnValue({ id: 'mock-doc' })
    mockCollection.mockReturnValue({ id: 'mock-collection' })
    mockQuery.mockReturnValue({ id: 'mock-query' })
    mockWhere.mockReturnValue({ id: 'mock-where' })
    mockAddDoc.mockResolvedValue({ id: 'notification-123' })
    mockNotifyProposerOfCoParentResponse.mockResolvedValue('notification-123')
    mockNotifyProposerOfExpiration.mockResolvedValue('notification-123')
  })

  // ---------------------------------------------------------------------------
  // requiresCoParentApproval tests
  // ---------------------------------------------------------------------------

  describe('requiresCoParentApproval - AC1', () => {
    it('should return true for shared custody child', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockChildWithSharedCustody,
      })

      const result = await requiresCoParentApproval('child-1', 'parent-1')

      expect(result.required).toBe(true)
      expect(result.otherParentUid).toBe('parent-2')
      expect(result.otherParentName).toBe('Dad')
    })

    it('should return false for sole custody child', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockChildWithSoleCustody,
      })

      const result = await requiresCoParentApproval('child-2', 'parent-1')

      expect(result.required).toBe(false)
      expect(result.otherParentUid).toBeNull()
    })

    it('should return false for non-existent child', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      })

      const result = await requiresCoParentApproval('non-existent', 'parent-1')

      expect(result.required).toBe(false)
    })

    it('should identify correct other parent', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockChildWithSharedCustody,
      })

      const resultFromMom = await requiresCoParentApproval('child-1', 'parent-1')
      expect(resultFromMom.otherParentUid).toBe('parent-2')

      const resultFromDad = await requiresCoParentApproval('child-1', 'parent-2')
      expect(resultFromDad.otherParentUid).toBe('parent-1')
    })
  })

  // ---------------------------------------------------------------------------
  // approveAsCoParent tests
  // ---------------------------------------------------------------------------

  describe('approveAsCoParent - AC4', () => {
    it('should approve proposal and update status to pending', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProposalPendingCoParent,
      })
      mockUpdateDoc.mockResolvedValue(undefined)

      await approveAsCoParent({
        proposalId: 'proposal-1',
        approverUid: 'parent-2',
        approverName: 'Dad',
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'pending',
          coParentApprovalStatus: 'approved',
          coParentApprovedByUid: 'parent-2',
        })
      )
    })

    it('should throw error if proposer tries to self-approve', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProposalPendingCoParent,
      })

      await expect(
        approveAsCoParent({
          proposalId: 'proposal-1',
          approverUid: 'parent-1', // Same as proposer
          approverName: 'Mom',
        })
      ).rejects.toThrow(CO_PARENT_APPROVAL_MESSAGES.cannotSelfApprove)
    })

    it('should throw error if proposal not in pending_coparent_approval status', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ ...mockProposalPendingCoParent, status: 'pending' }),
      })

      await expect(
        approveAsCoParent({
          proposalId: 'proposal-1',
          approverUid: 'parent-2',
          approverName: 'Dad',
        })
      ).rejects.toThrow('Proposal is not awaiting co-parent approval')
    })

    it('should throw error if proposal has expired', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          ...mockProposalPendingCoParent,
          expiresAt: Date.now() - 1000, // Expired
        }),
      })

      await expect(
        approveAsCoParent({
          proposalId: 'proposal-1',
          approverUid: 'parent-2',
          approverName: 'Dad',
        })
      ).rejects.toThrow(CO_PARENT_APPROVAL_MESSAGES.expired)
    })

    it('should throw error if proposal not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      })

      await expect(
        approveAsCoParent({
          proposalId: 'non-existent',
          approverUid: 'parent-2',
          approverName: 'Dad',
        })
      ).rejects.toThrow('Proposal not found')
    })
  })

  // ---------------------------------------------------------------------------
  // declineAsCoParent tests
  // ---------------------------------------------------------------------------

  describe('declineAsCoParent - AC4', () => {
    it('should decline proposal with reason', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProposalPendingCoParent,
      })
      mockUpdateDoc.mockResolvedValue(undefined)

      await declineAsCoParent({
        proposalId: 'proposal-1',
        declinerUid: 'parent-2',
        declinerName: 'Dad',
        reason: 'I think we should discuss this first',
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'declined',
          coParentApprovalStatus: 'declined',
          coParentDeclineReason: 'I think we should discuss this first',
        })
      )
    })

    it('should decline proposal without reason', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProposalPendingCoParent,
      })
      mockUpdateDoc.mockResolvedValue(undefined)

      await declineAsCoParent({
        proposalId: 'proposal-1',
        declinerUid: 'parent-2',
        declinerName: 'Dad',
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'declined',
          coParentApprovalStatus: 'declined',
          coParentDeclineReason: null,
        })
      )
    })

    it('should throw error if proposer tries to self-decline', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProposalPendingCoParent,
      })

      await expect(
        declineAsCoParent({
          proposalId: 'proposal-1',
          declinerUid: 'parent-1', // Same as proposer
          declinerName: 'Mom',
        })
      ).rejects.toThrow('withdraw')
    })
  })

  // ---------------------------------------------------------------------------
  // getCoParentApprovalStatus tests
  // ---------------------------------------------------------------------------

  describe('getCoParentApprovalStatus - AC3', () => {
    it('should return pending status for awaiting proposal', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProposalPendingCoParent,
      })

      const result = await getCoParentApprovalStatus('proposal-1')

      expect(result.required).toBe(true)
      expect(result.status).toBe('pending')
      expect(result.isExpired).toBe(false)
    })

    it('should return approved status', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProposalApproved,
      })

      const result = await getCoParentApprovalStatus('proposal-2')

      expect(result.status).toBe('approved')
      expect(result.approvedByUid).toBe('parent-2')
    })

    it('should detect expired proposals', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          ...mockProposalPendingCoParent,
          expiresAt: Date.now() - 1000,
        }),
      })

      const result = await getCoParentApprovalStatus('proposal-1')

      expect(result.isExpired).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // checkAndExpireProposals tests
  // ---------------------------------------------------------------------------

  describe('checkAndExpireProposals - AC5', () => {
    it('should expire proposals past 14 days', async () => {
      const expiredProposal = {
        id: 'expired-proposal',
        data: () => ({
          ...mockProposalPendingCoParent,
          expiresAt: Date.now() - 1000, // Already expired
        }),
      }
      mockGetDocs.mockResolvedValue({ docs: [expiredProposal] })
      mockUpdateDoc.mockResolvedValue(undefined)

      const count = await checkAndExpireProposals('family-1')

      expect(count).toBe(1)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'expired' })
      )
    })

    it('should not expire proposals within 14 days', async () => {
      const validProposal = {
        id: 'valid-proposal',
        data: () => mockProposalPendingCoParent,
      }
      mockGetDocs.mockResolvedValue({ docs: [validProposal] })

      const count = await checkAndExpireProposals('family-1')

      expect(count).toBe(0)
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should return 0 when no proposals to expire', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] })

      const count = await checkAndExpireProposals('family-1')

      expect(count).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // getPendingCoParentApprovals tests
  // ---------------------------------------------------------------------------

  describe('getPendingCoParentApprovals', () => {
    it('should return proposals needing this parent approval', async () => {
      const proposalFromOtherParent = {
        id: 'proposal-from-mom',
        data: () => ({
          ...mockProposalPendingCoParent,
          proposerId: 'parent-1',
        }),
      }
      mockGetDocs.mockResolvedValue({ docs: [proposalFromOtherParent] })

      const result = await getPendingCoParentApprovals('family-1', 'parent-2')

      expect(result).toHaveLength(1)
      expect(result[0].proposerId).toBe('parent-1')
    })

    it('should exclude proposals created by requesting parent', async () => {
      const ownProposal = {
        id: 'own-proposal',
        data: () => ({
          ...mockProposalPendingCoParent,
          proposerId: 'parent-1',
        }),
      }
      mockGetDocs.mockResolvedValue({ docs: [ownProposal] })

      const result = await getPendingCoParentApprovals('family-1', 'parent-1')

      expect(result).toHaveLength(0)
    })
  })

  // ---------------------------------------------------------------------------
  // canChildRespond tests
  // ---------------------------------------------------------------------------

  describe('canChildRespond - AC2', () => {
    it('should return false when co-parent approval is pending', () => {
      const proposal = mockProposalPendingCoParent as AgreementProposal

      expect(canChildRespond(proposal)).toBe(false)
    })

    it('should return true when co-parent has approved', () => {
      const proposal = mockProposalApproved as AgreementProposal

      expect(canChildRespond(proposal)).toBe(true)
    })

    it('should return true when co-parent approval not required', () => {
      const proposal = {
        ...mockProposalPendingCoParent,
        coParentApprovalRequired: false,
      } as AgreementProposal

      expect(canChildRespond(proposal)).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // getCoParentStatusMessage tests
  // ---------------------------------------------------------------------------

  describe('getCoParentStatusMessage', () => {
    it('should return awaiting message for pending approval', () => {
      const proposal = mockProposalPendingCoParent as AgreementProposal
      const message = getCoParentStatusMessage(proposal, 'Dad')

      expect(message).toContain('Dad')
      expect(message).toContain('review')
    })

    it('should return approved message', () => {
      const proposal = mockProposalApproved as AgreementProposal
      const message = getCoParentStatusMessage(proposal, 'Dad')

      expect(message).toContain('Dad')
      expect(message).toContain('approved')
    })

    it('should return decline message with reason', () => {
      const proposal = {
        ...mockProposalPendingCoParent,
        coParentApprovalStatus: 'declined',
        coParentDeclineReason: 'Need to discuss first',
      } as AgreementProposal
      const message = getCoParentStatusMessage(proposal, 'Dad')

      expect(message).toContain('Dad')
      expect(message).toContain('declined')
      expect(message).toContain('Need to discuss first')
    })

    it('should return empty string when approval not required', () => {
      const proposal = {
        ...mockProposalPendingCoParent,
        coParentApprovalRequired: false,
      } as AgreementProposal
      const message = getCoParentStatusMessage(proposal, 'Dad')

      expect(message).toBe('')
    })
  })

  // ---------------------------------------------------------------------------
  // calculateExpirationDate tests
  // ---------------------------------------------------------------------------

  describe('calculateExpirationDate', () => {
    it('should return date 14 days from now', () => {
      const before = Date.now()
      const expiration = calculateExpirationDate()
      const after = Date.now()

      expect(expiration).toBeGreaterThanOrEqual(before + CO_PARENT_APPROVAL_EXPIRY_MS)
      expect(expiration).toBeLessThanOrEqual(after + CO_PARENT_APPROVAL_EXPIRY_MS)
    })
  })

  // ---------------------------------------------------------------------------
  // Constants tests
  // ---------------------------------------------------------------------------

  describe('CO_PARENT_APPROVAL_MESSAGES', () => {
    it('should have all required message templates', () => {
      expect(CO_PARENT_APPROVAL_MESSAGES.awaitingApproval('Mom')).toContain('Mom')
      expect(CO_PARENT_APPROVAL_MESSAGES.approved('Mom')).toContain('approved')
      expect(CO_PARENT_APPROVAL_MESSAGES.declined('Mom')).toContain('declined')
      expect(CO_PARENT_APPROVAL_MESSAGES.declined('Mom', 'Reason')).toContain('Reason')
      expect(CO_PARENT_APPROVAL_MESSAGES.expired).toContain('expired')
      expect(CO_PARENT_APPROVAL_MESSAGES.cannotSelfApprove).toBeDefined()
      expect(CO_PARENT_APPROVAL_MESSAGES.childCannotRespond).toBeDefined()
    })
  })

  describe('CO_PARENT_APPROVAL_EXPIRY_MS', () => {
    it('should be 14 days in milliseconds', () => {
      expect(CO_PARENT_APPROVAL_EXPIRY_MS).toBe(14 * 24 * 60 * 60 * 1000)
    })
  })
})
