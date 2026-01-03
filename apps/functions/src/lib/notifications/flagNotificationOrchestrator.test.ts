/**
 * Tests for Flag Notification Orchestrator
 *
 * Story 41.2: Flag Notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared before importing
vi.mock('@fledgely/shared', () => {
  const NOTIFICATION_DEFAULTS_MOCK = {
    criticalFlagsEnabled: true,
    mediumFlagsMode: 'digest' as const,
    lowFlagsEnabled: false,
    timeLimitWarningsEnabled: true,
    limitReachedEnabled: true,
    extensionRequestsEnabled: true,
    syncAlertsEnabled: true,
    syncThresholdHours: 4 as const,
    quietHoursEnabled: false,
  }

  return {
    createDefaultNotificationPreferences: (
      userId: string,
      familyId: string,
      childId: string | null
    ) => ({
      id: childId ? `${userId}-${childId}` : `${userId}-default`,
      userId,
      familyId,
      childId,
      ...NOTIFICATION_DEFAULTS_MOCK,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      quietHoursWeekendDifferent: false,
      quietHoursWeekendStart: null,
      quietHoursWeekendEnd: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    }),
    NOTIFICATION_DEFAULTS: NOTIFICATION_DEFAULTS_MOCK,
  }
})

// Mock firebase-admin/firestore
const mockDocGet = vi.fn()
const mockCollectionDoc = vi.fn(() => ({
  get: mockDocGet,
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: mockDocGet,
    })),
  })),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: vi.fn(() => ({
      doc: mockCollectionDoc,
    })),
  }),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

// Import after mocks
import {
  isCrisisRelatedFlag,
  determineNotificationRoute,
  processFlagNotification,
  _resetDbForTesting,
} from './flagNotificationOrchestrator'
import type { FlagDocument, ParentNotificationPreferences } from '@fledgely/shared'

describe('flagNotificationOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
  })

  describe('isCrisisRelatedFlag', () => {
    it('returns true for self_harm_detected suppression', () => {
      const flag = {
        id: 'flag-1',
        suppressionReason: 'self_harm_detected',
      } as FlagDocument

      expect(isCrisisRelatedFlag(flag)).toBe(true)
    })

    it('returns true for crisis_url_visited suppression', () => {
      const flag = {
        id: 'flag-1',
        suppressionReason: 'crisis_url_visited',
      } as FlagDocument

      expect(isCrisisRelatedFlag(flag)).toBe(true)
    })

    it('returns true for distress_signals suppression', () => {
      const flag = {
        id: 'flag-1',
        suppressionReason: 'distress_signals',
      } as FlagDocument

      expect(isCrisisRelatedFlag(flag)).toBe(true)
    })

    it('returns true for sensitive_hold status', () => {
      const flag = {
        id: 'flag-1',
        status: 'sensitive_hold',
      } as FlagDocument

      expect(isCrisisRelatedFlag(flag)).toBe(true)
    })

    it('returns false for normal flags', () => {
      const flag = {
        id: 'flag-1',
        status: 'pending',
      } as FlagDocument

      expect(isCrisisRelatedFlag(flag)).toBe(false)
    })

    it('returns false for flags without suppression', () => {
      const flag = {
        id: 'flag-1',
        status: 'reviewed',
        suppressionReason: undefined,
      } as FlagDocument

      expect(isCrisisRelatedFlag(flag)).toBe(false)
    })
  })

  describe('determineNotificationRoute', () => {
    const basePrefs: ParentNotificationPreferences = {
      id: 'user-1-default',
      userId: 'user-1',
      familyId: 'family-1',
      childId: null,
      criticalFlagsEnabled: true,
      mediumFlagsMode: 'digest',
      lowFlagsEnabled: false,
      timeLimitWarningsEnabled: true,
      limitReachedEnabled: true,
      extensionRequestsEnabled: true,
      syncAlertsEnabled: true,
      syncThresholdHours: 4,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      quietHoursWeekendDifferent: false,
      quietHoursWeekendStart: null,
      quietHoursWeekendEnd: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    }

    describe('critical severity', () => {
      it('routes to immediate when criticalFlagsEnabled', () => {
        const prefs = { ...basePrefs, criticalFlagsEnabled: true }
        const result = determineNotificationRoute('critical', prefs)

        expect(result.route).toBe('immediate')
        expect(result.reason).toBe('critical_enabled')
      })

      it('skips when criticalFlagsEnabled is false', () => {
        const prefs = { ...basePrefs, criticalFlagsEnabled: false }
        const result = determineNotificationRoute('critical', prefs)

        expect(result.route).toBe('skipped')
        expect(result.reason).toBe('critical_disabled')
      })
    })

    describe('medium severity', () => {
      it('routes to immediate when mediumFlagsMode is immediate', () => {
        const prefs = { ...basePrefs, mediumFlagsMode: 'immediate' as const }
        const result = determineNotificationRoute('medium', prefs)

        expect(result.route).toBe('immediate')
        expect(result.reason).toBe('medium_immediate_mode')
      })

      it('routes to hourly digest when mediumFlagsMode is digest', () => {
        const prefs = { ...basePrefs, mediumFlagsMode: 'digest' as const }
        const result = determineNotificationRoute('medium', prefs)

        expect(result.route).toBe('hourly_digest')
        expect(result.reason).toBe('medium_digest_mode')
      })

      it('skips when mediumFlagsMode is off', () => {
        const prefs = { ...basePrefs, mediumFlagsMode: 'off' as const }
        const result = determineNotificationRoute('medium', prefs)

        expect(result.route).toBe('skipped')
        expect(result.reason).toBe('medium_disabled')
      })
    })

    describe('low severity', () => {
      it('routes to daily digest when lowFlagsEnabled', () => {
        const prefs = { ...basePrefs, lowFlagsEnabled: true }
        const result = determineNotificationRoute('low', prefs)

        expect(result.route).toBe('daily_digest')
        expect(result.reason).toBe('low_enabled')
      })

      it('skips when lowFlagsEnabled is false', () => {
        const prefs = { ...basePrefs, lowFlagsEnabled: false }
        const result = determineNotificationRoute('low', prefs)

        expect(result.route).toBe('skipped')
        expect(result.reason).toBe('low_disabled')
      })
    })
  })

  describe('processFlagNotification', () => {
    const baseFlagDoc: FlagDocument = {
      id: 'flag-123',
      childId: 'child-456',
      familyId: 'family-789',
      screenshotRef: 'children/child-456/screenshots/ss-1',
      screenshotId: 'ss-1',
      category: 'explicit_content',
      severity: 'critical',
      confidence: 0.95,
      reasoning: 'Test flag',
      createdAt: Date.now(),
      status: 'pending',
      throttled: false,
      childNotificationStatus: 'pending',
    }

    it('blocks notification for crisis-related flags (zero-data-path)', async () => {
      const crisisFlag = {
        ...baseFlagDoc,
        suppressionReason: 'self_harm_detected' as const,
        status: 'sensitive_hold' as const,
      }

      const result = await processFlagNotification(crisisFlag, 'family-789')

      expect(result.crisisBlocked).toBe(true)
      expect(result.notificationGenerated).toBe(false)
      expect(result.parentRoutes).toEqual([])
    })

    it('returns no notifications when no parents found', async () => {
      // Mock family doc with no parents
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: [] }),
      })

      const result = await processFlagNotification(baseFlagDoc, 'family-789')

      expect(result.notificationGenerated).toBe(false)
      expect(result.parentRoutes).toEqual([])
    })

    it('processes each parent independently', async () => {
      // Mock family doc with two parents
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1', 'parent-2'] }),
      })

      // Mock child doc
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ displayName: 'Emma' }),
      })

      // Mock preferences for parent-1 (child-specific not found)
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Mock preferences for parent-1 (default not found - use defaults)
      mockDocGet.mockResolvedValueOnce({ exists: false })

      // Mock preferences for parent-2 (child-specific not found)
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Mock preferences for parent-2 (default not found - use defaults)
      mockDocGet.mockResolvedValueOnce({ exists: false })

      const onImmediateNotification = vi.fn()

      const result = await processFlagNotification(baseFlagDoc, 'family-789', {
        onImmediateNotification,
      })

      expect(result.notificationGenerated).toBe(true)
      expect(result.parentRoutes).toHaveLength(2)
      expect(result.parentRoutes[0].route).toBe('immediate')
      expect(result.parentRoutes[1].route).toBe('immediate')
      expect(onImmediateNotification).toHaveBeenCalledTimes(2)
    })

    it('uses child-specific preferences when available', async () => {
      // Mock family doc
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock child doc
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ displayName: 'Emma' }),
      })

      // Mock child-specific preferences - critical disabled
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'parent-1-child-456',
          userId: 'parent-1',
          familyId: 'family-789',
          childId: 'child-456',
          criticalFlagsEnabled: false, // Disabled for this child
          mediumFlagsMode: 'digest',
          lowFlagsEnabled: false,
          quietHoursEnabled: false,
        }),
      })

      const result = await processFlagNotification(baseFlagDoc, 'family-789')

      expect(result.parentRoutes[0].route).toBe('skipped')
      expect(result.parentRoutes[0].reason).toBe('critical_disabled')
    })

    it('calls onDigestQueue for medium severity with digest mode', async () => {
      const mediumFlag = { ...baseFlagDoc, severity: 'medium' as const }

      // Mock family doc
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock child doc
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ displayName: 'Emma' }),
      })

      // Mock preferences with digest mode (default)
      mockDocGet.mockResolvedValueOnce({ exists: false })
      mockDocGet.mockResolvedValueOnce({ exists: false })

      const onDigestQueue = vi.fn()

      const result = await processFlagNotification(mediumFlag, 'family-789', {
        onDigestQueue,
      })

      expect(result.parentRoutes[0].route).toBe('hourly_digest')
      expect(onDigestQueue).toHaveBeenCalledWith('parent-1', mediumFlag, 'Emma', 'hourly')
    })

    it('calls onDigestQueue for low severity when enabled', async () => {
      const lowFlag = { ...baseFlagDoc, severity: 'low' as const }

      // Mock family doc
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock child doc
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ displayName: 'Emma' }),
      })

      // Mock preferences with low enabled
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'parent-1-default',
          userId: 'parent-1',
          familyId: 'family-789',
          childId: null,
          criticalFlagsEnabled: true,
          mediumFlagsMode: 'digest',
          lowFlagsEnabled: true, // Enabled
          quietHoursEnabled: false,
        }),
      })

      const onDigestQueue = vi.fn()

      const result = await processFlagNotification(lowFlag, 'family-789', {
        onDigestQueue,
      })

      expect(result.parentRoutes[0].route).toBe('daily_digest')
      expect(onDigestQueue).toHaveBeenCalledWith('parent-1', lowFlag, 'Emma', 'daily')
    })

    it('continues processing other parents if one fails', async () => {
      // Mock family doc with two parents
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1', 'parent-2'] }),
      })

      // Mock child doc
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ displayName: 'Emma' }),
      })

      // Mock preferences for both parents (using defaults)
      mockDocGet.mockResolvedValue({ exists: false })

      const onImmediateNotification = vi
        .fn()
        .mockRejectedValueOnce(new Error('First parent failed'))
        .mockResolvedValueOnce(undefined)

      const result = await processFlagNotification(baseFlagDoc, 'family-789', {
        onImmediateNotification,
      })

      // Both parents should be processed
      expect(result.parentRoutes).toHaveLength(2)
      expect(onImmediateNotification).toHaveBeenCalledTimes(2)
    })
  })
})
