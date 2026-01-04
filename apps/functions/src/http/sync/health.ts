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
 * Story 46.4: Added syncing networkStatus and offlineDurationSeconds
 */
interface DeviceHealthMetrics {
  captureSuccessRate24h: number | null
  uploadQueueSize: number
  networkStatus: 'online' | 'offline' | 'syncing' // Story 46.4: Added syncing
  offlineDurationSeconds?: number // Story 46.1: Duration device has been offline
  batteryLevel: number | null
  batteryCharging: boolean | null
  appVersion: string
  updateAvailable: boolean | null
  collectedAt: number
}

/**
 * Story 6.5: Consent status for device
 */
type ConsentStatus = 'pending' | 'granted' | 'withdrawn'

/**
 * Request body from extension
 */
interface SyncHealthRequest {
  deviceId: string
  familyId: string
  metrics: DeviceHealthMetrics
  // Story 6.5: Optional consent status from extension
  consentStatus?: ConsentStatus
  activeAgreementId?: string | null
  activeAgreementVersion?: string | null
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

    const {
      deviceId,
      familyId,
      metrics,
      consentStatus,
      activeAgreementId,
      activeAgreementVersion,
    } = req.body

    try {
      // Verify device exists in family
      const deviceRef = db.doc(`families/${familyId}/devices/${deviceId}`)
      const deviceDoc = await deviceRef.get()

      if (!deviceDoc.exists) {
        res.status(404).json({ error: 'Device not found' })
        return
      }

      // Get current device data to check previous state
      const currentData = deviceDoc.data()
      const previousNetworkStatus = currentData?.healthMetrics?.networkStatus

      // Build update object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {
        healthMetrics: {
          ...metrics,
          lastHealthSync: FieldValue.serverTimestamp(),
        },
        lastSeen: FieldValue.serverTimestamp(),
      }

      // Story 46.4: Track offlineSince timestamp
      // Set offlineSince when transitioning to offline
      if (metrics.networkStatus === 'offline' && previousNetworkStatus !== 'offline') {
        updateData.offlineSince = FieldValue.serverTimestamp()
      }
      // Clear offlineSince when coming back online or syncing
      if (
        (metrics.networkStatus === 'online' || metrics.networkStatus === 'syncing') &&
        previousNetworkStatus === 'offline'
      ) {
        updateData.offlineSince = null
      }

      // Story 46.4: Map networkStatus to device status
      // 'syncing' and 'online' -> 'active', 'offline' -> 'offline'
      if (metrics.networkStatus === 'syncing') {
        updateData.status = 'syncing'
      } else if (metrics.networkStatus === 'online') {
        updateData.status = 'active'
      } else if (metrics.networkStatus === 'offline') {
        updateData.status = 'offline'
      }

      // Story 6.5: Include consent status if provided
      if (consentStatus) {
        updateData.consentStatus = consentStatus
      }
      if (activeAgreementId !== undefined) {
        updateData.activeAgreementId = activeAgreementId
      }
      if (activeAgreementVersion !== undefined) {
        updateData.activeAgreementVersion = activeAgreementVersion
      }

      // Update device with health metrics and consent status
      await deviceRef.update(updateData)

      res.status(200).json({ success: true })
    } catch (error) {
      console.error('[syncDeviceHealth] Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)
