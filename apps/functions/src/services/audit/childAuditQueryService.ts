/**
 * Child Audit Query Service
 *
 * Story 27.3: Child Audit Log View - AC1, AC2, AC3
 *
 * Provides child-friendly audit queries with:
 * - Family relationship resolution (Mom, Dad, etc.)
 * - Screenshot metadata for thumbnails
 * - Child-readable language
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import type { AuditEvent } from '@fledgely/shared'

// Lazy initialization for Firestore
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/**
 * Child-friendly audit event with family names and screenshot info.
 */
export interface ChildFriendlyAuditEvent {
  id: string
  actorFamilyName: string // "Mom", "Dad", "Your parent"
  actorType: string
  accessType: string
  resourceType: string
  resourceId: string | null
  timestamp: number
  friendlyMessage: string // "Mom viewed your screenshot from Saturday"
  screenshotThumbnail?: {
    id: string
    timestamp: number
  }
}

/**
 * Result of a child audit log query.
 */
export interface ChildAuditLogResult {
  events: ChildFriendlyAuditEvent[]
  noRecentAccess: boolean
  lastAccessDate: number | null
}

/**
 * Get family-friendly name for an actor.
 *
 * Maps guardian UIDs to relationship names like "Mom" or "Dad"
 * based on their display name or falls back to "Your parent".
 */
async function getActorFamilyName(
  actorUid: string,
  actorType: string,
  _familyId: string
): Promise<string> {
  const db = getDb()

  // For child viewing own data
  if (actorType === 'child') {
    return 'You'
  }

  // For caregivers
  if (actorType === 'caregiver') {
    try {
      const userDoc = await db.collection('users').doc(actorUid).get()
      if (userDoc.exists) {
        return userDoc.data()?.displayName || 'A caregiver'
      }
    } catch {
      // Fallback
    }
    return 'A caregiver'
  }

  // For guardians - try to get a friendly name
  if (actorType === 'guardian') {
    try {
      const userDoc = await db.collection('users').doc(actorUid).get()
      if (userDoc.exists) {
        const displayName = userDoc.data()?.displayName || ''
        const lowerName = displayName.toLowerCase()

        // Check for common parent indicators
        if (
          lowerName.includes('mom') ||
          lowerName.includes('mother') ||
          lowerName.includes('mama')
        ) {
          return 'Mom'
        }
        if (
          lowerName.includes('dad') ||
          lowerName.includes('father') ||
          lowerName.includes('papa')
        ) {
          return 'Dad'
        }

        // Use display name if reasonable length
        if (displayName && displayName.length <= 15) {
          return displayName.split(' ')[0] // First name only
        }
      }
    } catch {
      // Fallback
    }
    return 'Your parent'
  }

  // For system/admin
  if (actorType === 'admin' || actorType === 'system') {
    return 'Fledgely'
  }

  return 'Someone'
}

/**
 * Format date in child-friendly format.
 */
function formatChildFriendlyDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) {
    return 'today'
  }
  if (diffDays === 1) {
    return 'yesterday'
  }
  if (diffDays < 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[date.getDay()]
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Create child-friendly message for an audit event.
 */
function createFriendlyMessage(actorName: string, resourceType: string, timestamp: number): string {
  const dateStr = formatChildFriendlyDate(timestamp)

  const messageTemplates: Record<string, string> = {
    screenshot_detail: `${actorName} viewed your screenshot from ${dateStr}`,
    screenshots: `${actorName} looked at your screenshots`,
    child_profile: `${actorName} checked your profile`,
    flags: `${actorName} reviewed a flagged item`,
    flag_detail: `${actorName} looked at something that was flagged`,
    activity: `${actorName} checked your activity`,
    devices: `${actorName} checked your devices`,
    device_detail: `${actorName} looked at a device`,
    agreements: `${actorName} viewed your agreement`,
    dashboard_access: `${actorName} visited the family dashboard`,
  }

  return messageTemplates[resourceType] || `${actorName} viewed your data`
}

/**
 * Query audit events for a specific child.
 *
 * Story 27.3: Child Audit Log View
 *
 * @param childId - Child ID to query events for
 * @param familyId - Family ID for context
 * @param limit - Maximum events to return
 * @returns Child-friendly audit events
 */
export async function getChildAuditLog(
  childId: string,
  familyId: string,
  limit: number = 20
): Promise<ChildAuditLogResult> {
  const db = getDb()

  // Query events for this child
  const snapshot = await db
    .collection('auditEvents')
    .where('familyId', '==', familyId)
    .where('childId', '==', childId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get()

  if (snapshot.empty) {
    return {
      events: [],
      noRecentAccess: true,
      lastAccessDate: null,
    }
  }

  const events: ChildFriendlyAuditEvent[] = []

  for (const doc of snapshot.docs) {
    const event = doc.data() as AuditEvent

    // Get family-friendly actor name
    const actorFamilyName = await getActorFamilyName(event.actorUid, event.actorType, familyId)

    // Create friendly message
    const friendlyMessage = createFriendlyMessage(
      actorFamilyName,
      event.resourceType,
      event.timestamp
    )

    // Include screenshot info if relevant
    const screenshotThumbnail =
      event.resourceType === 'screenshot_detail' && event.resourceId
        ? {
            id: event.resourceId,
            timestamp: event.timestamp,
          }
        : undefined

    events.push({
      id: event.id,
      actorFamilyName,
      actorType: event.actorType,
      accessType: event.accessType,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      timestamp: event.timestamp,
      friendlyMessage,
      screenshotThumbnail,
    })
  }

  // Check if recent access (within last week)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const noRecentAccess = events.every((e) => e.timestamp < oneWeekAgo)

  return {
    events,
    noRecentAccess,
    lastAccessDate: events[0]?.timestamp || null,
  }
}
