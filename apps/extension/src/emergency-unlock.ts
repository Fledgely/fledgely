/**
 * Emergency Unlock Page - Story 13.3, 13.4
 *
 * Handles emergency code entry for offline device unlock.
 * Validates TOTP codes locally without network connectivity.
 *
 * Requirements (Story 13.3):
 * - AC1: Emergency unlock button shows numeric keypad
 * - AC2: Local code validation against stored TOTP secret
 * - AC3: Valid code unlocks device immediately
 * - AC4: Invalid code shows error with remaining attempts
 * - AC5: Unlock event queued for sync when online
 * - AC6: Works without network connectivity
 *
 * Requirements (Story 13.4):
 * - AC1-3: Tiered lockout (3→5min, 6→30min, 10→24hr)
 * - AC4: Lockout persistence across restarts
 * - AC5: Lockout timer display
 * - AC6: Successful unlock resets counter
 * - AC7: Lockout event queuing for parent notification
 */

import { verifyTotpCode } from './totp-utils'

/**
 * Tiered brute force protection thresholds (Story 13.4)
 * - 3 attempts: 5 minute lockout
 * - 6 attempts: 30 minute lockout
 * - 10 attempts: 24 hour lockout
 */
const LOCKOUT_THRESHOLDS = [
  { attempts: 3, duration: 5 * 60 * 1000 }, // 5 minutes
  { attempts: 6, duration: 30 * 60 * 1000 }, // 30 minutes
  { attempts: 10, duration: 24 * 60 * 60 * 1000 }, // 24 hours
]
const LOCKOUT_STORAGE_KEY = 'emergencyUnlockLockout'
const ATTEMPTS_STORAGE_KEY = 'emergencyUnlockAttempts'
const LOCKOUT_EVENTS_KEY = 'lockoutEventQueue'

/**
 * Unlock event structure for sync queue
 */
interface UnlockEvent {
  type: 'emergency_unlock'
  deviceId: string
  timestamp: number
  unlockType: 'totp'
}

/**
 * Lockout event structure for parent notification (Story 13.4 AC7)
 */
interface LockoutEvent {
  type: 'lockout_triggered'
  deviceId: string
  timestamp: number
  lockoutDuration: number
  attemptCount: number
}

/**
 * Attempt tracking for brute force protection
 */
interface AttemptTracker {
  count: number
  lastAttempt: number
}

/**
 * Get the lockout duration based on attempt count (Story 13.4 AC1-3)
 * - 3 attempts: 5 minutes
 * - 6 attempts: 30 minutes
 * - 10+ attempts: 24 hours
 */
function getLockoutDuration(attemptCount: number): number {
  // Find the highest matching threshold
  for (let i = LOCKOUT_THRESHOLDS.length - 1; i >= 0; i--) {
    if (attemptCount >= LOCKOUT_THRESHOLDS[i].attempts) {
      return LOCKOUT_THRESHOLDS[i].duration
    }
  }
  return 0
}

/**
 * Get remaining attempts until next lockout threshold
 */
function getAttemptsUntilNextLockout(attemptCount: number): number {
  for (const threshold of LOCKOUT_THRESHOLDS) {
    if (attemptCount < threshold.attempts) {
      return threshold.attempts - attemptCount
    }
  }
  // Already at max lockout, but still count remaining until next trigger
  return 1 // Always show at least 1 remaining
}

/**
 * DOM Elements
 */
let codeDigits: HTMLElement[]
let messageEl: HTMLElement
let attemptsDisplay: HTMLElement
let attemptsText: HTMLElement
let entryView: HTMLElement
let successView: HTMLElement
let lockoutView: HTMLElement
let lockoutTimer: HTMLElement

/**
 * State
 */
let currentCode = ''
let isProcessing = false
let attemptCount = 0

/**
 * Initialize the emergency unlock page
 */
