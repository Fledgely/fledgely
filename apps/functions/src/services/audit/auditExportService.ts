/**
 * Audit Export Service
 *
 * Story 27.5: Audit Log Search and Export - AC2, AC3, AC4, AC5
 *
 * Generates CSV and PDF exports of audit log data with:
 * - Full event details
 * - Watermarking for forensic traceability
 * - Proper formatting
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
 * Export watermark metadata
 */
export interface ExportWatermark {
  exportId: string
  requestorUid: string
  requestorEmail: string
  exportTimestamp: number
  familyId: string
  eventCount: number
}

/**
 * Export filters
 */
export interface ExportFilters {
  startDate?: number
  endDate?: number
  actorUid?: string
  resourceType?: string
  childId?: string
}

/**
 * Format timestamp for export
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toISOString()
}

/**
 * Format timestamp for PDF display
 */
function formatTimestampReadable(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Get actor display name
 */
async function getActorDisplayName(actorUid: string): Promise<string> {
  const db = getDb()
  try {
    const userDoc = await db.collection('users').doc(actorUid).get()
    if (userDoc.exists) {
      return userDoc.data()?.displayName || userDoc.data()?.email || actorUid
    }
  } catch {
    // Fallback
  }
  return actorUid
}

/**
 * Get child name
 */
async function getChildName(childId: string | null): Promise<string> {
  if (!childId) return 'N/A'
  const db = getDb()
  try {
    const childDoc = await db.collection('children').doc(childId).get()
    if (childDoc.exists) {
      return childDoc.data()?.name || childId
    }
  } catch {
    // Fallback
  }
  return childId
}

/**
 * Get device type from user agent
 */
function getDeviceType(userAgent: string | null): string {
  if (!userAgent) return 'Unknown'
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'Mobile'
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'Tablet'
  }
  if (ua.includes('chrome')) return 'Chrome Desktop'
  if (ua.includes('firefox')) return 'Firefox Desktop'
  if (ua.includes('safari')) return 'Safari Desktop'
  return 'Desktop'
}

/**
 * Format resource type for display
 */
function formatResourceType(resourceType: string): string {
  const mapping: Record<string, string> = {
    screenshots: 'Screenshots list',
    screenshot_detail: 'Screenshot detail',
    child_profile: 'Child profile',
    children_list: 'Children list',
    flags: 'Flagged content',
    flag_detail: 'Flag detail',
    devices: 'Devices list',
    device_detail: 'Device detail',
    agreements: 'Agreements',
    activity: 'Activity',
    dashboard_access: 'Dashboard',
    audit_log_view: 'Audit log',
    audit_export: 'Audit export',
    settings_modify: 'Settings',
    profile_modify: 'Profile',
    caregiver_status: 'Caregiver status',
  }
  return mapping[resourceType] || resourceType.replace(/_/g, ' ')
}

/**
 * Format access type for display
 */
function formatAccessType(accessType: string): string {
  const mapping: Record<string, string> = {
    view: 'Viewed',
    download: 'Downloaded',
    export: 'Exported',
    modify: 'Modified',
  }
  return mapping[accessType] || accessType
}

/**
 * Escape CSV field
 */
