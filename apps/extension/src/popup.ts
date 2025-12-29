/**
 * Fledgely Chrome Extension - Popup UI Script
 *
 * Handles popup interactions and communicates with background service.
 *
 * Story 9.3: Extension Authentication
 * Story 9.4: Family Connection & Child Selection
 */

import { signIn, signOut, getAuthState, AuthState } from './auth'

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
 * Update UI based on auth state
 */
async function updateUI(authState: AuthState): Promise<void> {
  // Load connected child from storage
  const { connectedChild: stored } = await chrome.storage.local.get('connectedChild')
  if (stored) {
    connectedChild = MOCK_CHILDREN.find((c) => c.id === stored.id) || null
  }

  if (!authState.isAuthenticated) {
    // Not authenticated
    stateNotAuth.classList.remove('hidden')
    stateAuthNoChild.classList.add('hidden')
    stateAuthConnected.classList.add('hidden')
    hideError()
  } else if (connectedChild) {
    // Authenticated and connected to child
    stateNotAuth.classList.add('hidden')
    stateAuthNoChild.classList.add('hidden')
    stateAuthConnected.classList.remove('hidden')

    connectedChildAvatar.style.background = connectedChild.color
    connectedChildAvatar.textContent = connectedChild.name[0]
    connectedChildName.textContent = connectedChild.name

    // Update last sync time
    await updateLastSyncDisplay()
  } else {
    // Authenticated but no child selected
    stateNotAuth.classList.add('hidden')
    stateAuthNoChild.classList.remove('hidden')
    stateAuthConnected.classList.add('hidden')

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

  // Set up event listeners
  signInBtn.addEventListener('click', handleSignIn)
  signOutBtn1.addEventListener('click', handleSignOut)
  signOutBtn2.addEventListener('click', handleSignOut)
  connectBtn.addEventListener('click', connectToChild)
  changeChildBtn.addEventListener('click', disconnectChild)
}

// Run on load
init()
