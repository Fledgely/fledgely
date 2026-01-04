/**
 * Offline Queue Service - Story 46.1
 *
 * IndexedDB-based queue for storing screenshots when offline.
 * Implements FIFO eviction at 500 items with encryption at rest.
 *
 * AC2: IndexedDB Queue Storage (up to 500 items, FIFO)
 * AC3: Queue Data Integrity (survives restarts)
 * AC4: Encryption at Rest using AES-256-GCM
 * AC5: Performance (NFR55: <100ms operations)
 */

import type { ScreenshotCapture } from './capture'
import { encryptData, decryptData } from './queue-encryption'

// Database constants
export const DB_NAME = 'fledgely_offline_queue'
export const DB_VERSION = 2 // Bumped for AC4 encryption support
export const STORE_NAME = 'screenshots'
export const MAX_QUEUE_SIZE = 500

/**
 * Queue item interface (unencrypted, for API use).
 * This is what callers work with.
 */
export interface QueuedScreenshot {
  id: string
  capture: ScreenshotCapture
  childId: string
  queuedAt: number
  retryCount: number
  lastRetryAt: number | null
  isDecoy: boolean
}

/**
 * Encrypted queue item for IndexedDB storage.
 * AC4: Queue encrypted at rest using Web Crypto API.
 * Only metadata needed for indexing is stored unencrypted.
 */
export interface EncryptedQueueItem {
  id: string
  encryptedData: ArrayBuffer // AES-256-GCM encrypted capture + retry info
  iv: Uint8Array // Unique IV for each encryption
  queuedAt: number // Unencrypted for FIFO indexing
  childId: string // Unencrypted for filtering
  isDecoy: boolean // Unencrypted for filtering
}

/**
 * Payload encrypted within each queue item.
 * Contains the sensitive capture data.
 */
interface EncryptedPayload {
  capture: ScreenshotCapture
  retryCount: number
  lastRetryAt: number | null
}

// Module-level deviceId cache for encryption
let cachedDeviceId: string | null = null

// Database instance (cached for performance)
let dbInstance: IDBDatabase | null = null
let dbInitPromise: Promise<IDBDatabase> | null = null

/**
 * Set the device ID for queue encryption.
 * AC4: Encryption key derived from device credentials.
 * Must be called before adding items to the queue.
 *
 * @param deviceId The device identifier for key derivation
 */
export function setQueueDeviceId(deviceId: string): void {
  cachedDeviceId = deviceId
}

/**
 * Get the current device ID for encryption.
 * Returns null if not set.
 */
export function getQueueDeviceId(): string | null {
  return cachedDeviceId
}

/**
 * Initialize the IndexedDB database for offline queue.
 * Creates the database and object store if they don't exist.
 * AC3: Queue survives service worker and browser restarts
 */
export async function initOfflineQueue(): Promise<IDBDatabase> {
  // Return cached instance if available
  if (dbInstance) {
    return dbInstance
  }

  // Return existing promise if initialization is in progress
  if (dbInitPromise) {
    return dbInitPromise
  }

  dbInitPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      dbInitPromise = null
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const oldVersion = event.oldVersion

      // Version 1 -> 2: Clear unencrypted data (AC4 encryption migration)
      if (oldVersion < 2 && db.objectStoreNames.contains(STORE_NAME)) {
        // Delete old store with unencrypted data
        db.deleteObjectStore(STORE_NAME)
        console.log('[OfflineQueue] Cleared unencrypted queue for AC4 encryption upgrade')
      }

      // Create screenshots object store with queuedAt index for FIFO ordering
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('queuedAt', 'queuedAt', { unique: false })
        store.createIndex('childId', 'childId', { unique: false })
      }
    }
  })

  return dbInitPromise
}

/**
 * Get the database instance, initializing if needed.
 */
async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) {
    await initOfflineQueue()
  }
  return dbInstance!
}

/**
 * Add a screenshot to the offline queue with encryption.
 * Implements FIFO eviction if queue exceeds MAX_QUEUE_SIZE.
 *
 * AC2: Oldest items dropped if queue full (FIFO)
 * AC4: Queue encrypted at rest using Web Crypto API
 * AC5: Queue operations complete in <100ms
 *
 * @param screenshot The screenshot to queue
 * @returns Promise resolving when added
 */
