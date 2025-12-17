'use client'

/**
 * SafetySignalQueueService
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 3
 *
 * Handles offline queueing of safety signals with encrypted IndexedDB storage.
 * Implements retry with exponential backoff and connectivity restoration handling.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Queue is encrypted using device-derived key (NOT family key)
 * - No queue data visible to family members
 * - Processing only occurs on secure connections (HTTPS)
 * - Zero-data-path: signal processing happens synchronously before logging
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import {
  type QueuedSafetySignal,
  type TriggerSafetySignalResponse,
  type GestureType,
  type SignalDeviceType,
  type RouteSignalInput,
  type RouteSignalResponse,
  SAFETY_SIGNAL_CONSTANTS,
  generateQueueId,
  calculateRetryDelay,
  canRetrySignal,
  queuedSafetySignalSchema,
} from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Queue service configuration
 */
export interface SafetySignalQueueConfig {
  /** IndexedDB database name */
  dbName?: string
  /** IndexedDB store name */
  storeName?: string
  /** Custom encryption service (for testing) */
  encryptionService?: EncryptionService
  /** Custom network service (for testing) */
  networkService?: NetworkService
  /** Custom API service (for testing) */
  apiService?: SignalApiService
  /** Whether to auto-start processing on creation */
  autoStart?: boolean
}

/**
 * Encryption service interface (for testability)
 */
export interface EncryptionService {
  /** Encrypt a queued signal */
  encrypt: (signal: QueuedSafetySignal) => Promise<ArrayBuffer>
  /** Decrypt a queued signal */
  decrypt: (data: ArrayBuffer) => Promise<QueuedSafetySignal>
  /** Derive encryption key from device */
  deriveKey: () => Promise<CryptoKey>
}

/**
 * Network service interface (for testability)
 */
export interface NetworkService {
  /** Check if device is online */
  isOnline: () => boolean
  /** Check if connection is secure (HTTPS) */
  isSecure: () => boolean
  /** Subscribe to online/offline events */
  onConnectivityChange: (callback: (online: boolean) => void) => () => void
}

/**
 * Signal API service interface (for testability)
 */
export interface SignalApiService {
  /** Send signal to server */
  sendSignal: (signal: QueuedSafetySignal) => Promise<{ success: boolean; signalId?: string }>
}

/**
 * Queue status for monitoring
 */
export interface QueueStatus {
  /** Number of signals in queue */
  queueSize: number
  /** Whether processing is active */
  isProcessing: boolean
  /** Number of pending signals */
  pendingCount: number
  /** Number of failed signals */
  failedCount: number
}

// ============================================================================
// Default Implementations
// ============================================================================

/**
 * Default encryption service using Web Crypto API
 *
 * CRITICAL: Uses device-derived key, NOT family key
 *
 * NOTE: The current key derivation uses browser fingerprint + origin.
 * For production deployment, this should be enhanced with:
 * - Device attestation (WebAuthn / SafetyNet / DeviceCheck)
 * - Cryptographically random device secret stored in separate IndexedDB
 * - Higher PBKDF2 iteration count (310000 per OWASP 2023)
 *
 * TODO(Story 7.5.6): Implement full encryption system with device secrets
 */
const createDefaultEncryptionService = (): EncryptionService => {
  let cachedKey: CryptoKey | null = null

  // Define deriveKey once in closure to avoid recursive service creation
  const deriveKey = async (): Promise<CryptoKey> => {
    if (cachedKey) return cachedKey

    // Use a device fingerprint + app identifier as key material
    // TODO(Story 7.5.6): Replace with cryptographically random device secret
    const keyMaterial = `fledgely-safety-signal-${navigator.userAgent}-${location.origin}`
    const encoder = new TextEncoder()
    const data = encoder.encode(keyMaterial)

    // Derive key using PBKDF2
    const importedKey = await crypto.subtle.importKey('raw', data, 'PBKDF2', false, ['deriveKey'])

    cachedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('fledgely-safety-signal-salt'),
        iterations: 100000, // TODO(Story 7.5.6): Increase to 310000 for OWASP compliance
        hash: 'SHA-256',
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )

    return cachedKey
  }

  return {
    deriveKey,

    encrypt: async (signal: QueuedSafetySignal): Promise<ArrayBuffer> => {
      const key = await deriveKey() // Use closure reference, not recursive factory call
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(signal))
      const iv = crypto.getRandomValues(new Uint8Array(12))

      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

      // Combine IV + encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      return combined.buffer
    },

    decrypt: async (data: ArrayBuffer): Promise<QueuedSafetySignal> => {
      const key = await deriveKey() // Use closure reference, not recursive factory call
      const combined = new Uint8Array(data)
      const iv = combined.slice(0, 12)
      const encrypted = combined.slice(12)

      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)

      const decoder = new TextDecoder()
      const json = JSON.parse(decoder.decode(decrypted))

      // Validate schema
      return queuedSafetySignalSchema.parse(json)
    },
  }
}

