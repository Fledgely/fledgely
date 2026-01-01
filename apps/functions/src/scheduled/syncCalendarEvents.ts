/**
 * Calendar Events Sync Scheduled Function - Story 33.4
 *
 * Syncs calendar events for all children with connected Google Calendars.
 * Detects focus-eligible events by matching keywords.
 *
 * Story 33.4 AC2: Calendar Event Detection
 * - When calendar event contains focus keywords
 * - Event is detected as focus-mode-eligible
 * - Detection uses case-insensitive matching
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import { defineSecret } from 'firebase-functions/params'
import { getFirestore } from 'firebase-admin/firestore'
import { google, calendar_v3 } from 'googleapis'
import * as logger from 'firebase-functions/logger'
import { encryptToken, decryptToken } from '../utils/encryption'

const db = getFirestore()

// Define secrets for OAuth and encryption
const GOOGLE_CLIENT_ID = defineSecret('GOOGLE_CALENDAR_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = defineSecret('GOOGLE_CALENDAR_CLIENT_SECRET')
const TOKEN_ENCRYPTION_KEY = defineSecret('CALENDAR_TOKEN_ENCRYPTION_KEY')

// How far ahead to sync (24 hours)
const SYNC_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Match event title against focus keywords (case-insensitive)
 */
function matchFocusKeywords(
  title: string,
  description: string | null,
  keywords: string[]
): { matches: boolean; matchedKeywords: string[] } {
  const searchText = `${title} ${description || ''}`.toLowerCase()
  const matched: string[] = []

  for (const keyword of keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      matched.push(keyword)
    }
  }

  return {
    matches: matched.length > 0,
    matchedKeywords: matched,
  }
}

interface CalendarIntegrationConfig {
  childId: string
  familyId: string
  isEnabled: boolean
  connectionStatus: string
  accessToken: string
  refreshToken: string | null
  tokenExpiresAt: number | null
  syncFrequencyMinutes: number
  focusTriggerKeywords: string[]
  lastSyncAt: number | null
}

interface CalendarEvent {
  id: string
  title: string
  startTime: number
  endTime: number
  description: string | null
  isFocusEligible: boolean
  matchedKeywords: string[]
  isAllDay: boolean
  processed: boolean
}

/**
 * Sync calendar events for a single child
 */
async function syncChildCalendar(
  config: CalendarIntegrationConfig,
  encryptionKey: string,
  clientId: string,
  clientSecret: string
): Promise<{ success: boolean; eventCount: number; error?: string }> {
  try {
    // Decrypt access token
    const accessToken = decryptToken(config.accessToken, encryptionKey)
    const refreshToken = config.refreshToken
      ? decryptToken(config.refreshToken, encryptionKey)
      : null

    // Create OAuth client with tokens
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: config.tokenExpiresAt,
    })

    // Handle token refresh
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        logger.info('Token refreshed for child', { childId: config.childId })

        // Update tokens in Firestore
        const configRef = db.doc(
          `families/${config.familyId}/calendarIntegration/${config.childId}`
        )
        const updates: Record<string, unknown> = {
          accessToken: encryptToken(tokens.access_token, encryptionKey),
          updatedAt: Date.now(),
        }

        if (tokens.refresh_token) {
          updates.refreshToken = encryptToken(tokens.refresh_token, encryptionKey)
        }
        if (tokens.expiry_date) {
          updates.tokenExpiresAt = tokens.expiry_date
        }

        await configRef.update(updates)
      }
    })

    // Create Calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Fetch events for the next 24 hours
    const now = new Date()
    const endTime = new Date(now.getTime() + SYNC_WINDOW_MS)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    })

    const events: CalendarEvent[] = []
    const googleEvents = response.data.items || []

    for (const event of googleEvents) {
      if (!event.id || !event.summary) continue

      const startTime = parseEventTime(event.start)
      const endTime = parseEventTime(event.end)
      if (!startTime || !endTime) continue

      const { matches, matchedKeywords } = matchFocusKeywords(
        event.summary,
        event.description || null,
        config.focusTriggerKeywords
      )

      events.push({
        id: event.id,
        title: event.summary,
        startTime,
        endTime,
        description: event.description || null,
        isFocusEligible: matches,
        matchedKeywords,
        isAllDay: !!event.start?.date,
        processed: false,
      })
    }

    // Store events in Firestore
    const eventsRef = db.doc(`families/${config.familyId}/calendarEvents/${config.childId}`)
    await eventsRef.set({
      childId: config.childId,
      familyId: config.familyId,
      events,
      fetchedAt: Date.now(),
      expiresAt: Date.now() + SYNC_WINDOW_MS,
      updatedAt: Date.now(),
    })

    // Update last sync time
    const configRef = db.doc(`families/${config.familyId}/calendarIntegration/${config.childId}`)
    await configRef.update({
      lastSyncAt: Date.now(),
      lastSyncError: null,
      updatedAt: Date.now(),
    })

    return { success: true, eventCount: events.length }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Calendar sync failed for child', {
      childId: config.childId,
      error: errorMessage,
    })

    // Update sync error in config
    try {
      const configRef = db.doc(`families/${config.familyId}/calendarIntegration/${config.childId}`)
      await configRef.update({
        lastSyncError: errorMessage,
        connectionStatus: errorMessage.includes('invalid_grant') ? 'error' : 'connected',
        updatedAt: Date.now(),
      })
    } catch {
      // Ignore update error
    }

    return { success: false, eventCount: 0, error: errorMessage }
  }
}

