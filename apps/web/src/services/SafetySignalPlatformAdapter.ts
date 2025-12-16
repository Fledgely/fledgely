/**
 * SafetySignalPlatformAdapter
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 7
 *
 * Cross-platform adapter for safety signal detection and delivery.
 * Provides consistent gesture recognition across all platforms.
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 * All adapters must respect this invariant.
 */

import {
  SAFETY_SIGNAL_CONSTANTS,
  DEFAULT_GESTURE_CONFIG,
  type TriggerSafetySignalResponse,
  type GestureConfig,
} from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Platform types supported by the safety signal system
 */
export type PlatformType = 'web' | 'chrome' | 'android' | 'ios'

/**
 * Platform capability flags
 */
export interface PlatformCapabilities {
  /** Whether the platform supports tap gestures */
  supportsTapGesture: boolean
  /** Whether the platform supports keyboard shortcuts */
  supportsKeyboardShortcut: boolean
  /** Whether the platform supports encrypted IndexedDB */
  supportsEncryptedStorage: boolean
  /** Whether the platform supports background sync */
  supportsBackgroundSync: boolean
  /** Whether the platform supports device attestation */
  supportsDeviceAttestation: boolean
}

/**
 * Signal trigger result from platform adapter
 */
export interface PlatformSignalResult {
  /** Whether the signal was successfully triggered */
  success: boolean
  /** Signal ID if successful */
  signalId?: string
  /** Queue ID if offline */
  queueId?: string
  /** Whether signal was queued for later delivery */
  queued: boolean
  /** Error message if failed */
  error?: string
  /** Platform that triggered the signal */
  platform: PlatformType
}

/**
 * Platform adapter interface
 *
 * All platform-specific implementations must implement this interface
 * to ensure consistent safety signal behavior across platforms.
 */
export interface SafetySignalPlatformAdapter {
  /** Platform identifier */
  readonly platform: PlatformType

  /** Platform capabilities */
  readonly capabilities: PlatformCapabilities

  /**
   * Initialize the adapter
   * Called once when the adapter is created
   */
  initialize(): Promise<void>

  /**
   * Trigger a safety signal
   * @param childId - ID of the child triggering the signal
   * @param gestureType - Type of gesture used
   * @returns Result of the signal trigger
   */
  triggerSignal(
    childId: string,
    gestureType: 'tap' | 'keyboard'
  ): Promise<PlatformSignalResult>

  /**
   * Get the gesture configuration for this platform
   * Allows platform-specific adjustments
   */
  getGestureConfig(): GestureConfig

  /**
   * Check if the platform is online
   */
  isOnline(): boolean

  /**
   * Get queue status (pending signals)
   */
  getQueueStatus(): Promise<{
    pendingCount: number
    oldestSignalTime?: Date
  }>

  /**
   * Process queued signals (called when online)
   */
  processQueue(): Promise<number>

  /**
   * Clean up resources
   */
  destroy(): Promise<void>
}

// ============================================================================
// Web Platform Adapter
// ============================================================================

/**
 * Web platform adapter for safety signals
 *
 * Implements safety signal detection for web browsers using:
 * - IndexedDB for encrypted queue storage
 * - Web Crypto API for encryption
 * - Navigator.onLine for connectivity detection
 */
export class WebPlatformAdapter implements SafetySignalPlatformAdapter {
  readonly platform: PlatformType = 'web'

  readonly capabilities: PlatformCapabilities = {
    supportsTapGesture: true,
    supportsKeyboardShortcut: true,
    supportsEncryptedStorage: true,
    supportsBackgroundSync: 'serviceWorker' in navigator && 'SyncManager' in window,
    supportsDeviceAttestation: false, // Web doesn't have device attestation
  }

  private initialized = false
  private queueService: {
    queueSignal: (childId: string, gestureType: 'tap' | 'keyboard') => Promise<TriggerSafetySignalResponse>
    processQueue: () => Promise<number>
    getQueueStatus: () => Promise<{ pendingCount: number; oldestSignalTime?: Date }>
    destroy: () => Promise<void>
  } | null = null

  async initialize(): Promise<void> {
    if (this.initialized) return

    // Lazy import to avoid circular dependencies
    const { getSafetySignalQueueService } = await import('./SafetySignalQueueService')
    this.queueService = getSafetySignalQueueService()
    await (this.queueService as { initialize: () => Promise<void> }).initialize()
    this.initialized = true
  }

  async triggerSignal(
    childId: string,
    gestureType: 'tap' | 'keyboard'
  ): Promise<PlatformSignalResult> {
    if (!this.initialized || !this.queueService) {
      return {
        success: false,
        queued: false,
        error: 'Adapter not initialized',
        platform: this.platform,
      }
    }

    try {
      const result = await this.queueService.queueSignal(childId, gestureType)

      return {
        success: result.success,
        signalId: result.signalId,
        queueId: result.queueId,
        queued: result.queued,
        error: result.error,
        platform: this.platform,
      }
    } catch (error) {
      return {
        success: false,
        queued: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: this.platform,
      }
    }
  }