/**
 * Default network service using browser APIs
 */
const createDefaultNetworkService = (): NetworkService => {
  return {
    isOnline: () => navigator.onLine,
    isSecure: () => location.protocol === 'https:' || location.hostname === 'localhost',
    onConnectivityChange: (callback: (online: boolean) => void) => {
      const handleOnline = () => callback(true)
      const handleOffline = () => callback(false)

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    },
  }
}

/**
 * Default API service connecting to routeSafetySignal Cloud Function
 *
 * Story 7.5.2: External Signal Routing - Task 7
 *
 * CRITICAL: This service routes signals to external crisis partners.
 * - Signal payload is minimized (INV-002)
 * - Encrypted before delivery to partner
 * - 48-hour notification blackout enforced after routing
 */
const createDefaultApiService = (): SignalApiService => {
  // Lazily import Firebase to avoid initialization during tests
  let routeSafetySignalFn: ReturnType<
    typeof import('firebase/functions').httpsCallable<RouteSignalInput, RouteSignalResponse>
  > | null = null

  const getRouteSafetySignalFn = async () => {
    if (!routeSafetySignalFn) {
      const { httpsCallable } = await import('firebase/functions')
      const { functions } = await import('@/lib/firebase')
      routeSafetySignalFn = httpsCallable<RouteSignalInput, RouteSignalResponse>(
        functions,
        'routeSafetySignal'
      )
    }
    return routeSafetySignalFn
  }

  return {
    sendSignal: async (signal: QueuedSafetySignal) => {
      // Build input for Cloud Function
      const input: RouteSignalInput = {
        signalId: signal.queueId, // Use queueId as signalId
        childId: signal.childId,
        triggeredAt: signal.triggeredAt,
        deviceType: signal.deviceType,
        jurisdiction: signal.jurisdiction, // May be null, server will detect
      }

      try {
        const fn = await getRouteSafetySignalFn()
        const result = await fn(input)

        if (result.data.success) {
          return {
            success: true,
            signalId: result.data.routingId ?? signal.queueId,
          }
        }

        // Routing failed - return error for retry
        return {
          success: false,
          signalId: undefined,
        }
      } catch (error) {
        // Network or Firebase error - signal will be retried
        // CRITICAL: Errors are swallowed to prevent signal leakage
        console.error('[SafetySignalQueueService] Signal routing error')
        throw error // Re-throw for retry handling
      }
    },
  }
}

// ============================================================================
// SafetySignalQueueService
// ============================================================================

/**
 * Singleton service for managing the safety signal queue
 *
 * Handles:
 * - Encrypted IndexedDB storage
 * - Offline queueing with retry
 * - Connectivity-based processing
 * - Signal deduplication
 *
 * @example
 * ```ts
 * const queueService = new SafetySignalQueueService()
 * await queueService.initialize()
 *
 * // Queue a signal
 * const response = await queueService.queueSignal('child-123', 'web', 'tap')
 *
 * // Check status
 * const status = await queueService.getQueueStatus()
 * ```
 */
export class SafetySignalQueueService {
  private db: IDBDatabase | null = null
  private readonly dbName: string
  private readonly storeName: string
  private readonly encryption: EncryptionService
  private readonly network: NetworkService
  private readonly api: SignalApiService
  private isProcessing = false
  private connectivityUnsubscribe: (() => void) | null = null
  private retryTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor(config: SafetySignalQueueConfig = {}) {
    this.dbName = config.dbName ?? 'fledgely-safety-signal-queue'
    this.storeName = config.storeName ?? 'signals'
    this.encryption = config.encryptionService ?? createDefaultEncryptionService()
    this.network = config.networkService ?? createDefaultNetworkService()
    this.api = config.apiService ?? createDefaultApiService()
  }

