/**
 * Fledgely Chrome Extension - Popup UI Script
 *
 * Handles popup interactions and communicates with background service.
 *
 * Story 9.3: Extension Authentication
 * Story 9.4: Family Connection & Child Selection
 * Story 12.2: Extension QR Code Scanning
 */

import { signIn, signOut, getAuthState, AuthState } from './auth'
import {
  initializeCamera,
  startScanning,
  stopCamera,
  validateEnrollmentPayload,
} from './qr-scanner'
import {
  submitEnrollmentRequest,
  pollEnrollmentStatus,
  registerDevice,
  EnrollmentRequestStatus,
} from './enrollment-service'

// Enrollment state type (matches background.ts)
type EnrollmentState = 'not_enrolled' | 'pending' | 'enrolled'

// Mock family data for development
// Real data will come from Firestore in Epic 12
interface Child {
  id: string
  name: string
  age: number
  color: string
  hasActiveAgreement: boolean
}

const MOCK_CHILDREN: Child[] = [
  { id: 'child-1', name: 'Emma', age: 12, color: '#ec4899', hasActiveAgreement: true },
  { id: 'child-2', name: 'Liam', age: 10, color: '#3b82f6', hasActiveAgreement: true },
  { id: 'child-3', name: 'Olivia', age: 8, color: '#22c55e', hasActiveAgreement: false },
]

// State
let selectedChildId: string | null = null
let connectedChild: Child | null = null
let isScanning = false
let stopPolling: (() => void) | null = null // Story 12.3: Cleanup function for polling

// DOM Elements - Not Enrolled (Story 12.2)
const stateNotEnrolled = document.getElementById('state-not-enrolled')!
const statePendingEnrollment = document.getElementById('state-pending-enrollment')!
const scannerContainer = document.getElementById('scanner-container')!
const scannerPlaceholder = document.getElementById('scanner-placeholder')!
const scannerVideo = document.getElementById('scanner-video') as HTMLVideoElement
const scannerCanvas = document.getElementById('scanner-canvas') as HTMLCanvasElement
const scannerOverlay = document.getElementById('scanner-overlay')!
const scannerStatus = document.getElementById('scanner-status')!
const enrollmentError = document.getElementById('enrollment-error')!
const startScanBtn = document.getElementById('start-scan-btn') as HTMLButtonElement
const scanBtnText = document.getElementById('scan-btn-text')!
const scanBtnSpinner = document.getElementById('scan-btn-spinner')!
const retryScanBtn = document.getElementById('retry-scan-btn') as HTMLButtonElement
const cancelEnrollmentBtn = document.getElementById('cancel-enrollment-btn') as HTMLButtonElement

// DOM Elements - Not Authenticated
const stateNotAuth = document.getElementById('state-not-auth')!
const signInBtn = document.getElementById('sign-in-btn') as HTMLButtonElement
const signInText = document.getElementById('sign-in-text')!
const signInSpinner = document.getElementById('sign-in-spinner')!
const errorContainer = document.getElementById('error-container')!

// DOM Elements - Authenticated No Child
const stateAuthNoChild = document.getElementById('state-auth-no-child')!
const userAvatar1 = document.getElementById('user-avatar-1')!
const userName1 = document.getElementById('user-name-1')!
const userEmail1 = document.getElementById('user-email-1')!
const childList = document.getElementById('child-list')!
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement
const signOutBtn1 = document.getElementById('sign-out-btn-1') as HTMLButtonElement

// DOM Elements - Authenticated Connected
const stateAuthConnected = document.getElementById('state-auth-connected')!
const connectedChildAvatar = document.getElementById('connected-child-avatar')!
const connectedChildName = document.getElementById('connected-child-name')!
const lastSyncTime = document.getElementById('last-sync-time')!
const changeChildBtn = document.getElementById('change-child-btn') as HTMLButtonElement
const signOutBtn2 = document.getElementById('sign-out-btn-2') as HTMLButtonElement