/**
 * Parse Google Calendar event time to timestamp
 */
function parseEventTime(time: calendar_v3.Schema$EventDateTime | undefined): number | null {
  if (!time) return null

  if (time.dateTime) {
    return new Date(time.dateTime).getTime()
  }

  if (time.date) {
    return new Date(time.date).getTime()
  }

  return null
}

/**
 * Calendar Sync Scheduled Function
 *
 * Runs every 15 minutes to sync calendar events for users
 * who need syncing based on their configured frequency.
 */
export const syncCalendarEvents = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'UTC',
    memory: '512MiB',
    timeoutSeconds: 540,
    secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY],
  },
  async (_event: ScheduledEvent) => {
    logger.info('Starting calendar events sync')

    const now = Date.now()
    const encryptionKey = TOKEN_ENCRYPTION_KEY.value()
    const clientId = GOOGLE_CLIENT_ID.value()
    const clientSecret = GOOGLE_CLIENT_SECRET.value()

    try {
      // Query all connected calendar integrations
      const integrationsSnapshot = await db
        .collectionGroup('calendarIntegration')
        .where('connectionStatus', '==', 'connected')
        .where('isEnabled', '==', true)
        .get()

      logger.info('Found calendar integrations', {
        count: integrationsSnapshot.size,
      })

      let syncedCount = 0
      let skippedCount = 0
      let errorCount = 0
      let totalEvents = 0

      for (const doc of integrationsSnapshot.docs) {
        const config = doc.data() as CalendarIntegrationConfig

        // Check if sync is needed based on frequency
        const lastSync = config.lastSyncAt || 0
        const syncIntervalMs = (config.syncFrequencyMinutes || 30) * 60 * 1000

        if (now - lastSync < syncIntervalMs) {
          skippedCount++
          continue
        }

        // Sync calendar
        const result = await syncChildCalendar(config, encryptionKey, clientId, clientSecret)

        if (result.success) {
          syncedCount++
          totalEvents += result.eventCount
          logger.info('Synced calendar for child', {
            childId: config.childId,
            eventCount: result.eventCount,
          })
        } else {
          errorCount++
        }
      }

      logger.info('Calendar sync complete', {
        totalIntegrations: integrationsSnapshot.size,
        synced: syncedCount,
        skipped: skippedCount,
        errors: errorCount,
        totalEvents,
      })
    } catch (error) {
      logger.error('Calendar sync failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
)
