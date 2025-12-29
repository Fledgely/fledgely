/**
 * Fledgely Chrome Extension - Authentication Module
 *
 * Handles Chrome Identity API integration for Google Sign-In.
 * Uses chrome.identity.getAuthToken for OAuth flow.
 *
 * Story 9.3: Extension Authentication
 */

export interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  email: string | null
  displayName: string | null
  photoURL: string | null
  accessToken: string | null
  tokenExpiresAt: number | null
}

export const DEFAULT_AUTH_STATE: AuthState = {
  isAuthenticated: false,
  userId: null,
  email: null,
  displayName: null,
  photoURL: null,
  accessToken: null,
  tokenExpiresAt: null,
}

/**
 * Sign in using Chrome Identity API
 * Opens interactive OAuth flow if needed
 */
export async function signIn(): Promise<AuthState> {
  try {
    // Get OAuth token via Chrome Identity API
    const token = await new Promise<string>((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (!token) {
          reject(new Error('No token received'))
          return
        }
        resolve(token)
      })
    })

    // Fetch user info from Google
    const userInfo = await fetchGoogleUserInfo(token)

    const authState: AuthState = {
      isAuthenticated: true,
      userId: userInfo.id,
      email: userInfo.email,
      displayName: userInfo.name,
      photoURL: userInfo.picture,
      accessToken: token,
      // Token valid for 1 hour, but we'll refresh before that
      tokenExpiresAt: Date.now() + 55 * 60 * 1000,
    }

    // Store auth state
    await chrome.storage.local.set({ authState })

    console.log('[Fledgely Auth] Sign-in successful:', userInfo.email)
    return authState
  } catch (error) {
    console.error('[Fledgely Auth] Sign-in failed:', error)
    throw error
  }
}

/**
 * Sign out and clear stored credentials
 */
export async function signOut(): Promise<void> {
  try {
    // Get current token to revoke
    const { authState } = await chrome.storage.local.get('authState')

    if (authState?.accessToken) {
      // Revoke token with Chrome
      await new Promise<void>((resolve) => {
        chrome.identity.removeCachedAuthToken({ token: authState.accessToken }, () => {
          resolve()
        })
      })
    }

    // Clear stored state
    await chrome.storage.local.set({ authState: DEFAULT_AUTH_STATE })

    console.log('[Fledgely Auth] Signed out')
  } catch (error) {
    console.error('[Fledgely Auth] Sign-out error:', error)
    // Still clear local state even if revoke fails
    await chrome.storage.local.set({ authState: DEFAULT_AUTH_STATE })
  }
}

/**
 * Get current auth state from storage
 */
export async function getAuthState(): Promise<AuthState> {
  const { authState } = await chrome.storage.local.get('authState')
  return authState || DEFAULT_AUTH_STATE
}

/**
 * Check if token needs refresh and refresh if needed
 */
export async function ensureValidToken(): Promise<string | null> {
  const authState = await getAuthState()

  if (!authState.isAuthenticated || !authState.accessToken) {
    return null
  }

  // Check if token is expired or will expire soon (within 5 min)
  const now = Date.now()
  if (authState.tokenExpiresAt && authState.tokenExpiresAt < now + 5 * 60 * 1000) {
    // Token expired or expiring soon, refresh it
    try {
      const newToken = await new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (chrome.runtime.lastError || !token) {
            reject(new Error(chrome.runtime.lastError?.message || 'Token refresh failed'))
            return
          }
          resolve(token)
        })
      })

      // Update stored token
      await chrome.storage.local.set({
        authState: {
          ...authState,
          accessToken: newToken,
          tokenExpiresAt: Date.now() + 55 * 60 * 1000,
        },
      })

      console.log('[Fledgely Auth] Token refreshed')
      return newToken
    } catch {
      console.warn('[Fledgely Auth] Token refresh failed, user may need to re-authenticate')
      return null
    }
  }

  return authState.accessToken
}

/**
 * Fetch Google user info using access token
 */
async function fetchGoogleUserInfo(
  accessToken: string
): Promise<{ id: string; email: string; name: string; picture: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`)
  }

  return response.json()
}
