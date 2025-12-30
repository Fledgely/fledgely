/**
 * Consent Withdrawal Module - Story 6.6
 *
 * Handles consent withdrawal flow for children:
 * - Initiate withdrawal request (24-hour cooling period)
 * - Check pending withdrawal status
 * - Cancel withdrawal during cooling period
 *
 * Key principles:
 * - Child-initiated only (verified via device assignment)
 * - 24-hour mandatory cooling period
 * - Non-threatening, age-appropriate messaging
 * - Parents notified but cannot cancel on child's behalf
 */

// Cloud Functions base URL
const FUNCTIONS_BASE_URL = 'https://us-central1-fledgely-cns-me.cloudfunctions.net'

/**
 * Withdrawal request status
 */
export type WithdrawalStatus = 'pending' | 'cancelled' | 'executed'

/**
 * Withdrawal request data returned from API
 */
export interface WithdrawalRequest {
  requestId: string
  childId: string
  familyId: string
  deviceId: string
  status: WithdrawalStatus
  requestedAt: number
  expiresAt: number
  cancelledAt?: number
  executedAt?: number
}

/**
 * Result of withdrawal operations
 */
export interface WithdrawalResult {
  success: boolean
  error?: string
  request?: WithdrawalRequest
}

/**
 * Initiate a consent withdrawal request
 * Story 6.6 AC3: Requires confirmation (handled in popup)
 * Story 6.6 AC4: Triggers parent notification (handled by Cloud Function)
 * Story 6.6 AC5: Starts 24-hour cooling period
 *
 * @param childId - Child's ID
 * @param familyId - Family's ID
 * @param deviceId - Device ID initiating withdrawal
 * @returns WithdrawalResult with request details
 */
export async function initiateWithdrawal(
  childId: string,
  familyId: string,
  deviceId: string
): Promise<WithdrawalResult> {
  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/initiateConsentWithdrawal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        childId,
        familyId,
        deviceId,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to initiate withdrawal',
      }
    }

    return {
      success: true,
      request: data.result as WithdrawalRequest,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Check for pending withdrawal request
 * Story 6.6 AC5: Shows countdown during cooling period
 *
 * @param childId - Child's ID
 * @param familyId - Family's ID
 * @returns WithdrawalResult with pending request if exists
 */
export async function checkPendingWithdrawal(
  childId: string,
  familyId: string
): Promise<WithdrawalResult> {
  try {
    const params = new URLSearchParams({
      childId,
      familyId,
    })

    const response = await fetch(`${FUNCTIONS_BASE_URL}/checkWithdrawalStatus?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      // 404 means no pending withdrawal - not an error
      if (response.status === 404) {
        return {
          success: true,
          request: undefined,
        }
      }
      return {
        success: false,
        error: data.error?.message || 'Failed to check withdrawal status',
      }
    }

    return {
      success: true,
      request: data.result as WithdrawalRequest,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Cancel a pending withdrawal request
 * Story 6.6 AC6: Child can cancel during cooling period
 *
 * @param requestId - Withdrawal request ID
 * @param childId - Child's ID (for verification)
 * @returns WithdrawalResult
 */
export async function cancelWithdrawal(
  requestId: string,
  childId: string
): Promise<WithdrawalResult> {
  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/cancelConsentWithdrawal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        childId,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to cancel withdrawal',
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Format countdown time for display
 * Returns HH:MM:SS format
 *
 * @param expiresAt - Timestamp when withdrawal will execute
 * @returns Formatted countdown string
 */
export function formatCountdown(expiresAt: number): string {
  const now = Date.now()
  const remaining = Math.max(0, expiresAt - now)

  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Check if withdrawal countdown has expired
 *
 * @param expiresAt - Timestamp when withdrawal will execute
 * @returns true if countdown has expired
 */
export function isCountdownExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt
}