// Story 6.5: DOM Elements - Consent Pending State
const stateConsentPending = document.getElementById('state-consent-pending')!
const consentPendingChildAvatar = document.getElementById('consent-pending-child-avatar')!
const consentPendingChildName = document.getElementById('consent-pending-child-name')!
const refreshConsentBtn = document.getElementById('refresh-consent-btn') as HTMLButtonElement
const refreshConsentText = document.getElementById('refresh-consent-text')!
const refreshConsentSpinner = document.getElementById('refresh-consent-spinner')!
const consentPendingChangeChild = document.getElementById(
  'consent-pending-change-child'
) as HTMLButtonElement

/**
 * Hide all state sections
 */
function hideAllStates(): void {
  stateNotEnrolled.classList.add('hidden')
  statePendingEnrollment.classList.add('hidden')
  stateNotAuth.classList.add('hidden')
  stateAuthNoChild.classList.add('hidden')
  stateAuthConnected.classList.add('hidden')
  stateConsentPending.classList.add('hidden') // Story 6.5
}

/**
 * Story 6.5: Get consent status from background
 */
interface ConsentStatusResponse {
  consentStatus: 'pending' | 'granted' | 'withdrawn' | null
  activeAgreementId: string | null
  activeAgreementVersion: string | null
  childId: string | null
  monitoringEnabled: boolean
}

async function getConsentStatus(): Promise<ConsentStatusResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_CONSENT_STATUS' }, (response) => {
      resolve({
        consentStatus: response?.consentStatus || null,
        activeAgreementId: response?.activeAgreementId || null,
        activeAgreementVersion: response?.activeAgreementVersion || null,
        childId: response?.childId || null,
        monitoringEnabled: response?.monitoringEnabled || false,
      })
    })
  })
}

/**
 * Story 6.5: Refresh consent status from server
 */
async function refreshConsentStatus(): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'REFRESH_CONSENT_STATUS' }, () => {
      resolve()
    })
  })
}

/**
 * Story 6.5: Set refresh consent button loading state
 */
function setRefreshConsentLoading(loading: boolean): void {
  refreshConsentBtn.disabled = loading
  if (loading) {
    refreshConsentText.classList.add('hidden')
    refreshConsentSpinner.classList.remove('hidden')
  } else {
    refreshConsentText.classList.remove('hidden')
    refreshConsentSpinner.classList.add('hidden')
  }
}

/**
 * Story 6.5: Handle refresh consent button click
 */
async function handleRefreshConsent(): Promise<void> {
  setRefreshConsentLoading(true)
  try {
    await refreshConsentStatus()
    // Re-check UI state after refresh
    await updateUI(await getAuthState())
  } catch (error) {
    console.error('[Fledgely Popup] Consent refresh error:', error)
  } finally {
    setRefreshConsentLoading(false)
  }
}

/**
 * Get enrollment state from background
 */
async function getEnrollmentState(): Promise<{
  enrollmentState: EnrollmentState
  familyId: string | null
}> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_ENROLLMENT_STATE' }, (response) => {
      resolve({
        enrollmentState: response?.enrollmentState || 'not_enrolled',
        familyId: response?.familyId || null,
      })
    })
  })
}

/**
 * Show enrollment error
 */
function showEnrollmentError(message: string): void {
  enrollmentError.textContent = message
  enrollmentError.classList.remove('hidden')
  scannerStatus.textContent = 'Scan failed'
  scannerStatus.className = 'scanner-status'
}

/**
 * Hide enrollment error
 */
function hideEnrollmentError(): void {
  enrollmentError.classList.add('hidden')
  enrollmentError.textContent = ''
}

/**
 * Set scan button loading state
 */
function setScanLoading(loading: boolean): void {
  startScanBtn.disabled = loading
  if (loading) {
    scanBtnText.classList.add('hidden')
    scanBtnSpinner.classList.remove('hidden')
  } else {
    scanBtnText.classList.remove('hidden')
    scanBtnSpinner.classList.add('hidden')
  }
}

