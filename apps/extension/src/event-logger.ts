/**
 * Event Logger Module for Fledgely Chrome Extension
 *
 * This module handles capture event logging for debugging and audit purposes.
 * All events are stored in chrome.storage.local with automatic rotation.
 *
 * Story 10.6: Capture Event Logging
 *
 * PRIVACY RULES:
 * - NEVER log URLs
 * - NEVER log screenshot data
 * - NEVER log tab titles
 * - Only log: timestamps, event types, durations, queue sizes, error codes
 */

// Event types for capture-related events
export type CaptureEventType =
  | 'capture_success'
  | 'capture_skipped'
  | 'capture_failed'
  | 'upload_success'
  | 'upload_failed'
  | 'idle_pause'
  | 'idle_resume'
  | 'queue_overflow'
  | 'retry_exhausted'

/**
 * Capture event interface for logging
 * Note: NO URLs, screenshot data, or PII allowed
 */
export interface CaptureEvent {
  id: string
  timestamp: number
  eventType: CaptureEventType
  success: boolean
  duration?: number // How long operation took (ms)
  queueSize?: number // Queue size at time of event
  errorCode?: string // Error code if failed (NO error messages with URLs!)
}

/**
 * Event log storage structure
 */
interface EventLog {
  events: CaptureEvent[]
  lastPruned: number
}

// Constants for log management
const LOG_RETENTION_DAYS = 7
const MAX_LOG_EVENTS = 1000
const STORAGE_KEY = 'captureEventLog'

// Error codes (safe, no URLs or PII)
export const ERROR_CODES = {
  NO_ACTIVE_TAB: 'E001_NO_ACTIVE_TAB',
  NON_CAPTURABLE_URL: 'E002_NON_CAPTURABLE',
  CAPTURE_FAILED: 'E003_CAPTURE_FAILED',
  UPLOAD_NETWORK_ERROR: 'E004_NETWORK_ERROR',
  UPLOAD_AUTH_ERROR: 'E005_AUTH_ERROR',
  UPLOAD_SERVER_ERROR: 'E006_SERVER_ERROR',
  UPLOAD_RATE_LIMITED: 'E007_RATE_LIMITED',
  QUEUE_FULL: 'E008_QUEUE_FULL',
  MAX_RETRIES_EXCEEDED: 'E009_MAX_RETRIES',
  CRISIS_URL_PROTECTED: 'E010_CRISIS_PROTECTED', // Story 11.1: Zero data path
  ALLOWLIST_CHECK_ERROR: 'E011_ALLOWLIST_ERROR', // Story 11.1: Fail-safe triggered
} as const

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Prune events older than LOG_RETENTION_DAYS
 */
function pruneOldEvents(events: CaptureEvent[]): CaptureEvent[] {
  const cutoffTime = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
  return events.filter((event) => event.timestamp > cutoffTime)
}

/**
 * Get the current event log from storage
 * @returns The event log or empty log if not found or on error
 */
async function getEventLog(): Promise<EventLog> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return result[STORAGE_KEY] || { events: [], lastPruned: 0 }
  } catch {
    // Storage unavailable - return empty log
    console.warn('[Fledgely] Failed to read event log from storage')
    return { events: [], lastPruned: 0 }
  }
}

/**
 * Save the event log to storage
 * Silently fails if storage is unavailable (non-critical operation)
 */
async function saveEventLog(log: EventLog): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: log })
  } catch {
    // Storage unavailable - log warning but don't throw
    console.warn('[Fledgely] Failed to save event log to storage')
  }
}

/**
 * Log a capture-related event
 * This is the main function used to record events for debugging and audit
 */
export async function logCaptureEvent(
  eventType: CaptureEventType,
  success: boolean,
  options: {
    duration?: number
    queueSize?: number
    errorCode?: string
  } = {}
): Promise<void> {
  const log = await getEventLog()

  // Prune old events periodically (once per hour at most)
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  if (log.lastPruned < oneHourAgo) {
    log.events = pruneOldEvents(log.events)
    log.lastPruned = now
  }

  // Create new event
  const event: CaptureEvent = {
    id: generateEventId(),
    timestamp: now,
    eventType,
    success,
    ...options,
  }

  // Add to log
  log.events.push(event)

  // Enforce max events limit (keep most recent)
  if (log.events.length > MAX_LOG_EVENTS) {
    const excess = log.events.length - MAX_LOG_EVENTS
    log.events.splice(0, excess)
  }

  await saveEventLog(log)
}

/**
 * Get all capture events (for debug panel)
 * Returns events in reverse chronological order (newest first)
 * @param limit Optional maximum number of events to return
 * @returns Array of capture events, newest first
 */
export async function getCaptureEvents(limit?: number): Promise<CaptureEvent[]> {
  const log = await getEventLog()

  // Prune old events first
  log.events = pruneOldEvents(log.events)
  await saveEventLog(log)

  // Return in reverse chronological order
  const sorted = [...log.events].reverse()
  return limit ? sorted.slice(0, limit) : sorted
}

/**
 * Clear all capture events (for debug panel)
 * @returns Promise that resolves when events are cleared
 */
export async function clearCaptureEvents(): Promise<void> {
  await saveEventLog({ events: [], lastPruned: Date.now() })
}

/**
 * Get event statistics for the specified time period
 * @param hours Number of hours to look back (default: 24)
 * @returns Statistics object with counts by type and success/failure
 */
export async function getEventStats(hours: number = 24): Promise<{
  total: number
  successful: number
  failed: number
  byType: Record<CaptureEventType, number>
}> {
  const log = await getEventLog()
  const cutoffTime = Date.now() - hours * 60 * 60 * 1000
  const recentEvents = log.events.filter((e) => e.timestamp > cutoffTime)

  const stats = {
    total: recentEvents.length,
    successful: recentEvents.filter((e) => e.success).length,
    failed: recentEvents.filter((e) => !e.success).length,
    byType: {} as Record<CaptureEventType, number>,
  }

  for (const event of recentEvents) {
    stats.byType[event.eventType] = (stats.byType[event.eventType] || 0) + 1
  }

  return stats
}

/**
 * Check if there have been consecutive critical errors
 * Used for error badge display
 * @param count Number of consecutive errors required (default: 3)
 * @returns True if there are `count` consecutive critical errors
 */
export async function hasConsecutiveCriticalErrors(count: number = 3): Promise<boolean> {
  const log = await getEventLog()
  const events = [...log.events].reverse()

  if (events.length < count) {
    return false
  }

  // Critical error types that trigger the badge
  const criticalTypes: CaptureEventType[] = ['capture_failed', 'upload_failed', 'retry_exhausted']

  // Success types that reset the error counter (ignore idle events)
  const successTypes: CaptureEventType[] = ['capture_success', 'upload_success']

  let consecutiveErrors = 0
  for (const event of events) {
    if (!event.success && criticalTypes.includes(event.eventType)) {
      consecutiveErrors++
      if (consecutiveErrors >= count) {
        return true
      }
    } else if (event.success && successTypes.includes(event.eventType)) {
      // Only reset on capture/upload success, not idle events
      break
    }
    // Ignore idle_pause, idle_resume, capture_skipped for consecutive counting
  }

  return false
}

/**
 * Count consecutive successes since last failure
 * Used to determine when to clear error badge
 * @returns Number of consecutive successful capture/upload events
 */
export async function countConsecutiveSuccesses(): Promise<number> {
  const log = await getEventLog()
  const events = [...log.events].reverse()

  let count = 0
  for (const event of events) {
    if (event.success) {
      count++
    } else {
      break
    }
  }

  return count
}