  /**
   * Initialize the queue service
   *
   * Opens/creates IndexedDB and sets up connectivity monitoring
   */
  async initialize(): Promise<void> {
    // Skip if already initialized or in SSR
    if (this.db || typeof indexedDB === 'undefined') {
      return
    }

    // Open database
    this.db = await this.openDatabase()

    // Set up connectivity monitoring
    this.connectivityUnsubscribe = this.network.onConnectivityChange((online) => {
      if (online) {
        // Process queue when coming online
        this.processQueue().catch(() => {
          // Silently handle errors - signal processing continues
        })
      }
    })

    // Initial queue processing if online
    if (this.network.isOnline() && this.network.isSecure()) {
      this.processQueue().catch(() => {
        // Silently handle errors
      })
    }
  }

  /**
   * Queue a safety signal for delivery
   *
   * CRITICAL: This method queues synchronously to ensure zero-data-path
   */
  async queueSignal(
    childId: string,
    deviceType: SignalDeviceType,
    gestureType: GestureType
  ): Promise<TriggerSafetySignalResponse> {
    const queueId = generateQueueId()
    const now = new Date().toISOString()

    const signal: QueuedSafetySignal = {
      queueId,
      childId,
      triggeredAt: now,
      deviceType,
      gestureType,
      jurisdiction: null, // Will be determined by server
      attempts: 0,
      lastAttemptAt: null,
      nextRetryAt: null,
      createdAt: now,
    }

    // Check for duplicate (same child + gesture within MIN_SIGNAL_INTERVAL)
    const isDuplicate = await this.checkDuplicate(childId, gestureType)
    if (isDuplicate) {
      return {
        success: true,
        queueId: null,
        queued: false, // Not queued because duplicate
      }
    }

    // Queue the signal
    await this.saveSignal(signal)

    // Attempt immediate processing if online and secure
    if (this.network.isOnline() && this.network.isSecure()) {
      this.processQueue().catch(() => {
        // Silently handle errors - signal is safely queued
      })
    }

    return {
      success: true,
      queueId,
      queued: true,
    }
  }

  /**
   * Get current queue status
   */
  async getQueueStatus(): Promise<QueueStatus> {
    const signals = await this.getAllSignals()

    const pendingCount = signals.filter(
      (s) => s.attempts < SAFETY_SIGNAL_CONSTANTS.MAX_RETRY_ATTEMPTS
    ).length
    const failedCount = signals.filter(
      (s) => s.attempts >= SAFETY_SIGNAL_CONSTANTS.MAX_RETRY_ATTEMPTS
    ).length

    return {
      queueSize: signals.length,
      isProcessing: this.isProcessing,
      pendingCount,
      failedCount,
    }
  }

