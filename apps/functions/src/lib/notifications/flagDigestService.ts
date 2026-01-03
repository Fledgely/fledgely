/**
 * Flag Digest Service
 *
 * Story 41.2: Flag Notifications - AC2, AC3, AC7
 *
 * Manages queuing and sending of digest notifications:
 * - Hourly digests for medium severity flags
 * - Daily digests for low severity flags
 * - Consolidation of multiple flags (AC7)
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import type { FlagDocument, ConcernSeverity, ConcernCategory } from '@fledgely/shared'

// Lazy Firestore initialization for testing
let db: FirebaseFirestore.Firestore | null = null
function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

/**
 * Digest type
 */
export type DigestType = 'hourly' | 'daily'

/**
 * Queued flag for digest
 */
export interface FlagDigestQueueItem {
  id: string
  userId: string
  flagId: string
  childId: string
  childName: string
  severity: ConcernSeverity
  category: ConcernCategory
  queuedAt: number
  digestType: DigestType
  processed: boolean
}

/**
 * Queue a flag for digest notification
 *
 * Story 41.2 - AC2, AC3: Queue for hourly or daily digest
 */
export async function queueFlagForDigest(
  userId: string,
  flag: FlagDocument,
  childName: string,
  digestType: DigestType
): Promise<string> {
  const queueRef = getDb().collection('users').doc(userId).collection('flagDigestQueue').doc()

  const queueItem: FlagDigestQueueItem = {
    id: queueRef.id,
    userId,
    flagId: flag.id,
    childId: flag.childId,
    childName,
    severity: flag.severity,
    category: flag.category,
    queuedAt: Date.now(),
    digestType,
    processed: false,
  }

  await queueRef.set(queueItem)

  logger.info('Flag queued for digest', {
    userId,
    flagId: flag.id,
    digestType,
    queueId: queueRef.id,
  })

  return queueRef.id
}

/**
 * Get pending digest items for a user
 */
async function getPendingDigestItems(
  userId: string,
  digestType: DigestType
): Promise<FlagDigestQueueItem[]> {
  const query = getDb()
    .collection('users')
    .doc(userId)
    .collection('flagDigestQueue')
    .where('digestType', '==', digestType)
    .where('processed', '==', false)
    .orderBy('queuedAt', 'asc')

  const snapshot = await query.get()

  return snapshot.docs.map((doc) => doc.data() as FlagDigestQueueItem)
}

/**
 * Mark digest items as processed
 */
