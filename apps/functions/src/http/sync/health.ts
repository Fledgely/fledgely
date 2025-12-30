/**
 * Device Health Sync HTTP Endpoint
 *
 * Story 19.4: Monitoring Health Details
 *
 * Receives health metrics from extension and stores in Firestore.
 * Called every 5 minutes by enrolled extensions.
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp()
}

const db = getFirestore()

/**
 * Health metrics received from extension
 */
interface DeviceHealthMetrics {
  captureSuccessRate24h: number | null
  uploadQueueSize: number
  networkStatus: 'online' | 'offline'
  batteryLevel: number | null
  batteryCharging: boolean | null
  appVersion: string
  updateAvailable: boolean | null
  collectedAt: number
}

/**
 * Request body from extension
 */
interface SyncHealthRequest {
  deviceId: string
  familyId: string
  metrics: DeviceHealthMetrics
}

/**
 * Validate the request body
 */
function validateRequest(body: unknown): body is SyncHealthRequest {
  if (!body || typeof body !== 'object') return false

  const req = body as Record<string, unknown>

  if (typeof req.deviceId !== 'string' || !req.deviceId) return false
  if (typeof req.familyId !== 'string' || !req.familyId) return false
  if (!req.metrics || typeof req.metrics !== 'object') return false

  return true
}

/**
 * HTTP endpoint for syncing device health metrics
 *
 * POST /syncDeviceHealth
 * Body: { deviceId, familyId, metrics }
 */
export const syncDeviceHealth = onRequest(
  {
    cors: true,
    region: 'us-central1',
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Validate request
    if (!validateRequest(req.body)) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }

    const { deviceId, familyId, metrics } = req.body

    try {
      // Verify device exists in family
      const deviceRef = db.doc(`families/${familyId}/devices/${deviceId}`)
      const deviceDoc = await deviceRef.get()

      if (!deviceDoc.exists) {
        res.status(404).json({ error: 'Device not found' })
        return
      }

      // Update device with health metrics
      await deviceRef.update({
        healthMetrics: {
          ...metrics,
          lastHealthSync: FieldValue.serverTimestamp(),
        },
        lastSeen: FieldValue.serverTimestamp(),
      })

      res.status(200).json({ success: true })
    } catch (error) {
      console.error('[syncDeviceHealth] Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)