/**
 * Handle successful QR code detection
 * AC3, AC4, AC5, AC6
 */
async function handleQRCodeDetected(data: string): Promise<void> {
  // Stop scanning
  isScanning = false
  stopCamera()

  // Validate the payload
  const result = validateEnrollmentPayload(data)

  if (!result.valid) {
    // Show error based on error code
    let errorMessage = result.errorMessage || 'Invalid code - please try again'

    // AC5: Expired token handling
    if (result.errorCode === 'EXPIRED_TOKEN') {
      errorMessage = 'Code expired - generate a new one from the dashboard'
    }

    showEnrollmentError(errorMessage)

    // Show retry button
    startScanBtn.classList.add('hidden')
    retryScanBtn.classList.remove('hidden')

    // Reset UI
    scannerVideo.classList.add('hidden')
    scannerOverlay.classList.add('hidden')
    scannerPlaceholder.classList.remove('hidden')

    return
  }

  // AC6: Success - store pending enrollment
  const payload = result.payload!

  scannerStatus.textContent = 'QR code detected!'
  scannerStatus.className = 'scanner-status success'

  // Send to background to store pending enrollment
  await new Promise<void>((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'SET_PENDING_ENROLLMENT',
        familyId: payload.familyId,
        token: payload.token,
      },
      () => resolve()
    )
  })

  // Story 12.3: Submit enrollment request to server
  scannerStatus.textContent = 'Submitting request...'
  const submitResult = await submitEnrollmentRequest(payload.familyId, payload.token)

  if (!submitResult.success) {
    showEnrollmentError(submitResult.message)
    startScanBtn.classList.add('hidden')
    retryScanBtn.classList.remove('hidden')
    scannerVideo.classList.add('hidden')
    scannerOverlay.classList.add('hidden')
    scannerPlaceholder.classList.remove('hidden')

    // Clear pending enrollment on failure
    await new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: 'CLEAR_PENDING_ENROLLMENT' }, () => resolve())
    })
    return
  }

  // Store request ID for polling
  if (submitResult.requestId) {
    await new Promise<void>((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: 'UPDATE_ENROLLMENT_REQUEST',
          requestId: submitResult.requestId,
          expiresAt: Date.now() + 10 * 60 * 1000, // 10 minute expiry
        },
        () => resolve()
      )
    })

    // Start polling for approval status
    startEnrollmentPolling(payload.familyId, submitResult.requestId)
  }

  // Update UI to show pending state
  await updateUI(await getAuthState())
}

/**
 * Start QR code scanning
 * AC1, AC2, AC3
 */
async function handleStartScanning(): Promise<void> {
  hideEnrollmentError()
  setScanLoading(true)

  try {
    // Initialize camera
    await initializeCamera(scannerVideo, scannerCanvas)

    // Update UI for scanning mode
    scannerPlaceholder.classList.add('hidden')
    scannerVideo.classList.remove('hidden')
    scannerOverlay.classList.remove('hidden')
    scannerStatus.textContent = 'Scanning for QR code...'
    scannerStatus.className = 'scanner-status scanning'

    // Hide start button, keep retry hidden
    startScanBtn.classList.add('hidden')
    retryScanBtn.classList.add('hidden')

    isScanning = true

    // Start scanning loop
    startScanning(handleQRCodeDetected)
  } catch (error) {
    // AC2: Handle camera permission errors
    const message = error instanceof Error ? error.message : 'Failed to access camera'
    showEnrollmentError(message)

    // Show retry button
    startScanBtn.classList.add('hidden')
    retryScanBtn.classList.remove('hidden')
  } finally {
    setScanLoading(false)
  }
}

/**
 * Handle retry scan button click
 */
async function handleRetryScan(): Promise<void> {
  // Reset UI
  retryScanBtn.classList.add('hidden')
  startScanBtn.classList.remove('hidden')
  hideEnrollmentError()
  scannerStatus.textContent = 'Point your camera at the QR code'
  scannerStatus.className = 'scanner-status'

  // Start scanning again
  await handleStartScanning()
}