  getGestureConfig(): GestureConfig {
    return { ...DEFAULT_GESTURE_CONFIG }
  }

  isOnline(): boolean {
    return navigator.onLine
  }

  async getQueueStatus(): Promise<{ pendingCount: number; oldestSignalTime?: Date }> {
    if (!this.queueService) {
      return { pendingCount: 0 }
    }
    return this.queueService.getQueueStatus()
  }

  async processQueue(): Promise<number> {
    if (!this.queueService) {
      return 0
    }
    return this.queueService.processQueue()
  }

  async destroy(): Promise<void> {
    if (this.queueService) {
      await this.queueService.destroy()
      this.queueService = null
    }
    this.initialized = false
  }
}

// ============================================================================
// Chrome Extension Platform Adapter (Mock)
// ============================================================================

/**
 * Chrome extension platform adapter
 *
 * Mock implementation for Chrome extension platform.
 * Full implementation will be in Epic 8 (Chrome Extension).
 */
export class ChromePlatformAdapter implements SafetySignalPlatformAdapter {
  readonly platform: PlatformType = 'chrome'

  readonly capabilities: PlatformCapabilities = {
    supportsTapGesture: true,
    supportsKeyboardShortcut: true,
    supportsEncryptedStorage: true,
    supportsBackgroundSync: true, // Chrome extensions have service workers
    supportsDeviceAttestation: false,
  }

  private initialized = false
  private mockQueue: Array<{ childId: string; gestureType: 'tap' | 'keyboard'; timestamp: Date }> = []

  async initialize(): Promise<void> {
    // Mock implementation - actual Chrome extension storage will be different
    this.initialized = true
  }

  async triggerSignal(
    childId: string,
    gestureType: 'tap' | 'keyboard'
  ): Promise<PlatformSignalResult> {
    if (!this.initialized) {
      return {
        success: false,
        queued: false,
        error: 'Adapter not initialized',
        platform: this.platform,
      }
    }

    // Mock: Queue the signal
    const queueId = `chrome_queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.mockQueue.push({ childId, gestureType, timestamp: new Date() })

    return {
      success: true,
      queueId,
      queued: true,
      platform: this.platform,
    }
  }

  getGestureConfig(): GestureConfig {
    // Chrome extension might have slightly different config
    return {
      ...DEFAULT_GESTURE_CONFIG,
      // Could adjust timing for extension context
    }
  }

  isOnline(): boolean {
    return navigator.onLine
  }

  async getQueueStatus(): Promise<{ pendingCount: number; oldestSignalTime?: Date }> {
    return {
      pendingCount: this.mockQueue.length,
      oldestSignalTime: this.mockQueue[0]?.timestamp,
    }
  }

  async processQueue(): Promise<number> {
    const count = this.mockQueue.length
    this.mockQueue = []
    return count
  }

  async destroy(): Promise<void> {
    this.mockQueue = []
    this.initialized = false
  }
}

// ============================================================================
// Android Platform Adapter (Mock)
// ============================================================================

/**
 * Android platform adapter
 *
 * Mock implementation for Android platform.
 * Full implementation will be in Epic 9 (Mobile Apps).
 */
export class AndroidPlatformAdapter implements SafetySignalPlatformAdapter {
  readonly platform: PlatformType = 'android'

  readonly capabilities: PlatformCapabilities = {
    supportsTapGesture: true,
    supportsKeyboardShortcut: false, // Physical keyboards rare on Android
    supportsEncryptedStorage: true, // Android Keystore
    supportsBackgroundSync: true, // WorkManager
    supportsDeviceAttestation: true, // SafetyNet / Play Integrity
  }

  private initialized = false
  private mockQueue: Array<{ childId: string; gestureType: 'tap' | 'keyboard'; timestamp: Date }> = []

  async initialize(): Promise<void> {
    // Mock implementation - actual Android will use native storage
    this.initialized = true
  }

  async triggerSignal(
    childId: string,
    gestureType: 'tap' | 'keyboard'
  ): Promise<PlatformSignalResult> {
    if (!this.initialized) {
      return {
        success: false,
        queued: false,
        error: 'Adapter not initialized',
        platform: this.platform,
      }
    }

    const queueId = `android_queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.mockQueue.push({ childId, gestureType, timestamp: new Date() })

    return {
      success: true,
      queueId,
      queued: true,
      platform: this.platform,
    }
  }

  getGestureConfig(): GestureConfig {
    return {
      ...DEFAULT_GESTURE_CONFIG,
      // Android might need adjusted tap timing for touch screens
      tapWindowMs: 3500, // Slightly longer for touch input
    }
  }

