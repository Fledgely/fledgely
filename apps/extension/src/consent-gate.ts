/**
 * Consent Gate Module
 *
 * Story 6.5: Device Consent Gate
 *
 * This module provides consent verification functionality for the extension.
 * It checks whether there's an active consent agreement before allowing
 * monitoring to start.
 *
 * Requirements:
 * - AC1: Agreement check before monitoring
 * - AC2: No agreement = no monitoring
 * - AC6: Automatic monitoring start when consent granted
 * - AC7: Non-negotiable consent requirement
 *
 * Key Principle: A device CANNOT monitor without child consent via
 * an active, signed family agreement.
 */

/**
 * Consent status returned from the server
 */
export interface ConsentStatus {
  /** Whether the child has given consent via an active agreement */
  hasConsent: boolean
  /** ID of the active agreement (null if no consent) */
  agreementId: string | null
  /** Version of the active agreement */
  agreementVersion: string | null
  /** Human-readable status message */
  message: string
  /** Status enum for state management */
  consentStatus: 'pending' | 'granted' | 'withdrawn'
}

/**
 * Error result from consent check
 */
export interface ConsentCheckError {
  success: false
  error: string
  errorCode: string
}

/**
 * Success result from consent check
 */
export interface ConsentCheckSuccess {
  success: true
  status: ConsentStatus
}

export type ConsentCheckResult = ConsentCheckSuccess | ConsentCheckError

/**
 * Firebase Functions base URL
 * Uses emulator in development, production URL otherwise
 */
const FUNCTIONS_BASE_URL =
  typeof process !== 'undefined' && process.env?.FUNCTIONS_BASE_URL
    ? process.env.FUNCTIONS_BASE_URL
    : typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'
      ? 'http://127.0.0.1:5001/fledgely-dev/us-central1'
      : 'https://us-central1-fledgely-cns-me.cloudfunctions.net'

/**
 * Check if there's an active consent agreement for monitoring.
 *
 * Story 6.5: Device Consent Gate
 * - AC1: Check happens on extension startup and periodically
 * - AC2: No agreement = no monitoring (returns hasConsent: false)
 * - AC7: Non-negotiable - no bypass mechanism
 *
 * @param childId - The child ID assigned to this device
 * @param familyId - The family ID the device belongs to
 * @param deviceId - The device ID (for server validation)
 * @returns ConsentCheckResult with consent status or error
 */
