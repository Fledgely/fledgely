/**
 * Enrollment Service - Story 12.3, 12.4
 *
 * Handles enrollment request submission, status monitoring, and device registration.
 * Works with Cloud Functions for the approval and registration flow.
 *
 * Requirements:
 * - Story 12.3 AC1: Submit enrollment request to server
 * - Story 12.3 AC4: Handle approval timeout
 * - Story 12.3 AC5: Handle rejection
 * - Story 12.3 AC6: Handle approval success
 * - Story 12.4 AC1-AC3: Register device after approval
 */

/**
 * Device info sent with enrollment request
 */
export interface DeviceInfo {
  type: 'chromebook'
  platform: string
  userAgent: string
}

/**
 * Enrollment request status
 */
export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired'

/**
 * Response from submitting enrollment request
 */
export interface SubmitEnrollmentResponse {
  success: boolean
  requestId?: string
  message: string
  error?: string
}

/**
 * Response from device registration
 * Story 12.4
 */
export interface RegisterDeviceResponse {
  success: boolean
  deviceId?: string
  message: string
  error?: string
}

/**
 * Enrollment request data from Firestore
 */
export interface EnrollmentRequestData {
  id: string
  familyId: string
  status: EnrollmentRequestStatus
  createdAt: number
  expiresAt: number
  approvedBy?: string
  approvedAt?: number
  rejectedBy?: string
  rejectedAt?: number
}

/**
 * Firebase Functions base URL
 * Uses emulator in development, production URL otherwise
 * Can be overridden via FUNCTIONS_BASE_URL for testing
 */
const FUNCTIONS_BASE_URL =
  typeof process !== 'undefined' && process.env?.FUNCTIONS_BASE_URL
    ? process.env.FUNCTIONS_BASE_URL
    : typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'
      ? 'http://127.0.0.1:5001/fledgely-dev/us-central1'
      : 'https://us-central1-fledgely.cloudfunctions.net'

/**
 * Gather device information for enrollment request
 */
export function gatherDeviceInfo(): DeviceInfo {
  const platform = navigator.platform || 'Unknown'
  const userAgent = navigator.userAgent

  return {
    type: 'chromebook',
    platform,
    userAgent,
  }
}

/**
 * Submit enrollment request to Cloud Function
 * AC1: Enrollment request submission
 */
export async function submitEnrollmentRequest(
  familyId: string,
  token: string
): Promise<SubmitEnrollmentResponse> {
  const deviceInfo = gatherDeviceInfo()

  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/submitEnrollmentRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          familyId,
          token,
          deviceInfo,
        },
      }),
    })

    const result = await response.json()

    if (result.error) {
      return {
        success: false,
        message: result.error.message || 'Failed to submit enrollment request',
        error: result.error.code || 'unknown',
      }
    }

    return {
      success: true,
      requestId: result.result.requestId,
      message: result.result.message || 'Enrollment request submitted',
    }
  } catch (error) {
    console.error('[Fledgely] Enrollment request failed:', error)
    return {
      success: false,
      message: 'Network error - please check your connection',
      error: 'network_error',
    }
  }
}

/**
 * Polling interval for checking request status (5 seconds)
 */
const POLL_INTERVAL_MS = 5000

/**
 * Maximum polling duration (10 minutes + buffer)
 */
const MAX_POLL_DURATION_MS = 11 * 60 * 1000

/**
 * Poll for enrollment request status changes
 * AC4, AC5, AC6: Handle different status outcomes
 *
 * Uses polling as a fallback for Firestore real-time listeners
 * which may not be available in extension popup context.
 *
 * @param familyId - Family ID
 * @param requestId - Enrollment request ID
 * @param onStatusChange - Callback when status changes
 * @returns Cleanup function to stop polling
 */
export function pollEnrollmentStatus(
  familyId: string,
  requestId: string,
  onStatusChange: (status: EnrollmentRequestStatus, data?: EnrollmentRequestData) => void
): () => void {
  let isPolling = true
  const startTime = Date.now()

  const checkStatus = async (): Promise<void> => {
    if (!isPolling) return

    try {
      // Check if we've exceeded maximum poll duration
      if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
        onStatusChange('expired')
        isPolling = false
        return
      }

      // Fetch request status from API
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/getEnrollmentRequestStatus?` +
          new URLSearchParams({ familyId, requestId }),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        // Handle 404 - request was deleted or doesn't exist
        if (response.status === 404) {
          console.warn('[Fledgely] Enrollment request not found - may have been deleted')
          onStatusChange('expired')
          isPolling = false
          return
        }
        // Other errors - continue polling
        console.warn('[Fledgely] Status check failed, will retry')
        scheduleNextPoll()
        return
      }

      const result = await response.json()
      const requestData = result.result as EnrollmentRequestData

      if (requestData.status !== 'pending') {
        // Status has changed - notify and stop polling
        onStatusChange(requestData.status, requestData)
        isPolling = false
        return
      }

      // Still pending - continue polling
      scheduleNextPoll()
    } catch (error) {
      console.error('[Fledgely] Status poll error:', error)
      // Continue polling on network errors
      scheduleNextPoll()
    }
  }

  const scheduleNextPoll = (): void => {
    if (isPolling) {
      setTimeout(checkStatus, POLL_INTERVAL_MS)
    }
  }

  // Start polling
  checkStatus()

  // Return cleanup function
  return () => {
    isPolling = false
  }
}

/**
 * Calculate time remaining until request expires
 */
export function getTimeUntilExpiry(expiresAt: number): number {
  return Math.max(0, expiresAt - Date.now())
}

/**
 * Format time remaining as MM:SS
 */
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return '0:00'

  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Register device after enrollment approval
 * Story 12.4: Device Registration in Firestore
 * AC3: Returns deviceId for extension to store
 */
export async function registerDevice(
  familyId: string,
  requestId: string
): Promise<RegisterDeviceResponse> {
  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/registerDevice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        familyId,
        requestId,
      }),
    })

    const result = await response.json()

    if (result.error) {
      return {
        success: false,
        message: result.error.message || 'Failed to register device',
        error: result.error.code || 'unknown',
      }
    }

    return {
      success: true,
      deviceId: result.result.deviceId,
      message: result.result.message || 'Device registered successfully',
    }
  } catch (error) {
    console.error('[Fledgely] Device registration failed:', error)
    return {
      success: false,
      message: 'Network error - please check your connection',
      error: 'network_error',
    }
  }
}
