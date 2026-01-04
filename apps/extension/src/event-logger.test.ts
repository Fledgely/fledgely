/**
 * Event Logger Tests - Story 46.3
 *
 * Tests for capture event logging including sync events.
 * AC5: Sync Event Logging (NFR42)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  logCaptureEvent,
  getCaptureEvents,
  clearCaptureEvents,
  getEventStats,
  ERROR_CODES,
  type CaptureEventType,
} from './event-logger'

// Mock chrome.storage.local with proper implementation
const mockStorage: Record<string, unknown> = {}

// Set up global chrome mock before importing the module
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string | string[]) => {
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: mockStorage[keys] })
        }
        const result: Record<string, unknown> = {}
        keys.forEach((key) => {
          result[key] = mockStorage[key]
        })
        return Promise.resolve(result)
      }),
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage, data)
        return Promise.resolve()
      }),
    },
  },
})

describe('Event Logger', () => {
  beforeEach(async () => {
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
    await clearCaptureEvents()
  })

  describe('logCaptureEvent', () => {
    it('should log sync_start event', async () => {
      await logCaptureEvent('sync_start', true, {
        queueSize: 25,
        duration: 120, // offline duration in seconds
      })

      const events = await getCaptureEvents()
      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('sync_start')
      expect(events[0].success).toBe(true)
      expect(events[0].queueSize).toBe(25)
      expect(events[0].duration).toBe(120)
    })

    it('should log sync_complete event', async () => {
      await logCaptureEvent('sync_complete', true, {
        queueSize: 0,
        duration: 5000, // sync duration in ms
      })

      const events = await getCaptureEvents()
      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('sync_complete')
      expect(events[0].success).toBe(true)
      expect(events[0].queueSize).toBe(0)
      expect(events[0].duration).toBe(5000)
    })

    it('should log sync_delayed event with battery error code', async () => {
      await logCaptureEvent('sync_delayed', false, {
        queueSize: 50,
        errorCode: ERROR_CODES.SYNC_BATTERY_LOW,
      })

      const events = await getCaptureEvents()
      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('sync_delayed')
      expect(events[0].success).toBe(false)
      expect(events[0].queueSize).toBe(50)
      expect(events[0].errorCode).toBe('E015_SYNC_BATTERY_LOW')
    })

    it('should log sync_failed event', async () => {
      await logCaptureEvent('sync_failed', false, {
        queueSize: 15,
        duration: 3000,
        errorCode: ERROR_CODES.SYNC_NETWORK_LOST,
      })

      const events = await getCaptureEvents()
      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('sync_failed')
      expect(events[0].success).toBe(false)
      expect(events[0].queueSize).toBe(15)
      expect(events[0].errorCode).toBe('E016_SYNC_NETWORK_LOST')
    })
  })

  describe('getEventStats', () => {
    it('should count sync events by type', async () => {
      await logCaptureEvent('sync_start', true, { queueSize: 10 })
      await logCaptureEvent('upload_success', true, { queueSize: 9 })
      await logCaptureEvent('upload_success', true, { queueSize: 8 })
      await logCaptureEvent('sync_complete', true, { queueSize: 0 })

      const stats = await getEventStats(24)
      expect(stats.total).toBe(4)
      expect(stats.successful).toBe(4)
      expect(stats.failed).toBe(0)
      expect(stats.byType['sync_start']).toBe(1)
      expect(stats.byType['sync_complete']).toBe(1)
      expect(stats.byType['upload_success']).toBe(2)
    })

    it('should count failed sync events', async () => {
      await logCaptureEvent('sync_start', true, { queueSize: 10 })
      await logCaptureEvent('upload_failed', false, { queueSize: 10 })
      await logCaptureEvent('sync_failed', false, {
        queueSize: 10,
        errorCode: ERROR_CODES.SYNC_NETWORK_LOST,
      })

      const stats = await getEventStats(24)
      expect(stats.total).toBe(3)
      expect(stats.successful).toBe(1)
      expect(stats.failed).toBe(2)
      expect(stats.byType['sync_failed']).toBe(1)
    })
  })

  describe('ERROR_CODES', () => {
    it('should have sync-related error codes', () => {
      expect(ERROR_CODES.SYNC_BATTERY_LOW).toBe('E015_SYNC_BATTERY_LOW')
      expect(ERROR_CODES.SYNC_NETWORK_LOST).toBe('E016_SYNC_NETWORK_LOST')
    })
  })

  describe('Sync event types validation', () => {
    const syncEventTypes: CaptureEventType[] = [
      'sync_start',
      'sync_complete',
      'sync_delayed',
      'sync_failed',
    ]

    it('should accept all sync event types', async () => {
      for (const eventType of syncEventTypes) {
        await logCaptureEvent(eventType, true, { queueSize: 5 })
      }

      const events = await getCaptureEvents()
      expect(events).toHaveLength(4)

      const loggedTypes = events.map((e) => e.eventType)
      for (const eventType of syncEventTypes) {
        expect(loggedTypes).toContain(eventType)
      }
    })
  })
})