export async function checkConsentStatus(
  childId: string,
  familyId: string,
  deviceId: string
): Promise<ConsentCheckResult> {
  // Validate inputs
  if (!childId || !familyId || !deviceId) {
    return {
      success: false,
      error: 'Missing required parameters',
      errorCode: 'INVALID_PARAMS',
    }
  }

  try {
    const url = new URL(`${FUNCTIONS_BASE_URL}/checkConsentStatus`)
    url.searchParams.set('familyId', familyId)
    url.searchParams.set('childId', childId)
    url.searchParams.set('deviceId', deviceId)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // Handle HTTP errors
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`
      const errorCode = errorData.error?.code || 'HTTP_ERROR'

      console.error('[Fledgely] Consent check HTTP error:', response.status, errorMessage)

      return {
        success: false,
        error: errorMessage,
        errorCode,
      }
    }

    const result = await response.json()
    const status = result.result as ConsentStatus

    console.log('[Fledgely] Consent check result:', {
      hasConsent: status.hasConsent,
      consentStatus: status.consentStatus,
    })

    return {
      success: true,
      status,
    }
  } catch (error) {
    // Network error or other exception
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Fledgely] Consent check network error:', message)

    return {
      success: false,
      error: message,
      errorCode: 'NETWORK_ERROR',
    }
  }
}

/**
 * Cache for consent status to reduce API calls.
 *
 * Consent status is cached in chrome.storage.local to:
 * 1. Reduce network calls during normal operation
 * 2. Allow offline-first operation (assume last known state)
 * 3. Enable quick startup without waiting for network
 *
 * Cache is invalidated when:
 * - Cache age exceeds CONSENT_CACHE_TTL_MS
 * - Explicit refresh is requested
 * - Server returns different status
 */
const CONSENT_CACHE_KEY = 'consentStatusCache'
const CONSENT_CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

interface ConsentCache {
  status: ConsentStatus
  cachedAt: number
  childId: string
  familyId: string
}

/**
 * Get cached consent status if available and not expired.
 *
 * @param childId - The child ID to check cache for
 * @param familyId - The family ID to check cache for
 * @returns Cached status or null if not available/expired
 */
export async function getCachedConsentStatus(
  childId: string,
  familyId: string
): Promise<ConsentStatus | null> {
  try {
    const result = await chrome.storage.local.get(CONSENT_CACHE_KEY)
    const cache = result[CONSENT_CACHE_KEY] as ConsentCache | undefined

    if (!cache) {
      return null
    }

    // Verify cache is for same child/family
    if (cache.childId !== childId || cache.familyId !== familyId) {
      return null
    }

    // Check if cache is expired
    const age = Date.now() - cache.cachedAt
    if (age > CONSENT_CACHE_TTL_MS) {
      console.log('[Fledgely] Consent cache expired, will refresh')
      return null
    }

    console.log(`[Fledgely] Using cached consent status (age: ${Math.round(age / 1000)}s)`)
    return cache.status
  } catch {
    // Storage error - treat as cache miss
    return null
  }
}

/**
 * Save consent status to cache.
 *
 * @param status - The consent status to cache
 * @param childId - The child ID this status is for
 * @param familyId - The family ID this status is for
 */
export async function cacheConsentStatus(
  status: ConsentStatus,
  childId: string,
  familyId: string
): Promise<void> {
  try {
    const cache: ConsentCache = {
      status,
      cachedAt: Date.now(),
      childId,
      familyId,
    }
    await chrome.storage.local.set({ [CONSENT_CACHE_KEY]: cache })
    console.log('[Fledgely] Consent status cached')
  } catch {
    // Storage error - non-critical
    console.warn('[Fledgely] Failed to cache consent status')
  }
}

/**
 * Clear the consent status cache.
 * Called when device is unenrolled or child assignment changes.
 */
export async function clearConsentCache(): Promise<void> {
  try {
    await chrome.storage.local.remove(CONSENT_CACHE_KEY)
    console.log('[Fledgely] Consent cache cleared')
  } catch {
    // Storage error - non-critical
  }
}

/**
 * Check consent status with caching.
 *
 * This is the primary function for checking consent. It:
 * 1. Checks cache first for quick response
 * 2. Falls back to server if cache is stale/missing
 * 3. Updates cache with fresh server response
 *
 * Story 6.5: Device Consent Gate
 * - AC1: Check happens on startup and periodically (via cache TTL)
 * - AC6: Returns updated status when consent is granted
 *
 * @param childId - The child ID assigned to this device
 * @param familyId - The family ID the device belongs to
 * @param deviceId - The device ID for validation
 * @param forceRefresh - Skip cache and fetch from server
 * @returns ConsentCheckResult with consent status
 */
export async function checkConsentStatusWithCache(
  childId: string,
  familyId: string,
  deviceId: string,
  forceRefresh = false
): Promise<ConsentCheckResult> {
  // Try cache first unless force refresh
  if (!forceRefresh) {
    const cached = await getCachedConsentStatus(childId, familyId)
    if (cached) {
      return { success: true, status: cached }
    }
  }

  // Fetch from server
  const result = await checkConsentStatus(childId, familyId, deviceId)

  // Cache successful results
  if (result.success) {
    await cacheConsentStatus(result.status, childId, familyId)
  }

  return result
}

/**
 * Determine if monitoring should be active based on consent status.
 *
 * Story 6.5: Device Consent Gate
 * - AC2: No agreement = no monitoring
 * - AC5: Device remains functional, only monitoring disabled
 *
 * @param status - The consent status to evaluate
 * @returns true if monitoring should be active
 */
export function shouldEnableMonitoring(status: ConsentStatus): boolean {
  return status.hasConsent && status.consentStatus === 'granted'
}

/**
 * Get a user-friendly message for consent status.
 *
 * Story 6.5: Device Consent Gate - AC3
 * Provides friendly explanations for the popup UI.
 *
 * @param status - The consent status
 * @returns User-friendly message for display
 */
export function getConsentMessage(status: ConsentStatus): string {
  switch (status.consentStatus) {
    case 'granted':
      return `Monitoring active under agreement ${status.agreementVersion || 'v1.0'}`
    case 'pending':
      return 'Waiting for family agreement to be signed'
    case 'withdrawn':
      return 'Agreement has been revoked - monitoring paused'
    default:
      return status.message
  }
}