export async function addToQueue(screenshot: QueuedScreenshot): Promise<void> {
  const startTime = performance.now()

  // AC4: Require deviceId for encryption
  if (!cachedDeviceId) {
    throw new Error('Device ID not set for queue encryption. Call setQueueDeviceId() first.')
  }

  // Prepare encrypted payload
  const payload: EncryptedPayload = {
    capture: screenshot.capture,
    retryCount: screenshot.retryCount,
    lastRetryAt: screenshot.lastRetryAt,
  }

  // AC4: Encrypt the sensitive data
  const { encryptedData, iv } = await encryptData(JSON.stringify(payload), cachedDeviceId)

  // Create encrypted queue item (metadata unencrypted for indexing)
  const encryptedItem: EncryptedQueueItem = {
    id: screenshot.id,
    encryptedData,
    iv,
    queuedAt: screenshot.queuedAt,
    childId: screenshot.childId,
    isDecoy: screenshot.isDecoy,
  }

  const db = await getDB()

  // Check current queue size first (separate transaction)
  const currentSize = await getQueueSize()

  // Evict oldest items if needed (separate transaction for proper sync)
  if (currentSize >= MAX_QUEUE_SIZE) {
    const itemsToRemove = currentSize - MAX_QUEUE_SIZE + 1
    await evictOldestItemsAsync(itemsToRemove)
  }

  // Add the new encrypted item
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const addRequest = store.add(encryptedItem)
    addRequest.onerror = () => {
      const error = addRequest.error
      // Handle quota exceeded error
      if (error?.name === 'QuotaExceededError') {
        reject(new Error('IndexedDB quota exceeded. Queue storage is full.'))
      } else {
        reject(new Error(`Failed to add to queue: ${error?.message}`))
      }
    }

    transaction.oncomplete = () => {
      const elapsed = performance.now() - startTime
      if (elapsed > 100) {
        console.warn(`[OfflineQueue] addToQueue exceeded 100ms: ${elapsed.toFixed(2)}ms`)
      }
      resolve()
    }

    transaction.onerror = () =>
      reject(new Error(`Transaction failed: ${transaction.error?.message}`))
  })
}

/**
 * Evict oldest items from the queue (FIFO) - async version.
 * Uses separate transaction for proper synchronization.
 */
async function evictOldestItemsAsync(count: number): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('queuedAt')
    const request = index.openCursor()
    let deleted = 0

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor && deleted < count) {
        cursor.delete()
        deleted++
        cursor.continue()
      }
    }

    request.onerror = () => reject(new Error(`Failed to evict items: ${request.error?.message}`))

    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(new Error(`Eviction transaction failed: ${transaction.error?.message}`))
  })
}

/**
 * Get queued items in FIFO order (oldest first) with decryption.
 * AC4: Decrypts queue items using Web Crypto API
 * AC5: Queue operations complete in <100ms
 *
 * @param limit Maximum number of items to retrieve (default: all)
 * @returns Array of queued screenshots (decrypted)
 */
export async function getQueuedItems(limit?: number): Promise<QueuedScreenshot[]> {
  const startTime = performance.now()

  // AC4: Require deviceId for decryption
  if (!cachedDeviceId) {
    throw new Error('Device ID not set for queue decryption. Call setQueueDeviceId() first.')
  }

  const db = await getDB()

  // First, get encrypted items from IndexedDB
  const encryptedItems: EncryptedQueueItem[] = await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('queuedAt')
    const items: EncryptedQueueItem[] = []

    const request = index.openCursor()

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        items.push(cursor.value as EncryptedQueueItem)
        if (limit && items.length >= limit) {
          resolve(items)
        } else {
          cursor.continue()
        }
      } else {
        resolve(items)
      }
    }

    request.onerror = () =>
      reject(new Error(`Failed to get queued items: ${request.error?.message}`))
  })

  // AC4: Decrypt each item
  const decryptedItems: QueuedScreenshot[] = []
  for (const encryptedItem of encryptedItems) {
    try {
      const decryptedPayload = await decryptData(
        encryptedItem.encryptedData,
        encryptedItem.iv,
        cachedDeviceId
      )
      const payload: EncryptedPayload = JSON.parse(decryptedPayload)

      decryptedItems.push({
        id: encryptedItem.id,
        capture: payload.capture,
        childId: encryptedItem.childId,
        queuedAt: encryptedItem.queuedAt,
        retryCount: payload.retryCount,
        lastRetryAt: payload.lastRetryAt,
        isDecoy: encryptedItem.isDecoy,
      })
    } catch (error) {
      console.error(`[OfflineQueue] Failed to decrypt item ${encryptedItem.id}:`, error)
      // Skip corrupted items - they may be from a different device or have invalid keys
    }
  }

  const elapsed = performance.now() - startTime
  if (elapsed > 100) {
    console.warn(`[OfflineQueue] getQueuedItems exceeded 100ms: ${elapsed.toFixed(2)}ms`)
  }

  return decryptedItems
}

