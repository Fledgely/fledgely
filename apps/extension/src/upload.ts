/**
 * Fledgely Chrome Extension - Screenshot Upload Module
 *
 * Handles uploading screenshots from the local queue to the fledgely API.
 *
 * Story 10.4: Screenshot Upload to API
 * Story 18.1: Firebase Storage Upload Endpoint - Real API integration
 */

import { ScreenshotCapture } from './capture'

/**
 * API endpoint for screenshot uploads
 * Uses Firebase Cloud Functions HTTP endpoint
 */
const API_ENDPOINT = 'https://us-central1-fledgely.cloudfunctions.net/uploadScreenshot'

/**
 * Upload payload sent to the API
 */
export interface UploadPayload {
  /** Base64 JPEG image data */
  dataUrl: string
  /** Capture timestamp (ms since epoch) */
  timestamp: number
  /** URL of the captured tab */
  url: string
  /** Title of the captured tab */
  title: string
  /** Extension installation/device ID */
  deviceId: string
  /** Family ID for device authentication */
  familyId: string
  /** Connected child ID */
  childId: string
  /** Time when screenshot was added to queue */
  queuedAt: number
}

/**
 * Upload result
 */
export type UploadResult =
  | { success: true }
  | { success: false; error: string; shouldRetry: boolean }

/**
 * Rate limiting configuration
 */
const MAX_UPLOADS_PER_MINUTE = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute

/**
 * Exponential backoff configuration
 */
const INITIAL_RETRY_DELAY_MS = 1000 // 1 second
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000 // 5 minutes
const BACKOFF_FACTOR = 2
const MAX_RETRIES = 5

/**
 * Track upload timestamps for rate limiting
 */
let uploadTimestamps: number[] = []

/**
 * Check if we're within rate limits
 */
function isWithinRateLimit(): boolean {
  const now = Date.now()
  // Remove timestamps older than the rate limit window
  uploadTimestamps = uploadTimestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)
  return uploadTimestamps.length < MAX_UPLOADS_PER_MINUTE
}

/**
 * Record an upload timestamp for rate limiting
 */
function recordUpload(): void {
  uploadTimestamps.push(Date.now())
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(retryCount: number): number {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_FACTOR, retryCount)
  return Math.min(delay, MAX_RETRY_DELAY_MS)
}

/**
 * Check if we should retry based on retry count
 */
export function shouldRetry(retryCount: number): boolean {
  return retryCount < MAX_RETRIES
}

/**
 * Upload a screenshot to the fledgely API
 * Story 10.4: Screenshot Upload to API
 * Story 18.1: Real API integration with Firebase Storage
 */
export async function uploadScreenshot(
  capture: ScreenshotCapture,
  childId: string,
  queuedAt: number
): Promise<UploadResult> {
  // Check rate limit
  if (!isWithinRateLimit()) {
    return {
      success: false,
      error: 'Rate limit exceeded',
      shouldRetry: true, // Retry after rate limit window
    }
  }

  try {
    // Get device credentials from storage
    const { state } = await chrome.storage.local.get('state')
    const deviceId = state?.deviceId
    const familyId = state?.familyId

    // Verify device is enrolled
    if (!deviceId || !familyId) {
      console.warn('[Fledgely] Device not enrolled, skipping upload')
      return {
        success: false,
        error: 'Device not enrolled',
        shouldRetry: false,
      }
    }

    const payload: UploadPayload = {
      dataUrl: capture.dataUrl,
      timestamp: capture.timestamp,
      url: capture.url,
      title: capture.title,
      deviceId,
      familyId,
      childId,
      queuedAt,
    }

    console.log('[Fledgely] Uploading screenshot:', {
      timestamp: payload.timestamp,
      url: payload.url.substring(0, 50) + '...',
      deviceId: payload.deviceId,
      childId: payload.childId,
      imageSize: Math.round(payload.dataUrl.length / 1024) + 'KB',
    })

    // Story 18.1: Call real API endpoint
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || `HTTP ${response.status}`
      console.error('[Fledgely] Upload failed:', errorMessage)

      // Retry on 5xx server errors, not on 4xx client errors
      const shouldRetry = response.status >= 500

      return {
        success: false,
        error: errorMessage,
        shouldRetry,
      }
    }

    const result = await response.json()

    if (result.success) {
      recordUpload()
      console.log('[Fledgely] Screenshot uploaded successfully:', result.storagePath)
      return { success: true }
    } else {
      return {
        success: false,
        error: result.error || 'Upload failed',
        shouldRetry: false,
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
    console.error('[Fledgely] Upload failed:', errorMessage)

    // Determine if error is retryable (network errors are retryable)
    const isNetworkError =
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('timeout')

    return {
      success: false,
      error: errorMessage,
      shouldRetry: isNetworkError,
    }
  }
}

/**
 * Get remaining uploads allowed in current rate limit window
 */
export function getRemainingUploads(): number {
  const now = Date.now()
  uploadTimestamps = uploadTimestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)
  return Math.max(0, MAX_UPLOADS_PER_MINUTE - uploadTimestamps.length)
}

/**
 * Export constants for testing
 */
export { MAX_UPLOADS_PER_MINUTE, MAX_RETRIES }
