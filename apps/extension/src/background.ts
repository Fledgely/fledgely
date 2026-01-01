/**
 * Fledgely Chrome Extension - Service Worker
 *
 * This is the background script that runs as a service worker (Manifest V3).
 * It handles:
 * - Screenshot capture scheduling via chrome.alarms
 * - Sync queue management
 * - Authentication state
 * - Communication with popup
 *
 * Story 9.1: Extension Package & Manifest
 * Story 9.6: Extension Background Service
 * Story 10.1: Screenshot Capture Mechanism
 */

import { captureScreenshot, ScreenshotCapture } from './capture'
import { uploadScreenshot, calculateRetryDelay, shouldRetry, getRemainingUploads } from './upload'
import {
  logCaptureEvent,
  getCaptureEvents,
  clearCaptureEvents,
  getEventStats,
  hasConsecutiveCriticalErrors,
  countConsecutiveSuccesses,
  ERROR_CODES,
} from './event-logger'
import {
  isUrlProtected,
  initializeAllowlist,
  getAllowlistVersion,
  syncAllowlistFromServer,
  isAllowlistStale,
} from './crisis-allowlist'
import { validateEnrollmentState, isEnrolled } from './enrollment-state'
import { verifyDeviceEnrollment } from './enrollment-service'
import { setupHealthSyncAlarm } from './health-metrics'
import {
  initScreenTimeTracking,
  handleTabActivated,
  handleTabUpdated,
  handleIdleStateChanged,
  syncScreenTime,
  ALARM_SCREEN_TIME_SYNC,
} from './screen-time'
import {
  setupWarningCheckAlarm,
  checkAndTriggerWarnings,
  syncTimeLimitConfig,
  clearWarningState,
  getTimeLimitStatus,
  getTimeLimitConfig,
  checkEnforcementStatus,
  checkEnforcementWithOverride,
  checkForActiveOverride,
  enforceOnAllTabs,
  shouldBlockTab,
  injectBlockingScript,
  DEFAULT_EDUCATION_EXEMPTION,
  ALARM_WARNING_CHECK,
} from './time-limit-warnings'
import {
  checkConsentStatusWithCache,
  clearConsentCache,
  shouldEnableMonitoring,
} from './consent-gate'
import { isCrisisSearch, getRelevantResources } from './crisis-keywords'
import { extractSearchQuery } from './search-detector'
import { getOrGenerateSchedule, isInPrivacyGap, clearSchedule } from './privacy-gaps'
import { checkAndUpdateVpnStatus, clearVpnState } from './vpn-detection'
// Story 32.3: Family Offline Time Enforcement
// Story 32.4: Parent Compliance Tracking
import {
  setupOfflineCheckAlarm,
  checkOfflineSchedule,
  getOfflineScheduleState,
  syncOfflineSchedule,
  clearOfflineEnforcementFromAllTabs,
  onParentTabNavigation,
  syncQueuedComplianceRecords,
  ALARM_OFFLINE_CHECK,
} from './offline-schedule-enforcement'
// Story 33.1: Focus Mode App Blocking
import {
  getFocusModeState,
  setFocusModeState,
  syncFocusModeState,
  setupFocusModeCheckAlarm,
  handleFocusModeCheckAlarm,
  shouldBlockUrl,
  injectFocusModeBlockingScript,
  clearFocusModeBlockingFromAllTabs,
  FOCUS_MODE_CHECK_ALARM,
} from './focus-mode'

/**
 * XOR encrypt/decrypt a string with a key
 * Story 13.1 AC2: Basic obfuscation for TOTP secret in local storage
 *
 * This is NOT cryptographic security - it's obfuscation to prevent
 * casual inspection of chrome.storage.local. The real security comes from:
 * 1. Chrome extension isolation
 * 2. The TOTP secret only being useful with knowledge of the algorithm
 * 3. The 6-digit codes having limited validity windows
 *
 * @param data - String to encrypt/decrypt
 * @param key - Key to XOR with (deviceId)
 * @returns XOR'd string as hex
 */
function xorEncrypt(data: string, key: string): string {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    const dataChar = data.charCodeAt(i)
    const keyChar = key.charCodeAt(i % key.length)
    result.push(dataChar ^ keyChar)
  }
  // Return as hex string for safe storage
  return result.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * XOR decrypt a hex string with a key
 * Story 13.1 AC2: Reverse of xorEncrypt
 *
 * @param hexData - Hex-encoded encrypted string
 * @param key - Key to XOR with (deviceId)
 * @returns Decrypted string
 */
function xorDecrypt(hexData: string, key: string): string {
  const bytes: number[] = []
  for (let i = 0; i < hexData.length; i += 2) {
    bytes.push(parseInt(hexData.substring(i, i + 2), 16))
  }
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    const keyChar = key.charCodeAt(i % key.length)
    result += String.fromCharCode(bytes[i] ^ keyChar)
  }
  return result
}

// Alarm names for scheduled tasks
const ALARM_SCREENSHOT_CAPTURE = 'screenshot-capture'
const ALARM_SYNC_QUEUE = 'sync-queue'
const ALARM_ALLOWLIST_SYNC = 'allowlist-sync' // Story 11.2
const ALARM_CONSENT_CHECK = 'consent-check' // Story 6.5: Periodic consent verification

