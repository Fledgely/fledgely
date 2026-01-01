/**
 * agreementActivationService Tests - Story 34.4
 *
 * Tests for agreement activation notifications, activity logging, and version history.
 * AC3: Agreement version update
 * AC5: Both parties notification
 * AC6: History logging
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import {
  notifyBothPartiesOfActivation,
  logAgreementActivation,
  createVersionHistoryEntry,
  ACTIVATION_MESSAGES,
} from './agreementActivationService'
import type { ActivatedAgreementVersion, DualSignatures } from '@fledgely/shared'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

const { collection, doc, addDoc, setDoc, serverTimestamp } = await import('firebase/firestore')

describe('agreementActivationService - Story 34.4', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(collection as Mock).mockReturnValue({ id: 'mock-collection' })
    ;(doc as Mock).mockReturnValue({ id: 'mock-doc' })
    ;(addDoc as Mock).mockResolvedValue({ id: 'new-doc-id' })
    ;(setDoc as Mock).mockResolvedValue(undefined)
  })

  describe('ACTIVATION_MESSAGES', () => {
    it('should have proposerSuccess message', () => {
      expect(ACTIVATION_MESSAGES.proposerSuccess).toBe(
        'Agreement updated successfully! New rules are now active.'
      )
    })

    it('should generate recipientSuccess message with summary', () => {
      const message = ACTIVATION_MESSAGES.recipientSuccess('Extra gaming time')
      expect(message).toBe('Agreement updated! Extra gaming time is now active.')
    })

    it('should generate activityDescription with both names', () => {
      const message = ACTIVATION_MESSAGES.activityDescription('Mom', 'Emma')
      expect(message).toBe('Mom and Emma agreed on changes. Agreement updated.')
    })
  })

  describe('notifyBothPartiesOfActivation - AC5', () => {
    const mockInput = {
      familyId: 'family-123',
      proposalId: 'proposal-456',
      proposerId: 'parent-1',
      proposerName: 'Mom',
      recipientId: 'child-abc',
      recipientName: 'Emma',
    }

    it('should create notification for proposer', async () => {
      await notifyBothPartiesOfActivation(mockInput)

      expect(addDoc).toHaveBeenCalled()
      const calls = (addDoc as Mock).mock.calls
      const proposerCall = calls[0]
      expect(proposerCall[1].recipientId).toBe(mockInput.proposerId)
      expect(proposerCall[1].type).toBe('agreement_activated')
    })

    it('should create notification for recipient', async () => {
      await notifyBothPartiesOfActivation(mockInput)

      const calls = (addDoc as Mock).mock.calls
      expect(calls.length).toBe(2)
      const recipientCall = calls[1]
      expect(recipientCall[1].recipientId).toBe(mockInput.recipientId)
      expect(recipientCall[1].type).toBe('agreement_activated')
    })

    it('should include proposer success message in proposer notification', async () => {
      await notifyBothPartiesOfActivation(mockInput)

      const calls = (addDoc as Mock).mock.calls
      const proposerCall = calls[0]
      expect(proposerCall[1].body).toBe(ACTIVATION_MESSAGES.proposerSuccess)
    })

    it('should include recipient success message in recipient notification', async () => {
      await notifyBothPartiesOfActivation(mockInput)

      const calls = (addDoc as Mock).mock.calls
      const recipientCall = calls[1]
      expect(recipientCall[1].body).toContain('Agreement updated!')
    })

    it('should return both notification IDs', async () => {
      ;(addDoc as Mock)
        .mockResolvedValueOnce({ id: 'proposer-notif-id' })
        .mockResolvedValueOnce({ id: 'recipient-notif-id' })

      const result = await notifyBothPartiesOfActivation(mockInput)

      expect(result).toEqual(['proposer-notif-id', 'recipient-notif-id'])
    })

    it('should include proposalId in notification data', async () => {
      await notifyBothPartiesOfActivation(mockInput)

      const calls = (addDoc as Mock).mock.calls
      expect(calls[0][1].data.proposalId).toBe(mockInput.proposalId)
      expect(calls[1][1].data.proposalId).toBe(mockInput.proposalId)
    })

    it('should set read to false for both notifications', async () => {
      await notifyBothPartiesOfActivation(mockInput)

      const calls = (addDoc as Mock).mock.calls
      expect(calls[0][1].read).toBe(false)
      expect(calls[1][1].read).toBe(false)
    })

    it('should include server timestamp in both notifications', async () => {
      await notifyBothPartiesOfActivation(mockInput)

      expect(serverTimestamp).toHaveBeenCalled()
      const calls = (addDoc as Mock).mock.calls
      expect(calls[0][1].createdAt).toEqual({ _serverTimestamp: true })
      expect(calls[1][1].createdAt).toEqual({ _serverTimestamp: true })
    })
  })

  describe('logAgreementActivation - AC6', () => {
    const mockInput = {
      familyId: 'family-123',
      proposalId: 'proposal-456',
      proposerName: 'Mom',
      recipientName: 'Emma',
      versionNumber: 2,
    }

    it('should create activity entry in familyActivity collection', async () => {
      await logAgreementActivation(mockInput)

      expect(collection).toHaveBeenCalledWith({}, 'familyActivity')
      expect(addDoc).toHaveBeenCalled()
    })

    it('should include familyId in activity data', async () => {
      await logAgreementActivation(mockInput)

      const calls = (addDoc as Mock).mock.calls
      expect(calls[0][1].familyId).toBe(mockInput.familyId)
    })

    it('should set type to agreement_activated', async () => {
      await logAgreementActivation(mockInput)

      const calls = (addDoc as Mock).mock.calls
      expect(calls[0][1].type).toBe('agreement_activated')
    })

    it('should include description with both party names', async () => {
      await logAgreementActivation(mockInput)

      const calls = (addDoc as Mock).mock.calls
      expect(calls[0][1].description).toContain('Mom')
      expect(calls[0][1].description).toContain('Emma')
    })

    it('should include proposalId and versionNumber in metadata', async () => {
      await logAgreementActivation(mockInput)

      const calls = (addDoc as Mock).mock.calls
      expect(calls[0][1].metadata.proposalId).toBe(mockInput.proposalId)
      expect(calls[0][1].metadata.versionNumber).toBe(mockInput.versionNumber)
    })

    it('should return the activity log ID', async () => {
      ;(addDoc as Mock).mockResolvedValueOnce({ id: 'activity-log-id' })

      const result = await logAgreementActivation(mockInput)

      expect(result).toBe('activity-log-id')
    })
  })

  describe('createVersionHistoryEntry - AC3, AC6', () => {
    const mockSignatures: DualSignatures = {
      proposer: {
        userId: 'parent-1',
        userName: 'Mom',
        role: 'parent',
        signedAt: Date.now() - 1000,
        action: 'proposed',
      },
      recipient: {
        userId: 'child-abc',
        userName: 'Emma',
        role: 'child',
        signedAt: Date.now(),
        action: 'accepted',
      },
    }

    const mockVersion: ActivatedAgreementVersion = {
      id: 'version-2',
      agreementId: 'agreement-789',
      familyId: 'family-123',
      childId: 'child-abc',
      versionNumber: 2,
      content: { timeLimits: { weekday: { gaming: 90 } } },
      changedFromVersion: 1,
      proposalId: 'proposal-456',
      signatures: mockSignatures,
      createdAt: Date.now(),
      activatedAt: Date.now(),
    }

    const mockInput = {
      familyId: 'family-123',
      agreementId: 'agreement-789',
      version: mockVersion,
    }

    it('should create version document in versions subcollection', async () => {
      await createVersionHistoryEntry(mockInput)

      expect(doc).toHaveBeenCalledWith(
        {},
        'families',
        mockInput.familyId,
        'agreements',
        mockInput.agreementId,
        'versions',
        mockVersion.id
      )
      expect(setDoc).toHaveBeenCalled()
    })

    it('should include all version data', async () => {
      await createVersionHistoryEntry(mockInput)

      const calls = (setDoc as Mock).mock.calls
      const versionData = calls[0][1]
      expect(versionData.id).toBe(mockVersion.id)
      expect(versionData.versionNumber).toBe(mockVersion.versionNumber)
      expect(versionData.content).toEqual(mockVersion.content)
    })

    it('should include dual signatures in version data', async () => {
      await createVersionHistoryEntry(mockInput)

      const calls = (setDoc as Mock).mock.calls
      const versionData = calls[0][1]
      expect(versionData.signatures.proposer.userId).toBe('parent-1')
      expect(versionData.signatures.recipient.userId).toBe('child-abc')
    })

    it('should include proposalId reference', async () => {
      await createVersionHistoryEntry(mockInput)

      const calls = (setDoc as Mock).mock.calls
      const versionData = calls[0][1]
      expect(versionData.proposalId).toBe(mockVersion.proposalId)
    })

    it('should include changedFromVersion for history', async () => {
      await createVersionHistoryEntry(mockInput)

      const calls = (setDoc as Mock).mock.calls
      const versionData = calls[0][1]
      expect(versionData.changedFromVersion).toBe(1)
    })

    it('should return the version document ID', async () => {
      const result = await createVersionHistoryEntry(mockInput)

      expect(result).toBe(mockVersion.id)
    })

    it('should use server timestamp for createdAt', async () => {
      await createVersionHistoryEntry(mockInput)

      expect(serverTimestamp).toHaveBeenCalled()
      const calls = (setDoc as Mock).mock.calls
      expect(calls[0][1].createdAt).toEqual({ _serverTimestamp: true })
    })
  })
})