/**
 * Remove a screenshot from the queue after successful upload.
 * AC5: Queue operations complete in <100ms
 *
 * @param id The screenshot ID to remove
 * @returns Promise resolving when removed
 */
export async function removeFromQueue(id: string): Promise<void> {
  const startTime = performance.now()
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.delete(id)

    request.onerror = () =>
      reject(new Error(`Failed to remove from queue: ${request.error?.message}`))

    transaction.oncomplete = () => {
      const elapsed = performance.now() - startTime
      if (elapsed > 100) {
        console.warn(`[OfflineQueue] removeFromQueue exceeded 100ms: ${elapsed.toFixed(2)}ms`)
      }
      resolve()
    }

    transaction.onerror = () =>
      reject(new Error(`Transaction failed: ${transaction.error?.message}`))
  })
}

/**
 * Get the current queue size.
 * AC5: Queue operations complete in <100ms
 *
 * @returns Number of items in the queue
 */
export async function getQueueSize(): Promise<number> {
  const startTime = performance.now()
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.count()

    request.onsuccess = () => {
      const elapsed = performance.now() - startTime
      if (elapsed > 100) {
        console.warn(`[OfflineQueue] getQueueSize exceeded 100ms: ${elapsed.toFixed(2)}ms`)
      }
      resolve(request.result)
    }

    request.onerror = () => reject(new Error(`Failed to get queue size: ${request.error?.message}`))
  })
}

/**
 * Clear all items from the queue.
 * Used for testing and reset scenarios.
 *
 * @returns Promise resolving when cleared
 */
export async function clearQueue(): Promise<void> {
  const startTime = performance.now()
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.clear()

    request.onerror = () => reject(new Error(`Failed to clear queue: ${request.error?.message}`))

    transaction.oncomplete = () => {
      const elapsed = performance.now() - startTime
      if (elapsed > 100) {
        console.warn(`[OfflineQueue] clearQueue exceeded 100ms: ${elapsed.toFixed(2)}ms`)
      }
      resolve()
    }

    transaction.onerror = () =>
      reject(new Error(`Transaction failed: ${transaction.error?.message}`))
  })
}

/**
 * Close the database connection.
 * Used for testing cleanup.
 */
export function closeQueue(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    dbInitPromise = null
  }
}

/**
 * Generate a unique queue item ID.
 */
export function generateQueueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Update retry count for a queued item.
 * AC4: Decrypts, updates, and re-encrypts the item.
 *
 * @param id The screenshot ID
 * @param retryCount New retry count
 * @param lastRetryAt Timestamp of last retry
 */
export async function updateRetryCount(
  id: string,
  retryCount: number,
  lastRetryAt: number
): Promise<void> {
  // AC4: Require deviceId for encryption
  if (!cachedDeviceId) {
    throw new Error('Device ID not set for queue encryption. Call setQueueDeviceId() first.')
  }

  const db = await getDB()

  // Get the encrypted item
  const encryptedItem: EncryptedQueueItem | undefined = await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result as EncryptedQueueItem | undefined)
    request.onerror = () => reject(new Error(`Failed to get queue item: ${request.error?.message}`))
  })

  if (!encryptedItem) {
    throw new Error(`Queue item not found: ${id}`)
  }

  // Decrypt the payload
  const decryptedPayload = await decryptData(
    encryptedItem.encryptedData,
    encryptedItem.iv,
    cachedDeviceId
  )
  const payload: EncryptedPayload = JSON.parse(decryptedPayload)

  // Update retry info
  payload.retryCount = retryCount
  payload.lastRetryAt = lastRetryAt

  // Re-encrypt with new data
  const { encryptedData, iv } = await encryptData(JSON.stringify(payload), cachedDeviceId)

  // Update the encrypted item
  const updatedItem: EncryptedQueueItem = {
    ...encryptedItem,
    encryptedData,
    iv,
  }

  // Store updated item
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(updatedItem)

    request.onerror = () =>
      reject(new Error(`Failed to update retry count: ${request.error?.message}`))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(new Error(`Transaction failed: ${transaction.error?.message}`))
  })
}