/**
 * Handle cancel enrollment button click
 */
async function handleCancelEnrollment(): Promise<void> {
  // Stop polling if active
  if (stopPolling) {
    stopPolling()
    stopPolling = null
  }

  // Clear pending enrollment
  await new Promise<void>((resolve) => {
    chrome.runtime.sendMessage({ type: 'CLEAR_PENDING_ENROLLMENT' }, () => resolve())
  })

  // Update UI
  await updateUI(await getAuthState())
}

/**
 * Start polling for enrollment approval status
 * Story 12.3: AC4, AC5, AC6 - Handle approval/rejection/expiry
 * Story 12.4: Register device after approval
 */
function startEnrollmentPolling(familyId: string, requestId: string): void {
  // Stop any existing polling
  if (stopPolling) {
    stopPolling()
  }

  stopPolling = pollEnrollmentStatus(
    familyId,
    requestId,
    async (status: EnrollmentRequestStatus) => {
      // Stop polling
      stopPolling = null

      // Story 12.4: If approved, register the device
      if (status === 'approved') {
        const registrationResult = await registerDevice(familyId, requestId)

        if (registrationResult.success && registrationResult.deviceId) {
          // Update background state with enrollment complete and deviceId
          await new Promise<void>((resolve) => {
            chrome.runtime.sendMessage(
              {
                type: 'ENROLLMENT_COMPLETE',
                familyId,
                deviceId: registrationResult.deviceId,
              },
              () => resolve()
            )
          })
        } else {
          // Registration failed - show error and clear pending state
          console.error('[Fledgely] Device registration failed:', registrationResult.message)
          await new Promise<void>((resolve) => {
            chrome.runtime.sendMessage(
              {
                type: 'UPDATE_ENROLLMENT_STATUS',
                status: 'expired', // Treat failed registration like expired
              },
              () => resolve()
            )
          })
        }
      } else {
        // Rejected or expired - update background state
        await new Promise<void>((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: 'UPDATE_ENROLLMENT_STATUS',
              status,
            },
            () => resolve()
          )
        })
      }

      // Update UI based on status
      await updateUI(await getAuthState())
    }
  )
}

/**
 * Update user info displays
 */
function updateUserInfo(authState: AuthState): void {
  const elements = [{ avatar: userAvatar1, name: userName1, email: userEmail1 }]

  for (const el of elements) {
    if (authState.photoURL) {
      el.avatar.innerHTML = `<img src="${authState.photoURL}" alt="Profile" />`
    } else {
      el.avatar.textContent = authState.displayName?.[0] || authState.email?.[0] || '?'
    }
    el.name.textContent = authState.displayName || 'User'
    el.email.textContent = authState.email || ''
  }
}

/**
 * Render child selection list
 */
function renderChildList(): void {
  childList.innerHTML = ''

  for (const child of MOCK_CHILDREN) {
    const isSelected = child.id === selectedChildId
    const option = document.createElement('button')
    option.type = 'button'
    option.className = `child-option${isSelected ? ' selected' : ''}`
    option.setAttribute('role', 'radio')
    option.setAttribute('aria-checked', isSelected ? 'true' : 'false')
    option.setAttribute(
      'aria-label',
      `${child.name}, age ${child.age}${!child.hasActiveAgreement ? ' (no active agreement)' : ''}`
    )

    option.innerHTML = `
      <div class="child-avatar" style="background: ${child.color}">${child.name[0]}</div>
      <div class="child-details">
        <div class="child-name">${child.name}</div>
        <div class="child-age">Age ${child.age}${!child.hasActiveAgreement ? ' • No Agreement' : ''}</div>
      </div>
      <div class="child-check">${isSelected ? '✓' : ''}</div>
    `

    option.addEventListener('click', () => selectChild(child.id))
    childList.appendChild(option)
  }
}

/**
 * Select a child
 */
