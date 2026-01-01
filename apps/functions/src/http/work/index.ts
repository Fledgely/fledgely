/**
 * Work Mode HTTP Handlers - Story 33.3
 *
 * HTTP endpoints for work mode state and configuration management.
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
 * Get work mode state for a child
 * Called by Chrome extension to sync work mode status
 * Requires authentication via Firebase ID token or device enrollment
 *
 * Story 33.3 AC2: Reduced monitoring during work hours
 */
export const getWorkModeState = onRequest(
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
        console.log('[getWorkModeState] Authenticated request from:', decodedToken.uid)
      } catch (error) {
        console.error('[getWorkModeState] Token verification failed:', error)
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
        console.log('[getWorkModeState] Device request:', deviceId)
      } catch (error) {
        console.error('[getWorkModeState] Device verification failed:', error)
        res.status(403).json({ error: 'Device verification failed' })
        return
      }
    } else {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    try {
      // Get work mode state from Firestore
      const stateRef = db.doc(`families/${familyId}/workMode/${childId}`)
      const stateDoc = await stateRef.get()

      if (!stateDoc.exists) {
        // No work mode state - return default inactive state
        res.json({
          isActive: false,
          currentSession: null,
          totalSessionsToday: 0,
          totalWorkTimeToday: 0,
        })
        return
      }

      const data = stateDoc.data()
      res.json({
        isActive: data?.isActive || false,
        currentSession: data?.currentSession || null,
        totalSessionsToday: data?.totalSessionsToday || 0,
        totalWorkTimeToday: data?.totalWorkTimeToday || 0,
      })
    } catch (error) {
      console.error('[getWorkModeState] Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * Get work mode configuration for a child
 * Called by Chrome extension to sync schedules and work app whitelist
 * Requires authentication via Firebase ID token or device enrollment
 *
 * Story 33.3: Work Mode for Employed Teens
 */
export const getWorkModeConfig = onRequest(
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
        console.log('[getWorkModeConfig] Authenticated request from:', decodedToken.uid)
      } catch (error) {
        console.error('[getWorkModeConfig] Token verification failed:', error)
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
        console.log('[getWorkModeConfig] Device request:', deviceId)
      } catch (error) {
        console.error('[getWorkModeConfig] Device verification failed:', error)
        res.status(403).json({ error: 'Device verification failed' })
        return
      }
    } else {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    try {
      // Get work mode configuration from Firestore
      const configRef = db.doc(`families/${familyId}/workModeConfig/${childId}`)
      const configDoc = await configRef.get()

      if (!configDoc.exists) {
        // No configuration - return defaults
        res.json({
          schedules: [],
          useDefaultWorkApps: true,
          customWorkApps: [],
          pauseScreenshots: true,
          suspendTimeLimits: true,
          allowManualActivation: true,
        })
        return
      }

      const data = configDoc.data()
      res.json({
        schedules: data?.schedules || [],
        useDefaultWorkApps: data?.useDefaultWorkApps ?? true,
        customWorkApps: data?.customWorkApps || [],
        pauseScreenshots: data?.pauseScreenshots ?? true,
        suspendTimeLimits: data?.suspendTimeLimits ?? true,
        allowManualActivation: data?.allowManualActivation ?? true,
      })
    } catch (error) {
      console.error('[getWorkModeConfig] Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)
