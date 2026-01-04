/**
 * Trusted Adult Access Callable Functions - Story 52.5
 *
 * Firebase callable functions for trusted adult data access.
 *
 * AC1: View Shared Data Dashboard
 * AC2: Read-Only Access
 * AC3: Respect Reverse Mode Settings
 * AC5: Access Logging (NFR42)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import {
  validateTrustedAdultAccess,
  getSharedDataFilter,
  hasAnySharedData,
  createAccessEvent,
  getSharedByLabel,
  getNoDataSharedMessage,
  type TrustedAdultAccessType,
} from '@fledgely/shared'
import { TrustedAdultStatus } from '@fledgely/shared'
import type { ReverseModeSettings } from '@fledgely/shared'

const db = getFirestore()

// ============================================
// Request Schemas
// ============================================

const GetSharedDataRequestSchema = z.object({
  childId: z.string().min(1),
})

const GetTrustedAdultChildrenRequestSchema = z.object({})

const LogAccessRequestSchema = z.object({
  childId: z.string().min(1),
  accessType: z.enum([
    'dashboard_view',
    'screen_time_view',
    'flags_view',
    'screenshots_view',
    'location_view',
    'activity_view',
  ]),
  dataCategories: z.array(z.string()).optional(),
})

// ============================================
// Helper Functions
// ============================================

interface TrustedAdultData {
  id: string
  email: string
  name: string
  status: string
  childId: string
  familyId: string
  invitedBy: string
  invitedAt: Date
  expiresAt: Date
  userId?: string
  acceptedAt?: Date
  approvedByTeenAt?: Date
  approvedByTeenId?: string
  revokedAt?: Date
  revokedBy?: string
  revokedReason?: string
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value
  if (typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate()
  }
  return undefined
}

async function getTrustedAdultByUserId(
  userId: string,
  childId: string
): Promise<TrustedAdultData | null> {
  const snapshot = await db
    .collection('trustedAdults')
    .where('userId', '==', userId)
    .where('childId', '==', childId)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  const data = doc.data()

  return {
    id: doc.id,
    email: data.email,
    name: data.name,
    status: data.status,
    childId: data.childId,
    familyId: data.familyId,
    invitedBy: data.invitedBy,
    invitedAt: toDate(data.invitedAt) ?? new Date(),
    expiresAt: toDate(data.expiresAt) ?? new Date(),
    userId: data.userId,
    acceptedAt: toDate(data.acceptedAt),
    approvedByTeenAt: toDate(data.approvedByTeenAt),
    approvedByTeenId: data.approvedByTeenId,
    revokedAt: toDate(data.revokedAt),
    revokedBy: data.revokedBy,
    revokedReason: data.revokedReason,
  }
}

async function getAllTrustedAdultsForUser(userId: string): Promise<TrustedAdultData[]> {
  const snapshot = await db
    .collection('trustedAdults')
    .where('userId', '==', userId)
    .where('status', '==', TrustedAdultStatus.ACTIVE)
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      email: data.email,
      name: data.name,
      status: data.status,
      childId: data.childId,
      familyId: data.familyId,
      invitedBy: data.invitedBy,
      invitedAt: toDate(data.invitedAt) ?? new Date(),
      expiresAt: toDate(data.expiresAt) ?? new Date(),
      userId: data.userId,
      acceptedAt: toDate(data.acceptedAt),
      approvedByTeenAt: toDate(data.approvedByTeenAt),
      approvedByTeenId: data.approvedByTeenId,
    }
  })
}

async function getChildInfo(childId: string): Promise<{ name: string; familyId: string } | null> {
  const snapshot = await db.collection('children').doc(childId).get()

  if (!snapshot.exists) {
    return null
  }

  const data = snapshot.data()!
  return {
    name: data.name || data.displayName || 'Child',
    familyId: data.familyId,
  }
}

async function getReverseModeSettings(childId: string): Promise<ReverseModeSettings | null> {
  const snapshot = await db.collection('reverseModeSettings').doc(childId).get()

  if (!snapshot.exists) {
    return null
  }

  const data = snapshot.data()!
  return {
    status: data.status || 'off',
    activatedAt: toDate(data.activatedAt),
    activatedBy: data.activatedBy,
    deactivatedAt: toDate(data.deactivatedAt),
    sharingPreferences: data.sharingPreferences,
  }
}

// ============================================
// Callable Functions
// ============================================

/**
 * Get shared data for a trusted adult.
 * AC1: Dashboard limited to what teen shares
 * AC3: Respect reverse mode settings
 */
