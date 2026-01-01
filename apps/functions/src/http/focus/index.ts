/**
 * Focus Mode HTTP Handlers - Story 33.1, 33.2
 *
 * HTTP endpoints for focus mode state and configuration management.
 * Includes authentication for security.
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const db = getFirestore()

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Get focus mode state for a child
 * Called by Chrome extension to sync focus mode status
 * Requires authentication via Firebase ID token
 *
 * Story 33.1 AC2: App blocking during focus mode
 */
export const getFocusModeState = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 100,
    concurrency: 80,
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Verify authentication (optional for extension with deviceId)
    const token = extractBearerToken(req.headers.authorization)
    const { childId, familyId, deviceId } = req.body

    if (!childId || !familyId) {
      res.status(400).json({ error: 'Missing childId or familyId' })
      return
    }

    // Validate inputs
    if (typeof childId !== 'string' || typeof familyId !== 'string') {
      res.status(400).json({ error: 'Invalid childId or familyId format' })
      return
    }

    // If token provided, verify it
    if (token) {
      try {
        const decodedToken = await getAuth().verifyIdToken(token)
        console.log('[getFocusModeState] Authenticated request from:', decodedToken.uid)
      } catch (error) {
        console.error('[getFocusModeState] Token verification failed:', error)
        res.status(401).json({ error: 'Invalid token' })
        return
      }
    } else if (deviceId) {
      // If no token but deviceId, verify device is enrolled
      try {
        const deviceDoc = await db.doc(`families/${familyId}/devices/${deviceId}`).get()
        if (!deviceDoc.exists) {
          res.status(403).json({ error: 'Device not enrolled' })
          return
        }
        console.log('[getFocusModeState] Device request:', deviceId)
      } catch (error) {
        console.error('[getFocusModeState] Device verification failed:', error)
        res.status(403).json({ error: 'Device verification failed' })
        return
      }
    } else {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    try {
      // Get focus mode state from Firestore
      const stateRef = db.doc(`families/${familyId}/focusMode/${childId}`)
      const stateDoc = await stateRef.get()

      if (!stateDoc.exists) {
        // No focus mode state - return default inactive state
        res.json({
          isActive: false,
          currentSession: null,
          totalSessionsToday: 0,
          totalFocusTimeToday: 0,
        })
        return
      }

      const data = stateDoc.data()
      res.json({
        isActive: data?.isActive || false,
        currentSession: data?.currentSession || null,
        totalSessionsToday: data?.totalSessionsToday || 0,
        totalFocusTimeToday: data?.totalFocusTimeToday || 0,
      })
    } catch (error) {
      console.error('[getFocusModeState] Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * Get focus mode configuration for a child
 * Called by Chrome extension to sync custom app lists
 * Requires authentication via Firebase ID token or device enrollment
 *
 * Story 33.2: Focus Mode App Configuration
 */
export const getFocusModeConfig = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 100,
    concurrency: 80,
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Verify authentication (optional for extension with deviceId)
    const token = extractBearerToken(req.headers.authorization)
    const { childId, familyId, deviceId } = req.body

    if (!childId || !familyId) {
      res.status(400).json({ error: 'Missing childId or familyId' })
      return
    }

    // Validate inputs
    if (typeof childId !== 'string' || typeof familyId !== 'string') {
      res.status(400).json({ error: 'Invalid childId or familyId format' })
      return
    }

    // If token provided, verify it
    if (token) {
      try {
        const decodedToken = await getAuth().verifyIdToken(token)
        console.log('[getFocusModeConfig] Authenticated request from:', decodedToken.uid)
      } catch (error) {
        console.error('[getFocusModeConfig] Token verification failed:', error)
        res.status(401).json({ error: 'Invalid token' })
        return
      }
    } else if (deviceId) {
      // If no token but deviceId, verify device is enrolled
      try {
        const deviceDoc = await db.doc(`families/${familyId}/devices/${deviceId}`).get()
        if (!deviceDoc.exists) {
          res.status(403).json({ error: 'Device not enrolled' })
          return
        }
        console.log('[getFocusModeConfig] Device request:', deviceId)
      } catch (error) {
        console.error('[getFocusModeConfig] Device verification failed:', error)
        res.status(403).json({ error: 'Device verification failed' })
        return
      }
    } else {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    try {
      // Get focus mode configuration from Firestore
      const configRef = db.doc(`families/${familyId}/focusModeConfig/${childId}`)
      const configDoc = await configRef.get()

      if (!configDoc.exists) {
        // No configuration - return defaults
        res.json({
          useDefaultCategories: true,
          customAllowList: [],
          customBlockList: [],
          allowedCategories: [],
          blockedCategories: [],
        })
        return
      }

      const data = configDoc.data()
      res.json({
        useDefaultCategories: data?.useDefaultCategories ?? true,
        customAllowList: data?.customAllowList || [],
        customBlockList: data?.customBlockList || [],
        allowedCategories: data?.allowedCategories || [],
        blockedCategories: data?.blockedCategories || [],
      })
    } catch (error) {
      console.error('[getFocusModeConfig] Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)