function init(): void {
  // Get DOM elements
  codeDigits = Array.from(document.querySelectorAll('.code-digit'))
  messageEl = document.getElementById('message')!
  attemptsDisplay = document.getElementById('attempts-display')!
  attemptsText = document.getElementById('attempts-text')!
  entryView = document.getElementById('entry-view')!
  successView = document.getElementById('success-view')!
  lockoutView = document.getElementById('lockout-view')!
  lockoutTimer = document.getElementById('lockout-timer')!

  // Load attempt count from storage
  loadAttemptCount()

  // Set up event listeners for keypad buttons
  document.querySelectorAll('.key[data-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = (btn as HTMLElement).dataset.key
      if (key) handleKeyPress(key)
    })
  })

  // Clear button
  document.getElementById('clear-btn')?.addEventListener('click', handleClear)

  // Backspace button
  document.getElementById('backspace-btn')?.addEventListener('click', handleBackspace)

  // Cancel button
  document.getElementById('cancel-btn')?.addEventListener('click', handleCancel)

  // Keyboard input support
  document.addEventListener('keydown', handleKeyboardInput)

  // Check for existing lockout
  checkLockout()
}

/**
 * Load attempt count from chrome.storage.local
 */
async function loadAttemptCount(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(ATTEMPTS_STORAGE_KEY)
    const tracker: AttemptTracker = result[ATTEMPTS_STORAGE_KEY] || { count: 0, lastAttempt: 0 }
    attemptCount = tracker.count
    updateAttemptsDisplay()
  } catch (error) {
    console.error('[EmergencyUnlock] Failed to load attempt count:', error)
  }
}

/**
 * Save attempt count to chrome.storage.local
 */
async function saveAttemptCount(): Promise<void> {
  try {
    const tracker: AttemptTracker = {
      count: attemptCount,
      lastAttempt: Date.now(),
    }
    await chrome.storage.local.set({ [ATTEMPTS_STORAGE_KEY]: tracker })
  } catch (error) {
    console.error('[EmergencyUnlock] Failed to save attempt count:', error)
  }
}

/**
 * Reset attempt count (on successful unlock)
 */
async function resetAttemptCount(): Promise<void> {
  attemptCount = 0
  try {
    await chrome.storage.local.remove(ATTEMPTS_STORAGE_KEY)
  } catch (error) {
    console.error('[EmergencyUnlock] Failed to reset attempt count:', error)
  }
}

/**
 * Check if user is locked out
 */
async function checkLockout(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(LOCKOUT_STORAGE_KEY)
    const lockoutEnd = result[LOCKOUT_STORAGE_KEY] as number | undefined

    if (lockoutEnd && Date.now() < lockoutEnd) {
      showLockout(lockoutEnd)
    }
  } catch (error) {
    console.error('[EmergencyUnlock] Failed to check lockout:', error)
  }
}

/**
 * Show lockout view with countdown
 */
function showLockout(lockoutEnd: number): void {
  entryView.classList.add('hidden')
  successView.classList.add('hidden')
  lockoutView.classList.remove('hidden')

  const updateTimer = (): void => {
    const remaining = Math.max(0, lockoutEnd - Date.now())

    if (remaining <= 0) {
      // Lockout expired, reload page
      window.location.reload()
      return
    }

    // Story 13.4 AC5: Format as HH:MM:SS for long lockouts, MM:SS for short
    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)

    if (hours > 0) {
      lockoutTimer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      lockoutTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    setTimeout(updateTimer, 1000)
  }

  updateTimer()
}

/**
 * Handle numeric key press
 */
function handleKeyPress(key: string): void {
  if (isProcessing || currentCode.length >= 6) return

  currentCode += key
  updateCodeDisplay()

  // Auto-submit when 6 digits entered
  if (currentCode.length === 6) {
    setTimeout(() => validateCode(), 100)
  }
}

/**
 * Handle clear button
 */
function handleClear(): void {
  if (isProcessing) return

  currentCode = ''
  updateCodeDisplay()
  clearMessage()
}