function selectChild(childId: string): void {
  const child = MOCK_CHILDREN.find((c) => c.id === childId)
  if (!child) return

  selectedChildId = childId
  connectBtn.disabled = !child.hasActiveAgreement

  if (!child.hasActiveAgreement) {
    connectBtn.textContent = 'Agreement Required'
  } else {
    connectBtn.textContent = 'Connect'
  }

  renderChildList()
}

/**
 * Connect to selected child
 */
async function connectToChild(): Promise<void> {
  if (!selectedChildId) return

  const child = MOCK_CHILDREN.find((c) => c.id === selectedChildId)
  if (!child || !child.hasActiveAgreement) return

  connectedChild = child

  // Store in chrome.storage and notify background
  await chrome.storage.local.set({
    connectedChild: {
      id: child.id,
      name: child.name,
      color: child.color,
    },
  })

  // Notify background to update state
  chrome.runtime.sendMessage({
    type: 'CHILD_CONNECTED',
    childId: child.id,
    childName: child.name,
  })

  updateUI(await getAuthState())
}

/**
 * Format relative time for last sync display
 */
function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return 'Never'

  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
  return `${Math.floor(diff / 86400000)} days ago`
}

/**
 * Update last sync time display
 */
async function updateLastSyncDisplay(): Promise<void> {
  const { state } = await chrome.storage.local.get('state')
  lastSyncTime.textContent = formatRelativeTime(state?.lastSync)
}

/**
 * Disconnect from child (change selection)
 */
async function disconnectChild(): Promise<void> {
  connectedChild = null
  selectedChildId = null

  await chrome.storage.local.remove('connectedChild')

  // Notify background
  chrome.runtime.sendMessage({
    type: 'CHILD_DISCONNECTED',
  })

  updateUI(await getAuthState())
}

/**
 * Update UI based on auth and enrollment state
 * Story 12.2: Now handles enrollment states first
 */
async function updateUI(authState: AuthState): Promise<void> {
  // Hide all states first
  hideAllStates()

  // Stop camera if switching away from scanner
  if (isScanning) {
    isScanning = false
    stopCamera()
  }

  // Get enrollment state
  const { enrollmentState, familyId } = await getEnrollmentState()

  // Story 12.2: Check enrollment state first
  // If device is not enrolled and not pending, show enrollment UI
  if (enrollmentState === 'not_enrolled' && !familyId) {
    stateNotEnrolled.classList.remove('hidden')

    // Reset scanner UI
    scannerPlaceholder.classList.remove('hidden')
    scannerVideo.classList.add('hidden')
    scannerOverlay.classList.add('hidden')
    startScanBtn.classList.remove('hidden')
    retryScanBtn.classList.add('hidden')
    hideEnrollmentError()
    scannerStatus.textContent = 'Point your camera at the QR code'
    scannerStatus.className = 'scanner-status'

    return
  }

  // Story 12.2: Pending enrollment state
  if (enrollmentState === 'pending') {
    statePendingEnrollment.classList.remove('hidden')
    return
  }

  // Load connected child from storage
  const { connectedChild: stored } = await chrome.storage.local.get('connectedChild')
  if (stored) {
    connectedChild = MOCK_CHILDREN.find((c) => c.id === stored.id) || null
  }

  if (!authState.isAuthenticated) {
    // Not authenticated
    stateNotAuth.classList.remove('hidden')
    hideError()
  } else if (connectedChild) {
    // Story 6.5: Check consent status before showing monitoring active
    const consentStatus = await getConsentStatus()

    if (consentStatus.consentStatus === 'pending' || consentStatus.consentStatus === 'withdrawn') {
      // Story 6.5 AC3: Show consent pending state
      stateConsentPending.classList.remove('hidden')

      // Update child info in consent pending view
      consentPendingChildAvatar.style.background = connectedChild.color
      consentPendingChildAvatar.textContent = connectedChild.name[0]
      consentPendingChildName.textContent = connectedChild.name
    } else if (consentStatus.consentStatus === 'granted') {
      // Authenticated and connected to child with consent granted
      stateAuthConnected.classList.remove('hidden')

      connectedChildAvatar.style.background = connectedChild.color
      connectedChildAvatar.textContent = connectedChild.name[0]
      connectedChildName.textContent = connectedChild.name

      // Update last sync time
      await updateLastSyncDisplay()
    } else {
      // Consent status not yet determined - show consent pending as default for safety
      // Story 6.5 AC2: No monitoring without consent
      stateConsentPending.classList.remove('hidden')

      consentPendingChildAvatar.style.background = connectedChild.color
      consentPendingChildAvatar.textContent = connectedChild.name[0]
      consentPendingChildName.textContent = connectedChild.name
    }
  } else {
    // Authenticated but no child selected
    stateAuthNoChild.classList.remove('hidden')

    updateUserInfo(authState)
    renderChildList()
  }
}

