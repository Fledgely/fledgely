/**
 * Offline Queue Service Tests - Story 46.1
 *
 * Tests for IndexedDB-based offline queue.
 * AC2: IndexedDB Queue Storage
 * AC3: Queue Data Integrity
 * AC5: Performance (NFR55: <100ms)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  initOfflineQueue,
  addToQueue,
  getQueuedItems,
  removeFromQueue,
  getQueueSize,
  clearQueue,
  closeQueue,
  generateQueueId,
  updateRetryCount,
  setQueueDeviceId,
  MAX_QUEUE_SIZE,
  type QueuedScreenshot,
} from './offline-queue'

// Test device ID for encryption
const TEST_DEVICE_ID = 'test-device-12345'

// Mock IndexedDB for jsdom environment
import 'fake-indexeddb/auto'

// Helper to create test screenshot
function createTestScreenshot(overrides: Partial<QueuedScreenshot> = {}): QueuedScreenshot {
  return {
    id: generateQueueId(),
    capture: {
      dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      timestamp: Date.now(),
      url: 'https://example.com',
      title: 'Test Page',
      captureTimeMs: 50,
    },
    childId: 'child-123',
    queuedAt: Date.now(),
    retryCount: 0,
    lastRetryAt: null,
    isDecoy: false,
    ...overrides,
  }
}

describe('Offline Queue Service', () => {
  beforeEach(async () => {
    // Set device ID for encryption (AC4)
    setQueueDeviceId(TEST_DEVICE_ID)
    // Initialize fresh database for each test
    await initOfflineQueue()
    await clearQueue()
  })

  afterEach(() => {
    closeQueue()
  })

  describe('initOfflineQueue', () => {
    it('should initialize database successfully', async () => {
      const db = await initOfflineQueue()
      expect(db).toBeDefined()
      expect(db.name).toBe('fledgely_offline_queue')
    })

    it('should return same instance on repeated calls', async () => {
      const db1 = await initOfflineQueue()
      const db2 = await initOfflineQueue()
      expect(db1).toBe(db2)
    })
  })

  describe('addToQueue', () => {
    it('should add screenshot to queue', async () => {
      const screenshot = createTestScreenshot()
      await addToQueue(screenshot)

      const size = await getQueueSize()
      expect(size).toBe(1)
    })

    it('should add multiple screenshots', async () => {
      for (let i = 0; i < 5; i++) {
        await addToQueue(createTestScreenshot())
      }

      const size = await getQueueSize()
      expect(size).toBe(5)
    })

    it('should complete in <100ms (NFR55)', async () => {
      const screenshot = createTestScreenshot()
      const start = performance.now()
      await addToQueue(screenshot)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('FIFO eviction (AC2)', () => {
    it('should evict oldest items when queue exceeds MAX_QUEUE_SIZE', async () => {
      // Add MAX_QUEUE_SIZE items
      const screenshots: QueuedScreenshot[] = []
      for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
        const screenshot = createTestScreenshot({
          id: `item-${i.toString().padStart(4, '0')}`,
          queuedAt: Date.now() + i, // Ensure ordering
        })
        screenshots.push(screenshot)
        await addToQueue(screenshot)
      }

      // Verify queue is at max
      let size = await getQueueSize()
      expect(size).toBe(MAX_QUEUE_SIZE)

      // Add one more item
      const newItem = createTestScreenshot({
        id: 'newest-item',
        queuedAt: Date.now() + MAX_QUEUE_SIZE + 1,
      })
      await addToQueue(newItem)

      // Queue should still be at MAX_QUEUE_SIZE
      size = await getQueueSize()
      expect(size).toBe(MAX_QUEUE_SIZE)

      // The oldest item should be evicted
      const items = await getQueuedItems()
      const ids = items.map((item) => item.id)
      expect(ids).not.toContain('item-0000') // First item should be gone
      expect(ids).toContain('newest-item') // New item should be present
    })
  })

  describe('getQueuedItems', () => {
    it('should return items in FIFO order (oldest first)', async () => {
      // Add items with explicit ordering
      for (let i = 0; i < 5; i++) {
        await addToQueue(
          createTestScreenshot({
            id: `item-${i}`,
            queuedAt: 1000 + i * 100, // 1000, 1100, 1200, 1300, 1400
          })
        )
      }

      const items = await getQueuedItems()
      expect(items).toHaveLength(5)
      expect(items[0].id).toBe('item-0') // Oldest first
      expect(items[4].id).toBe('item-4') // Newest last
    })

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await addToQueue(createTestScreenshot())
      }

      const items = await getQueuedItems(3)
      expect(items).toHaveLength(3)
    })

    it('should return empty array for empty queue', async () => {
      const items = await getQueuedItems()
      expect(items).toHaveLength(0)
    })

    it('should complete in <100ms (NFR55)', async () => {
      // Add some items
      for (let i = 0; i < 50; i++) {
        await addToQueue(createTestScreenshot())
      }

      const start = performance.now()
      await getQueuedItems()
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('removeFromQueue', () => {
    it('should remove specific item from queue', async () => {
      const screenshot1 = createTestScreenshot({ id: 'keep-1' })
      const screenshot2 = createTestScreenshot({ id: 'remove-me' })
      const screenshot3 = createTestScreenshot({ id: 'keep-2' })

      await addToQueue(screenshot1)
      await addToQueue(screenshot2)
      await addToQueue(screenshot3)

      await removeFromQueue('remove-me')

      const size = await getQueueSize()
      expect(size).toBe(2)

      const items = await getQueuedItems()
      const ids = items.map((item) => item.id)
      expect(ids).toContain('keep-1')
      expect(ids).toContain('keep-2')
      expect(ids).not.toContain('remove-me')
    })

    it('should complete in <100ms (NFR55)', async () => {
      const screenshot = createTestScreenshot()
      await addToQueue(screenshot)

      const start = performance.now()
      await removeFromQueue(screenshot.id)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('getQueueSize', () => {
    it('should return 0 for empty queue', async () => {
      const size = await getQueueSize()
      expect(size).toBe(0)
    })

    it('should return correct count', async () => {
      for (let i = 0; i < 7; i++) {
        await addToQueue(createTestScreenshot())
      }

      const size = await getQueueSize()
      expect(size).toBe(7)
    })

    it('should complete in <100ms (NFR55)', async () => {
      const start = performance.now()
      await getQueueSize()
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('clearQueue', () => {
    it('should remove all items from queue', async () => {
      for (let i = 0; i < 10; i++) {
        await addToQueue(createTestScreenshot())
      }

      let size = await getQueueSize()
      expect(size).toBe(10)

      await clearQueue()

      size = await getQueueSize()
      expect(size).toBe(0)
    })

    it('should complete in <100ms (NFR55)', async () => {
      for (let i = 0; i < 50; i++) {
        await addToQueue(createTestScreenshot())
      }

      const start = performance.now()
      await clearQueue()
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('updateRetryCount', () => {
    it('should update retry count and timestamp', async () => {
      const screenshot = createTestScreenshot({ id: 'retry-test' })
      await addToQueue(screenshot)

      const retryTime = Date.now()
      await updateRetryCount('retry-test', 3, retryTime)

      const items = await getQueuedItems()
      const updated = items.find((item) => item.id === 'retry-test')

      expect(updated).toBeDefined()
      expect(updated!.retryCount).toBe(3)
      expect(updated!.lastRetryAt).toBe(retryTime)
    })

    it('should reject for non-existent item', async () => {
      await expect(updateRetryCount('non-existent', 1, Date.now())).rejects.toThrow(
        'Queue item not found'
      )
    })
  })

  describe('generateQueueId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateQueueId())
      }
      expect(ids.size).toBe(100)
    })

    it('should include timestamp component', () => {
      const id = generateQueueId()
      const timestamp = parseInt(id.split('-')[0], 10)
      expect(timestamp).toBeGreaterThan(Date.now() - 1000)
      expect(timestamp).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('Queue Data Integrity (AC3)', () => {
    it('should preserve all screenshot metadata', async () => {
      const screenshot = createTestScreenshot({
        id: 'integrity-test',
        childId: 'child-456',
        isDecoy: true,
        retryCount: 2,
        lastRetryAt: 1234567890,
      })
      screenshot.capture.url = 'https://specific-url.com/page'
      screenshot.capture.title = 'Specific Page Title'

      await addToQueue(screenshot)
      const items = await getQueuedItems()
      const retrieved = items.find((item) => item.id === 'integrity-test')

      expect(retrieved).toBeDefined()
      expect(retrieved!.childId).toBe('child-456')
      expect(retrieved!.isDecoy).toBe(true)
      expect(retrieved!.retryCount).toBe(2)
      expect(retrieved!.lastRetryAt).toBe(1234567890)
      expect(retrieved!.capture.url).toBe('https://specific-url.com/page')
      expect(retrieved!.capture.title).toBe('Specific Page Title')
    })
  })
})