// Story 31.6: Cloud Functions API endpoint
// Uses project ID from manifest or defaults to production
const FIREBASE_PROJECT_ID = 'fledgely-cns-me'
const FIREBASE_REGION = 'us-central1'
const API_BASE_URL = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`

// Consent check interval (15 minutes)
const CONSENT_CHECK_INTERVAL_MINUTES = 15

// Allowlist sync interval (24 hours)
const ALLOWLIST_SYNC_INTERVAL_HOURS = 24

// Capture interval constraints (MV3 minimum is 1 minute)
const DEFAULT_CAPTURE_INTERVAL_MINUTES = 5
const MIN_CAPTURE_INTERVAL_MINUTES = 1
const MAX_CAPTURE_INTERVAL_MINUTES = 30
const DEFAULT_SYNC_INTERVAL_MINUTES = 15

// Idle detection constants (Story 10.5)
const DEFAULT_IDLE_THRESHOLD_SECONDS = 300 // 5 minutes
const MIN_IDLE_THRESHOLD_SECONDS = 60 // 1 minute
const MAX_IDLE_THRESHOLD_SECONDS = 1800 // 30 minutes

// Current idle state (in-memory, not persisted)
let isDeviceIdle = false

// Error badge constants (Story 10.6)
const ERROR_BADGE_COLOR = '#ef4444' // Red
const CONSECUTIVE_ERRORS_THRESHOLD = 3
const CONSECUTIVE_SUCCESSES_TO_CLEAR = 5

// Protected site indicator constants (Story 11.3)
const PROTECTED_BADGE_TEXT = '✓' // Checkmark
const PROTECTED_BADGE_COLOR = '#8b5cf6' // Purple (calming)
const PROTECTED_TITLE = 'Fledgely - Private Site (not monitored)'

// Decoy mode constants (Story 11.5)
// Simple gray gradient placeholder image (1x1 pixel gray JPEG as minimal placeholder)
// In production, this would be a more innocuous-looking search engine screenshot
const DECOY_IMAGE_DATA =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAAYAH//2Q=='

/**
 * Validate and clamp capture interval to allowed range
 */
function validateCaptureInterval(minutes: number): number {
  return Math.max(MIN_CAPTURE_INTERVAL_MINUTES, Math.min(MAX_CAPTURE_INTERVAL_MINUTES, minutes))
}

/**
 * Enrollment state for device registration
 * Story 12.2: Extension QR Code Scanning
 */
export type EnrollmentState = 'not_enrolled' | 'pending' | 'enrolled'

/**
 * Pending enrollment data from QR scan
 * Story 12.2: Stored temporarily until enrollment is confirmed
 * Story 12.3: Extended with request tracking
 */
export interface EnrollmentPending {
  familyId: string
  token: string
  scannedAt: number
  requestId?: string // Added in Story 12.3 after submission
  requestStatus?: 'pending' | 'approved' | 'rejected' | 'expired' // Story 12.3
  expiresAt?: number // Story 12.3: Request expiry timestamp
}

// Extension state stored in chrome.storage.local
interface ExtensionState {
  isAuthenticated: boolean
  userId: string | null
  familyId: string | null
  childId: string | null
  lastSync: number | null
  monitoringEnabled: boolean
  captureIntervalMinutes: number
  idleThresholdSeconds: number
  showProtectedIndicator: boolean // Story 11.3: Optional visual indicator
  decoyModeEnabled: boolean // Story 11.5: Generate decoys for crisis sites
  privacyGapsEnabled: boolean // Story 7.8: Random screenshot gaps for privacy
  vpnDetected: boolean // Story 8.7: VPN Detection Transparency
  enrollmentState: EnrollmentState // Story 12.2: Device enrollment status
  pendingEnrollment: EnrollmentPending | null // Story 12.2: Pending enrollment data
  deviceId: string | null // Story 12.4: Registered device ID
  // Story 13.1: TOTP secret for offline emergency unlock
  totpSecret: string | null // Base32 encoded secret (XOR encrypted with deviceId)
  // Story 6.5: Device Consent Gate - consent status tracking
  consentStatus: 'pending' | 'granted' | 'withdrawn' | null
  activeAgreementId: string | null
  activeAgreementVersion: string | null
}

const DEFAULT_STATE: ExtensionState = {
  isAuthenticated: false,
  userId: null,
  familyId: null,
  childId: null,
  lastSync: null,
  monitoringEnabled: false,
  captureIntervalMinutes: DEFAULT_CAPTURE_INTERVAL_MINUTES,
  idleThresholdSeconds: DEFAULT_IDLE_THRESHOLD_SECONDS,
  showProtectedIndicator: true, // Story 11.3: Default to showing indicator
  decoyModeEnabled: false, // Story 11.5: Default to off (opt-in)
  privacyGapsEnabled: true, // Story 7.8: Default to enabled for privacy
  vpnDetected: false, // Story 8.7: No VPN detected initially
  enrollmentState: 'not_enrolled', // Story 12.2: Device starts as not enrolled
  pendingEnrollment: null, // Story 12.2: No pending enrollment initially
  deviceId: null, // Story 12.4: No device ID initially
  totpSecret: null, // Story 13.1: No TOTP secret initially
  // Story 6.5: Device Consent Gate
  consentStatus: null, // Not checked yet
  activeAgreementId: null,
  activeAgreementVersion: null,
}

/**
 * Validate and clamp idle threshold to allowed range
 */
function validateIdleThreshold(seconds: number): number {
  return Math.max(MIN_IDLE_THRESHOLD_SECONDS, Math.min(MAX_IDLE_THRESHOLD_SECONDS, seconds))
}

/**
 * Set up idle detection with the configured threshold
 * Story 10.5: Capture Pause During Inactivity
 */
function setupIdleDetection(thresholdSeconds: number): void {
  const validatedThreshold = validateIdleThreshold(thresholdSeconds)
  chrome.idle.setDetectionInterval(validatedThreshold)
  console.log(`[Fledgely] Idle detection set to ${validatedThreshold}s`)
}

/**
 * Start monitoring alarms when a child is connected
 * Uses chrome.alarms for MV3-compliant persistent scheduling
 */
async function startMonitoringAlarms(
  intervalMinutes: number,
  idleThreshold: number = DEFAULT_IDLE_THRESHOLD_SECONDS
): Promise<void> {
  // Validate and clamp interval to allowed range (1-30 minutes)
  const validatedInterval = validateCaptureInterval(intervalMinutes)

  // Set up idle detection (Story 10.5)
  setupIdleDetection(idleThreshold)

  // Clear any existing alarms first
  await chrome.alarms.clear(ALARM_SCREENSHOT_CAPTURE)
  await chrome.alarms.clear(ALARM_SYNC_QUEUE)

  // Create screenshot capture alarm
  // Note: MV3 minimum interval is 1 minute for repeating alarms
  await chrome.alarms.create(ALARM_SCREENSHOT_CAPTURE, {
    delayInMinutes: 1, // First capture after 1 minute
    periodInMinutes: validatedInterval,
  })
  console.log(`[Fledgely] Screenshot alarm created with ${validatedInterval}min interval`)

  // Create sync queue alarm
  await chrome.alarms.create(ALARM_SYNC_QUEUE, {
    delayInMinutes: 2, // First sync after 2 minutes
    periodInMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
  })
  console.log(`[Fledgely] Sync alarm created with ${DEFAULT_SYNC_INTERVAL_MINUTES}min interval`)
}

/**
 * Stop monitoring alarms when child is disconnected or monitoring disabled
 */
async function stopMonitoringAlarms(): Promise<void> {
  await chrome.alarms.clear(ALARM_SCREENSHOT_CAPTURE)
  await chrome.alarms.clear(ALARM_SYNC_QUEUE)
  console.log('[Fledgely] Monitoring alarms cleared')
}

/**
 * Setup consent check alarm for periodic verification
 * Story 6.5: Device Consent Gate - AC1
 *
 * Consent is checked periodically to detect:
 * - Agreement becoming active (start monitoring)
 * - Agreement being revoked (stop monitoring)
 */
async function setupConsentCheckAlarm(): Promise<void> {
  await chrome.alarms.clear(ALARM_CONSENT_CHECK)
  await chrome.alarms.create(ALARM_CONSENT_CHECK, {
    delayInMinutes: 1, // First check after 1 minute
    periodInMinutes: CONSENT_CHECK_INTERVAL_MINUTES,
  })
  console.log(
    `[Fledgely] Consent check alarm created (${CONSENT_CHECK_INTERVAL_MINUTES}min interval)`
  )
}

/**
 * Clear consent check alarm
 */
async function clearConsentCheckAlarm(): Promise<void> {
  await chrome.alarms.clear(ALARM_CONSENT_CHECK)
}

/**
 * Check consent status and update monitoring state accordingly.
 *
 * Story 6.5: Device Consent Gate
 * - AC1: Check happens on startup and periodically
 * - AC2: No agreement = no monitoring
 * - AC6: Automatic monitoring start when consent granted
 *
 * @param forceRefresh - Skip cache and fetch from server
 */
async function checkAndUpdateConsentStatus(forceRefresh = false): Promise<void> {
  const { state } = await chrome.storage.local.get('state')
  const currentState = state || DEFAULT_STATE

  // Only check consent if device is enrolled with a child
  if (
    currentState.enrollmentState !== 'enrolled' ||
    !currentState.familyId ||
    !currentState.childId ||
    !currentState.deviceId
  ) {
    console.log('[Fledgely] Consent check skipped - device not fully enrolled')
    return
  }

  const result = await checkConsentStatusWithCache(
    currentState.childId,
    currentState.familyId,
    currentState.deviceId,
    forceRefresh
  )

  if (!result.success) {
    console.warn('[Fledgely] Consent check failed:', result.error)
    // On error, preserve current state (offline-first approach)
    return
  }

  const consentStatus = result.status

  // Check if consent status changed
  const previousConsentStatus = currentState.consentStatus
  const newConsentStatus = consentStatus.consentStatus
  const consentChanged = previousConsentStatus !== newConsentStatus

  // Update state with new consent info
  const newState: ExtensionState = {
    ...currentState,
    consentStatus: newConsentStatus,
    activeAgreementId: consentStatus.agreementId,
    activeAgreementVersion: consentStatus.agreementVersion,
  }

  if (consentChanged) {
    console.log(
      `[Fledgely] Consent status changed: ${previousConsentStatus} -> ${newConsentStatus}`
    )

    if (shouldEnableMonitoring(consentStatus)) {
      // Story 6.5 AC6: Consent granted - start monitoring automatically
      console.log('[Fledgely] Consent granted - enabling monitoring')
      newState.monitoringEnabled = true
      await chrome.storage.local.set({ state: newState })
      await updateActionTitle(newState)
      await startMonitoringAlarms(newState.captureIntervalMinutes, newState.idleThresholdSeconds)
    } else {
      // Story 6.5 AC2: No consent - stop monitoring
      console.log('[Fledgely] Consent not granted - disabling monitoring')
      newState.monitoringEnabled = false
      await chrome.storage.local.set({ state: newState })
      await updateActionTitle(newState)
      await stopMonitoringAlarms()
    }
  } else {
    // No change, just update state
    await chrome.storage.local.set({ state: newState })
  }
}

/**
 * Handle consent check alarm trigger
 * Story 6.5: Device Consent Gate - AC1
 */
async function handleConsentCheckAlarm(): Promise<void> {
  console.log('[Fledgely] Consent check alarm triggered')
  await checkAndUpdateConsentStatus(false) // Use cache when available
}

/**
 * Update lastSync timestamp in state
 */
async function updateLastSync(): Promise<void> {
  const { state } = await chrome.storage.local.get('state')
  if (state) {
    const newState = { ...state, lastSync: Date.now() }
    await chrome.storage.local.set({ state: newState })
  }
}

/**
 * Create a decoy screenshot capture for crisis-protected sites
 * Story 11.5: Decoy Mode for Crisis Browsing
 * Returns a ScreenshotCapture with placeholder image and sanitized metadata
 */
function createDecoyCapture(): ScreenshotCapture {
  return {
    dataUrl: DECOY_IMAGE_DATA,
    timestamp: Date.now(),
    url: 'about:blank', // Sanitized URL - never expose protected site
    title: 'Protected', // Sanitized title - never expose protected site
    captureTimeMs: 0, // Decoy is instant
  }
}

/**
 * Maximum number of screenshots in the local queue (NFR87)
 */
const MAX_QUEUE_SIZE = 500

/**
 * Queue item for pending screenshot upload
 */
interface QueuedScreenshot {
  id: string
  capture: ScreenshotCapture
  childId: string
  queuedAt: number
  retryCount: number
  lastRetryAt: number | null
  isDecoy: boolean // Story 11.5: True if this is a decoy image for crisis protection
}

/**
 * Add a screenshot to the upload queue
 * Queue persists in chrome.storage.local for offline support
 * Story 10.6: Now logs queue overflow events
 * Story 11.5: Added isDecoy parameter for decoy mode
 */
async function queueScreenshot(
  capture: ScreenshotCapture,
  childId: string,
  isDecoy: boolean = false
): Promise<void> {
  const { screenshotQueue = [] } = await chrome.storage.local.get('screenshotQueue')

  const item: QueuedScreenshot = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    capture,
    childId,
    queuedAt: Date.now(),
    retryCount: 0,
    lastRetryAt: null,
    isDecoy,
  }

  // Add to queue
  screenshotQueue.push(item)

  // Enforce queue size limit (drop oldest items)
  if (screenshotQueue.length > MAX_QUEUE_SIZE) {
    const dropped = screenshotQueue.length - MAX_QUEUE_SIZE
    screenshotQueue.splice(0, dropped)
    console.warn(`[Fledgely] Queue overflow: dropped ${dropped} oldest screenshots`)

    // Log queue overflow event (Story 10.6)
    await logCaptureEvent('queue_overflow', false, {
      queueSize: MAX_QUEUE_SIZE,
      errorCode: ERROR_CODES.QUEUE_FULL,
    })
  }

  await chrome.storage.local.set({ screenshotQueue })
  console.log(`[Fledgely] Screenshot queued (${screenshotQueue.length} items in queue)`)
}

/**
 * Get the current queue size
 * Exported for popup to display queue status
 */
export async function getQueueSize(): Promise<number> {
  const { screenshotQueue = [] } = await chrome.storage.local.get('screenshotQueue')
  return screenshotQueue.length
}

/**
 * Process the screenshot queue - upload pending items
 * Story 10.4: Screenshot Upload to API
 * Story 10.6: Now logs all upload events
 */
async function processScreenshotQueue(): Promise<void> {
  const { screenshotQueue = [] } = await chrome.storage.local.get('screenshotQueue')

  if (screenshotQueue.length === 0) {
    console.log('[Fledgely] Queue empty, nothing to process')
    return
  }

  const remainingUploads = getRemainingUploads()
  if (remainingUploads === 0) {
    console.log('[Fledgely] Rate limit reached, will retry on next sync')
    return
  }

  // Get state for badge updates
  const { state } = await chrome.storage.local.get('state')

  // Process queue items that are ready for upload
  const now = Date.now()
  const updatedQueue: QueuedScreenshot[] = []
  let uploadsThisRun = 0
  let successCount = 0
  let failCount = 0

  for (const item of screenshotQueue) {
    // Check if we've hit the rate limit for this run
    if (uploadsThisRun >= remainingUploads) {
      updatedQueue.push(item) // Keep for later
      continue
    }

    // Check if item needs to wait for retry backoff
    if (item.lastRetryAt !== null) {
      const retryDelay = calculateRetryDelay(item.retryCount)
      if (now - item.lastRetryAt < retryDelay) {
        updatedQueue.push(item) // Not ready for retry yet
        continue
      }
    }

    // Check if max retries exceeded
    if (!shouldRetry(item.retryCount)) {
      console.warn(`[Fledgely] Dropping screenshot ${item.id} after max retries`)
      failCount++

      // Log retry exhausted event (Story 10.6)
      await logCaptureEvent('retry_exhausted', false, {
        queueSize: screenshotQueue.length,
        errorCode: ERROR_CODES.MAX_RETRIES_EXCEEDED,
      })
      continue // Don't re-add to queue
    }

    // Attempt upload
    const uploadStart = Date.now()
    const result = await uploadScreenshot(item.capture, item.childId, item.queuedAt)
    const uploadDuration = Date.now() - uploadStart
    uploadsThisRun++

    if (result.success) {
      successCount++

      // Log upload success event (Story 10.6)
      await logCaptureEvent('upload_success', true, {
        duration: uploadDuration,
        queueSize: updatedQueue.length + (screenshotQueue.length - uploadsThisRun),
      })
      // Don't add back to queue - successfully uploaded
    } else {
      if (result.shouldRetry) {
        // Update retry info and keep in queue
        updatedQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastRetryAt: now,
        })
      }
      failCount++

      // Log upload failure event (Story 10.6)
      await logCaptureEvent('upload_failed', false, {
        duration: uploadDuration,
        queueSize: updatedQueue.length + (screenshotQueue.length - uploadsThisRun),
        errorCode: ERROR_CODES.UPLOAD_NETWORK_ERROR,
      })
    }
  }

  // Save updated queue
  await chrome.storage.local.set({ screenshotQueue: updatedQueue })

  console.log(
    `[Fledgely] Queue processed: ${successCount} uploaded, ${failCount} failed, ` +
      `${updatedQueue.length} remaining`
  )

  // Update error badge after processing (Story 10.6)
  if (state) {
    await updateErrorBadge(state)
  }
}

/**
 * Handle screenshot capture triggered by alarm
 * Story 10.6: Now logs all capture events
 * Story 11.1: Checks crisis allowlist BEFORE any capture
 */
async function handleScreenshotCapture(state: ExtensionState): Promise<void> {
  if (!state.childId) {
    console.log('[Fledgely] No child connected, skipping capture')
    return
  }

  // Story 10.5: Skip capture if device is idle or locked
  if (isDeviceIdle) {
    console.log('[Fledgely] Device is idle/locked, skipping capture')
    // Note: idle_pause/resume events logged in idle listener, not here
    return
  }

  // Story 7.8: Privacy Gaps Injection
  // Skip capture if currently in a random privacy gap
  // CRITICAL: Do NOT log anything - gaps must be invisible to parents
  if (state.privacyGapsEnabled !== false) {
    try {
      const schedule = await getOrGenerateSchedule(state.childId)
      if (isInPrivacyGap(schedule, Date.now())) {
        // Silently skip - NO logging, NO special event
        // This makes privacy gaps indistinguishable from crisis gaps
        return
      }
    } catch {
      // Fail-safe: If privacy gap check fails, continue with capture
      // We don't want privacy gap failures to break monitoring
    }
  }

  // Story 11.1: Check crisis allowlist BEFORE any capture (INV-001 zero data path)
  // This check MUST happen before captureScreenshot to ensure no data is created
  try {
    // Get current tab URL for allowlist check
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (activeTab?.url) {
      const isProtected = isUrlProtected(activeTab.url)
      if (isProtected) {
        // ZERO DATA PATH: Skip real capture entirely
        // Log event but DO NOT log URL (privacy requirement)
        const queueSize = await getQueueSize()

        // Story 11.5: If decoy mode is enabled, queue a decoy instead of skipping
        if (state.decoyModeEnabled) {
          const decoyCapture = createDecoyCapture()
          await queueScreenshot(decoyCapture, state.childId, true) // isDecoy=true
          console.log('[Fledgely] Decoy queued for protected site (no gap in timeline)')
        }

        await logCaptureEvent('capture_skipped', true, {
          queueSize: state.decoyModeEnabled ? queueSize + 1 : queueSize,
          errorCode: ERROR_CODES.CRISIS_URL_PROTECTED,
        })
        // Note: We intentionally do NOT log anything about which site was protected
        return
      }
    }
  } catch {
    // Fail-safe: If we can't check the allowlist, skip capture
    console.error('[Fledgely] Crisis allowlist check failed, skipping capture (fail-safe)')
    const queueSize = await getQueueSize()
    await logCaptureEvent('capture_skipped', true, {
      queueSize,
      errorCode: ERROR_CODES.ALLOWLIST_CHECK_ERROR,
    })
    return
  }

  // Story 8.7: VPN Detection Transparency
  // Check for VPN and log if detected (non-blocking, continues capture)
  try {
    const vpnResult = await checkAndUpdateVpnStatus()
    if (vpnResult && vpnResult.vpnDetected) {
      // Update state
      const newState: ExtensionState = { ...state, vpnDetected: true }
      await chrome.storage.local.set({ state: newState })

      // Log VPN detection event (informational only)
      const vpnErrorCode =
        vpnResult.confidence === 'high'
          ? ERROR_CODES.VPN_DETECTED_HIGH
          : vpnResult.confidence === 'medium'
            ? ERROR_CODES.VPN_DETECTED_MEDIUM
            : ERROR_CODES.VPN_DETECTED_LOW
      await logCaptureEvent('vpn_detected', true, { errorCode: vpnErrorCode })
    } else if (state.vpnDetected && vpnResult && !vpnResult.vpnDetected) {
      // VPN was previously detected but now isn't - update state
      const newState: ExtensionState = { ...state, vpnDetected: false }
      await chrome.storage.local.set({ state: newState })
    }
  } catch {
    // VPN detection failure is not critical - continue with capture
  }

  const startTime = Date.now()
  const result = await captureScreenshot({ quality: 80 })
  const duration = Date.now() - startTime
  const queueSize = await getQueueSize()

  if (result.success) {
    // Queue the screenshot for upload (Story 10.4 will implement actual upload)
    await queueScreenshot(result.capture, state.childId)

    // Log success event (Story 10.6)
    await logCaptureEvent('capture_success', true, {
      duration,
      queueSize: queueSize + 1, // After adding to queue
    })

    // Update lastSync to show activity
    await updateLastSync()

    // Check if we should clear error badge
    await updateErrorBadge(state)
  } else if (result.skipped) {
    // Non-capturable URL (chrome://, etc.) - this is expected, not an error
    console.log(`[Fledgely] Capture skipped: ${result.error}`)

    // Log skipped event (Story 10.6)
    await logCaptureEvent('capture_skipped', true, {
      duration,
      queueSize,
      errorCode: ERROR_CODES.NON_CAPTURABLE_URL,
    })
  } else {
    // Actual error occurred
    console.error(`[Fledgely] Capture failed: ${result.error}`)

    // Log failure event (Story 10.6)
    await logCaptureEvent('capture_failed', false, {
      duration,
      queueSize,
      errorCode: ERROR_CODES.CAPTURE_FAILED,
    })

    // Update error badge
    await updateErrorBadge(state)
  }
}

// Update toolbar icon title based on state
async function updateActionTitle(state: ExtensionState): Promise<void> {
  const title = state.isAuthenticated
    ? state.childId
      ? `Fledgely - Monitoring Active`
      : 'Fledgely - Not Connected to Child'
    : 'Fledgely - Not Signed In'

  await chrome.action.setTitle({ title })

  // Set badge for quick status indication
  if (state.monitoringEnabled) {
    await chrome.action.setBadgeText({ text: '●' })
    await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' }) // Green
  } else if (state.isAuthenticated) {
    await chrome.action.setBadgeText({ text: '○' })
    await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }) // Amber
  } else {
    await chrome.action.setBadgeText({ text: '' })
  }
}

/**
 * Set error badge on extension icon when critical errors occur
 * Story 10.6: Capture Event Logging
 */
async function setErrorBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '!' })
  await chrome.action.setBadgeBackgroundColor({ color: ERROR_BADGE_COLOR })
}

/**
 * Set protected site badge on extension icon
 * Story 11.3: Protected Site Visual Indicator
 * NOTE: This does NOT log anything - privacy requirement (AC6)
 * @param tabId - The tab ID to set badge for (tab-specific)
 */
async function setProtectedBadge(tabId: number): Promise<void> {
  await chrome.action.setBadgeText({ text: PROTECTED_BADGE_TEXT, tabId })
  await chrome.action.setBadgeBackgroundColor({ color: PROTECTED_BADGE_COLOR, tabId })
  await chrome.action.setTitle({ title: PROTECTED_TITLE, tabId })
}

/**
 * Clear protected site badge (restore normal badge state)
 * Story 11.3: Protected Site Visual Indicator
 * NOTE: This does NOT log anything - privacy requirement (AC6)
 * @param tabId - The tab ID to clear badge for (tab-specific)
 */
async function clearProtectedBadge(tabId: number, state: ExtensionState): Promise<void> {
  // Restore normal badge state for this tab
  const title = state.isAuthenticated
    ? state.childId
      ? 'Fledgely - Monitoring Active'
      : 'Fledgely - Not Connected to Child'
    : 'Fledgely - Not Signed In'

  await chrome.action.setTitle({ title, tabId })

  if (state.monitoringEnabled) {
    await chrome.action.setBadgeText({ text: '●', tabId })
    await chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId })
  } else if (state.isAuthenticated) {
    await chrome.action.setBadgeText({ text: '○', tabId })
    await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId })
  } else {
    await chrome.action.setBadgeText({ text: '', tabId })
  }
}

/**
 * Check if a tab URL is protected and update badge accordingly
 * Story 11.3: Protected Site Visual Indicator
 * NOTE: This does NOT log anything - privacy requirement (AC6)
 */
async function updateProtectedBadge(tabId: number, url: string): Promise<void> {
  const { state } = await chrome.storage.local.get('state')
  const currentState = state || DEFAULT_STATE

  // Only show indicator if enabled in settings
  if (!currentState.showProtectedIndicator) {
    return
  }

  const isProtected = isUrlProtected(url)
  if (isProtected) {
    await setProtectedBadge(tabId)
  } else {
    await clearProtectedBadge(tabId, currentState)
  }
}

/**
 * Check and update error badge based on event log
 * Called after logging events to show/clear error badge
 * Story 10.6: Capture Event Logging
 */
async function updateErrorBadge(state: ExtensionState): Promise<void> {
  // Only show error badge if monitoring is enabled
  if (!state.monitoringEnabled) {
    return
  }

  // Check if we should show error badge
  const hasErrors = await hasConsecutiveCriticalErrors(CONSECUTIVE_ERRORS_THRESHOLD)
  if (hasErrors) {
    await setErrorBadge()
    return
  }

  // Check if we should clear error badge (enough consecutive successes)
  const successCount = await countConsecutiveSuccesses()
  if (successCount >= CONSECUTIVE_SUCCESSES_TO_CLEAR) {
    // Restore normal badge
    await updateActionTitle(state)
  }
}

// Initialize extension state on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Fledgely] Extension installed:', details.reason)

  // Story 11.1: Initialize crisis allowlist on install/update
  await initializeAllowlist()
  console.log(`[Fledgely] Crisis allowlist initialized (v${getAllowlistVersion()})`)

  // Story 11.2: Set up allowlist sync alarm (24h interval)
  await chrome.alarms.create(ALARM_ALLOWLIST_SYNC, {
    delayInMinutes: 60, // First sync 1 hour after install
    periodInMinutes: ALLOWLIST_SYNC_INTERVAL_HOURS * 60,
  })
  console.log('[Fledgely] Allowlist sync alarm created')

  // Story 19.4: Set up health metrics sync alarm (5 min interval)
  setupHealthSyncAlarm()

  // Story 29.2: Initialize screen time tracking (15 min sync interval)
  await initScreenTimeTracking()

  // Story 31.1: Initialize time limit warning check (1 min interval)
  setupWarningCheckAlarm()

  // Story 32.3: Initialize offline schedule check (1 min interval)
  setupOfflineCheckAlarm()

  // Story 33.1: Initialize focus mode check alarm (1 min interval)
  setupFocusModeCheckAlarm()

  if (details.reason === 'install') {
    // First installation - initialize state and open onboarding
    await chrome.storage.local.set({ state: DEFAULT_STATE })
    console.log('[Fledgely] Initialized extension state')

    // Open onboarding page
    await chrome.tabs.create({
      url: chrome.runtime.getURL('onboarding.html'),
    })
    console.log('[Fledgely] Opened onboarding page')

    // Set initial toolbar state
    await updateActionTitle(DEFAULT_STATE)
  } else if (details.reason === 'update') {
    // Extension updated - preserve existing state
    console.log('[Fledgely] Extension updated from', details.previousVersion)

    // Update toolbar with current state
    const { state } = await chrome.storage.local.get('state')
    await updateActionTitle(state || DEFAULT_STATE)
  }
})

// Handle startup (browser restart)
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Fledgely] Browser started, checking state')

  // Story 11.1: Initialize crisis allowlist on startup
  await initializeAllowlist()
  console.log(`[Fledgely] Crisis allowlist initialized (v${getAllowlistVersion()})`)

  // Story 11.2: Set up allowlist sync alarm (24h interval)
  await chrome.alarms.create(ALARM_ALLOWLIST_SYNC, {
    delayInMinutes: 60, // First sync 1 hour after startup
    periodInMinutes: ALLOWLIST_SYNC_INTERVAL_HOURS * 60,
  })
  console.log('[Fledgely] Allowlist sync alarm created')

  // Story 19.4: Set up health metrics sync alarm (5 min interval)
  setupHealthSyncAlarm()

  // Story 29.2: Initialize screen time tracking (15 min sync interval)
  await initScreenTimeTracking()

  // Story 31.1: Initialize time limit warning check (1 min interval)
  setupWarningCheckAlarm()

  // Story 32.3: Initialize offline schedule check (1 min interval)
  setupOfflineCheckAlarm()

  // Story 33.1: Initialize focus mode check alarm (1 min interval)
  setupFocusModeCheckAlarm()

  // Story 11.2: Check if allowlist needs immediate sync
  if (await isAllowlistStale()) {
    console.log('[Fledgely] Allowlist is stale, syncing now')
    await syncAllowlistFromServer()
  }

  const { state } = await chrome.storage.local.get('state')

  // Story 12.6: Validate enrollment state on startup
  const enrollmentValidation = validateEnrollmentState(state)

  if (!enrollmentValidation.valid) {
    // Story 12.6 AC5: Invalid/corrupted state - clear and reset
    console.warn('[Fledgely] Enrollment state validation failed:', enrollmentValidation.error)
    const resetState: ExtensionState = {
      ...DEFAULT_STATE,
      enrollmentState: 'not_enrolled',
      familyId: null,
      deviceId: null,
      pendingEnrollment: null,
    }
    await chrome.storage.local.set({ state: resetState })
    await updateActionTitle(resetState)
    console.log('[Fledgely] Invalid enrollment state cleared, prompting re-enrollment')
    return
  }

  // Story 12.6 AC1, AC2: Log enrollment status for debugging
  if (isEnrolled(enrollmentValidation)) {
    console.log('[Fledgely] Enrolled device restored:', {
      familyId: enrollmentValidation.familyId,
      deviceId: enrollmentValidation.deviceId,
      childId: enrollmentValidation.childId,
    })

    // Story 12.6 AC4: Optionally verify enrollment with server (non-blocking)
    // This runs in the background and doesn't block startup
    verifyDeviceEnrollment(enrollmentValidation.familyId!, enrollmentValidation.deviceId!)
      .then(async (serverResult) => {
        if (!serverResult.valid) {
          // Story 12.6 AC5: Server says enrollment is invalid
          console.warn('[Fledgely] Server rejected enrollment:', serverResult.status)

          if (serverResult.status === 'not_found' || serverResult.status === 'revoked') {
            // Clear local state and prompt re-enrollment
            const resetState: ExtensionState = {
              ...DEFAULT_STATE,
              enrollmentState: 'not_enrolled',
              familyId: null,
              deviceId: null,
              pendingEnrollment: null,
            }
            await chrome.storage.local.set({ state: resetState })
            await updateActionTitle(resetState)
            console.log('[Fledgely] Enrollment revoked by server, cleared local state')
          }
        } else {
          console.log('[Fledgely] Server confirmed enrollment is valid')
        }
      })
      .catch((error) => {
        // Non-fatal error - offline-first approach
        console.warn('[Fledgely] Server verification failed (continuing anyway):', error)
      })
  } else {
    console.log('[Fledgely] Device not enrolled, state:', enrollmentValidation.enrollmentState)
  }

  // Update toolbar with current state
  await updateActionTitle(state || DEFAULT_STATE)

  // Story 6.5: Set up consent check alarm for enrolled devices
  if (isEnrolled(enrollmentValidation) && enrollmentValidation.childId) {
    await setupConsentCheckAlarm()

    // Story 6.5 AC1: Check consent on startup (force refresh to get latest)
    console.log('[Fledgely] Checking consent status on startup')
    await checkAndUpdateConsentStatus(true)
  }

  // Story 6.5: Only resume monitoring if consent is granted
  // The checkAndUpdateConsentStatus call above will handle starting monitoring if consent is valid
  // We no longer auto-start based on monitoringEnabled flag alone
  const updatedState = (await chrome.storage.local.get('state')).state || DEFAULT_STATE
  if (
    updatedState?.isAuthenticated &&
    updatedState?.monitoringEnabled &&
    updatedState?.childId &&
    updatedState?.consentStatus === 'granted'
  ) {
    // Resume monitoring alarms if they were active AND consent is granted
    console.log('[Fledgely] Resuming monitoring for child (consent granted):', updatedState.childId)
    await startMonitoringAlarms(
      updatedState.captureIntervalMinutes || DEFAULT_CAPTURE_INTERVAL_MINUTES,
      updatedState.idleThresholdSeconds || DEFAULT_IDLE_THRESHOLD_SECONDS
    )
  } else if (updatedState?.monitoringEnabled && updatedState?.consentStatus !== 'granted') {
    console.log('[Fledgely] Monitoring was enabled but consent not granted - waiting for consent')
  }
})

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Fledgely] Received message:', message.type)

  switch (message.type) {
    case 'GET_STATE':
      chrome.storage.local.get('state').then(({ state }) => {
        sendResponse({ state: state || DEFAULT_STATE })
      })
      return true // Keep channel open for async response

    case 'SET_STATE':
      chrome.storage.local.set({ state: message.state }).then(() => {
        sendResponse({ success: true })
      })
      return true

    case 'AUTH_STATE_CHANGED':
      // Update extension state and badge when auth changes
      chrome.storage.local.get('state').then(async ({ state }) => {
        const newState: ExtensionState = {
          ...(state || DEFAULT_STATE),
          isAuthenticated: message.authState?.isAuthenticated || false,
          userId: message.authState?.userId || null,
        }
        await chrome.storage.local.set({ state: newState })
        await updateActionTitle(newState)
        sendResponse({ success: true })
      })
      return true

    case 'CHILD_CONNECTED':
      // Update state when child is connected
      // Story 6.5: Do NOT start monitoring immediately - check consent first
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newState: ExtensionState = {
          ...currentState,
          childId: message.childId,
          // Story 6.5 AC2: Don't enable monitoring until consent is verified
          monitoringEnabled: false, // Will be set to true by checkAndUpdateConsentStatus if consent granted
        }
        await chrome.storage.local.set({ state: newState })
        await updateActionTitle(newState)

        // Story 6.5: Set up consent check alarm and check consent now
        await setupConsentCheckAlarm()

        // Force refresh to get latest consent status
        await checkAndUpdateConsentStatus(true)

        // Story 31.1: Sync time limit configuration
        if (currentState.familyId) {
          await syncTimeLimitConfig(message.childId, currentState.familyId)
        }

        // Story 33.1: Sync focus mode state
        if (currentState.familyId) {
          await syncFocusModeState(message.childId, currentState.familyId)
        }

        console.log('[Fledgely] Connected to child:', message.childName)
        sendResponse({ success: true })
      })
      return true

    case 'CHILD_DISCONNECTED':
      // Update state when child is disconnected and stop monitoring alarms
      chrome.storage.local.get('state').then(async ({ state }) => {
        const newState: ExtensionState = {
          ...(state || DEFAULT_STATE),
          childId: null,
          monitoringEnabled: false,
          // Story 6.5: Clear consent status when child disconnected
          consentStatus: null,
          activeAgreementId: null,
          activeAgreementVersion: null,
        }
        await chrome.storage.local.set({ state: newState })
        await updateActionTitle(newState)

        // Stop monitoring alarms
        await stopMonitoringAlarms()

        // Story 6.5: Clear consent check alarm and cache
        await clearConsentCheckAlarm()
        await clearConsentCache()

        // Story 7.8: Clear privacy gap schedule
        await clearSchedule()

        // Story 8.7: Clear VPN detection state
        await clearVpnState()

        // Story 31.1: Clear warning state
        await clearWarningState()

        // Story 32.3: Clear offline enforcement
        await clearOfflineEnforcementFromAllTabs()

        // Story 33.1: Clear focus mode blocking
        await clearFocusModeBlockingFromAllTabs()
        await setFocusModeState({
          isActive: false,
          durationType: null,
          startedAt: null,
          durationMs: null,
          childId: null,
          familyId: null,
          lastSyncedAt: 0,
        })

        console.log('[Fledgely] Disconnected from child')
        sendResponse({ success: true })
      })
      return true

    case 'UPDATE_CAPTURE_INTERVAL':
      // Update capture interval and restart alarm with new timing
      // Story 10.2: Configurable Capture Intervals
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newInterval = validateCaptureInterval(
          message.intervalMinutes || DEFAULT_CAPTURE_INTERVAL_MINUTES
        )

        const newState: ExtensionState = {
          ...currentState,
          captureIntervalMinutes: newInterval,
        }
        await chrome.storage.local.set({ state: newState })

        // If monitoring is active, restart alarms with new interval
        if (currentState.monitoringEnabled) {
          await startMonitoringAlarms(newInterval, currentState.idleThresholdSeconds)
          console.log(`[Fledgely] Capture interval updated to ${newInterval}min`)
        }

        sendResponse({ success: true, newInterval })
      })
      return true

    case 'UPDATE_IDLE_THRESHOLD':
      // Update idle threshold for inactivity detection
      // Story 10.5: Capture Pause During Inactivity
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newThreshold = validateIdleThreshold(
          message.thresholdSeconds || DEFAULT_IDLE_THRESHOLD_SECONDS
        )

        const newState: ExtensionState = {
          ...currentState,
          idleThresholdSeconds: newThreshold,
        }
        await chrome.storage.local.set({ state: newState })

        // Update idle detection with new threshold
        setupIdleDetection(newThreshold)
        console.log(`[Fledgely] Idle threshold updated to ${newThreshold}s`)

        sendResponse({ success: true, newThreshold })
      })
      return true

    case 'GET_CAPTURE_LOGS':
      // Get capture event logs for debug panel (parent only)
      // Story 10.6: Capture Event Logging - AC5 requires parent authentication
      chrome.storage.local.get('state').then(async ({ state }) => {
        if (!state?.isAuthenticated) {
          sendResponse({ success: false, error: 'Not authenticated' })
          return
        }
        try {
          const events = await getCaptureEvents(message.limit || 100)
          sendResponse({ success: true, events })
        } catch (error) {
          sendResponse({ success: false, error: String(error) })
        }
      })
      return true

    case 'CLEAR_CAPTURE_LOGS':
      // Clear capture event logs (parent only)
      // Story 10.6: Capture Event Logging - AC5 requires parent authentication
      chrome.storage.local.get('state').then(async ({ state }) => {
        if (!state?.isAuthenticated) {
          sendResponse({ success: false, error: 'Not authenticated' })
          return
        }
        try {
          await clearCaptureEvents()
          sendResponse({ success: true })
        } catch (error) {
          sendResponse({ success: false, error: String(error) })
        }
      })
      return true

    case 'GET_CAPTURE_STATS':
      // Get capture event statistics (parent only)
      // Story 10.6: Capture Event Logging - AC5 requires parent authentication
      chrome.storage.local.get('state').then(async ({ state }) => {
        if (!state?.isAuthenticated) {
          sendResponse({ success: false, error: 'Not authenticated' })
          return
        }
        try {
          const stats = await getEventStats(message.hours || 24)
          sendResponse({ success: true, stats })
        } catch (error) {
          sendResponse({ success: false, error: String(error) })
        }
      })
      return true

    case 'UPDATE_PROTECTED_INDICATOR':
      // Update protected site indicator setting
      // Story 11.3: Protected Site Visual Indicator - AC5 optional setting
      // NOTE: This does NOT log anything - privacy requirement (AC6)
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newState: ExtensionState = {
          ...currentState,
          showProtectedIndicator: Boolean(message.showIndicator),
        }
        await chrome.storage.local.set({ state: newState })
        // Note: No logging of this setting change (AC6)
        sendResponse({ success: true, showIndicator: newState.showProtectedIndicator })
      })
      return true

    case 'UPDATE_DECOY_MODE':
      // Update decoy mode setting
      // Story 11.5: Decoy Mode for Crisis Browsing - AC5 opt-in requirement
      // Child must explicitly enable this feature
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newState: ExtensionState = {
          ...currentState,
          decoyModeEnabled: Boolean(message.enabled),
        }
        await chrome.storage.local.set({ state: newState })
        console.log(`[Fledgely] Decoy mode ${newState.decoyModeEnabled ? 'enabled' : 'disabled'}`)
        sendResponse({ success: true, decoyModeEnabled: newState.decoyModeEnabled })
      })
      return true

    case 'UPDATE_PRIVACY_GAPS':
      // Update privacy gaps setting
      // Story 7.8: Privacy Gaps Injection - AC5 default enabled
      // NOTE: No logging of this setting change (privacy requirement)
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newState: ExtensionState = {
          ...currentState,
          privacyGapsEnabled: Boolean(message.enabled),
        }
        await chrome.storage.local.set({ state: newState })
        // Note: We do NOT log this change - privacy requirement
        sendResponse({ success: true, privacyGapsEnabled: newState.privacyGapsEnabled })
      })
      return true

    case 'SET_PENDING_ENROLLMENT':
      // Store pending enrollment from QR code scan
      // Story 12.2: Extension QR Code Scanning - AC6 success state transition
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newState: ExtensionState = {
          ...currentState,
          enrollmentState: 'pending',
          pendingEnrollment: {
            familyId: message.familyId,
            token: message.token,
            scannedAt: Date.now(),
          },
        }
        await chrome.storage.local.set({ state: newState })
        console.log('[Fledgely] Pending enrollment stored:', message.familyId)
        sendResponse({ success: true })
      })
      return true

    case 'CLEAR_PENDING_ENROLLMENT':
      // Clear pending enrollment (e.g., on cancel or error)
      // Story 12.2: Extension QR Code Scanning
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newState: ExtensionState = {
          ...currentState,
          enrollmentState: 'not_enrolled',
          pendingEnrollment: null,
        }
        await chrome.storage.local.set({ state: newState })
        console.log('[Fledgely] Pending enrollment cleared')
        sendResponse({ success: true })
      })
      return true

    case 'GET_ENROLLMENT_STATE':
      // Get current enrollment state
      // Story 12.2: Extension QR Code Scanning - AC1 enrollment state detection
      chrome.storage.local.get('state').then(({ state }) => {
        const currentState = state || DEFAULT_STATE
        sendResponse({
          enrollmentState: currentState.enrollmentState,
          pendingEnrollment: currentState.pendingEnrollment,
          familyId: currentState.familyId,
        })
      })
      return true

    case 'GET_CONSENT_STATUS':
      // Get current consent status
      // Story 6.5: Device Consent Gate - AC3 consent status for popup
      chrome.storage.local.get('state').then(({ state }) => {
        const currentState = state || DEFAULT_STATE
        sendResponse({
          consentStatus: currentState.consentStatus,
          activeAgreementId: currentState.activeAgreementId,
          activeAgreementVersion: currentState.activeAgreementVersion,
          childId: currentState.childId,
          monitoringEnabled: currentState.monitoringEnabled,
        })
      })
      return true

    case 'REFRESH_CONSENT_STATUS':
      // Force refresh consent status from server
      // Story 6.5: Device Consent Gate - AC6 manual refresh option
      checkAndUpdateConsentStatus(true)
        .then(() => chrome.storage.local.get('state'))
        .then(({ state }) => {
          const currentState = state || DEFAULT_STATE
          sendResponse({
            success: true,
            consentStatus: currentState.consentStatus,
            activeAgreementId: currentState.activeAgreementId,
            activeAgreementVersion: currentState.activeAgreementVersion,
            monitoringEnabled: currentState.monitoringEnabled,
          })
        })
        .catch((error) => {
          sendResponse({ success: false, error: String(error) })
        })
      return true

    case 'GET_TIME_LIMIT_STATUS':
      // Get current time limit status for popup display
      // Story 31.1: Countdown Warning System - AC4
      getTimeLimitStatus()
        .then((status) => {
          sendResponse({ success: true, status })
        })
        .catch((error) => {
          sendResponse({ success: false, error: String(error) })
        })
      return true

    case 'SYNC_TIME_LIMITS':
      // Sync time limit configuration from Firestore
      // Story 31.1: Countdown Warning System
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        if (!currentState.childId || !currentState.familyId) {
          sendResponse({ success: false, error: 'No child connected' })
          return
        }
        try {
          const config = await syncTimeLimitConfig(currentState.childId, currentState.familyId)
          sendResponse({ success: true, config })
        } catch (error) {
          sendResponse({ success: false, error: String(error) })
        }
      })
      return true

    case 'UPDATE_ENROLLMENT_REQUEST':
      // Update pending enrollment with request ID after submission
      // Story 12.3: Device-to-Device Enrollment Approval - AC1 request tracking
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        if (!currentState.pendingEnrollment) {
          sendResponse({ success: false, error: 'No pending enrollment' })
          return
        }
        const newState: ExtensionState = {
          ...currentState,
          pendingEnrollment: {
            ...currentState.pendingEnrollment,
            requestId: message.requestId,
            requestStatus: 'pending',
            expiresAt: message.expiresAt,
          },
        }
        await chrome.storage.local.set({ state: newState })
        console.log('[Fledgely] Enrollment request updated:', message.requestId)
        sendResponse({ success: true })
      })
      return true

    case 'UPDATE_ENROLLMENT_STATUS':
      // Update enrollment status when approved/rejected/expired
      // Story 12.3: Device-to-Device Enrollment Approval - AC4, AC5, AC6
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE

        const newStatus = message.status as 'approved' | 'rejected' | 'expired'

        if (newStatus === 'approved') {
          // AC6: Approval success - transition to enrolled state
          // Note: This path is now deprecated - ENROLLMENT_COMPLETE is preferred
          const newState: ExtensionState = {
            ...currentState,
            enrollmentState: 'enrolled',
            familyId: currentState.pendingEnrollment?.familyId || null,
            pendingEnrollment: null,
          }
          await chrome.storage.local.set({ state: newState })
          console.log('[Fledgely] Enrollment approved - device enrolled')
        } else {
          // AC5: Rejection or AC4: Expiry - clear pending enrollment
          const newState: ExtensionState = {
            ...currentState,
            enrollmentState: 'not_enrolled',
            pendingEnrollment: null,
          }
          await chrome.storage.local.set({ state: newState })
          console.log(`[Fledgely] Enrollment ${newStatus} - cleared pending state`)
        }

        sendResponse({ success: true, status: newStatus })
      })
      return true

    case 'ENROLLMENT_COMPLETE':
      // Complete enrollment with deviceId after successful registration
      // Story 12.4: Device Registration in Firestore - AC4 credential storage
      // Story 13.1: Store TOTP secret for offline emergency unlock
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE

        // Story 13.1 AC2: Encrypt totpSecret with deviceId before storing
        // Using XOR encryption for basic obfuscation in local storage
        let encryptedTotpSecret: string | null = null
        if (message.totpSecret && message.deviceId) {
          encryptedTotpSecret = xorEncrypt(message.totpSecret, message.deviceId)
        }

        const newState: ExtensionState = {
          ...currentState,
          enrollmentState: 'enrolled',
          familyId: message.familyId,
          deviceId: message.deviceId,
          pendingEnrollment: null,
          totpSecret: encryptedTotpSecret, // Story 13.1: Store encrypted TOTP secret
        }
        await chrome.storage.local.set({ state: newState })
        console.log(
          '[Fledgely] Enrollment complete - deviceId:',
          message.deviceId,
          'hasTotpSecret:',
          !!encryptedTotpSecret
        )
        sendResponse({ success: true })
      })
      return true

    case 'ENROLLMENT_INVALIDATED':
      // Story 12.6: Enrollment invalidated (server rejected or device removed)
      // AC5: Clear invalid state and prompt re-enrollment
      // Story 13.1: Also clear TOTP secret
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newState: ExtensionState = {
          ...currentState,
          enrollmentState: 'not_enrolled',
          familyId: null,
          deviceId: null,
          childId: null,
          pendingEnrollment: null,
          monitoringEnabled: false,
          totpSecret: null, // Story 13.1: Clear TOTP secret on invalidation
        }
        await chrome.storage.local.set({ state: newState })
        await updateActionTitle(newState)
        await stopMonitoringAlarms()
        console.log('[Fledgely] Enrollment invalidated, state cleared')
        sendResponse({ success: true, reason: message.reason || 'unknown' })
      })
      return true

    case 'CLEAR_DEVICE_STATE':
      // Story 12.6 AC6: Explicit device removal clears all enrollment state
      // Story 13.1: Also clear TOTP secret
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newState: ExtensionState = {
          ...currentState,
          enrollmentState: 'not_enrolled',
          familyId: null,
          deviceId: null,
          childId: null,
          pendingEnrollment: null,
          monitoringEnabled: false,
          totpSecret: null, // Story 13.1: Clear TOTP secret on device removal
        }
        await chrome.storage.local.set({ state: newState })
        await updateActionTitle(newState)
        await stopMonitoringAlarms()
        console.log('[Fledgely] Device state cleared for re-enrollment')
        sendResponse({ success: true })
      })
      return true

    case 'GET_TOTP_SECRET':
      // Story 13.3: Get decrypted TOTP secret for emergency unlock
      getTotpSecret().then((secret) => {
        sendResponse({ secret })
      })
      return true

    case 'EMERGENCY_UNLOCK_SUCCESS':
      // Story 13.3: Handle successful emergency unlock
      console.log('[Fledgely] Emergency unlock successful')
      // Future: Could trigger temporary unlock state changes
      sendResponse({ success: true })
      return true

    case 'EMERGENCY_UNLOCK_LOCKOUT':
      // Story 13.3: Handle lockout from too many failed attempts
      console.log('[Fledgely] Emergency unlock lockout triggered until:', message.lockoutEnd)
      // Future: Could queue notification for parent
      sendResponse({ success: true })
      return true

    case 'CHECK_OFFLINE_STATE':
      // Story 32.3: Check if offline blocking is active for content script
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        if (!currentState.familyId) {
          sendResponse({ isBlocked: false })
          return
        }

        try {
          const scheduleState = await getOfflineScheduleState()
          sendResponse({
            isBlocked: scheduleState.isInOfflineWindow,
            minutesUntilEnd: scheduleState.minutesUntilEnd,
          })
        } catch {
          sendResponse({ isBlocked: false })
        }
      })
      return true

    case 'GET_OFFLINE_STATE':
      // Story 32.3: Get offline schedule state for content script countdown
      getOfflineScheduleState()
        .then((scheduleState) => {
          sendResponse({
            minutesUntilEnd: scheduleState.minutesUntilEnd,
            isInOfflineWindow: scheduleState.isInOfflineWindow,
          })
        })
        .catch(() => {
          sendResponse({ minutesUntilEnd: null, isInOfflineWindow: false })
        })
      return true

    case 'SYNC_OFFLINE_SCHEDULE':
      // Story 32.3: Sync offline schedule from Firestore
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        if (!currentState.familyId) {
          sendResponse({ success: false, error: 'No family connected' })
          return
        }
        try {
          const schedule = await syncOfflineSchedule(currentState.familyId)
          sendResponse({ success: true, schedule })
        } catch (error) {
          sendResponse({ success: false, error: String(error) })
        }
      })
      return true

    case 'GET_FOCUS_MODE_STATE':
      // Story 33.1: Get focus mode state for content script
      getFocusModeState()
        .then((focusModeState) => {
          sendResponse({
            isActive: focusModeState.isActive,
            durationType: focusModeState.durationType,
            startedAt: focusModeState.startedAt,
            durationMs: focusModeState.durationMs,
          })
        })
        .catch(() => {
          sendResponse({ isActive: false })
        })
      return true

    case 'SYNC_FOCUS_MODE':
      // Story 33.1: Sync focus mode state from Firestore
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        if (!currentState.childId || !currentState.familyId) {
          sendResponse({ success: false, error: 'No child connected' })
          return
        }
        try {
          const focusModeState = await syncFocusModeState(
            currentState.childId,
            currentState.familyId
          )
          sendResponse({ success: true, state: focusModeState })
        } catch (error) {
          sendResponse({ success: false, error: String(error) })
        }
      })
      return true

    case 'CHECK_TIME_LIMIT_STATE':
      // Story 31.4: Check if enforcement is active for content script
      // Story 31.7: Also check for active override
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        if (!currentState.childId || !currentState.familyId || !currentState.deviceId) {
          sendResponse({ isBlocked: false })
          return
        }

        try {
          // Use override-aware enforcement check
          const result = await checkEnforcementWithOverride(
            currentState.childId,
            currentState.familyId,
            currentState.deviceId
          )

          const config = await getTimeLimitConfig()
          const accommodations = config?.accommodations

          sendResponse({
            isBlocked: result.isEnforcing,
            accommodations: accommodations
              ? {
                  calmingColorsEnabled: accommodations.calmingColorsEnabled,
                  gradualTransitionEnabled: accommodations.gradualTransitionEnabled,
                }
              : undefined,
            // Story 31.7 AC4: Include override info for display
            overrideInfo: result.overrideInfo,
          })
        } catch {
          sendResponse({ isBlocked: false })
        }
      })
      return true

    case 'CHECK_ACTIVE_OVERRIDE':
      // Story 31.7: Check for active override for content script
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        if (!currentState.childId || !currentState.familyId || !currentState.deviceId) {
          sendResponse({ hasActiveOverride: false })
          return
        }

        try {
          const overrideInfo = await checkForActiveOverride(
            currentState.childId,
            currentState.familyId,
            currentState.deviceId
          )
          sendResponse(overrideInfo)
        } catch {
          sendResponse({ hasActiveOverride: false })
        }
      })
      return true

    case 'REQUEST_TIME_EXTENSION':
      // Story 31.6: Handle time extension request from blocked page
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        if (!currentState.childId || !currentState.familyId || !currentState.deviceId) {
          sendResponse({ success: false, error: 'not_enrolled', message: 'Device not enrolled' })
          return
        }

        const reason = message.reason || 'five_more_minutes'
        console.log('[Fledgely] Time extension requested:', { reason })

        try {
          // Call the cloud function to create the request
          const response = await fetch(`${API_BASE_URL}/requestTimeExtension`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              childId: currentState.childId,
              familyId: currentState.familyId,
              deviceId: currentState.deviceId,
              reason,
              extensionMinutes: 30,
            }),
          })

          const result = await response.json()

          if (response.status === 429) {
            // AC6: Daily limit reached
            sendResponse({
              success: false,
              error: 'limit_reached',
              message: result.message || "You've already used your daily requests.",
            })
          } else if (response.ok && result.success) {
            sendResponse({
              success: true,
              requestId: result.requestId,
              message: 'Request sent to parent',
            })
          } else {
            sendResponse({
              success: false,
              error: 'request_failed',
              message: result.message || 'Failed to send request',
            })
          }
        } catch (error) {
          console.error('[Fledgely] Time extension request error:', error)
          sendResponse({
            success: false,
            error: 'network_error',
            message: 'Unable to send request. Please ask a parent to help.',
          })
        }
      })
      return true

    case 'CHECK_TIME_EXTENSION_STATUS':
      // Story 31.6: Poll for status of a time extension request
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        if (!currentState.familyId || !currentState.deviceId) {
          sendResponse({ success: false, error: 'not_enrolled' })
          return
        }

        const requestId = message.requestId
        if (!requestId) {
          sendResponse({ success: false, error: 'missing_request_id' })
          return
        }

        try {
          // Include deviceId for security verification
          const response = await fetch(
            `${API_BASE_URL}/getTimeExtensionStatus?requestId=${requestId}&familyId=${currentState.familyId}&deviceId=${currentState.deviceId}`
          )

          if (!response.ok) {
            sendResponse({ success: false, error: 'request_failed' })
            return
          }

          const result = await response.json()
          sendResponse({
            success: true,
            status: result.status,
            extensionMinutes: result.extensionMinutes,
          })
        } catch (error) {
          console.error('[Fledgely] Check time extension status error:', error)
          sendResponse({ success: false, error: 'network_error' })
        }
      })
      return true

    default:
      sendResponse({ error: 'Unknown message type' })
      return false
  }
})

// Alarm handler for scheduled tasks (MV3 persistent scheduling)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[Fledgely] Alarm fired:', alarm.name)

  // Story 11.2: Allowlist sync runs regardless of monitoring state
  if (alarm.name === ALARM_ALLOWLIST_SYNC) {
    console.log('[Fledgely] Allowlist sync alarm triggered')
    await syncAllowlistFromServer()
    return
  }

  // Story 6.5: Consent check runs regardless of monitoring state
  // (it controls whether monitoring should be enabled/disabled)
  if (alarm.name === ALARM_CONSENT_CHECK) {
    await handleConsentCheckAlarm()
    return
  }

  // Story 29.2: Screen time sync - requires monitoring and consent
  if (alarm.name === ALARM_SCREEN_TIME_SYNC) {
    console.log('[Fledgely] Screen time sync alarm triggered')
    const { state: syncState } = await chrome.storage.local.get('state')
    if (syncState?.enrolled && syncState?.consentStatus === 'granted') {
      await syncScreenTime()
    } else {
      console.log('[Fledgely] Screen time sync skipped - not enrolled or no consent')
    }
    return
  }

  // Story 31.1: Time limit warning check - requires monitoring and consent
  // Story 31.4: Also check and enforce time limits
  // Story 31.7: Check for override before enforcing
  if (alarm.name === ALARM_WARNING_CHECK) {
    const { state: warningState } = await chrome.storage.local.get('state')
    if (warningState?.monitoringEnabled && warningState?.consentStatus === 'granted') {
      await checkAndTriggerWarnings()

      // Story 31.4/31.7: Check enforcement with override awareness
      if (warningState.childId && warningState.familyId && warningState.deviceId) {
        const result = await checkEnforcementWithOverride(
          warningState.childId,
          warningState.familyId,
          warningState.deviceId
        )
        if (result.isEnforcing) {
          await enforceOnAllTabs()
        }
      } else {
        // Fall back to simple enforcement check if IDs not available
        const isEnforcing = await checkEnforcementStatus()
        if (isEnforcing) {
          await enforceOnAllTabs()
        }
      }
    }
    return
  }

  // Story 32.3: Offline schedule check - enforces family offline time
  // Story 32.4: Also syncs queued parent compliance records
  if (alarm.name === ALARM_OFFLINE_CHECK) {
    console.log('[Fledgely] Offline schedule check alarm triggered')
    const { state: offlineState } = await chrome.storage.local.get('state')
    // Only check if enrolled with a family (consent not required for offline time)
    if (offlineState?.enrollmentState === 'enrolled' && offlineState?.familyId) {
      await checkOfflineSchedule()
      // Story 32.4: Sync any queued compliance records
      await syncQueuedComplianceRecords()
    }
    return
  }

  // Story 33.1: Focus mode check - enforces app blocking during focus mode
  if (alarm.name === FOCUS_MODE_CHECK_ALARM) {
    console.log('[Fledgely] Focus mode check alarm triggered')
    const { state: focusState } = await chrome.storage.local.get('state')
    // Only check if enrolled with a child and consent is granted
    if (focusState?.enrollmentState === 'enrolled' && focusState?.childId && focusState?.familyId) {
      await handleFocusModeCheckAlarm()
    }
    return
  }

  // Check if monitoring is still enabled before processing capture/upload alarms
  const { state } = await chrome.storage.local.get('state')
  if (!state?.monitoringEnabled) {
    console.log('[Fledgely] Monitoring disabled, ignoring alarm')
    return
  }

  // Story 6.5 AC2: Double-check consent before any capture
  // This is a safety net - consent should already be checked periodically
  if (state?.consentStatus !== 'granted') {
    console.log('[Fledgely] Consent not granted, skipping capture')
    return
  }

  switch (alarm.name) {
    case ALARM_SCREENSHOT_CAPTURE:
      // Story 10.1: Screenshot Capture Mechanism
      console.log('[Fledgely] Screenshot capture alarm triggered')
      await handleScreenshotCapture(state)
      break

    case ALARM_SYNC_QUEUE: {
      // Story 10.4: Screenshot Upload to API
      console.log('[Fledgely] Sync queue alarm triggered')
      await processScreenshotQueue()
      await updateLastSync()
      break
    }
  }
})

// Idle state change listener (Story 10.5, Story 10.6 logging, Story 29.2 screen time)
chrome.idle.onStateChanged.addListener(async (newState) => {
  const previousState = isDeviceIdle

  // Update idle state based on chrome.idle state
  // "active" = user is active, "idle" = user is idle, "locked" = screen is locked
  isDeviceIdle = newState !== 'active'

  if (previousState !== isDeviceIdle) {
    if (isDeviceIdle) {
      console.log(`[Fledgely] Device became ${newState} - capture paused`)

      // Log idle pause event (Story 10.6)
      const queueSize = await getQueueSize()
      await logCaptureEvent('idle_pause', true, { queueSize })
    } else {
      console.log('[Fledgely] Device became active - capture resumed')

      // Log idle resume event (Story 10.6)
      const queueSize = await getQueueSize()
      await logCaptureEvent('idle_resume', true, { queueSize })
    }
  }

  // Story 29.2: Update screen time tracking on idle state change
  try {
    await handleIdleStateChanged(newState)
  } catch {
    // Screen time tracking failures are non-critical
  }
})

// Tab navigation listener (Story 11.3: Protected Site Visual Indicator)
// Updates badge when user navigates to/from protected sites
// NOTE: This does NOT log anything - privacy requirement (AC6)
// Story 29.2: Also handles screen time tracking for URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only check on complete load to avoid flickering
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      await updateProtectedBadge(tabId, tab.url)
    } catch {
      // Silently fail - badge updates are non-critical
    }

    // Story 31.4/31.7: Enforce time limits on newly loaded tabs (with override check)
    try {
      const { state: tabState } = await chrome.storage.local.get('state')
      if (tabState?.childId && tabState?.familyId && tabState?.deviceId) {
        const result = await checkEnforcementWithOverride(
          tabState.childId,
          tabState.familyId,
          tabState.deviceId
        )
        if (result.isEnforcing) {
          const config = await getTimeLimitConfig()
          const educationExemption = config?.educationExemption || DEFAULT_EDUCATION_EXEMPTION
          if (shouldBlockTab(tab.url, true, educationExemption)) {
            await injectBlockingScript(tabId)
          }
        }
      } else {
        // Fall back to simple check
        const isEnforcing = await checkEnforcementStatus()
        if (isEnforcing) {
          const config = await getTimeLimitConfig()
          const educationExemption = config?.educationExemption || DEFAULT_EDUCATION_EXEMPTION
          if (shouldBlockTab(tab.url, true, educationExemption)) {
            await injectBlockingScript(tabId)
          }
        }
      }
    } catch {
      // Enforcement failures are non-critical for navigation
    }
  }

  // Story 29.2: Track screen time on URL changes
  if (changeInfo.url) {
    try {
      await handleTabUpdated(tabId, changeInfo, tab)
    } catch {
      // Screen time tracking failures are non-critical
    }
  }

  // Story 32.4: Track parent activity during offline window
  if (changeInfo.url || changeInfo.status === 'complete') {
    try {
      await onParentTabNavigation(tabId, tab.url || '')
    } catch {
      // Parent activity tracking failures are non-critical
    }
  }

  // Story 33.1: Enforce focus mode blocking on tab load
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const focusModeState = await getFocusModeState()
      if (focusModeState.isActive && shouldBlockUrl(tab.url)) {
        await injectFocusModeBlockingScript(tabId)
      }
    } catch {
      // Focus mode blocking failures are non-critical
    }
  }
})

// Tab activation listener (Story 11.3: Protected Site Visual Indicator)
// Updates badge when user switches to a different tab
// NOTE: This does NOT log anything - privacy requirement (AC6)
// Story 29.2: Also handles screen time tracking for tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab.url) {
      await updateProtectedBadge(activeInfo.tabId, tab.url)
    }
  } catch {
    // Silently fail - badge updates are non-critical
  }

  // Story 29.2: Track screen time on tab switch
  try {
    await handleTabActivated(activeInfo.tabId)
  } catch {
    // Screen time tracking failures are non-critical
  }
})

/**
 * Story 7.6: Crisis Search Redirection
 *
 * Detects when child searches for crisis-related terms and shows
 * an optional interstitial with helpful crisis resources.
 *
 * CRITICAL PRIVACY:
 * - Search query is NEVER stored or logged
 * - Only detection result (category) is used
 * - No parent notification is generated
 */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only process main frame navigations
  if (details.frameId !== 0) {
    return
  }

  try {
    // Check if this is a search URL and extract the query
    const searchResult = extractSearchQuery(details.url)
    if (!searchResult.isSearch || !searchResult.query) {
      return
    }

    // Check if query indicates crisis intent
    // PRIVACY: Query is checked in memory only - NEVER stored
    const crisisResult = isCrisisSearch(searchResult.query)
    if (!crisisResult.isCrisis || !crisisResult.category) {
      return
    }

    // Get relevant resources for this crisis category
    const resources = getRelevantResources(crisisResult.category)

    // Send message to content script to show interstitial
    // NOTE: We do NOT log this - privacy requirement (AC4)
    try {
      await chrome.tabs.sendMessage(details.tabId, {
        type: 'SHOW_CRISIS_INTERSTITIAL',
        category: crisisResult.category,
        resources,
      })
    } catch {
      // Content script may not be ready yet - silently ignore
      // This is non-critical functionality
    }
  } catch {
    // Silently fail - crisis redirect is optional functionality
    // We never want this to break the browsing experience
  }
})

/**
 * Get the decrypted TOTP secret from storage
 * Story 13.1 Task 3.4: getTotpSecret() function to decrypt stored secret
 *
 * @returns Decrypted TOTP secret or null if not available
 */
export async function getTotpSecret(): Promise<string | null> {
  const { state } = await chrome.storage.local.get('state')
  if (!state?.totpSecret || !state?.deviceId) {
    return null
  }
  try {
    return xorDecrypt(state.totpSecret, state.deviceId)
  } catch {
    console.error('[Fledgely] Failed to decrypt TOTP secret')
    return null
  }
}

/**
 * Story 13.5: Emergency Unlock Audit Trail
 *
 * Sync queued unlock and lockout events to the audit log when online.
 * Events are queued locally during offline operation and synced when
 * network connectivity is restored.
 */

// Storage keys for event queues
const UNLOCK_EVENT_QUEUE_KEY = 'unlockEventQueue'
const LOCKOUT_EVENT_QUEUE_KEY = 'lockoutEventQueue'

// Alarm for periodic queue sync check
const ALARM_AUDIT_SYNC = 'fledgely-audit-sync'
const AUDIT_SYNC_INTERVAL_MINUTES = 5

/**
 * Initialize audit trail sync
 * Story 13.5: Set up connectivity monitoring and periodic sync
 */
async function initAuditSync(): Promise<void> {
  // Set up periodic sync alarm
  await chrome.alarms.create(ALARM_AUDIT_SYNC, {
    periodInMinutes: AUDIT_SYNC_INTERVAL_MINUTES,
  })

  // Sync immediately if online
  if (navigator.onLine) {
    await checkAndSyncEventQueues()
  }

  console.log('[Fledgely] Audit sync initialized')
}

/**
 * Check and sync queued events to audit log
 * Story 13.5 AC5: Process all queued events when online
 */
async function checkAndSyncEventQueues(): Promise<void> {
  if (!navigator.onLine) {
    console.log('[Fledgely] Offline - skipping audit sync')
    return
  }

  const { state } = await chrome.storage.local.get('state')
  if (!state?.familyId || !state?.deviceId) {
    console.log('[Fledgely] Not enrolled - skipping audit sync')
    return
  }

  try {
    // Process unlock events
    const unlockResult = await chrome.storage.local.get(UNLOCK_EVENT_QUEUE_KEY)
    const unlockEvents = unlockResult[UNLOCK_EVENT_QUEUE_KEY] || []

    if (unlockEvents.length > 0) {
      console.log(`[Fledgely] Syncing ${unlockEvents.length} unlock events`)
      for (const event of unlockEvents) {
        await syncAuditEvent(state.familyId, {
          type: 'emergency_unlock',
          deviceId: state.deviceId,
          timestamp: event.timestamp,
          metadata: {
            unlockType: event.unlockType,
          },
        })
      }
      // Clear queue after successful sync
      await chrome.storage.local.remove(UNLOCK_EVENT_QUEUE_KEY)
      console.log('[Fledgely] Unlock events synced and cleared')
    }

    // Process lockout events
    const lockoutResult = await chrome.storage.local.get(LOCKOUT_EVENT_QUEUE_KEY)
    const lockoutEvents = lockoutResult[LOCKOUT_EVENT_QUEUE_KEY] || []

    if (lockoutEvents.length > 0) {
      console.log(`[Fledgely] Syncing ${lockoutEvents.length} lockout events`)
      for (const event of lockoutEvents) {
        await syncAuditEvent(state.familyId, {
          type: 'lockout_triggered',
          deviceId: state.deviceId,
          timestamp: event.timestamp,
          metadata: {
            attemptCount: event.attemptCount,
            lockoutDuration: event.lockoutDuration,
          },
        })
      }
      // Clear queue after successful sync
      await chrome.storage.local.remove(LOCKOUT_EVENT_QUEUE_KEY)
      console.log('[Fledgely] Lockout events synced and cleared')
    }
  } catch (error) {
    console.error('[Fledgely] Audit sync error:', error)
    // Keep events in queue for retry
  }
}

/**
 * Sync a single audit event to Firestore via web dashboard API
 * Story 13.5 AC1, AC2, AC3: Sync events without code values
 *
 * Note: This uses the web dashboard API endpoint for audit logging.
 * In production, this would POST to /api/audit with the auth token.
 * For now, we store events locally for the dashboard to read.
 */
async function syncAuditEvent(
  familyId: string,
  event: {
    type: string
    deviceId: string
    timestamp: number
    metadata: Record<string, unknown>
  }
): Promise<void> {
  // Store in local audit log for dashboard to sync
  // (Full Firestore integration will be in web dashboard)
  const localAuditKey = 'localAuditLog'
  const result = await chrome.storage.local.get(localAuditKey)
  const auditLog = result[localAuditKey] || []

  auditLog.push({
    ...event,
    familyId,
    syncedAt: null, // Will be set when synced to Firestore
  })

  await chrome.storage.local.set({ [localAuditKey]: auditLog })
  console.log(`[Fledgely] Audit event stored: ${event.type}`)
}

// Handle audit sync alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_AUDIT_SYNC) {
    await checkAndSyncEventQueues()
  }
})

// Initialize audit sync on service worker startup
initAuditSync().catch((error) => {
  console.error('[Fledgely] Failed to initialize audit sync:', error)
})

/**
 * Story 19.5: Extension Tamper Detection (AC6)
 *
 * Detect when the extension is being disabled, suspended, or has permissions revoked.
 * Send final status update to mark device as 'unenrolled' before losing ability to communicate.
 */

/**
 * Send final status update to Firestore to mark device as unenrolled
 * Best-effort - may fail if network unavailable
 */
async function syncFinalStatus(
  reason: 'disabled' | 'permissions_revoked' | 'suspended'
): Promise<void> {
  try {
    const { state } = await chrome.storage.local.get('state')
    if (!state?.deviceId || !state?.familyId) {
      console.log('[Fledgely] No enrollment - skipping final status sync')
      return
    }

    // Use the health sync endpoint to update status
    const response = await fetch(
      'https://us-central1-fledgely-cns-me.cloudfunctions.net/syncDeviceHealth',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: state.deviceId,
          familyId: state.familyId,
          metrics: {
            status: 'unenrolled',
            unenrollReason: reason,
            collectedAt: Date.now(),
          },
        }),
      }
    )

    if (response.ok) {
      console.log(`[Fledgely] Final status sent: ${reason}`)
    } else {
      console.error('[Fledgely] Final status sync failed:', response.status)
    }
  } catch (error) {
    // Best effort - may fail if network unavailable
    console.error('[Fledgely] Failed to send final status:', error)
  }
}

// Story 19.5 AC6 Task 4.1: Detect extension being disabled/suspended
// Note: onSuspend is called when service worker is being terminated
// This is our last chance to send a status update before losing communication
chrome.runtime.onSuspend.addListener(async () => {
  console.log('[Fledgely] Extension being suspended/disabled')

  try {
    // Send final status update - best effort
    await syncFinalStatus('suspended')
  } catch (error) {
    // Best effort - nothing we can do if this fails during shutdown
    console.error('[Fledgely] Failed to send suspend notification:', error)
  }
})

// Story 19.5 AC6 Task 4.3: Handle permission revocation
// If critical permissions are removed, we can no longer monitor effectively
chrome.permissions.onRemoved.addListener(async (permissions) => {
  console.log('[Fledgely] Permissions removed:', permissions)

  // Check if critical permissions were removed
  const criticalPermissions = ['tabs', 'activeTab']
  const removedCritical = permissions.permissions?.some((p) => criticalPermissions.includes(p))

  if (removedCritical) {
    console.log('[Fledgely] Critical permissions revoked - marking as unenrolled')
    await syncFinalStatus('permissions_revoked')
  }
})

// Export for testing
export type { ExtensionState }
export { DEFAULT_STATE, xorEncrypt, xorDecrypt, checkAndSyncEventQueues, syncFinalStatus }