/**
 * Show error message
 */
function showError(message: string): void {
  errorContainer.textContent = message
  errorContainer.classList.remove('hidden')
}

/**
 * Hide error message
 */
function hideError(): void {
  errorContainer.classList.add('hidden')
  errorContainer.textContent = ''
}

/**
 * Set sign-in button loading state
 */
function setSignInLoading(loading: boolean): void {
  signInBtn.disabled = loading
  if (loading) {
    signInText.classList.add('hidden')
    signInSpinner.classList.remove('hidden')
  } else {
    signInText.classList.remove('hidden')
    signInSpinner.classList.add('hidden')
  }
}

/**
 * Handle sign-in button click
 */
async function handleSignIn(): Promise<void> {
  hideError()
  setSignInLoading(true)

  try {
    const authState = await signIn()
    await updateUI(authState)

    // Notify background to update badge
    chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', authState })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sign-in failed'

    // Provide user-friendly error messages
    let userMessage = message
    if (message.includes('User interaction required')) {
      userMessage = 'Please try again and complete the sign-in popup.'
    } else if (message.includes('OAuth2 not granted or revoked')) {
      userMessage = 'Permission was denied. Please try again and allow access.'
    } else if (message.includes('invalid_client')) {
      userMessage =
        'Extension not configured. Please contact support or check that OAuth is set up correctly.'
    }

    showError(userMessage)
  } finally {
    setSignInLoading(false)
  }
}

/**
 * Handle sign-out button click
 */
async function handleSignOut(): Promise<void> {
  // Clear connected child first
  connectedChild = null
  selectedChildId = null
  await chrome.storage.local.remove('connectedChild')

  try {
    await signOut()
    await updateUI({ isAuthenticated: false } as AuthState)

    // Notify background to update badge
    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      authState: { isAuthenticated: false },
    })
  } catch {
    // Still update UI even if signout has issues
    await updateUI({ isAuthenticated: false } as AuthState)
  }
}

/**
 * Initialize popup
 */
async function init(): Promise<void> {
  // Load current auth state
  const authState = await getAuthState()
  await updateUI(authState)

  // Set up event listeners - Enrollment (Story 12.2)
  startScanBtn.addEventListener('click', handleStartScanning)
  retryScanBtn.addEventListener('click', handleRetryScan)
  cancelEnrollmentBtn.addEventListener('click', handleCancelEnrollment)
  scannerContainer.addEventListener('click', () => {
    // Allow clicking on placeholder to start scanning
    if (!isScanning && scannerPlaceholder.classList.contains('hidden') === false) {
      handleStartScanning()
    }
  })

  // Set up event listeners - Auth
  signInBtn.addEventListener('click', handleSignIn)
  signOutBtn1.addEventListener('click', handleSignOut)
  signOutBtn2.addEventListener('click', handleSignOut)
  connectBtn.addEventListener('click', connectToChild)
  changeChildBtn.addEventListener('click', disconnectChild)

  // Story 6.5: Set up event listeners - Consent Pending
  refreshConsentBtn.addEventListener('click', handleRefreshConsent)
  consentPendingChangeChild.addEventListener('click', disconnectChild)
}

// Run on load
init()
