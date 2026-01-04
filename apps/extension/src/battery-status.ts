/**
 * Battery Status Detection - Story 46.3 Task 1
 *
 * Detects battery level for intelligent sync scheduling.
 *
 * AC3: Battery Protection
 * - Delays large syncs when battery <20%
 * - Allows immediate sync when charging
 */

// Battery threshold for delaying sync (percentage)
const LOW_BATTERY_THRESHOLD = 20

// Queue size threshold for considering "large sync"
const LARGE_SYNC_THRESHOLD = 10

// Cache battery state to avoid repeated API calls
let cachedBatteryLevel: number = 100
let cachedIsCharging: boolean = false
let lastBatteryCheck: number = 0
const BATTERY_CACHE_TTL_MS = 30000 // 30 seconds

/**
 * Battery API interface (subset of BatteryManager)
 */
interface BatteryManager {
  level: number // 0.0 to 1.0
  charging: boolean
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
}

/**
 * Get the battery manager from navigator.
 * Returns null if Battery API not available.
 */
async function getBatteryManager(): Promise<BatteryManager | null> {
  try {
    // Check if getBattery is available (may not be in all contexts)
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (navigator as any).getBattery()
    }
    return null
  } catch (error) {
    console.warn('[BatteryStatus] Battery API not available:', error)
    return null
  }
}

/**
 * Get current battery level as percentage (0-100).
 *
 * @returns Battery level percentage, or 100 if unavailable
 */
export async function getBatteryLevel(): Promise<number> {
  // Check cache first
  const now = Date.now()
  if (now - lastBatteryCheck < BATTERY_CACHE_TTL_MS) {
    return cachedBatteryLevel
  }

  const battery = await getBatteryManager()
  if (battery) {
    cachedBatteryLevel = Math.round(battery.level * 100)
    cachedIsCharging = battery.charging
    lastBatteryCheck = now
    return cachedBatteryLevel
  }

  // Default to 100% if API unavailable (don't delay sync)
  return 100
}

/**
 * Check if device is currently charging.
 *
 * @returns True if charging, false otherwise
 */
export async function isCharging(): Promise<boolean> {
  // Check cache first
  const now = Date.now()
  if (now - lastBatteryCheck < BATTERY_CACHE_TTL_MS) {
    return cachedIsCharging
  }

  const battery = await getBatteryManager()
  if (battery) {
    cachedBatteryLevel = Math.round(battery.level * 100)
    cachedIsCharging = battery.charging
    lastBatteryCheck = now
    return cachedIsCharging
  }

  // Default to not charging if API unavailable
  return false
}

/**
 * Determine if sync should be delayed due to low battery.
 *
 * AC3: Battery Protection
 * - Returns true if battery <20% AND queue >10 items
 * - Returns false if charging (always sync when plugged in)
 * - Returns false if small queue (always sync small batches)
 *
 * @param queueSize - Number of items waiting to sync
 * @returns True if sync should be delayed
 */
export async function shouldDelaySync(queueSize: number): Promise<boolean> {
  // Small queues always sync immediately
  if (queueSize <= LARGE_SYNC_THRESHOLD) {
    return false
  }

  // Always sync when charging
  const charging = await isCharging()
  if (charging) {
    return false
  }

  // Check battery level
  const level = await getBatteryLevel()
  if (level < LOW_BATTERY_THRESHOLD) {
    console.log(`[BatteryStatus] Delaying sync: battery ${level}%, queue ${queueSize} items`)
    return true
  }

  return false
}

/**
 * Get battery status summary for logging.
 *
 * @returns Object with level and charging status
 */
export async function getBatteryStatus(): Promise<{ level: number; charging: boolean }> {
  const level = await getBatteryLevel()
  const charging = await isCharging()
  return { level, charging }
}

/**
 * Reset cached battery state.
 * Used for testing.
 */
export function resetBatteryCache(): void {
  cachedBatteryLevel = 100
  cachedIsCharging = false
  lastBatteryCheck = 0
}

/**
 * Export thresholds for testing
 */
export { LOW_BATTERY_THRESHOLD, LARGE_SYNC_THRESHOLD }
