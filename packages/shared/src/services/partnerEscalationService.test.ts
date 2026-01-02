/**
 * PartnerEscalationService Tests - Story 7.5.5 Task 4
 *
 * TDD tests for tracking partner escalations.
 * AC3: Family notification suppression
 * AC6: Partner capability registration
 *
 * CRITICAL SAFETY:
 * - Escalation data stored in isolated collection
 * - Family members have NO access to escalation data
 * - Blackout extensions protect child during investigation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  recordEscalation,
  extendBlackoutPeriod,
  getEscalationStatus,
  sealEscalation,
  ESCALATION_COLLECTION,
} from './partnerEscalationService'
import { type SignalEscalation } from '../contracts/crisisPartner'

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

describe('PartnerEscalationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================
  // Constants Tests
  // ============================================

  describe('ESCALATION_COLLECTION', () => {
    it('should be named signalEscalations', () => {
      expect(ESCALATION_COLLECTION).toBe('signalEscalations')
    })
  })

  // ============================================
  // recordEscalation Tests
  // ============================================

  describe('recordEscalation', () => {
    it('should record an assessment escalation', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const escalation = await recordEscalation('sig_123', 'partner_456', 'assessment', 'US-CA')

      expect(escalation.signalId).toBe('sig_123')
      expect(escalation.partnerId).toBe('partner_456')
      expect(escalation.escalationType).toBe('assessment')
      expect(escalation.jurisdiction).toBe('US-CA')
      expect(escalation.sealed).toBe(false)
      expect(escalation.sealedAt).toBeNull()
      expect(firestore.setDoc).toHaveBeenCalled()
    })

    it('should record a mandatory_report escalation', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const escalation = await recordEscalation(
        'sig_123',
        'partner_456',
        'mandatory_report',
        'US-CA'
      )

      expect(escalation.escalationType).toBe('mandatory_report')
    })

    it('should record a law_enforcement_referral escalation', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const escalation = await recordEscalation(
        'sig_123',
        'partner_456',
        'law_enforcement_referral',
        'UK'
      )

      expect(escalation.escalationType).toBe('law_enforcement_referral')
    })

    it('should set escalatedAt timestamp', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const before = new Date()
      const escalation = await recordEscalation('sig_123', 'partner_456', 'assessment', 'US-CA')
      const after = new Date()

      expect(escalation.escalatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(escalation.escalatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should generate unique escalation id', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const esc1 = await recordEscalation('sig_123', 'partner_456', 'assessment', 'US-CA')
      const esc2 = await recordEscalation('sig_123', 'partner_456', 'assessment', 'US-CA')

      expect(esc1.id).not.toBe(esc2.id)
    })

    it('should throw for empty signalId', async () => {
      await expect(recordEscalation('', 'partner_456', 'assessment', 'US-CA')).rejects.toThrow(
        'signalId is required'
      )
    })

    it('should throw for empty partnerId', async () => {
      await expect(recordEscalation('sig_123', '', 'assessment', 'US-CA')).rejects.toThrow(
        'partnerId is required'
      )
    })

    it('should throw for empty jurisdiction', async () => {
      await expect(recordEscalation('sig_123', 'partner_456', 'assessment', '')).rejects.toThrow(
        'jurisdiction is required'
      )
    })
  })

  // ============================================
  // extendBlackoutPeriod Tests
  // ============================================

  describe('extendBlackoutPeriod', () => {
    it('should extend blackout period for a signal', async () => {
      const mockBlackout = {
        exists: () => true,
        data: () => ({
          id: 'blackout_123',
          signalId: 'sig_456',
          expiresAt: new Date(),
          active: true,
        }),
      }

      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [mockBlackout],
        empty: false,
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await extendBlackoutPeriod('sig_456', 24)

      expect(firestore.updateDoc).toHaveBeenCalled()
    })

    it('should extend by specified hours', async () => {
      const originalExpiry = new Date()
      const mockBlackout = {
        exists: () => true,
        ref: 'blackout_ref',
        data: () => ({
          id: 'blackout_123',
          signalId: 'sig_456',
          expiresAt: originalExpiry,
          active: true,
        }),
      }

      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [mockBlackout],
        empty: false,
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await extendBlackoutPeriod('sig_456', 24)

      // Verify updateDoc was called with extended time
      expect(firestore.updateDoc).toHaveBeenCalled()
      const updateCall = vi.mocked(firestore.updateDoc).mock.calls[0]
      const updateData = updateCall[1] as { expiresAt: Date; extendedBy: string }
      const expectedExpiry = new Date(originalExpiry.getTime() + 24 * 60 * 60 * 1000)
      expect(updateData.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3) // Within 1 second
    })

    it('should throw if no blackout found', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [],
        empty: true,
      } as any)

      await expect(extendBlackoutPeriod('sig_456', 24)).rejects.toThrow('No blackout found')
    })

    it('should throw for empty signalId', async () => {
      await expect(extendBlackoutPeriod('', 24)).rejects.toThrow('signalId is required')
    })

    it('should throw for negative extension hours', async () => {
      await expect(extendBlackoutPeriod('sig_123', -5)).rejects.toThrow(
        'Extension hours must be positive'
      )
    })

    it('should throw for zero extension hours', async () => {
      await expect(extendBlackoutPeriod('sig_123', 0)).rejects.toThrow(
        'Extension hours must be positive'
      )
    })
  })

  // ============================================
  // getEscalationStatus Tests
  // ============================================

  describe('getEscalationStatus', () => {
    it('should return escalation for existing signal', async () => {
      const escalationData: SignalEscalation = {
        id: 'esc_123',
        signalId: 'sig_456',
        partnerId: 'partner_789',
        escalationType: 'mandatory_report',
        escalatedAt: new Date(),
        jurisdiction: 'US-CA',
        sealed: false,
        sealedAt: null,
      }

      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [{ data: () => escalationData }],
        empty: false,
      } as any)

      const result = await getEscalationStatus('sig_456')

      expect(result).not.toBeNull()
      expect(result?.signalId).toBe('sig_456')
      expect(result?.escalationType).toBe('mandatory_report')
    })

    it('should return null for non-escalated signal', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [],
        empty: true,
      } as any)

      const result = await getEscalationStatus('sig_999')

      expect(result).toBeNull()
    })

    it('should throw for empty signalId', async () => {
      await expect(getEscalationStatus('')).rejects.toThrow('signalId is required')
    })
  })

  // ============================================
  // sealEscalation Tests
  // ============================================

  describe('sealEscalation', () => {
    it('should seal an escalation', async () => {
      const mockEscalation = {
        exists: () => true,
        data: () => ({
          id: 'esc_123',
          sealed: false,
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockEscalation as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await sealEscalation('esc_123')

      expect(firestore.updateDoc).toHaveBeenCalled()
      const updateCall = vi.mocked(firestore.updateDoc).mock.calls[0]
      const updateData = updateCall[1] as { sealed: boolean; sealedAt: Date }
      expect(updateData.sealed).toBe(true)
      expect(updateData.sealedAt).toBeInstanceOf(Date)
    })

    it('should throw if escalation not found', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      await expect(sealEscalation('nonexistent')).rejects.toThrow('Escalation not found')
    })

    it('should throw if already sealed', async () => {
      const mockEscalation = {
        exists: () => true,
        data: () => ({
          id: 'esc_123',
          sealed: true,
          sealedAt: new Date(),
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockEscalation as any)

      await expect(sealEscalation('esc_123')).rejects.toThrow('Escalation already sealed')
    })

    it('should throw for empty escalationId', async () => {
      await expect(sealEscalation('')).rejects.toThrow('escalationId is required')
    })
  })
})