export const getSharedDataForTrustedAdultCallable = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const parseResult = GetSharedDataRequestSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid request data')
    }

    const { childId } = parseResult.data

    // Get trusted adult record
    const trustedAdult = await getTrustedAdultByUserId(auth.uid, childId)

    // Validate access
    const accessResult = validateTrustedAdultAccess(
      trustedAdult as unknown as Parameters<typeof validateTrustedAdultAccess>[0]
    )

    if (!accessResult.hasAccess) {
      return {
        hasAccess: false,
        accessDeniedReason: accessResult.accessDeniedReason,
      }
    }

    // Get child info
    const childInfo = await getChildInfo(childId)
    if (!childInfo) {
      throw new HttpsError('not-found', 'Child not found')
    }

    // Get reverse mode settings
    const reverseModeSettings = await getReverseModeSettings(childId)

    // Get data filter based on reverse mode
    const dataFilter = getSharedDataFilter(reverseModeSettings)

    // Check if any data is shared
    const hasData = hasAnySharedData(dataFilter)

    // Log access
    const accessEvent = createAccessEvent(
      trustedAdult!.id,
      childId,
      childInfo.familyId,
      'dashboard_view',
      Object.entries(dataFilter)
        .filter(([, v]) => v === true)
        .map(([k]) => k)
    )

    await db.collection('trustedAdultAccessLog').add({
      ...accessEvent,
      timestamp: FieldValue.serverTimestamp(),
    })

    // Update last access timestamp on trusted adult record
    await db.collection('trustedAdults').doc(trustedAdult!.id).update({
      lastAccessAt: FieldValue.serverTimestamp(),
    })

    return {
      hasAccess: true,
      childId,
      childName: childInfo.name,
      sharedByLabel: getSharedByLabel(childInfo.name),
      dataFilter,
      hasData,
      noDataMessage: hasData ? null : getNoDataSharedMessage(childInfo.name),
      reverseModeActive: reverseModeSettings?.status === 'active',
    }
  }
)

/**
 * Get list of children a trusted adult can view.
 */
export const getTrustedAdultChildrenCallable = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const parseResult = GetTrustedAdultChildrenRequestSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid request data')
    }

    // Get all active trusted adult relationships for this user
    const trustedAdults = await getAllTrustedAdultsForUser(auth.uid)

    // Get child info for each relationship
    const children = await Promise.all(
      trustedAdults.map(async (ta) => {
        const childInfo = await getChildInfo(ta.childId)
        const reverseModeSettings = await getReverseModeSettings(ta.childId)

        return {
          childId: ta.childId,
          childName: childInfo?.name || 'Child',
          familyId: ta.familyId,
          trustedAdultId: ta.id,
          reverseModeActive: reverseModeSettings?.status === 'active',
          approvedAt: ta.approvedByTeenAt,
        }
      })
    )

    return {
      children,
      count: children.length,
    }
  }
)

/**
 * Log trusted adult access to child data.
 * AC5: All access logged for audit
 */
export const logTrustedAdultAccessCallable = onCall({ enforceAppCheck: false }, async (request) => {
  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated')
  }

  const parseResult = LogAccessRequestSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid request data')
  }

  const { childId, accessType, dataCategories } = parseResult.data

  // Get trusted adult record
  const trustedAdult = await getTrustedAdultByUserId(auth.uid, childId)

  // Validate access
  const accessResult = validateTrustedAdultAccess(
    trustedAdult as unknown as Parameters<typeof validateTrustedAdultAccess>[0]
  )

  if (!accessResult.hasAccess) {
    throw new HttpsError('permission-denied', accessResult.accessDeniedReason || 'Access denied')
  }

  // Get child info for family ID
  const childInfo = await getChildInfo(childId)
  if (!childInfo) {
    throw new HttpsError('not-found', 'Child not found')
  }

  // Create and store access event
  const accessEvent = createAccessEvent(
    trustedAdult!.id,
    childId,
    childInfo.familyId,
    accessType as TrustedAdultAccessType,
    dataCategories || []
  )

  await db.collection('trustedAdultAccessLog').add({
    ...accessEvent,
    timestamp: FieldValue.serverTimestamp(),
  })

  // Update last access timestamp
  await db.collection('trustedAdults').doc(trustedAdult!.id).update({
    lastAccessAt: FieldValue.serverTimestamp(),
  })

  return {
    success: true,
    eventId: accessEvent.id,
  }
})

/**
 * Get access log for a trusted adult (visible to teen).
 * AC5: Teen can see when trusted adult last accessed data
 */
export const getTrustedAdultAccessLogCallable = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const { trustedAdultId, limit: limitParam } = request.data as {
      trustedAdultId: string
      limit?: number
    }

    if (!trustedAdultId) {
      throw new HttpsError('invalid-argument', 'trustedAdultId is required')
    }

    const limitValue = Math.min(limitParam || 20, 100)

    // Get access log entries
    const snapshot = await db
      .collection('trustedAdultAccessLog')
      .where('trustedAdultId', '==', trustedAdultId)
      .orderBy('timestamp', 'desc')
      .limit(limitValue)
      .get()

    const entries = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        accessType: data.accessType,
        dataCategories: data.dataCategories,
        timestamp: toDate(data.timestamp)?.toISOString(),
      }
    })

    return {
      entries,
      count: entries.length,
    }
  }
)
