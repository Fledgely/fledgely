/**
 * Fuzzy Match Log Service
 *
 * Story 7.5: Fuzzy Domain Matching - Task 5
 *
 * Handles storage of fuzzy match logs for allowlist improvement.
 * Logs are ANONYMOUS - no user/family/child IDs for privacy.
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import {
  fuzzyMatchLogInputSchema,
  fuzzyMatchLogSchema,
  FUZZY_MATCH_LOGS_COLLECTION,
  FUZZY_MATCH_RATE_LIMIT,
  type FuzzyMatchLogInput,
  type FuzzyMatchLog,
  type FuzzyMatchRateLimit,
} from '@fledgely/contracts'

/**
 * Hash an IP address for rate limiting (privacy-preserving)
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check if a hashed IP has exceeded the daily rate limit
 *
 * @param ipHash - Hashed IP address
 * @returns true if rate limited, false if allowed
 */
export async function isRateLimited(ipHash: string): Promise<boolean> {
  const db = getFirestore()
  const today = getTodayDateString()
  const rateLimitDocId = `${ipHash}_${today}`

  const doc = await db
    .collection(FUZZY_MATCH_RATE_LIMIT.COLLECTION)
    .doc(rateLimitDocId)
    .get()

  if (!doc.exists) {
    return false
  }

  const data = doc.data() as FuzzyMatchRateLimit
  return data.count >= FUZZY_MATCH_RATE_LIMIT.MAX_LOGS_PER_DAY
}

/**
 * Increment the rate limit counter for an IP
 *
 * @param ipHash - Hashed IP address
 */
export async function incrementRateLimit(ipHash: string): Promise<void> {
  const db = getFirestore()
  const today = getTodayDateString()
  const rateLimitDocId = `${ipHash}_${today}`
  const docRef = db.collection(FUZZY_MATCH_RATE_LIMIT.COLLECTION).doc(rateLimitDocId)

  const doc = await docRef.get()

  if (doc.exists) {
    const data = doc.data() as FuzzyMatchRateLimit
    await docRef.update({
      count: data.count + 1,
    })
  } else {
    const rateLimitEntry: FuzzyMatchRateLimit = {
      ipHash,
      date: today,
      count: 1,
    }
    await docRef.set(rateLimitEntry)
  }
}

/**
 * Result of logging a fuzzy match
 */
export interface LogFuzzyMatchResult {
  success: boolean
  logId?: string
  error?: string
}

/**
 * Log a fuzzy match for allowlist improvement
 *
 * @param input - Fuzzy match input data
 * @param ip - Client IP address (for rate limiting)
 * @returns Result with log ID or error
 */
export async function logFuzzyMatch(
  input: FuzzyMatchLogInput,
  ip: string
): Promise<LogFuzzyMatchResult> {
  // Validate input
  const validationResult = fuzzyMatchLogInputSchema.safeParse(input)
  if (!validationResult.success) {
    return {
      success: false,
      error: `Invalid input: ${validationResult.error.message}`,
    }
  }

  const validatedInput = validationResult.data

  // Check rate limit
  const ipHash = hashIp(ip)
  if (await isRateLimited(ipHash)) {
    return {
      success: false,
      error: 'Rate limit exceeded. Please try again tomorrow.',
    }
  }

  // Create log entry
  const logId = uuidv4()
  const timestamp = new Date().toISOString()

  const logEntry: FuzzyMatchLog = {
    id: logId,
    inputDomain: validatedInput.inputDomain,
    matchedDomain: validatedInput.matchedDomain,
    distance: validatedInput.distance,
    deviceType: validatedInput.deviceType,
    timestamp,
  }

  // Validate the full entry
  const fullValidation = fuzzyMatchLogSchema.safeParse(logEntry)
  if (!fullValidation.success) {
    return {
      success: false,
      error: `Internal error: ${fullValidation.error.message}`,
    }
  }

  // Store in Firestore
  const db = getFirestore()
  await db.collection(FUZZY_MATCH_LOGS_COLLECTION).doc(logId).set({
    ...logEntry,
    // Store as Firestore timestamp for better querying
    createdAt: Timestamp.fromDate(new Date(timestamp)),
  })

  // Increment rate limit counter
  await incrementRateLimit(ipHash)

  return {
    success: true,
    logId,
  }
}

