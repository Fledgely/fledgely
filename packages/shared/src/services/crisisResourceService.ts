/**
 * Crisis Resource Service - Story 7.5.3 Task 2
 *
 * Service for managing and retrieving crisis resources.
 * AC2: Crisis resources with direct links
 * AC4: Crisis chat option
 *
 * CRITICAL SAFETY: These resources help children in crisis.
 * All resources must be verified and up-to-date.
 */

import {
  type CrisisResource,
  createDefaultUSResources,
  createDefaultUKResources,
  createDefaultCAResources,
  createDefaultAUResources,
  getResourcesByJurisdiction as filterByJurisdiction,
  sortResourcesByPriority,
  filterChatResources as filterChat,
} from '../contracts/signalConfirmation'

// ============================================
// Constants
// ============================================

/** Cache expiry time in milliseconds (1 hour) */
export const CACHE_EXPIRY_MS = 60 * 60 * 1000

/** Emergency numbers by country code */
const EMERGENCY_NUMBERS: Record<string, string> = {
  US: '911',
  CA: '911',
  UK: '999',
  AU: '000',
  NZ: '111',
  // EU countries use 112
  DE: '112',
  FR: '112',
  ES: '112',
  IT: '112',
  NL: '112',
  BE: '112',
  AT: '112',
  CH: '112',
  SE: '112',
  NO: '112',
  DK: '112',
  FI: '112',
  IE: '112',
  PT: '112',
  PL: '112',
  CZ: '112',
  HU: '112',
  RO: '112',
  GR: '112',
}

/** Default international emergency number */
const DEFAULT_EMERGENCY_NUMBER = '112'

// ============================================
// Types
// ============================================

export interface ResourceCache {
  resources: Map<string, CrisisResource>
  expiresAt: number
}

// ============================================
// In-Memory Cache
// ============================================

const resourceCache: ResourceCache = {
  resources: new Map(),
  expiresAt: 0,
}

// ============================================
// Cache Management Functions
// ============================================

/**
 * Get all cached resources.
 */
export function getCachedResources(): CrisisResource[] {
  return Array.from(resourceCache.resources.values())
}

/**
 * Set cached resources (replaces all).
 */
export function setCachedResources(resources: CrisisResource[]): void {
  resourceCache.resources.clear()
  for (const resource of resources) {
    resourceCache.resources.set(resource.id, resource)
  }
  resourceCache.expiresAt = Date.now() + CACHE_EXPIRY_MS
}

/**
 * Check if cache is valid (not empty and not expired).
 */
export function isCacheValid(): boolean {
  if (resourceCache.resources.size === 0) {
    return false
  }
  return Date.now() < resourceCache.expiresAt
}

/**
 * Get cache expiry time.
 */
export function getCacheExpiryTime(): number {
  return resourceCache.expiresAt
}

/**
 * Refresh resource cache with default resources.
 */
export function refreshResourceCache(): void {
  const allResources = [
    ...createDefaultUSResources(),
    ...createDefaultUKResources(),
    ...createDefaultCAResources(),
    ...createDefaultAUResources(),
  ]
  setCachedResources(allResources)
}

/**
 * Clear resource cache.
 */
export function clearResourceCache(): void {
  resourceCache.resources.clear()
  resourceCache.expiresAt = 0
}

/**
 * Add a resource to cache.
 */
export function addResourceToCache(resource: CrisisResource): void {
  resourceCache.resources.set(resource.id, resource)
  // Don't reset expiry when adding individual resources
}

// ============================================
// Resource Retrieval Functions
// ============================================

/**
 * Get all cached crisis resources.
 */
export function getAllCrisisResources(): CrisisResource[] {
  return getCachedResources()
}

/**
 * Get resource by ID.
 */
export function getResourceById(id: string): CrisisResource | undefined {
  return resourceCache.resources.get(id)
}

/**
 * Get resources for a specific jurisdiction.
 *
 * Includes:
 * - Resources matching the exact jurisdiction
 * - Resources matching the country code (for state-level jurisdictions)
 * - Universal resources (empty jurisdictions array)
 *
 * @param jurisdiction - Jurisdiction code (e.g., 'US', 'US-CA', 'UK')
 * @returns Resources for jurisdiction, sorted by priority
 */
export function getResourcesForJurisdiction(jurisdiction: string): CrisisResource[] {
  // Ensure cache is populated
  if (!isCacheValid()) {
    refreshResourceCache()
  }

  const allResources = getCachedResources()
  const filtered = filterByJurisdiction(allResources, jurisdiction)
  return sortResourcesByPriority(filtered)
}

/**
 * Get universal resources (available in all jurisdictions).
 */
export function getUniversalResources(): CrisisResource[] {
  const allResources = getCachedResources()
  return allResources.filter((r) => r.jurisdictions.length === 0)
}

/**
 * Get resources that have chat available.
 *
 * @param jurisdiction - Optional jurisdiction filter
 * @returns Chat-enabled resources
 */
export function getChatResources(jurisdiction?: string): CrisisResource[] {
  let resources = getCachedResources()

  if (jurisdiction) {
    resources = filterByJurisdiction(resources, jurisdiction)
  }

  return filterChat(resources)
}

/**
 * Check if chat is available for a jurisdiction.
 *
 * @param jurisdiction - Jurisdiction code
 * @returns True if chat resources exist
 */
export function isChatAvailable(jurisdiction: string): boolean {
  const chatResources = getChatResources(jurisdiction)
  return chatResources.length > 0
}

/**
 * Get emergency number for jurisdiction.
 *
 * @param jurisdiction - Jurisdiction code (e.g., 'US', 'US-CA', 'UK')
 * @returns Emergency number (e.g., '911', '999', '112')
 */
export function getEmergencyNumber(jurisdiction: string): string {
  // Extract country code from state-level jurisdictions
  const countryCode = jurisdiction.split('-')[0]

  // Check for known emergency number
  if (EMERGENCY_NUMBERS[countryCode]) {
    return EMERGENCY_NUMBERS[countryCode]
  }

  // Default to international emergency number
  return DEFAULT_EMERGENCY_NUMBER
}

// ============================================
// Resource Prioritization Functions
// ============================================

/**
 * Get prioritized resources for jurisdiction.
 *
 * @param jurisdiction - Jurisdiction code
 * @returns Resources sorted by priority (lowest priority number first)
 */
export function getPrioritizedResources(jurisdiction: string): CrisisResource[] {
  return getResourcesForJurisdiction(jurisdiction)
}

/**
 * Get top N resources for jurisdiction.
 *
 * @param jurisdiction - Jurisdiction code
 * @param n - Maximum number of resources to return
 * @returns Top N resources by priority
 */
export function getTopNResources(jurisdiction: string, n: number): CrisisResource[] {
  const prioritized = getPrioritizedResources(jurisdiction)
  return prioritized.slice(0, n)
}