/**
 * Handle backspace button
 */
function handleBackspace(): void {
  if (isProcessing || currentCode.length === 0) return

  currentCode = currentCode.slice(0, -1)
  updateCodeDisplay()
  clearMessage()
}

/**
 * Handle cancel button
 */
function handleCancel(): void {
  window.close()
}

/**
 * Handle keyboard input
 */
function handleKeyboardInput(event: KeyboardEvent): void {
  if (isProcessing) return

  if (/^\d$/.test(event.key)) {
    handleKeyPress(event.key)
  } else if (event.key === 'Backspace') {
    handleBackspace()
  } else if (event.key === 'Escape') {
    handleCancel()
  } else if (event.key === 'Enter' && currentCode.length === 6) {
    validateCode()
  }
}

/**
 * Update the visual code display
 */
function updateCodeDisplay(): void {
  codeDigits.forEach((digit, index) => {
    const value = currentCode[index] || ''
    digit.textContent = value ? '*' : ''
    digit.classList.toggle('filled', value !== '')
    digit.classList.remove('error', 'success')
  })
}

/**
 * Update attempts display
 */
function updateAttemptsDisplay(): void {
  if (attemptCount > 0) {
    const remaining = getAttemptsUntilNextLockout(attemptCount)
    attemptsText.textContent = `${remaining} attempt${remaining !== 1 ? 's' : ''} until lockout`
    attemptsDisplay.classList.remove('hidden')

    if (remaining <= 1) {
      attemptsDisplay.classList.add('danger')
      attemptsDisplay.classList.remove('warning')
    } else if (remaining <= 2) {
      attemptsDisplay.classList.add('warning')
      attemptsDisplay.classList.remove('danger')
    } else {
      attemptsDisplay.classList.remove('warning', 'danger')
    }
  } else {
    attemptsDisplay.classList.add('hidden')
  }
}

/**
 * Show message
 */
function showMessage(text: string, type: 'error' | 'success'): void {
  messageEl.textContent = text
  messageEl.className = `message ${type}`
}

/**
 * Clear message
 */
function clearMessage(): void {
  messageEl.textContent = ''
  messageEl.className = 'message'
}

/**
 * Show error state on code digits
 */
function showCodeError(): void {
  codeDigits.forEach((digit) => {
    digit.classList.add('error')
  })
}

/**
 * Show success state on code digits
 */
function showCodeSuccess(): void {
  codeDigits.forEach((digit) => {
    digit.classList.add('success')
    digit.classList.remove('error')
  })
}

/**
 * Get the decrypted TOTP secret from storage via background script
 */
async function getTotpSecret(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TOTP_SECRET' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[EmergencyUnlock] Failed to get TOTP secret:', chrome.runtime.lastError)
        resolve(null)
        return
      }
      resolve(response?.secret || null)
    })
  })
}

/**
 * Get device ID from storage via background script
 */
async function getDeviceId(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[EmergencyUnlock] Failed to get state:', chrome.runtime.lastError)
        resolve(null)
        return
      }
      resolve(response?.state?.deviceId || null)
    })
  })
}

/**
 * Queue unlock event for sync when online
 * AC5: Unlock event is queued for sync
 */
async function queueUnlockEvent(deviceId: string): Promise<void> {
  const event: UnlockEvent = {
    type: 'emergency_unlock',
    deviceId,
    timestamp: Date.now(),
    unlockType: 'totp',
  }

  try {
    const result = await chrome.storage.local.get('unlockEventQueue')
    const queue: UnlockEvent[] = result.unlockEventQueue || []
    queue.push(event)
    await chrome.storage.local.set({ unlockEventQueue: queue })
    console.log('[EmergencyUnlock] Unlock event queued for sync')
  } catch (error) {
    console.error('[EmergencyUnlock] Failed to queue unlock event:', error)
  }
}

