/**
 * Fledgely Chrome Extension - Popup UI Script
 *
 * Handles popup interactions and communicates with background service.
 *
 * Story 9.3: Extension Authentication
 */

import { signIn, signOut, getAuthState, AuthState } from './auth'

// DOM Elements
const stateNotAuth = document.getElementById('state-not-auth')!
const stateAuth = document.getElementById('state-auth')!
const signInBtn = document.getElementById('sign-in-btn') as HTMLButtonElement
const signInText = document.getElementById('sign-in-text')!
const signInSpinner = document.getElementById('sign-in-spinner')!
const signOutBtn = document.getElementById('sign-out-btn') as HTMLButtonElement
const errorContainer = document.getElementById('error-container')!
const userAvatar = document.getElementById('user-avatar')!
const userName = document.getElementById('user-name')!
const userEmail = document.getElementById('user-email')!
const _authStatus = document.getElementById('auth-status')!
const statusText = document.getElementById('status-text')!
const authMessage = document.getElementById('auth-message')!

/**
 * Update UI based on auth state
 */
function updateUI(authState: AuthState): void {
  if (authState.isAuthenticated) {
    // Show authenticated state
    stateNotAuth.classList.add('hidden')
    stateAuth.classList.remove('hidden')

    // Update user info
    if (authState.photoURL) {
      userAvatar.innerHTML = `<img src="${authState.photoURL}" alt="Profile" />`
    } else {
      userAvatar.textContent = authState.displayName?.[0] || authState.email?.[0] || '?'
    }
    userName.textContent = authState.displayName || 'User'
    userEmail.textContent = authState.email || ''

    // Update status based on family connection
    // For now, just show "Signed In" - family connection will be in Story 9.4
    statusText.textContent = 'Signed In'
    authMessage.textContent = 'Connect this device to a child in your family.'
  } else {
    // Show not authenticated state
    stateNotAuth.classList.remove('hidden')
    stateAuth.classList.add('hidden')
    hideError()
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
    updateUI(authState)

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
  signOutBtn.disabled = true

  try {
    await signOut()
    updateUI({ isAuthenticated: false } as AuthState)

    // Notify background to update badge
    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      authState: { isAuthenticated: false },
    })
  } finally {
    signOutBtn.disabled = false
  }
}

/**
 * Initialize popup
 */
async function init(): Promise<void> {
  // Load current auth state
  const authState = await getAuthState()
  updateUI(authState)

  // Set up event listeners
  signInBtn.addEventListener('click', handleSignIn)
  signOutBtn.addEventListener('click', handleSignOut)
}

// Run on load
init()