async function markDigestItemsProcessed(userId: string, itemIds: string[]): Promise<void> {
  const batch = getDb().batch()

  for (const itemId of itemIds) {
    const docRef = getDb().collection('users').doc(userId).collection('flagDigestQueue').doc(itemId)

    batch.update(docRef, {
      processed: true,
      processedAt: FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()
}

/**
 * Token stored in user's subcollection
 */
interface NotificationToken {
  token: string
}

/**
 * Get all FCM tokens for a user
 */
async function getUserTokens(userId: string): Promise<string[]> {
  const tokensRef = getDb().collection('users').doc(userId).collection('notificationTokens')
  const tokenDocs = await tokensRef.get()

  const tokens: string[] = []
  for (const doc of tokenDocs.docs) {
    const data = doc.data() as NotificationToken
    if (data.token) {
      tokens.push(data.token)
    }
  }

  return tokens
}

/**
 * Group digest items by child
 */
interface ChildDigestGroup {
  childId: string
  childName: string
  items: FlagDigestQueueItem[]
  highestSeverity: ConcernSeverity
}

function groupByChild(items: FlagDigestQueueItem[]): ChildDigestGroup[] {
  const groups = new Map<string, ChildDigestGroup>()

  for (const item of items) {
    const existing = groups.get(item.childId)

    if (existing) {
      existing.items.push(item)

      // Track highest severity
      if (
        item.severity === 'critical' ||
        (item.severity === 'medium' && existing.highestSeverity === 'low')
      ) {
        existing.highestSeverity = item.severity
      }
    } else {
      groups.set(item.childId, {
        childId: item.childId,
        childName: item.childName,
        items: [item],
        highestSeverity: item.severity,
      })
    }
  }

  return Array.from(groups.values())
}

/**
 * Get severity emoji badge
 */
function getSeverityBadge(severity: ConcernSeverity): string {
  switch (severity) {
    case 'critical':
      return '🔴'
    case 'medium':
      return '🟡'
    case 'low':
      return '🟢'
    default:
      return '⚪'
  }
}

/**
 * Build digest notification content
 *
 * Story 41.2 - AC7: Consolidated notification with count and highest severity
 */
function buildDigestContent(
  groups: ChildDigestGroup[],
  digestType: DigestType
): {
  title: string
  body: string
} {
  const totalFlags = groups.reduce((sum, g) => sum + g.items.length, 0)

  // Find highest severity across all groups
  let highestSeverity: ConcernSeverity = 'low'
  for (const group of groups) {
    if (group.highestSeverity === 'critical') {
      highestSeverity = 'critical'
      break
    }
    if (group.highestSeverity === 'medium' && highestSeverity === 'low') {
      highestSeverity = 'medium'
    }
  }

  const badge = getSeverityBadge(highestSeverity)
  const digestLabel = digestType === 'hourly' ? 'Hourly' : 'Daily'

  if (groups.length === 1) {
    // Single child
    const group = groups[0]
    const flagWord = totalFlags === 1 ? 'flag' : 'flags'
    return {
      title: `${badge} ${digestLabel} Flag Summary`,
      body: `${totalFlags} new ${flagWord} for ${group.childName} to review`,
    }
  }

  // Multiple children
  const childNames = groups.map((g) => g.childName).join(', ')
  const flagWord = totalFlags === 1 ? 'flag' : 'flags'

  return {
    title: `${badge} ${digestLabel} Flag Summary`,
    body: `${totalFlags} new ${flagWord} for ${childNames} to review`,
  }
}

/**
 * Record digest notification in history
 */
async function recordDigestHistory(
  userId: string,
  digestType: DigestType,
  flagIds: string[],
  status: 'sent' | 'failed'
): Promise<void> {
  const historyRef = getDb().collection('users').doc(userId).collection('notificationHistory').doc()

  await historyRef.set({
    id: historyRef.id,
    userId,
    type: 'flag_digest',
    digestType,
    flagIds,
    flagCount: flagIds.length,
    sentAt: Date.now(),
    deliveryStatus: status,
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Result of processing digest for a user
 */
export interface ProcessDigestResult {
  userId: string
  flagsProcessed: number
  sent: boolean
  reason?: string
}

/**
 * Process digest for a single user
 */
export async function processUserDigest(
  userId: string,
  digestType: DigestType
): Promise<ProcessDigestResult> {
  logger.info('Processing digest for user', { userId, digestType })

  // Get pending items
  const pendingItems = await getPendingDigestItems(userId, digestType)

  if (pendingItems.length === 0) {
    logger.info('No pending items for digest', { userId, digestType })
    return {
      userId,
      flagsProcessed: 0,
      sent: false,
      reason: 'no_pending_items',
    }
  }

  // Get user tokens
  const tokens = await getUserTokens(userId)

  if (tokens.length === 0) {
    logger.info('No tokens for user, marking items processed', { userId })
    await markDigestItemsProcessed(
      userId,
      pendingItems.map((i) => i.id)
    )
    await recordDigestHistory(
      userId,
      digestType,
      pendingItems.map((i) => i.flagId),
      'failed'
    )

    return {
      userId,
      flagsProcessed: pendingItems.length,
      sent: false,
      reason: 'no_tokens',
    }
  }

  // Group by child and build notification
  const groups = groupByChild(pendingItems)
  const content = buildDigestContent(groups, digestType)
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  // Send via FCM
  const messaging = getMessaging()

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: content.title,
        body: content.body,
      },
      data: {
        type: 'flag_digest',
        digestType,
        flagCount: String(pendingItems.length),
        action: 'view_flags',
      },
      webpush: {
        fcmOptions: {
          link: `${appUrl}/flags`,
        },
      },
    })

    // Mark items as processed
    await markDigestItemsProcessed(
      userId,
      pendingItems.map((i) => i.id)
    )

    // Record history
    await recordDigestHistory(
      userId,
      digestType,
      pendingItems.map((i) => i.flagId),
      response.successCount > 0 ? 'sent' : 'failed'
    )

    logger.info('Digest sent successfully', {
      userId,
      digestType,
      flagsProcessed: pendingItems.length,
      successCount: response.successCount,
    })

    return {
      userId,
      flagsProcessed: pendingItems.length,
      sent: response.successCount > 0,
    }
  } catch (error) {
    logger.error('Failed to send digest', { userId, digestType, error })

    // Still mark as processed to avoid retry spam
    await markDigestItemsProcessed(
      userId,
      pendingItems.map((i) => i.id)
    )

    await recordDigestHistory(
      userId,
      digestType,
      pendingItems.map((i) => i.flagId),
      'failed'
    )

    return {
      userId,
      flagsProcessed: pendingItems.length,
      sent: false,
      reason: 'send_failed',
    }
  }
}

/**
 * Get all users with pending digest items
 */
export async function getUsersWithPendingDigest(digestType: DigestType): Promise<string[]> {
  // Query across all users - using collection group query
  const query = getDb()
    .collectionGroup('flagDigestQueue')
    .where('digestType', '==', digestType)
    .where('processed', '==', false)
    .limit(1000) // Limit to prevent excessive reads

  const snapshot = await query.get()

  // Extract unique user IDs from parent paths
  const userIds = new Set<string>()

  for (const doc of snapshot.docs) {
    // Path is: users/{userId}/flagDigestQueue/{docId}
    const path = doc.ref.path
    const parts = path.split('/')
    if (parts.length >= 2 && parts[0] === 'users') {
      userIds.add(parts[1])
    }
  }

  return Array.from(userIds)
}

/**
 * Process hourly digest for all users
 *
 * Story 41.2 - AC2: Hourly digest for medium severity
 */
export async function processHourlyDigest(): Promise<{
  usersProcessed: number
  totalFlagsProcessed: number
  successCount: number
}> {
  logger.info('Processing hourly digest')

  const userIds = await getUsersWithPendingDigest('hourly')

  let totalFlagsProcessed = 0
  let successCount = 0

  for (const userId of userIds) {
    const result = await processUserDigest(userId, 'hourly')
    totalFlagsProcessed += result.flagsProcessed

    if (result.sent) {
      successCount++
    }
  }

  logger.info('Hourly digest processing complete', {
    usersProcessed: userIds.length,
    totalFlagsProcessed,
    successCount,
  })

  return {
    usersProcessed: userIds.length,
    totalFlagsProcessed,
    successCount,
  }
}

/**
 * Process daily digest for all users
 *
 * Story 41.2 - AC3: Daily digest for low severity
 */
export async function processDailyDigest(): Promise<{
  usersProcessed: number
  totalFlagsProcessed: number
  successCount: number
}> {
  logger.info('Processing daily digest')

  const userIds = await getUsersWithPendingDigest('daily')

  let totalFlagsProcessed = 0
  let successCount = 0

  for (const userId of userIds) {
    const result = await processUserDigest(userId, 'daily')
    totalFlagsProcessed += result.flagsProcessed

    if (result.sent) {
      successCount++
    }
  }

  // Also include any unprocessed hourly items in daily
  const hourlyUserIds = await getUsersWithPendingDigest('hourly')

  for (const userId of hourlyUserIds) {
    // Only process if not already processed above
    if (!userIds.includes(userId)) {
      const result = await processUserDigest(userId, 'hourly')
      totalFlagsProcessed += result.flagsProcessed

      if (result.sent) {
        successCount++
      }
    }
  }

  const totalUsersProcessed =
    userIds.length + hourlyUserIds.filter((u) => !userIds.includes(u)).length

  logger.info('Daily digest processing complete', {
    usersProcessed: totalUsersProcessed,
    totalFlagsProcessed,
    successCount,
  })

  return {
    usersProcessed: totalUsersProcessed,
    totalFlagsProcessed,
    successCount,
  }
}
