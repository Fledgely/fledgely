/**
 * Screen Time Sync HTTP Endpoint
 *
 * Story 29.2: Chromebook Screen Time Capture
 *
 * Receives screen time data from extension and stores in Firestore.
 * Called every 15 minutes by enrolled extensions.
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'
import {
  screenTimeCategorySchema,
  type ScreenTimeCategory,
  type ScreenTimeDailySummary,
  type CategoryTimeEntry,
  type DeviceTimeEntry,
  MAX_SCREEN_TIME_MINUTES_PER_DAY,
} from '@fledgely/shared'

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp()
}

const db = getFirestore()

/**
 * Category entry from extension
 */
interface CategoryEntry {
  category: ScreenTimeCategory
  minutes: number
}

/**
 * Date entry from extension
 */
interface DateEntry {
  date: string
  timezone: string
  categories: CategoryEntry[]
}

/**
 * Request body from extension
 */
interface SyncScreenTimeRequest {
  deviceId: string
  familyId: string
  childId: string
  entries: DateEntry[]
}

/**
 * Validate the request body
 */
function validateRequest(body: unknown): body is SyncScreenTimeRequest {
  if (!body || typeof body !== 'object') return false

  const req = body as Record<string, unknown>

  if (typeof req.deviceId !== 'string' || !req.deviceId) return false
  if (typeof req.familyId !== 'string' || !req.familyId) return false
  if (typeof req.childId !== 'string' || !req.childId) return false
  if (!Array.isArray(req.entries)) return false

  // Validate each entry
  for (const entry of req.entries) {
    if (typeof entry !== 'object' || !entry) return false
    const e = entry as Record<string, unknown>

    // Validate date format (YYYY-MM-DD)
    if (typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return false
    if (typeof e.timezone !== 'string' || !e.timezone) return false
    if (!Array.isArray(e.categories)) return false

    // Validate each category
    for (const cat of e.categories) {
      if (typeof cat !== 'object' || !cat) return false
      const c = cat as Record<string, unknown>

      // Validate category is a valid enum value
      const categoryResult = screenTimeCategorySchema.safeParse(c.category)
      if (!categoryResult.success) return false

      // Validate minutes
      if (
        typeof c.minutes !== 'number' ||
        c.minutes < 0 ||
        c.minutes > MAX_SCREEN_TIME_MINUTES_PER_DAY
      )
        return false
    }
  }

  return true
}

/**
 * HTTP endpoint for syncing screen time data
 *
 * POST /syncScreenTime
 * Body: { deviceId, familyId, childId, entries }
 */
export const syncScreenTime = onRequest(
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

    const { deviceId, familyId, childId, entries } = req.body

    try {
      // Verify device exists in family
      const deviceRef = db.doc(`families/${familyId}/devices/${deviceId}`)
      const deviceDoc = await deviceRef.get()

      if (!deviceDoc.exists) {
        res.status(404).json({ error: 'Device not found' })
        return
      }

      // Get device info for the device time entry
      const deviceData = deviceDoc.data()
      const deviceName = (deviceData?.name as string) || 'Unknown Device'
      const deviceType = (deviceData?.deviceType as string) || 'chromebook'

      // Process each date entry
      for (const entry of entries) {
        const { date, timezone, categories } = entry

        // Get or create daily summary document
        const dailySummaryRef = db.doc(
          `families/${familyId}/children/${childId}/screenTime/${date}`
        )
        const dailySummaryDoc = await dailySummaryRef.get()

        if (dailySummaryDoc.exists) {
          // Update existing document - merge device data
          await updateExistingDailySummary(
            dailySummaryRef,
            dailySummaryDoc.data() as ScreenTimeDailySummary,
            deviceId,
            deviceName,
            deviceType,
            categories,
            timezone
          )
        } else {
          // Create new document
          await createNewDailySummary(
            dailySummaryRef,
            childId,
            date,
            timezone,
            deviceId,
            deviceName,
            deviceType,
            categories
          )
        }
      }

      // Update device lastSeen
      await deviceRef.update({
        lastSeen: FieldValue.serverTimestamp(),
      })

      res.status(200).json({ success: true })
    } catch (error) {
      console.error('[syncScreenTime] Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * Create a new daily summary document
 */
async function createNewDailySummary(
  docRef: FirebaseFirestore.DocumentReference,
  childId: string,
  date: string,
  timezone: string,
  deviceId: string,
  deviceName: string,
  deviceType: string,
  categories: CategoryEntry[]
): Promise<void> {
  // Calculate total minutes
  const totalMinutes = categories.reduce((sum, c) => sum + c.minutes, 0)

  // Build device entry
  const deviceEntry: DeviceTimeEntry = {
    deviceId,
    deviceName,
    deviceType: deviceType as DeviceTimeEntry['deviceType'],
    minutes: totalMinutes,
    categories: categories.map((c) => ({
      category: c.category,
      minutes: Math.round(c.minutes),
    })),
  }

  // Build category entries (same as device for single device)
  const categoryEntries: CategoryTimeEntry[] = categories.map((c) => ({
    category: c.category,
    minutes: Math.round(c.minutes),
  }))

  const dailySummary: ScreenTimeDailySummary = {
    childId,
    date,
    timezone,
    totalMinutes: Math.round(totalMinutes),
    devices: [deviceEntry],
    categories: categoryEntries,
    updatedAt: Date.now(),
  }

  await docRef.set(dailySummary)
}

/**
 * Update an existing daily summary document with new device data
 */
async function updateExistingDailySummary(
  docRef: FirebaseFirestore.DocumentReference,
  existingData: ScreenTimeDailySummary,
  deviceId: string,
  deviceName: string,
  deviceType: string,
  newCategories: CategoryEntry[],
  timezone: string
): Promise<void> {
  // Find existing device entry or create new one
  const devices = [...existingData.devices]
  const existingDeviceIndex = devices.findIndex((d) => d.deviceId === deviceId)

  // Calculate new minutes for this device
  const deviceMinutes = newCategories.reduce((sum, c) => sum + c.minutes, 0)

  // Build device category entries
  const deviceCategories: CategoryTimeEntry[] = newCategories.map((c) => ({
    category: c.category,
    minutes: Math.round(c.minutes),
  }))

  if (existingDeviceIndex >= 0) {
    // Update existing device - merge categories
    const existingDevice = devices[existingDeviceIndex]
    const mergedCategories = mergeCategories(existingDevice.categories || [], deviceCategories)
    const newDeviceMinutes = mergedCategories.reduce((sum, c) => sum + c.minutes, 0)

    devices[existingDeviceIndex] = {
      ...existingDevice,
      minutes: Math.round(newDeviceMinutes),
      categories: mergedCategories,
    }
  } else {
    // Add new device entry
    devices.push({
      deviceId,
      deviceName,
      deviceType: deviceType as DeviceTimeEntry['deviceType'],
      minutes: Math.round(deviceMinutes),
      categories: deviceCategories,
    })
  }

  // Recalculate aggregate categories across all devices
  const aggregateCategories = aggregateCategoriesAcrossDevices(devices)

  // Calculate new total
  const totalMinutes = devices.reduce((sum, d) => sum + d.minutes, 0)

  // Update document
  await docRef.update({
    devices,
    categories: aggregateCategories,
    totalMinutes: Math.min(Math.round(totalMinutes), MAX_SCREEN_TIME_MINUTES_PER_DAY),
    timezone, // Update to latest timezone
    updatedAt: Date.now(),
  })
}

/**
 * Merge two category arrays, summing minutes for matching categories
 */
function mergeCategories(
  existing: CategoryTimeEntry[],
  incoming: CategoryTimeEntry[]
): CategoryTimeEntry[] {
  const categoryMap = new Map<ScreenTimeCategory, number>()

  // Add existing
  for (const cat of existing) {
    categoryMap.set(cat.category, (categoryMap.get(cat.category) || 0) + cat.minutes)
  }

  // Add incoming
  for (const cat of incoming) {
    categoryMap.set(cat.category, (categoryMap.get(cat.category) || 0) + cat.minutes)
  }

  // Convert back to array
  return Array.from(categoryMap.entries()).map(([category, minutes]) => ({
    category,
    minutes: Math.min(Math.round(minutes), MAX_SCREEN_TIME_MINUTES_PER_DAY),
  }))
}

/**
 * Aggregate categories across all devices
 */
function aggregateCategoriesAcrossDevices(devices: DeviceTimeEntry[]): CategoryTimeEntry[] {
  const categoryMap = new Map<ScreenTimeCategory, number>()

  for (const device of devices) {
    if (device.categories) {
      for (const cat of device.categories) {
        categoryMap.set(cat.category, (categoryMap.get(cat.category) || 0) + cat.minutes)
      }
    }
  }

  return Array.from(categoryMap.entries()).map(([category, minutes]) => ({
    category,
    minutes: Math.min(Math.round(minutes), MAX_SCREEN_TIME_MINUTES_PER_DAY),
  }))
}