/**
 * Get recent fuzzy match logs (for admin view)
 *
 * @param limit - Maximum number of logs to return
 * @returns Array of fuzzy match logs
 */
export async function getRecentFuzzyMatchLogs(
  limit: number = 100
): Promise<FuzzyMatchLog[]> {
  const db = getFirestore()

  const snapshot = await db
    .collection(FUZZY_MATCH_LOGS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: data.id,
      inputDomain: data.inputDomain,
      matchedDomain: data.matchedDomain,
      distance: data.distance,
      deviceType: data.deviceType,
      timestamp: data.timestamp,
    }
  })
}

/**
 * Get aggregated fuzzy match statistics
 *
 * Groups by inputDomain+matchedDomain and counts occurrences.
 * Useful for identifying common typos to add as aliases.
 *
 * @param limit - Maximum number of stats to return
 * @returns Array of aggregated stats sorted by count
 */
export async function getFuzzyMatchStats(limit: number = 50): Promise<
  Array<{
    inputDomain: string
    matchedDomain: string
    avgDistance: number
    count: number
    firstSeen: string
    lastSeen: string
  }>
> {
  const db = getFirestore()

  // Get all logs (we'll aggregate in memory - for production, consider Cloud Functions aggregation)
  const snapshot = await db
    .collection(FUZZY_MATCH_LOGS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(10000) // Reasonable limit for aggregation
    .get()

  // Aggregate by inputDomain+matchedDomain
  const statsMap = new Map<
    string,
    {
      inputDomain: string
      matchedDomain: string
      distances: number[]
      timestamps: string[]
    }
  >()

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const key = `${data.inputDomain}:${data.matchedDomain}`

    if (statsMap.has(key)) {
      const existing = statsMap.get(key)!
      existing.distances.push(data.distance)
      existing.timestamps.push(data.timestamp)
    } else {
      statsMap.set(key, {
        inputDomain: data.inputDomain,
        matchedDomain: data.matchedDomain,
        distances: [data.distance],
        timestamps: [data.timestamp],
      })
    }
  }

  // Convert to stats array
  const stats = Array.from(statsMap.values()).map((entry) => {
    const sortedTimestamps = entry.timestamps.sort()
    return {
      inputDomain: entry.inputDomain,
      matchedDomain: entry.matchedDomain,
      avgDistance: entry.distances.reduce((a, b) => a + b, 0) / entry.distances.length,
      count: entry.distances.length,
      firstSeen: sortedTimestamps[0],
      lastSeen: sortedTimestamps[sortedTimestamps.length - 1],
    }
  })

  // Sort by count descending and limit
  return stats.sort((a, b) => b.count - a.count).slice(0, limit)
}

/**
 * Delete old rate limit entries (for cleanup scheduled function)
 *
 * @param daysOld - Delete entries older than this many days
 * @returns Number of entries deleted
 */
export async function cleanupOldRateLimits(daysOld: number = 7): Promise<number> {
  const db = getFirestore()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)
  const cutoffDateString = cutoffDate.toISOString().split('T')[0]

  // Query for old rate limit entries
  // Since we use date in the doc ID format ipHash_YYYY-MM-DD, we can compare
  const snapshot = await db.collection(FUZZY_MATCH_RATE_LIMIT.COLLECTION).get()

  const batch = db.batch()
  let deleteCount = 0

  for (const doc of snapshot.docs) {
    const data = doc.data() as FuzzyMatchRateLimit
    if (data.date < cutoffDateString) {
      batch.delete(doc.ref)
      deleteCount++
    }
  }

  if (deleteCount > 0) {
    await batch.commit()
  }

  return deleteCount
}