function escapeCSV(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

/**
 * Generate CSV export of audit events.
 *
 * @param events - Audit events to export
 * @param watermark - Export watermark metadata
 * @returns CSV string
 */
export async function generateCSVExport(
  events: AuditEvent[],
  watermark: ExportWatermark
): Promise<string> {
  const lines: string[] = []

  // Header comment with watermark
  lines.push(`# Audit Log Export`)
  lines.push(`# Export ID: ${watermark.exportId}`)
  lines.push(`# Exported By: ${watermark.requestorEmail}`)
  lines.push(`# Export Date: ${formatTimestampReadable(watermark.exportTimestamp)}`)
  lines.push(`# Family ID: ${watermark.familyId}`)
  lines.push(`# Event Count: ${watermark.eventCount}`)
  lines.push(`#`)

  // CSV header
  lines.push('Timestamp,Actor,Role,Action,Resource Type,Child,Device')

  // Enrich and format each event
  for (const event of events) {
    const actorName = await getActorDisplayName(event.actorUid)
    const childName = await getChildName(event.childId)
    const deviceType = getDeviceType(event.userAgent)

    const row = [
      escapeCSV(formatTimestamp(event.timestamp)),
      escapeCSV(actorName),
      escapeCSV(event.actorType),
      escapeCSV(formatAccessType(event.accessType)),
      escapeCSV(formatResourceType(event.resourceType)),
      escapeCSV(childName),
      escapeCSV(deviceType),
    ]

    lines.push(row.join(','))
  }

  // Footer watermark
  lines.push('')
  lines.push(`# This export was generated by ${watermark.requestorEmail}`)
  lines.push(`# Export ID: ${watermark.exportId}`)
  lines.push(`# This document may contain sensitive family data.`)

  return lines.join('\n')
}

/**
 * Generate plain text PDF-style export of audit events.
 * (Simplified text format - could be enhanced with PDF library)
 *
 * @param events - Audit events to export
 * @param watermark - Export watermark metadata
 * @param familyName - Family name for header
 * @returns Formatted text string
 */
export async function generateTextExport(
  events: AuditEvent[],
  watermark: ExportWatermark,
  familyName: string
): Promise<string> {
  const lines: string[] = []
  const separator = '='.repeat(60)
  const divider = '-'.repeat(60)

  // Header
  lines.push(separator)
  lines.push('FAMILY AUDIT LOG EXPORT')
  lines.push(separator)
  lines.push('')
  lines.push(`Family: ${familyName}`)
  lines.push(`Exported By: ${watermark.requestorEmail}`)
  lines.push(`Export Date: ${formatTimestampReadable(watermark.exportTimestamp)}`)
  lines.push(`Export ID: ${watermark.exportId}`)
  lines.push('')
  lines.push(divider)
  lines.push('AUDIT EVENTS')
  lines.push(divider)
  lines.push('')

  // Events
  for (const event of events) {
    const actorName = await getActorDisplayName(event.actorUid)
    const childName = await getChildName(event.childId)
    const deviceType = getDeviceType(event.userAgent)

    lines.push(`Date: ${formatTimestampReadable(event.timestamp)}`)
    lines.push(`Actor: ${actorName} (${event.actorType})`)
    lines.push(
      `Action: ${formatAccessType(event.accessType)} ${formatResourceType(event.resourceType)}`
    )
    if (event.childId) {
      lines.push(`Child: ${childName}`)
    }
    lines.push(`Device: ${deviceType}`)
    lines.push('')
  }

  // Footer watermark
  lines.push(divider)
  lines.push('WATERMARK')
  lines.push(divider)
  lines.push(`This export was generated by ${watermark.requestorEmail}`)
  lines.push(`Export ID: ${watermark.exportId}`)
  lines.push(`Timestamp: ${formatTimestamp(watermark.exportTimestamp)}`)
  lines.push('')
  lines.push('This document may contain sensitive family data.')
  lines.push('Handle according to your data protection policies.')
  lines.push(separator)

  return lines.join('\n')
}

/**
 * Query events for export with filters.
 *
 * @param familyId - Family to export
 * @param filters - Export filters
 * @param maxEvents - Maximum events to export (default 1000)
 * @returns Array of audit events
 */
export async function queryEventsForExport(
  familyId: string,
  filters: ExportFilters,
  maxEvents: number = 1000
): Promise<AuditEvent[]> {
  const db = getDb()

  // Query base events (additional filters applied in-memory due to Firestore limitations)
  const snapshot = await db
    .collection('auditEvents')
    .where('familyId', '==', familyId)
    .orderBy('timestamp', 'desc')
    .limit(maxEvents)
    .get()

  const events: AuditEvent[] = []

  for (const doc of snapshot.docs) {
    const event = doc.data() as AuditEvent

    // Apply additional filters that Firestore can't handle
    if (filters.actorUid && event.actorUid !== filters.actorUid) {
      continue
    }
    if (filters.resourceType && event.resourceType !== filters.resourceType) {
      continue
    }
    if (filters.childId && event.childId !== filters.childId) {
      continue
    }
    if (filters.startDate && event.timestamp < filters.startDate) {
      continue
    }
    if (filters.endDate && event.timestamp > filters.endDate) {
      continue
    }

    events.push(event)
  }

  return events
}

/**
 * Get family name for export header.
 *
 * @param familyId - Family ID
 * @returns Family name or fallback
 */
export async function getFamilyName(familyId: string): Promise<string> {
  const db = getDb()
  try {
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (familyDoc.exists) {
      return familyDoc.data()?.name || 'Family'
    }
  } catch {
    // Fallback
  }
  return 'Family'
}

/**
 * For testing - reset Firestore instance
 */
export function _resetDbForTesting(): void {
  db = null
}
