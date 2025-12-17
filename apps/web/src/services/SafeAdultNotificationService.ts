'use client'

/**
 * SafeAdultNotificationService
 *
 * Story 7.5.4: Safe Adult Designation - Task 5
 *
 * Provides notification delivery for safe adult contacts when a child
 * triggers a safety signal. Calls a Cloud Function that sends SMS/email
 * without exposing contact information to the client.
 *
 * CRITICAL SAFETY REQUIREMENTS (INV-002):
 * - Encrypted contact data sent to Cloud Function (decrypted server-side)
 * - Notification message contains NO app-identifying information
 * - Rate limiting prevents spam/abuse
 * - No family-accessible path exists for this data
 *
 * Flow:
 * 1. Child triggers safety signal
 * 2. If safe adult exists, encrypted contact retrieved from storage
 * 3. Encrypted data + signalId sent to Cloud Function
 * 4. Cloud Function decrypts contact and sends notification
 * 5. Response indicates success/failure (generic errors only)
 *
 * CRITICAL INVARIANT (INV-002): Safe adult notification NEVER visible to family.
 */

import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import type {
  SafeAdultNotificationRequest,
  SafeAdultNotificationResponse,
  ContactType,
} from '@fledgely/contracts'
import type { EncryptedSafeAdultContact } from './SafeAdultEncryptionService'
import {
  type ISafeAdultStorageService,
  getSafeAdultStorageService,
} from './SafeAdultStorageService'

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the notification service
 */
export interface SafeAdultNotificationConfig {
  /** Custom storage service (for testing) */
  storageService?: ISafeAdultStorageService
  /** Maximum retries for notification */
  maxRetries?: number
  /** Retry delay in milliseconds */
  retryDelayMs?: number
  /** Enable verbose logging for debugging (NOT in production) */
  enableDebugLogging?: boolean
}

/**
 * Input for sending a safe adult notification
 */
export interface SendNotificationInput {
  /** Child ID (the designator) */
  childId: string
  /** Signal ID (for deduplication) */
  signalId: string
}

/**
 * Result of sending a safe adult notification
 */
export interface SendNotificationResult {
  /** Whether the notification was sent successfully */
  success: boolean
  /** Error message if failed (generic, no sensitive data) */
  error?: string
  /** Whether the notification was skipped (no safe adult designated) */
  skipped?: boolean
  /** Timestamp when notification was sent (ISO) */
  sentAt?: string
}

/**
 * Input for sending with a new contact (not from storage)
 */
export interface SendWithNewContactInput {
  /** Child ID */
  childId: string
  /** Child's first name */
  childFirstName: string
  /** Contact type */
  contactType: ContactType
  /** Contact value (will be encrypted before sending) */
  contactValue: string
  /** Signal ID (for deduplication) */
  signalId: string
}

/**
 * Interface for safe adult notification service
 */
export interface ISafeAdultNotificationService {
  /**
   * Send notification to saved safe adult
   *
   * Retrieves encrypted contact from storage and sends via Cloud Function.
   */
  send: (input: SendNotificationInput) => Promise<SendNotificationResult>

  /**
   * Send notification with a new contact (not saved)
   *
   * For one-time notifications where user enters contact at signal time.
   */
  sendWithNewContact: (input: SendWithNewContactInput) => Promise<SendNotificationResult>

  /**
   * Check if a safe adult is designated for a child
   */
  hasSafeAdult: (childId: string) => Promise<boolean>

  /**
   * Get the notification status for a signal
   */
  getNotificationStatus: (
    signalId: string
  ) => Promise<{ sent: boolean; sentAt?: string; error?: string } | null>
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_RETRIES = 2
const DEFAULT_RETRY_DELAY_MS = 1000

// Cloud Function name
const NOTIFY_SAFE_ADULT_FUNCTION = 'notifySafeAdult'

// ============================================================================
// SafeAdultNotificationService
// ============================================================================

/**
 * Service for sending notifications to safe adults
 *
 * Handles encrypted contact retrieval and Cloud Function invocation.
 *
 * @example
 * ```ts
 * const notificationService = new SafeAdultNotificationService()
 *
 * // Send notification to saved safe adult
 * const result = await notificationService.send({
 *   childId: 'child-123',
 *   signalId: 'signal-abc'
 * })
 *
 * if (result.success) {
 *   console.log('Notification sent!')
 * } else if (result.skipped) {
 *   console.log('No safe adult designated')
 * } else {
 *   console.log('Failed:', result.error)
 * }
 * ```
 */
export class SafeAdultNotificationService implements ISafeAdultNotificationService {
  private readonly storage: ISafeAdultStorageService
  private readonly maxRetries: number
  private readonly retryDelayMs: number
  private readonly enableDebugLogging: boolean

  // In-memory cache of notification statuses (cleared on page refresh)
  private readonly notificationStatuses = new Map<
    string,
    { sent: boolean; sentAt?: string; error?: string }
  >()

