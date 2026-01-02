/**
 * Offline Confirmation Service Tests - Story 7.5.3 Task 7
 *
 * Tests for offline confirmation handling and resource caching.
 * AC1: Confirmation display must work offline
 *
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  // Offline confirmation functions
  getOfflineConfirmation,
  shouldShowResourcesOffline,
  getCachedResourcesOffline,
  cacheResourcesForOffline,
  // Cache management
  clearOfflineCache,
  isOfflineCacheValid,
  getOfflineCacheStatus,
  // Sync functions
  syncOfflineConfirmations,
  getPendingConfirmations,
  markConfirmationSynced,
  // Queue management
  queueConfirmationForSync,
  getQueuedConfirmationsCount,
  clearSyncQueue,
} from './offlineConfirmationService'
import { type SignalCrisisResource as CrisisResource } from '../contracts/signalConfirmation'

describe('Offline Confirmation Service', () => {
  beforeEach(() => {
    // Clear all caches before each test
    clearOfflineCache()
    clearSyncQueue()
  })

  // ============================================
  // Offline Confirmation Tests
  // ============================================

  describe('getOfflineConfirmation', () => {
    it('should return offline-specific confirmation content', () => {
      const confirmation = getOfflineConfirmation()

      expect(confirmation.headerText).toBe('Message saved')
      expect(confirmation.bodyText).toContain('saved')
      expect(confirmation.bodyText.toLowerCase()).toContain('online')
    })

    it('should include emergency text with jurisdiction number', () => {
      const usConfirmation = getOfflineConfirmation('US')
      const ukConfirmation = getOfflineConfirmation('UK')

      expect(usConfirmation.emergencyText).toContain('911')
      expect(ukConfirmation.emergencyText).toContain('999')
    })

    it('should default to US if no jurisdiction provided', () => {
      const confirmation = getOfflineConfirmation()

      expect(confirmation.emergencyText).toContain('911')
    })

    it('should include reassuring message', () => {
      const confirmation = getOfflineConfirmation()

      expect(confirmation.bodyText.toLowerCase()).toContain('right thing')
    })

    it('should have chat prompt text', () => {
      const confirmation = getOfflineConfirmation()

      expect(confirmation.chatPromptText).toBeTruthy()
      expect(confirmation.chatPromptText.length).toBeGreaterThan(0)
    })

    it('should have dismiss button text', () => {
      const confirmation = getOfflineConfirmation()

      expect(confirmation.dismissButtonText).toBeTruthy()
    })
  })

  describe('shouldShowResourcesOffline', () => {
    it('should return true if resources are cached', () => {
      const mockResource: CrisisResource = {
        id: 'test-1',
        name: 'Test Resource',
        description: 'A test resource',
        type: 'hotline',
        value: '1-800-TEST',
        priority: 1,
        jurisdictions: ['US'],
        available24x7: true,
        chatAvailable: false,
      }
      cacheResourcesForOffline([mockResource])

      expect(shouldShowResourcesOffline()).toBe(true)
    })

    it('should return false if no resources cached', () => {
      clearOfflineCache()

      expect(shouldShowResourcesOffline()).toBe(false)
    })

    it('should return true even with partial cache', () => {
      const mockResource: CrisisResource = {
        id: 'partial-1',
        name: 'Partial Resource',
        description: 'A partial resource',
        type: 'website',
        value: 'https://test.com',
        priority: 5,
        jurisdictions: [],
        available24x7: false,
        chatAvailable: true,
      }
      cacheResourcesForOffline([mockResource])

      expect(shouldShowResourcesOffline()).toBe(true)
    })
  })

  // ============================================
  // Resource Caching Tests
  // ============================================

  describe('cacheResourcesForOffline', () => {
    it('should cache resources successfully', () => {
      const resources: CrisisResource[] = [
        {
          id: 'cache-1',
          name: 'Cache Test 1',
          description: 'First cached resource',
          type: 'hotline',
          value: '1-800-CACHE1',
          priority: 1,
          jurisdictions: ['US'],
          available24x7: true,
          chatAvailable: false,
        },
        {
          id: 'cache-2',
          name: 'Cache Test 2',
          description: 'Second cached resource',
          type: 'chat',
          value: 'https://chat.test.com',
          priority: 2,
          jurisdictions: ['US'],
          available24x7: true,
          chatAvailable: true,
        },
      ]

      cacheResourcesForOffline(resources)
      const cached = getCachedResourcesOffline()

      expect(cached).toHaveLength(2)
      expect(cached[0].id).toBe('cache-1')
      expect(cached[1].id).toBe('cache-2')
    })

    it('should replace existing cache', () => {
      const firstResources: CrisisResource[] = [
        {
          id: 'first-1',
          name: 'First',
          description: 'First resource',
          type: 'hotline',
          value: '1-800-FIRST',
          priority: 1,
          jurisdictions: [],
          available24x7: true,
          chatAvailable: false,
        },
      ]
      const secondResources: CrisisResource[] = [
        {
          id: 'second-1',
          name: 'Second',
          description: 'Second resource',
          type: 'website',
          value: 'https://second.com',
          priority: 1,
          jurisdictions: [],
          available24x7: true,
          chatAvailable: false,
        },
      ]

      cacheResourcesForOffline(firstResources)
      cacheResourcesForOffline(secondResources)
      const cached = getCachedResourcesOffline()

      expect(cached).toHaveLength(1)
      expect(cached[0].id).toBe('second-1')
    })

    it('should handle empty array', () => {
      cacheResourcesForOffline([])
      const cached = getCachedResourcesOffline()

      expect(cached).toHaveLength(0)
    })
  })

  describe('getCachedResourcesOffline', () => {
    it('should return empty array when no cache', () => {
      const cached = getCachedResourcesOffline()

      expect(cached).toEqual([])
    })

    it('should return cached resources in priority order', () => {
      const resources: CrisisResource[] = [
        {
          id: 'low-priority',
          name: 'Low Priority',
          description: 'Low priority resource',
          type: 'website',
          value: 'https://low.com',
          priority: 10,
          jurisdictions: [],
          available24x7: true,
          chatAvailable: false,
        },
        {
          id: 'high-priority',
          name: 'High Priority',
          description: 'High priority resource',
          type: 'hotline',
          value: '1-800-HIGH',
          priority: 1,
          jurisdictions: [],
          available24x7: true,
          chatAvailable: false,
        },
      ]

      cacheResourcesForOffline(resources)
      const cached = getCachedResourcesOffline()

      expect(cached[0].id).toBe('high-priority')
      expect(cached[1].id).toBe('low-priority')
    })

    it('should filter by jurisdiction when provided', () => {
      const resources: CrisisResource[] = [
        {
          id: 'us-only',
          name: 'US Only',
          description: 'US resource',
          type: 'hotline',
          value: '1-800-US',
          priority: 1,
          jurisdictions: ['US'],
          available24x7: true,
          chatAvailable: false,
        },
        {
          id: 'uk-only',
          name: 'UK Only',
          description: 'UK resource',
          type: 'hotline',
          value: '0800-UK',
          priority: 1,
          jurisdictions: ['UK'],
          available24x7: true,
          chatAvailable: false,
        },
      ]

      cacheResourcesForOffline(resources)
      const usCached = getCachedResourcesOffline('US')
      const ukCached = getCachedResourcesOffline('UK')

      expect(usCached).toHaveLength(1)
      expect(usCached[0].id).toBe('us-only')
      expect(ukCached).toHaveLength(1)
      expect(ukCached[0].id).toBe('uk-only')
    })
  })

  // ============================================
  // Cache Status Tests
  // ============================================

  describe('clearOfflineCache', () => {
    it('should clear all cached resources', () => {
      const resources: CrisisResource[] = [
        {
          id: 'to-clear',
          name: 'To Clear',
          description: 'Will be cleared',
          type: 'hotline',
          value: '1-800-CLEAR',
          priority: 1,
          jurisdictions: [],
          available24x7: true,
          chatAvailable: false,
        },
      ]
      cacheResourcesForOffline(resources)

      clearOfflineCache()
      const cached = getCachedResourcesOffline()

      expect(cached).toHaveLength(0)
    })
  })

  describe('isOfflineCacheValid', () => {
    it('should return false when cache is empty', () => {
      expect(isOfflineCacheValid()).toBe(false)
    })

    it('should return true when cache has resources', () => {
      const resources: CrisisResource[] = [
        {
          id: 'valid-check',
          name: 'Valid Check',
          description: 'For validity check',
          type: 'hotline',
          value: '1-800-VALID',
          priority: 1,
          jurisdictions: [],
          available24x7: true,
          chatAvailable: false,
        },
      ]
      cacheResourcesForOffline(resources)

      expect(isOfflineCacheValid()).toBe(true)
    })
  })

  describe('getOfflineCacheStatus', () => {
    it('should return status with resource count', () => {
      const resources: CrisisResource[] = [
        {
          id: 'status-1',
          name: 'Status 1',
          description: 'Status resource 1',
          type: 'hotline',
          value: '1-800-STATUS1',
          priority: 1,
          jurisdictions: [],
          available24x7: true,
          chatAvailable: false,
        },
        {
          id: 'status-2',
          name: 'Status 2',
          description: 'Status resource 2',
          type: 'chat',
          value: 'https://status.com',
          priority: 2,
          jurisdictions: [],
          available24x7: true,
          chatAvailable: true,
        },
      ]
      cacheResourcesForOffline(resources)

      const status = getOfflineCacheStatus()

      expect(status.resourceCount).toBe(2)
      expect(status.isValid).toBe(true)
    })

    it('should include last updated timestamp', () => {
      const beforeCache = Date.now()
      const resources: CrisisResource[] = [
        {
          id: 'timestamp-test',
          name: 'Timestamp Test',
          description: 'For timestamp check',
          type: 'website',
          value: 'https://timestamp.com',
          priority: 1,
          jurisdictions: [],
          available24x7: true,
          chatAvailable: false,
        },
      ]
      cacheResourcesForOffline(resources)
      const afterCache = Date.now()

      const status = getOfflineCacheStatus()

      expect(status.lastUpdated).toBeGreaterThanOrEqual(beforeCache)
      expect(status.lastUpdated).toBeLessThanOrEqual(afterCache)
    })

    it('should show zero count when empty', () => {
      const status = getOfflineCacheStatus()

      expect(status.resourceCount).toBe(0)
      expect(status.isValid).toBe(false)
    })
  })

  // ============================================
  // Sync Queue Tests
  // ============================================

  describe('queueConfirmationForSync', () => {
    it('should add confirmation to sync queue', () => {
      queueConfirmationForSync('signal-123', 'US')

      const count = getQueuedConfirmationsCount()
      expect(count).toBe(1)
    })

    it('should queue multiple confirmations', () => {
      queueConfirmationForSync('signal-1', 'US')
      queueConfirmationForSync('signal-2', 'UK')
      queueConfirmationForSync('signal-3', 'CA')

      const count = getQueuedConfirmationsCount()
      expect(count).toBe(3)
    })

    it('should not duplicate same signal ID', () => {
      queueConfirmationForSync('duplicate-signal', 'US')
      queueConfirmationForSync('duplicate-signal', 'US')

      const count = getQueuedConfirmationsCount()
      expect(count).toBe(1)
    })
  })

  describe('getPendingConfirmations', () => {
    it('should return all pending confirmations', () => {
      queueConfirmationForSync('pending-1', 'US')
      queueConfirmationForSync('pending-2', 'UK')

      const pending = getPendingConfirmations()

      expect(pending).toHaveLength(2)
      expect(pending[0].signalId).toBe('pending-1')
      expect(pending[1].signalId).toBe('pending-2')
    })

    it('should return empty array when no pending', () => {
      const pending = getPendingConfirmations()

      expect(pending).toEqual([])
    })

    it('should include jurisdiction in pending confirmation', () => {
      queueConfirmationForSync('with-jurisdiction', 'AU')

      const pending = getPendingConfirmations()

      expect(pending[0].jurisdiction).toBe('AU')
    })

    it('should include timestamp in pending confirmation', () => {
      const beforeQueue = Date.now()
      queueConfirmationForSync('with-timestamp', 'US')
      const afterQueue = Date.now()

      const pending = getPendingConfirmations()

      expect(pending[0].queuedAt).toBeGreaterThanOrEqual(beforeQueue)
      expect(pending[0].queuedAt).toBeLessThanOrEqual(afterQueue)
    })
  })

  describe('markConfirmationSynced', () => {
    it('should remove confirmation from queue after sync', () => {
      queueConfirmationForSync('to-sync', 'US')

      markConfirmationSynced('to-sync')
      const pending = getPendingConfirmations()

      expect(pending).toHaveLength(0)
    })

    it('should only remove specified confirmation', () => {
      queueConfirmationForSync('keep-1', 'US')
      queueConfirmationForSync('remove', 'UK')
      queueConfirmationForSync('keep-2', 'CA')

      markConfirmationSynced('remove')
      const pending = getPendingConfirmations()

      expect(pending).toHaveLength(2)
      expect(pending.find((p) => p.signalId === 'remove')).toBeUndefined()
    })

    it('should handle non-existent signal ID gracefully', () => {
      queueConfirmationForSync('existing', 'US')

      // Should not throw
      markConfirmationSynced('non-existent')
      const pending = getPendingConfirmations()

      expect(pending).toHaveLength(1)
    })
  })

  describe('syncOfflineConfirmations', () => {
    it('should call sync function for each pending confirmation', async () => {
      const syncFn = vi.fn().mockResolvedValue(true)
      queueConfirmationForSync('sync-1', 'US')
      queueConfirmationForSync('sync-2', 'UK')

      const result = await syncOfflineConfirmations(syncFn)

      expect(syncFn).toHaveBeenCalledTimes(2)
      expect(result.synced).toBe(2)
      expect(result.failed).toBe(0)
    })

    it('should handle sync failures gracefully', async () => {
      const syncFn = vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      queueConfirmationForSync('success-1', 'US')
      queueConfirmationForSync('fail', 'UK')
      queueConfirmationForSync('success-2', 'CA')

      const result = await syncOfflineConfirmations(syncFn)

      expect(result.synced).toBe(2)
      expect(result.failed).toBe(1)
    })

    it('should remove only successfully synced confirmations', async () => {
      const syncFn = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)

      queueConfirmationForSync('will-sync', 'US')
      queueConfirmationForSync('will-fail', 'UK')

      await syncOfflineConfirmations(syncFn)
      const pending = getPendingConfirmations()

      expect(pending).toHaveLength(1)
      expect(pending[0].signalId).toBe('will-fail')
    })

    it('should return zero counts when queue is empty', async () => {
      const syncFn = vi.fn()

      const result = await syncOfflineConfirmations(syncFn)

      expect(syncFn).not.toHaveBeenCalled()
      expect(result.synced).toBe(0)
      expect(result.failed).toBe(0)
    })
  })

  describe('clearSyncQueue', () => {
    it('should clear all queued confirmations', () => {
      queueConfirmationForSync('clear-1', 'US')
      queueConfirmationForSync('clear-2', 'UK')

      clearSyncQueue()

      expect(getQueuedConfirmationsCount()).toBe(0)
      expect(getPendingConfirmations()).toEqual([])
    })
  })
})
