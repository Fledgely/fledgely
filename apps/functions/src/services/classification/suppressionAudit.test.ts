/**
 * Suppression Audit Tests
 *
 * Story 21.2: Distress Detection Suppression (FR21A) - AC5
 *
 * Tests for suppression audit logging functionality.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Firestore } from 'firebase-admin/firestore'
import { logSuppressionEvent, markSuppressionReleased } from './suppressionAudit'

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

describe('suppressionAudit (Story 21.2)', () => {
  const mockSet = vi.fn().mockResolvedValue(undefined)
  const mockUpdate = vi.fn().mockResolvedValue(undefined)
  const mockDocRef = {
    id: 'test-audit-id-123',
    set: mockSet,
    update: mockUpdate,
  }
  const mockDoc = vi.fn().mockReturnValue(mockDocRef)
  const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc })
  const mockDb = { collection: mockCollection } as unknown as Firestore

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logSuppressionEvent', () => {
    it('creates audit entry with all required fields', async () => {
      const eventData = {
        screenshotId: 'screenshot-123',
        childId: 'child-456',
        familyId: 'family-789',
        concernCategory: 'Self-Harm Indicators' as const,
        severity: 'high' as const,
        suppressionReason: 'self_harm_detected' as const,
        timestamp: 1704067200000,
      }

      const result = await logSuppressionEvent(mockDb, eventData)

      expect(result).toBe('test-audit-id-123')
      expect(mockCollection).toHaveBeenCalledWith('suppressionAudit')
      expect(mockSet).toHaveBeenCalledWith({
        id: 'test-audit-id-123',
        screenshotId: 'screenshot-123',
        childId: 'child-456',
        familyId: 'family-789',
        concernCategory: 'Self-Harm Indicators',
        severity: 'high',
        suppressionReason: 'self_harm_detected',
        timestamp: 1704067200000,
        released: false,
      })
    })

    it('includes releasableAfter when provided', async () => {
      const eventData = {
        screenshotId: 'screenshot-123',
        childId: 'child-456',
        familyId: 'family-789',
        concernCategory: 'Self-Harm Indicators' as const,
        severity: 'medium' as const,
        suppressionReason: 'self_harm_detected' as const,
        timestamp: 1704067200000,
        releasableAfter: 1704240000000, // 48 hours later
      }

      await logSuppressionEvent(mockDb, eventData)

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          releasableAfter: 1704240000000,
        })
      )
    })

    it('handles crisis_url_visited suppression reason', async () => {
      const eventData = {
        screenshotId: 'screenshot-123',
        childId: 'child-456',
        familyId: 'family-789',
        concernCategory: 'Self-Harm Indicators' as const,
        severity: 'low' as const,
        suppressionReason: 'crisis_url_visited' as const,
        timestamp: 1704067200000,
      }

      await logSuppressionEvent(mockDb, eventData)

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          suppressionReason: 'crisis_url_visited',
        })
      )
    })

    it('handles distress_signals suppression reason', async () => {
      const eventData = {
        screenshotId: 'screenshot-123',
        childId: 'child-456',
        familyId: 'family-789',
        concernCategory: 'Self-Harm Indicators' as const,
        severity: 'medium' as const,
        suppressionReason: 'distress_signals' as const,
        timestamp: 1704067200000,
      }

      await logSuppressionEvent(mockDb, eventData)

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          suppressionReason: 'distress_signals',
        })
      )
    })
  })

  describe('markSuppressionReleased', () => {
    it('updates audit entry with released status and timestamp', async () => {
      const beforeTime = Date.now()

      await markSuppressionReleased(mockDb, 'audit-id-to-release')

      expect(mockCollection).toHaveBeenCalledWith('suppressionAudit')
      expect(mockDoc).toHaveBeenCalledWith('audit-id-to-release')
      expect(mockUpdate).toHaveBeenCalled()

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.released).toBe(true)
      expect(updateCall.releasedAt).toBeGreaterThanOrEqual(beforeTime)
    })
  })
})