  /**
   * Process the queue, sending signals to the server
   *
   * CRITICAL: Only processes on secure connections (HTTPS)
   */
  async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return
    }

    // Only process on secure connections
    if (!this.network.isOnline() || !this.network.isSecure()) {
      return
    }

    this.isProcessing = true

    try {
      const signals = await this.getAllSignals()

      for (const signal of signals) {
        // Skip signals that can't be retried
        if (!canRetrySignal(signal)) {
          continue
        }

        // Skip signals not yet due for retry
        if (signal.nextRetryAt && new Date(signal.nextRetryAt) > new Date()) {
          continue
        }

        try {
          await this.sendSignal(signal)
        } catch {
          // Individual signal errors don't stop processing
          continue
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Clear all signals from the queue
   *
   * For testing only - not exposed in production
   */
  async clearQueue(): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Cleanup and close the service
   */
  async destroy(): Promise<void> {
    // Clear all retry timeouts
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout)
    }
    this.retryTimeouts.clear()

    // Unsubscribe from connectivity changes
    if (this.connectivityUnsubscribe) {
      this.connectivityUnsubscribe()
      this.connectivityUnsubscribe = null
    }

    // Close database
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Open or create the IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => {
        reject(new Error('Failed to open safety signal queue database'))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store for encrypted signals
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'queueId' })

          // Index for finding signals by child
          store.createIndex('childId', 'childId', { unique: false })

          // Index for finding signals by creation time
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  /**
   * Save an encrypted signal to IndexedDB
   */
  private async saveSignal(signal: QueuedSafetySignal): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // Encrypt the signal
    const encrypted = await this.encryption.encrypt(signal)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)

      // Store with queueId as key, encrypted data as value
      const record = {
        queueId: signal.queueId,
        childId: signal.childId, // Stored for indexing (deduplication)
        createdAt: signal.createdAt, // Stored for indexing (cleanup)
        data: encrypted, // Encrypted signal data
      }

      const request = store.put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all signals from the queue (decrypted)
   */
  private async getAllSignals(): Promise<QueuedSafetySignal[]> {
    if (!this.db) {
      return []
    }

    const records = await new Promise<{ queueId: string; data: ArrayBuffer }[]>(
      (resolve, reject) => {
        const transaction = this.db!.transaction(this.storeName, 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }
    )

    const signals: QueuedSafetySignal[] = []

    for (const record of records) {
      try {
        const signal = await this.encryption.decrypt(record.data)
        signals.push(signal)
      } catch {
        // Skip corrupted entries - they'll be cleaned up
        continue
      }
    }

    return signals
  }

  /**
   * Delete a signal from the queue
   */
  private async deleteSignal(queueId: string): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(queueId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Check for duplicate signal (same child + gesture within interval)
   */
  private async checkDuplicate(childId: string, gestureType: GestureType): Promise<boolean> {
    const signals = await this.getAllSignals()
    const now = Date.now()
    const interval = SAFETY_SIGNAL_CONSTANTS.MIN_SIGNAL_INTERVAL_MS

    return signals.some((signal) => {
      if (signal.childId !== childId) return false
      if (signal.gestureType !== gestureType) return false

      const signalTime = new Date(signal.triggeredAt).getTime()
      return now - signalTime < interval
    })
  }

  /**
   * Send a signal to the server
   */
  private async sendSignal(signal: QueuedSafetySignal): Promise<void> {
    try {
      const result = await this.api.sendSignal(signal)

      if (result.success) {
        // Successfully sent - remove from queue
        await this.deleteSignal(signal.queueId)
      } else {
        // Failed - update retry info
        await this.updateRetryInfo(signal)
      }
    } catch {
      // Network or other error - update retry info
      await this.updateRetryInfo(signal)
    }
  }

  /**
   * Update signal with retry information
   */
  private async updateRetryInfo(signal: QueuedSafetySignal): Promise<void> {
    const now = new Date().toISOString()
    const nextAttempts = signal.attempts + 1
    const delay = calculateRetryDelay(nextAttempts)

    const updatedSignal: QueuedSafetySignal = {
      ...signal,
      attempts: nextAttempts,
      lastAttemptAt: now,
      nextRetryAt: new Date(Date.now() + delay).toISOString(),
    }

    await this.saveSignal(updatedSignal)

    // Schedule retry if still retriable
    if (canRetrySignal(updatedSignal)) {
      this.scheduleRetry(updatedSignal.queueId, delay)
    }
  }

  /**
   * Schedule a retry for a signal
   */
  private scheduleRetry(queueId: string, delayMs: number): void {
    // Clear existing timeout if any
    const existing = this.retryTimeouts.get(queueId)
    if (existing) {
      clearTimeout(existing)
    }

    // Schedule new retry
    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(queueId)
      this.processQueue().catch(() => {
        // Silently handle errors
      })
    }, delayMs)

    this.retryTimeouts.set(queueId, timeout)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let instance: SafetySignalQueueService | null = null

/**
 * Get the singleton queue service instance
 *
 * @example
 * ```ts
 * const queueService = getSafetySignalQueueService()
 * await queueService.initialize()
 * ```
 */
export function getSafetySignalQueueService(
  config?: SafetySignalQueueConfig
): SafetySignalQueueService {
  if (!instance) {
    instance = new SafetySignalQueueService(config)
  }
  return instance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSafetySignalQueueService(): void {
  if (instance) {
    instance.destroy().catch(() => {
      // Ignore errors during cleanup
    })
    instance = null
  }
}