/**
 * Validate the entered code against TOTP secret
 * AC2: Local code validation against stored TOTP secret
 */
async function validateCode(): Promise<void> {
  if (isProcessing || currentCode.length !== 6) return

  isProcessing = true
  clearMessage()

  try {
    // Get TOTP secret
    const secret = await getTotpSecret()

    if (!secret) {
      showMessage('Unable to verify code. Please contact your parent.', 'error')
      showCodeError()
      isProcessing = false
      return
    }

    // Validate code locally (AC6: works without network)
    const isValid = await verifyTotpCode(secret, currentCode)

    if (isValid) {
      // AC3: Valid code unlocks device immediately
      await handleValidCode()
    } else {
      // AC4: Invalid code shows error with remaining attempts
      await handleInvalidCode()
    }
  } catch (error) {
    console.error('[EmergencyUnlock] Validation error:', error)
    showMessage('An error occurred. Please try again.', 'error')
    showCodeError()
  } finally {
    isProcessing = false
  }
}

/**
 * Handle valid code - unlock device
 */
async function handleValidCode(): Promise<void> {
  showCodeSuccess()
  showMessage('Code verified!', 'success')

  // Reset attempt count
  await resetAttemptCount()

  // Get device ID for event queuing
  const deviceId = await getDeviceId()

  if (deviceId) {
    // AC5: Queue unlock event for sync
    await queueUnlockEvent(deviceId)
  }

  // Notify background script of unlock
  chrome.runtime.sendMessage({ type: 'EMERGENCY_UNLOCK_SUCCESS' })

  // Show success view
  setTimeout(() => {
    entryView.classList.add('hidden')
    successView.classList.remove('hidden')

    // Auto-close after 3 seconds
    setTimeout(() => {
      window.close()
    }, 3000)
  }, 500)
}

/**
 * Handle invalid code - show error and track attempts
 */
async function handleInvalidCode(): Promise<void> {
  showCodeError()
  attemptCount++
  await saveAttemptCount()

  // Story 13.4: Get tiered lockout duration based on attempt count
  const lockoutDuration = getLockoutDuration(attemptCount)

  if (lockoutDuration > 0) {
    // Trigger tiered lockout (Story 13.4 AC1-3)
    const lockoutEnd = Date.now() + lockoutDuration

    await chrome.storage.local.set({ [LOCKOUT_STORAGE_KEY]: lockoutEnd })
    showLockout(lockoutEnd)

    // Story 13.4 AC7: Queue lockout event for parent notification
    await queueLockoutEvent(lockoutDuration, attemptCount)

    // Notify background script of lockout
    chrome.runtime.sendMessage({
      type: 'EMERGENCY_UNLOCK_LOCKOUT',
      lockoutEnd,
      attemptCount,
      lockoutDuration,
    })
  } else {
    const remaining = getAttemptsUntilNextLockout(attemptCount)
    showMessage(
      `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} until lockout.`,
      'error'
    )
    updateAttemptsDisplay()

    // Clear code after showing error
    setTimeout(() => {
      currentCode = ''
      updateCodeDisplay()
    }, 1500)
  }
}

/**
 * Queue lockout event for parent notification (Story 13.4 AC7)
 */
async function queueLockoutEvent(lockoutDuration: number, attempts: number): Promise<void> {
  const deviceId = await getDeviceId()
  if (!deviceId) return

  const event: LockoutEvent = {
    type: 'lockout_triggered',
    deviceId,
    timestamp: Date.now(),
    lockoutDuration,
    attemptCount: attempts,
  }

  try {
    const result = await chrome.storage.local.get(LOCKOUT_EVENTS_KEY)
    const queue: LockoutEvent[] = result[LOCKOUT_EVENTS_KEY] || []
    queue.push(event)
    await chrome.storage.local.set({ [LOCKOUT_EVENTS_KEY]: queue })
  } catch (error) {
    // Non-critical: event queuing failure shouldn't block lockout
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
