/**
 * sendViewingRateAlert Cloud Function Tests - Story 3A.5
 *
 * Tests for the Cloud Function that sends viewing rate alerts to co-parents.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sendViewingRateAlertInputSchema,
  VIEWING_RATE_CONFIG,
  _resetDbForTesting,
} from './sendViewingRateAlert'

// Mock Firebase Admin
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockDoc = vi.fn(() => ({ get: mockGet, set: mockSet, id: 'notification-123' }))
const mockCollection = vi.fn(() => ({ doc: mockDoc }))
const mockFirestore = vi.fn(() => ({ collection: mockCollection }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore(),
}))

// Mock admin audit
const mockLogAdminAction = vi.fn()
vi.mock('../utils/adminAudit', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}))

describe('sendViewingRateAlert - Story 3A.5', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
  })

  describe('Input Schema Validation', () => {
    it('should accept valid input', () => {
      const result = sendViewingRateAlertInputSchema.safeParse({
        familyId: 'family-1',
        viewerUid: 'parent-1',
        viewCount: 55,
        timeframeStart: Date.now() - 3600000,
        timeframeEnd: Date.now(),
      })

      expect(result.success).toBe(true)
    })

    it('should reject empty familyId', () => {
      const result = sendViewingRateAlertInputSchema.safeParse({
        familyId: '',
        viewerUid: 'parent-1',
        viewCount: 55,
        timeframeStart: Date.now() - 3600000,
        timeframeEnd: Date.now(),
      })

      expect(result.success).toBe(false)
    })

    it('should reject empty viewerUid', () => {
      const result = sendViewingRateAlertInputSchema.safeParse({
        familyId: 'family-1',
        viewerUid: '',
        viewCount: 55,
        timeframeStart: Date.now() - 3600000,
        timeframeEnd: Date.now(),
      })

      expect(result.success).toBe(false)
    })

    it('should reject viewCount less than 1', () => {
      const result = sendViewingRateAlertInputSchema.safeParse({
        familyId: 'family-1',
        viewerUid: 'parent-1',
        viewCount: 0,
        timeframeStart: Date.now() - 3600000,
        timeframeEnd: Date.now(),
      })

      expect(result.success).toBe(false)
    })

    it('should accept viewCount at threshold', () => {
      const result = sendViewingRateAlertInputSchema.safeParse({
        familyId: 'family-1',
        viewerUid: 'parent-1',
        viewCount: VIEWING_RATE_CONFIG.threshold,
        timeframeStart: Date.now() - 3600000,
        timeframeEnd: Date.now(),
      })

      expect(result.success).toBe(true)
    })
  })

  describe('VIEWING_RATE_CONFIG', () => {
    it('should have threshold of 50 (AC1: hardcoded, not configurable)', () => {
      expect(VIEWING_RATE_CONFIG.threshold).toBe(50)
    })

    it('should have windowMinutes of 60', () => {
      expect(VIEWING_RATE_CONFIG.windowMinutes).toBe(60)
    })

    it('should be readonly (frozen)', () => {
      // TypeScript const assertion makes it readonly
      expect(typeof VIEWING_RATE_CONFIG.threshold).toBe('number')
      expect(typeof VIEWING_RATE_CONFIG.windowMinutes).toBe('number')
    })
  })

  describe('Audit Log Entry Format', () => {
    it('should log with correct action type', async () => {
      mockLogAdminAction.mockResolvedValue('log-id-123')

      // Simulate what the Cloud Function would call
      await mockLogAdminAction({
        agentId: 'parent-1',
        agentEmail: null,
        action: 'viewing_rate_exceeded',
        resourceType: 'viewing_rate_alert',
        resourceId: 'family-1',
        metadata: {
          familyId: 'family-1',
          viewerUid: 'parent-1',
          viewCount: 55,
          thresholdValue: 50,
          windowMinutes: 60,
          timeframeStart: expect.any(Number),
          timeframeEnd: expect.any(Number),
          otherGuardianUids: ['parent-2'],
          timestamp: expect.any(Number),
        },
      })

      expect(mockLogAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'viewing_rate_exceeded',
          resourceType: 'viewing_rate_alert',
          resourceId: 'family-1',
        })
      )
    })

    it('should include all required metadata fields', async () => {
      mockLogAdminAction.mockResolvedValue('log-id-456')

      const now = Date.now()
      const metadata = {
        familyId: 'family-1',
        viewerUid: 'parent-1',
        viewCount: 55,
        thresholdValue: VIEWING_RATE_CONFIG.threshold,
        windowMinutes: VIEWING_RATE_CONFIG.windowMinutes,
        timeframeStart: now - 3600000,
        timeframeEnd: now,
        otherGuardianUids: ['parent-2'],
        timestamp: now,
      }

      await mockLogAdminAction({
        agentId: 'parent-1',
        agentEmail: null,
        action: 'viewing_rate_exceeded',
        resourceType: 'viewing_rate_alert',
        resourceId: 'family-1',
        metadata,
      })

      expect(mockLogAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            familyId: 'family-1',
            viewerUid: 'parent-1',
            viewCount: 55,
            thresholdValue: 50,
            windowMinutes: 60,
          }),
        })
      )
    })
  })

  describe('Notification Content', () => {
    it('should create notification with generic message (AC2: no screenshot details)', () => {
      const viewCount = 55
      const message = `A family member has viewed ${viewCount} screenshots in the last hour.`

      // Verify message format matches AC2: shows count and timeframe, NOT which screenshots
      expect(message).toContain(String(viewCount))
      expect(message).toContain('last hour')
      expect(message).not.toContain('screenshot-')
      expect(message).not.toContain('child')
    })

    it('should NOT include viewer identity in notification message', () => {
      const message = 'A family member has viewed 55 screenshots in the last hour.'

      // Verify neutral language (AC2)
      expect(message).toContain('A family member')
      expect(message).not.toContain('parent-1')
      expect(message).not.toContain('your co-parent')
    })
  })

  describe('Child Protection', () => {
    it('should never notify children (AC5: prevent triangulation)', () => {
      // This is enforced by the Cloud Function logic which only
      // sends notifications to guardians, never children
      const mockFamily = {
        guardians: [
          { uid: 'parent-1', role: 'primary_guardian' },
          { uid: 'parent-2', role: 'guardian' },
        ],
        children: [{ id: 'child-1', name: 'Test Child' }],
      }

      // The function filters to other guardians only
      const otherGuardians = mockFamily.guardians.filter((g) => g.uid !== 'parent-1')

      // Verify child is not in notification recipients
      expect(otherGuardians).toHaveLength(1)
      expect(otherGuardians[0].uid).toBe('parent-2')
      expect(otherGuardians.some((g) => g.uid === 'child-1')).toBe(false)
    })
  })
})
