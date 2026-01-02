/**
 * Offline Confirmation Service - Story 7.5.3 Task 7
 *
 * Service for offline confirmation handling and resource caching.
 * AC1: Confirmation display must work offline
 *
 * CRITICAL SAFETY: Offline support ensures children can still
 * access help resources even without network connectivity.
 */

import {
  type CrisisResource,
  type ConfirmationContent,
  sortResourcesByPriority,
  getResourcesByJurisdiction,
} from '../contracts/signalConfirmation'
import { getEmergencyNumber } from './crisisResourceService'

// ============================================
// Types
// ============================================

export interface OfflineCacheStatus {
  resourceCount: number
  isValid: boolean
  lastUpdated: number
}

export interface PendingConfirmation {
  signalId: string
  jurisdiction: string
  queuedAt: number
}

export interface SyncResult {
  synced: number
  failed: number
}

export type SyncFunction = (confirmation: PendingConfirmation) => Promise<boolean>

// ============================================
// In-Memory Cache State
// ============================================

interface OfflineCache {
  resources: CrisisResource[]
  lastUpdated: number
}

let offlineCache: OfflineCache = {
  resources: [],
  lastUpdated: 0,
}

const syncQueue: Map<string, PendingConfirmation> = new Map()

// ============================================
// Offline Confirmation Functions
// ============================================

/**
 * Get offline-specific confirmation content.
 *
 * Provides reassuring message that the request is saved
 * and will be sent when connectivity is restored.
 *
 * @param jurisdiction - Optional jurisdiction for emergency number
 * @returns Offline confirmation content
 */
export function getOfflineConfirmation(jurisdiction: string = 'US'): ConfirmationContent {
  const emergencyNumber = getEmergencyNumber(jurisdiction)

  return {
    headerText: 'Message saved',
    bodyText:
      'Your message is saved. It will be sent when you are back online. You did the right thing.',
    emergencyText: `If you are in danger right now, call ${emergencyNumber}`,
    chatPromptText: 'Chat with someone now',
    dismissButtonText: 'Got it',
  }
}

/**
 * Check if resources should be shown offline.
 *
 * Returns true if there are cached resources available.
 *
 * @returns True if cached resources exist
 */
export function shouldShowResourcesOffline(): boolean {
  return offlineCache.resources.length > 0
}

// ============================================
// Resource Caching Functions
// ============================================

/**
 * Cache resources for offline access.
 *
 * Replaces any existing cached resources.
 *
 * @param resources - Resources to cache
 */
export function cacheResourcesForOffline(resources: CrisisResource[]): void {
  offlineCache = {
    resources: [...resources],
    lastUpdated: Date.now(),
  }
}

/**
 * Get cached resources for offline display.
 *
 * @param jurisdiction - Optional jurisdiction filter
 * @returns Cached resources sorted by priority
 */
export function getCachedResourcesOffline(jurisdiction?: string): CrisisResource[] {
  let resources = offlineCache.resources

  if (jurisdiction) {
    resources = getResourcesByJurisdiction(resources, jurisdiction)
  }

  return sortResourcesByPriority(resources)
}

/**
 * Clear the offline resource cache.
 */
export function clearOfflineCache(): void {
  offlineCache = {
    resources: [],
    lastUpdated: 0,
  }
}

/**
 * Check if offline cache is valid.
 *
 * @returns True if cache has resources
 */
export function isOfflineCacheValid(): boolean {
  return offlineCache.resources.length > 0
}

/**
 * Get offline cache status.
 *
 * @returns Cache status including resource count and last update time
 */
export function getOfflineCacheStatus(): OfflineCacheStatus {
  return {
    resourceCount: offlineCache.resources.length,
    isValid: offlineCache.resources.length > 0,
    lastUpdated: offlineCache.lastUpdated,
  }
}

// ============================================
// Sync Queue Functions
// ============================================

/**
 * Queue a confirmation for sync when online.
 *
 * @param signalId - Signal ID to queue
 * @param jurisdiction - Jurisdiction of the signal
 */
export function queueConfirmationForSync(signalId: string, jurisdiction: string): void {
  if (syncQueue.has(signalId)) {
    return // Don't duplicate
  }

  syncQueue.set(signalId, {
    signalId,
    jurisdiction,
    queuedAt: Date.now(),
  })
}

/**
 * Get all pending confirmations awaiting sync.
 *
 * @returns Array of pending confirmations
 */
export function getPendingConfirmations(): PendingConfirmation[] {
  return Array.from(syncQueue.values())
}

/**
 * Mark a confirmation as successfully synced.
 *
 * @param signalId - Signal ID to remove from queue
 */
export function markConfirmationSynced(signalId: string): void {
  syncQueue.delete(signalId)
}

/**
 * Get count of queued confirmations.
 *
 * @returns Number of confirmations waiting to sync
 */
export function getQueuedConfirmationsCount(): number {
  return syncQueue.size
}

/**
 * Clear the sync queue.
 */
export function clearSyncQueue(): void {
  syncQueue.clear()
}

/**
 * Sync all pending confirmations.
 *
 * Calls the provided sync function for each pending confirmation.
 * Successfully synced confirmations are removed from the queue.
 *
 * @param syncFn - Function to call for each confirmation
 * @returns Sync result with counts
 */
export async function syncOfflineConfirmations(syncFn: SyncFunction): Promise<SyncResult> {
  const pending = getPendingConfirmations()
  let synced = 0
  let failed = 0

  for (const confirmation of pending) {
    try {
      const success = await syncFn(confirmation)
      if (success) {
        markConfirmationSynced(confirmation.signalId)
        synced++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { synced, failed }
}