  isOnline(): boolean {
    // In mock, delegate to navigator.onLine
    // Real Android would use ConnectivityManager
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  async getQueueStatus(): Promise<{ pendingCount: number; oldestSignalTime?: Date }> {
    return {
      pendingCount: this.mockQueue.length,
      oldestSignalTime: this.mockQueue[0]?.timestamp,
    }
  }

  async processQueue(): Promise<number> {
    const count = this.mockQueue.length
    this.mockQueue = []
    return count
  }

  async destroy(): Promise<void> {
    this.mockQueue = []
    this.initialized = false
  }
}

// ============================================================================
// iOS Platform Adapter (Mock)
// ============================================================================

/**
 * iOS platform adapter
 *
 * Mock implementation for iOS platform.
 * Full implementation will be in Epic 9 (Mobile Apps).
 */
export class iOSPlatformAdapter implements SafetySignalPlatformAdapter {
  readonly platform: PlatformType = 'ios'

  readonly capabilities: PlatformCapabilities = {
    supportsTapGesture: true,
    supportsKeyboardShortcut: true, // iPads with keyboards
    supportsEncryptedStorage: true, // iOS Keychain
    supportsBackgroundSync: true, // BGTaskScheduler
    supportsDeviceAttestation: true, // DeviceCheck / App Attest
  }

  private initialized = false
  private mockQueue: Array<{ childId: string; gestureType: 'tap' | 'keyboard'; timestamp: Date }> = []

  async initialize(): Promise<void> {
    // Mock implementation - actual iOS will use native storage
    this.initialized = true
  }

  async triggerSignal(
    childId: string,
    gestureType: 'tap' | 'keyboard'
  ): Promise<PlatformSignalResult> {
    if (!this.initialized) {
      return {
        success: false,
        queued: false,
        error: 'Adapter not initialized',
        platform: this.platform,
      }
    }

    const queueId = `ios_queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.mockQueue.push({ childId, gestureType, timestamp: new Date() })

    return {
      success: true,
      queueId,
      queued: true,
      platform: this.platform,
    }
  }

  getGestureConfig(): GestureConfig {
    return {
      ...DEFAULT_GESTURE_CONFIG,
      // iOS might need adjusted tap timing for touch screens
      tapWindowMs: 3500, // Slightly longer for touch input
    }
  }

  isOnline(): boolean {
    // In mock, delegate to navigator.onLine
    // Real iOS would use NWPathMonitor
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  async getQueueStatus(): Promise<{ pendingCount: number; oldestSignalTime?: Date }> {
    return {
      pendingCount: this.mockQueue.length,
      oldestSignalTime: this.mockQueue[0]?.timestamp,
    }
  }

  async processQueue(): Promise<number> {
    const count = this.mockQueue.length
    this.mockQueue = []
    return count
  }

  async destroy(): Promise<void> {
    this.mockQueue = []
    this.initialized = false
  }
}

// ============================================================================
// Platform Adapter Factory
// ============================================================================

/**
 * Detect the current platform
 */
export function detectPlatform(): PlatformType {
  // Check for Chrome extension context
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    return 'chrome'
  }

  // Check for React Native / mobile WebView hints
  // In real implementation, this would be set by native code
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

  if (/android/i.test(userAgent)) {
    // Could be Android WebView or mobile web
    // Real implementation would check for native bridge
    return 'android'
  }

  if (/iPad|iPhone|iPod/.test(userAgent)) {
    // Could be iOS WebView or mobile Safari
    // Real implementation would check for native bridge
    return 'ios'
  }

  // Default to web
  return 'web'
}

/**
 * Create a platform adapter for the current platform
 */
export function createPlatformAdapter(platform?: PlatformType): SafetySignalPlatformAdapter {
  const targetPlatform = platform ?? detectPlatform()

  switch (targetPlatform) {
    case 'chrome':
      return new ChromePlatformAdapter()
    case 'android':
      return new AndroidPlatformAdapter()
    case 'ios':
      return new iOSPlatformAdapter()
    case 'web':
    default:
      return new WebPlatformAdapter()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let platformAdapterInstance: SafetySignalPlatformAdapter | null = null

/**
 * Get or create the platform adapter singleton
 */
export function getPlatformAdapter(): SafetySignalPlatformAdapter {
  if (!platformAdapterInstance) {
    platformAdapterInstance = createPlatformAdapter()
  }
  return platformAdapterInstance
}

/**
 * Reset the platform adapter (for testing)
 */
export function resetPlatformAdapter(): void {
  if (platformAdapterInstance) {
    platformAdapterInstance.destroy().catch(() => {})
    platformAdapterInstance = null
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  WebPlatformAdapter,
  ChromePlatformAdapter,
  AndroidPlatformAdapter,
  iOSPlatformAdapter,
  detectPlatform,
  createPlatformAdapter,
  getPlatformAdapter,
  resetPlatformAdapter,
}
