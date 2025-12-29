/**
 * Fledgely Chrome Extension - Screenshot Upload Module
 *
 * Handles uploading screenshots from the local queue to the fledgely API.
 *
 * Story 10.4: Screenshot Upload to API
 */

import { ScreenshotCapture } from './capture'

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
 * Get the device ID (extension installation ID)
 */
async function getDeviceId(): Promise<string> {
  // Use chrome.storage.local to store a persistent device ID
  const { deviceId } = await chrome.storage.local.get('deviceId')
  if (deviceId) return deviceId

  // Generate a new device ID on first run
  const newDeviceId = `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  await chrome.storage.local.set({ deviceId: newDeviceId })
  return newDeviceId
}

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
 *
 * NOTE: This is a placeholder implementation. The actual API endpoint
 * will be implemented in Epic 12 (Chromebook Device Enrollment).
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
    const deviceId = await getDeviceId()

    const payload: UploadPayload = {
      dataUrl: capture.dataUrl,
      timestamp: capture.timestamp,
      url: capture.url,
      title: capture.title,
      deviceId,
      childId,
      queuedAt,
    }

    // TODO: Replace with actual API call in Epic 12
    // For now, simulate upload with placeholder behavior
    console.log('[Fledgely] Upload payload prepared:', {
      timestamp: payload.timestamp,
      url: payload.url.substring(0, 50) + '...',
      deviceId: payload.deviceId,
      childId: payload.childId,
      imageSize: Math.round(payload.dataUrl.length / 1024) + 'KB',
    })

    // Simulate network delay (remove in production)
    // In production, this will be replaced with actual fetch call:
    // const response = await fetch(API_ENDPOINT, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    //   body: JSON.stringify(payload),
    // })

    // For now, mark as successful (placeholder)
    recordUpload()
    console.log('[Fledgely] Screenshot uploaded successfully (placeholder)')

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
    console.error('[Fledgely] Upload failed:', errorMessage)

    // Determine if error is retryable
    const isNetworkError =
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
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