  constructor(config: SafeAdultNotificationConfig = {}) {
    this.storage = config.storageService ?? getSafeAdultStorageService()
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES
    this.retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
    this.enableDebugLogging = config.enableDebugLogging ?? false
  }

  /**
   * Send notification to saved safe adult
   */
  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    this.debugLog('Sending notification', { childId: input.childId, signalId: input.signalId })

    // Check for existing notification status (deduplication)
    const existingStatus = this.notificationStatuses.get(input.signalId)
    if (existingStatus?.sent) {
      this.debugLog('Notification already sent for this signal', { signalId: input.signalId })
      return { success: true, sentAt: existingStatus.sentAt, skipped: false }
    }

    try {
      // Initialize storage if needed
      await this.storage.initialize()

      // Get encrypted contact for notification
      const encryptedData = await this.storage.getEncryptedForNotification(input.childId)

      if (!encryptedData) {
        this.debugLog('No safe adult designated', { childId: input.childId })
        return { success: true, skipped: true }
      }

      // Send notification via Cloud Function
      return await this.invokeNotifyFunction(
        encryptedData.childFirstName,
        encryptedData.encryptedContact,
        encryptedData.contactType,
        input.signalId
      )
    } catch (error) {
      const errorMessage = this.getGenericErrorMessage(error)
      this.debugLog('Notification failed', { error: errorMessage })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Send notification with a new contact (not saved)
   */
  async sendWithNewContact(input: SendWithNewContactInput): Promise<SendNotificationResult> {
    this.debugLog('Sending notification with new contact', {
      childId: input.childId,
      signalId: input.signalId,
      contactType: input.contactType,
    })

    // Check for existing notification status (deduplication)
    const existingStatus = this.notificationStatuses.get(input.signalId)
    if (existingStatus?.sent) {
      this.debugLog('Notification already sent for this signal', { signalId: input.signalId })
      return { success: true, sentAt: existingStatus.sentAt, skipped: false }
    }

    try {
      // Import encryption service dynamically to avoid circular dependencies
      const { getSafeAdultEncryptionService } = await import('./SafeAdultEncryptionService')
      const encryption = getSafeAdultEncryptionService()

      // Encrypt the contact
      const encryptedContact = await encryption.encrypt({
        type: input.contactType,
        value: input.contactValue,
      })

      // Send notification via Cloud Function
      return await this.invokeNotifyFunction(
        input.childFirstName,
        encryptedContact,
        input.contactType,
        input.signalId
      )
    } catch (error) {
      const errorMessage = this.getGenericErrorMessage(error)
      this.debugLog('Notification failed', { error: errorMessage })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Check if a safe adult is designated for a child
   */
  async hasSafeAdult(childId: string): Promise<boolean> {
    try {
      await this.storage.initialize()
      return await this.storage.exists(childId)
    } catch {
      return false
    }
  }

  /**
   * Get the notification status for a signal
   */
  async getNotificationStatus(
    signalId: string
  ): Promise<{ sent: boolean; sentAt?: string; error?: string } | null> {
    return this.notificationStatuses.get(signalId) ?? null
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Invoke the Cloud Function to send notification
   */
  private async invokeNotifyFunction(
    childFirstName: string,
    encryptedContact: EncryptedSafeAdultContact,
    contactType: ContactType,
    signalId: string
  ): Promise<SendNotificationResult> {
    const request: SafeAdultNotificationRequest = {
      childFirstName,
      encryptedContact: encryptedContact.encryptedData,
      contactType,
      encryptionKeyId: encryptedContact.keyId,
      signalId,
    }

    let lastError: string | undefined
    let retryCount = 0

    while (retryCount <= this.maxRetries) {
      try {
        const callable = httpsCallable<SafeAdultNotificationRequest, SafeAdultNotificationResponse>(
          functions,
          NOTIFY_SAFE_ADULT_FUNCTION
        )

        const result: HttpsCallableResult<SafeAdultNotificationResponse> = await callable(request)
        const response = result.data

        if (response.success) {
          // Cache successful notification
          this.notificationStatuses.set(signalId, {
            sent: true,
            sentAt: response.sentAt ?? new Date().toISOString(),
          })

          this.debugLog('Notification sent successfully', { signalId })
          return {
            success: true,
            sentAt: response.sentAt ?? undefined,
          }
        } else {
          // Server returned failure
          lastError = response.error ?? 'Failed to send notification'
          this.debugLog('Server returned failure', { error: lastError })
          break // Don't retry server-side failures
        }
      } catch (error) {
        lastError = this.getGenericErrorMessage(error)
        this.debugLog('Request failed, retrying', { attempt: retryCount + 1, error: lastError })

        retryCount++
        if (retryCount <= this.maxRetries) {
          await this.delay(this.retryDelayMs * retryCount)
        }
      }
    }

    // Cache failure status
    this.notificationStatuses.set(signalId, {
      sent: false,
      error: lastError,
    })

    return { success: false, error: lastError }
  }

  /**
   * Get a generic error message (no sensitive data leak)
   */
  private getGenericErrorMessage(error: unknown): string {
    // CRITICAL: Never expose internal error details to client
    // These could leak information about the safe adult or system internals
    if (error instanceof Error) {
      // Check for known Firebase error codes
      const message = error.message.toLowerCase()

      if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your connection.'
      }

      if (message.includes('timeout')) {
        return 'Request timed out. Please try again.'
      }

      if (message.includes('rate') || message.includes('limit')) {
        return 'Too many requests. Please wait a moment.'
      }

      if (message.includes('permission') || message.includes('unauthorized')) {
        return 'Unable to send notification. Please try again.'
      }
    }

    // Default generic error
    return 'Something went wrong. Please try again.'
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Debug logging (only when enabled)
   */
  private debugLog(message: string, data?: Record<string, unknown>): void {
    if (this.enableDebugLogging) {
      console.log(`[SafeAdultNotificationService] ${message}`, data ?? '')
    }
  }
}

/**
 * Custom error class for notification failures
 */
export class SafeAdultNotificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SafeAdultNotificationError'
  }
}

// ============================================================================
// Mock Notification Service (for testing)
// ============================================================================

/**
 * Mock notification service for development and testing
 *
 * Does not make actual network calls.
 */
export class MockSafeAdultNotificationService implements ISafeAdultNotificationService {
  private storage: ISafeAdultStorageService
  private sentNotifications = new Map<string, SendNotificationResult>()
  private shouldFail = false
  private failureMessage = 'Mock notification failure'
  private delay = 0

  constructor(storageService?: ISafeAdultStorageService) {
    this.storage = storageService ?? getSafeAdultStorageService(true) // Use mock storage
  }

  /**
   * Configure mock to fail
   */
  setFailure(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail
    if (message) this.failureMessage = message
  }

  /**
   * Configure mock delay
   */
  setDelay(delayMs: number): void {
    this.delay = delayMs
  }

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay))
    }

    if (this.shouldFail) {
      const result: SendNotificationResult = { success: false, error: this.failureMessage }
      this.sentNotifications.set(input.signalId, result)
      return result
    }

    // Check for existing notification
    const existing = this.sentNotifications.get(input.signalId)
    if (existing?.success) {
      return existing
    }

    await this.storage.initialize()
    const hasContact = await this.storage.exists(input.childId)

    if (!hasContact) {
      const result: SendNotificationResult = { success: true, skipped: true }
      this.sentNotifications.set(input.signalId, result)
      return result
    }

    const result: SendNotificationResult = {
      success: true,
      sentAt: new Date().toISOString(),
    }
    this.sentNotifications.set(input.signalId, result)
    return result
  }

  async sendWithNewContact(input: SendWithNewContactInput): Promise<SendNotificationResult> {
    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay))
    }

    if (this.shouldFail) {
      const result: SendNotificationResult = { success: false, error: this.failureMessage }
      this.sentNotifications.set(input.signalId, result)
      return result
    }

    // Check for existing notification
    const existing = this.sentNotifications.get(input.signalId)
    if (existing?.success) {
      return existing
    }

    const result: SendNotificationResult = {
      success: true,
      sentAt: new Date().toISOString(),
    }
    this.sentNotifications.set(input.signalId, result)
    return result
  }

  async hasSafeAdult(childId: string): Promise<boolean> {
    await this.storage.initialize()
    return await this.storage.exists(childId)
  }

  async getNotificationStatus(
    signalId: string
  ): Promise<{ sent: boolean; sentAt?: string; error?: string } | null> {
    const result = this.sentNotifications.get(signalId)
    if (!result) return null

    return {
      sent: result.success && !result.skipped,
      sentAt: result.sentAt,
      error: result.error,
    }
  }

  /**
   * Get all sent notifications (for testing)
   */
  getSentNotifications(): Map<string, SendNotificationResult> {
    return new Map(this.sentNotifications)
  }

  /**
   * Clear sent notifications (for testing)
   */
  clearSentNotifications(): void {
    this.sentNotifications.clear()
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a production notification service
 */
export function createSafeAdultNotificationService(
  config?: SafeAdultNotificationConfig
): SafeAdultNotificationService {
  return new SafeAdultNotificationService(config)
}

/**
 * Create a mock notification service for testing
 */
export function createMockSafeAdultNotificationService(
  storageService?: ISafeAdultStorageService
): MockSafeAdultNotificationService {
  return new MockSafeAdultNotificationService(storageService)
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: ISafeAdultNotificationService | null = null

/**
 * Get the singleton notification service instance
 *
 * @param useMock - Use mock service instead of real notification
 */
export function getSafeAdultNotificationService(useMock = false): ISafeAdultNotificationService {
  if (!instance) {
    instance = useMock
      ? createMockSafeAdultNotificationService()
      : createSafeAdultNotificationService()
  }
  return instance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSafeAdultNotificationService(): void {
  instance = null
}
