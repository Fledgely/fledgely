/**
 * SafetySignalPlatformAdapter Tests
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 7
 *
 * Tests for cross-platform safety signal adapters.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  WebPlatformAdapter,
  ChromePlatformAdapter,
  AndroidPlatformAdapter,
  iOSPlatformAdapter,
  detectPlatform,
  createPlatformAdapter,
  getPlatformAdapter,
  resetPlatformAdapter,
  type PlatformType,
  type SafetySignalPlatformAdapter,
} from './SafetySignalPlatformAdapter'

// ============================================================================
// Mock SafetySignalQueueService
// ============================================================================

const mockQueueService = {
  initialize: vi.fn().mockResolvedValue(undefined),
  queueSignal: vi.fn().mockResolvedValue({
    success: true,
    queueId: 'queue_123_test',
    queued: true,
  }),
  processQueue: vi.fn().mockResolvedValue(2),
  getQueueStatus: vi.fn().mockResolvedValue({
    pendingCount: 5,
    oldestSignalTime: new Date('2024-01-01'),
  }),
  destroy: vi.fn().mockResolvedValue(undefined),
}

vi.mock('./SafetySignalQueueService', () => ({
  getSafetySignalQueueService: () => mockQueueService,
}))

// ============================================================================
// Web Platform Adapter Tests
// ============================================================================

describe('WebPlatformAdapter', () => {
  let adapter: WebPlatformAdapter

  beforeEach(() => {
    adapter = new WebPlatformAdapter()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await adapter.destroy()
  })

  it('has correct platform identifier', () => {
    expect(adapter.platform).toBe('web')
  })

  it('reports correct capabilities', () => {
    expect(adapter.capabilities.supportsTapGesture).toBe(true)
    expect(adapter.capabilities.supportsKeyboardShortcut).toBe(true)
    expect(adapter.capabilities.supportsEncryptedStorage).toBe(true)
  })

  it('initializes successfully', async () => {
    await adapter.initialize()
    expect(mockQueueService.initialize).toHaveBeenCalled()
  })

  it('triggers signal successfully', async () => {
    await adapter.initialize()

    const result = await adapter.triggerSignal('child-123', 'tap')

    expect(result.success).toBe(true)
    expect(result.platform).toBe('web')
    expect(result.queued).toBe(true)
    expect(mockQueueService.queueSignal).toHaveBeenCalledWith('child-123', 'tap')
  })

  it('returns error when not initialized', async () => {
    const result = await adapter.triggerSignal('child-123', 'tap')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Adapter not initialized')
    expect(result.platform).toBe('web')
  })

  it('returns gesture config', () => {
    const config = adapter.getGestureConfig()

    expect(config.tapCountRequired).toBe(5)
    expect(config.tapWindowMs).toBe(3000)
    expect(config.keyboardPressesRequired).toBe(3)
    expect(config.keyboardWindowMs).toBe(3000)
  })

  it('checks online status', () => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
    expect(adapter.isOnline()).toBe(true)

    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
    expect(adapter.isOnline()).toBe(false)
  })

  it('gets queue status', async () => {
    await adapter.initialize()

    const status = await adapter.getQueueStatus()

    expect(status.pendingCount).toBe(5)
    expect(status.oldestSignalTime).toEqual(new Date('2024-01-01'))
  })

  it('processes queue', async () => {
    await adapter.initialize()

    const processed = await adapter.processQueue()

    expect(processed).toBe(2)
    expect(mockQueueService.processQueue).toHaveBeenCalled()
  })

  it('handles trigger signal errors', async () => {
    await adapter.initialize()
    mockQueueService.queueSignal.mockRejectedValueOnce(new Error('Queue error'))

    const result = await adapter.triggerSignal('child-123', 'tap')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Queue error')
  })

  it('destroys properly', async () => {
    await adapter.initialize()
    await adapter.destroy()

    expect(mockQueueService.destroy).toHaveBeenCalled()
  })
})

// ============================================================================
// Chrome Platform Adapter Tests
// ============================================================================

describe('ChromePlatformAdapter', () => {
  let adapter: ChromePlatformAdapter

  beforeEach(() => {
    adapter = new ChromePlatformAdapter()
  })

  afterEach(async () => {
    await adapter.destroy()
  })

  it('has correct platform identifier', () => {
    expect(adapter.platform).toBe('chrome')
  })

  it('reports correct capabilities', () => {
    expect(adapter.capabilities.supportsTapGesture).toBe(true)
    expect(adapter.capabilities.supportsKeyboardShortcut).toBe(true)
    expect(adapter.capabilities.supportsBackgroundSync).toBe(true)
  })

  it('initializes successfully', async () => {
    await adapter.initialize()
    // Mock should not throw
  })

  it('triggers signal and queues', async () => {
    await adapter.initialize()

    const result = await adapter.triggerSignal('child-456', 'keyboard')

    expect(result.success).toBe(true)
    expect(result.platform).toBe('chrome')
    expect(result.queued).toBe(true)
    expect(result.queueId).toContain('chrome_queue_')
  })

  it('tracks queue status', async () => {
    await adapter.initialize()

    await adapter.triggerSignal('child-1', 'tap')
    await adapter.triggerSignal('child-2', 'keyboard')

    const status = await adapter.getQueueStatus()

    expect(status.pendingCount).toBe(2)
    expect(status.oldestSignalTime).toBeInstanceOf(Date)
  })

  it('processes and clears queue', async () => {
    await adapter.initialize()

    await adapter.triggerSignal('child-1', 'tap')
    await adapter.triggerSignal('child-2', 'tap')

    const processed = await adapter.processQueue()
    expect(processed).toBe(2)

    const status = await adapter.getQueueStatus()
    expect(status.pendingCount).toBe(0)
  })
})

// ============================================================================
// Android Platform Adapter Tests
// ============================================================================

describe('AndroidPlatformAdapter', () => {
  let adapter: AndroidPlatformAdapter

  beforeEach(() => {
    adapter = new AndroidPlatformAdapter()
  })

  afterEach(async () => {
    await adapter.destroy()
  })

  it('has correct platform identifier', () => {
    expect(adapter.platform).toBe('android')
  })

  it('reports correct capabilities', () => {
    expect(adapter.capabilities.supportsTapGesture).toBe(true)
    expect(adapter.capabilities.supportsKeyboardShortcut).toBe(false) // Rare on Android
    expect(adapter.capabilities.supportsDeviceAttestation).toBe(true) // SafetyNet
  })

  it('has adjusted gesture config for touch', () => {
    const config = adapter.getGestureConfig()
    expect(config.tapWindowMs).toBe(3500) // Longer for touch input
  })

  it('triggers signal successfully', async () => {
    await adapter.initialize()

    const result = await adapter.triggerSignal('child-789', 'tap')

    expect(result.success).toBe(true)
    expect(result.platform).toBe('android')
    expect(result.queueId).toContain('android_queue_')
  })

  it('returns error when not initialized', async () => {
    const result = await adapter.triggerSignal('child-789', 'tap')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Adapter not initialized')
  })
})

// ============================================================================
// iOS Platform Adapter Tests
// ============================================================================

describe('iOSPlatformAdapter', () => {
  let adapter: iOSPlatformAdapter

  beforeEach(() => {
    adapter = new iOSPlatformAdapter()
  })

  afterEach(async () => {
    await adapter.destroy()
  })

  it('has correct platform identifier', () => {
    expect(adapter.platform).toBe('ios')
  })

  it('reports correct capabilities', () => {
    expect(adapter.capabilities.supportsTapGesture).toBe(true)
    expect(adapter.capabilities.supportsKeyboardShortcut).toBe(true) // iPads
    expect(adapter.capabilities.supportsDeviceAttestation).toBe(true) // DeviceCheck
  })

  it('has adjusted gesture config for touch', () => {
    const config = adapter.getGestureConfig()
    expect(config.tapWindowMs).toBe(3500) // Longer for touch input
  })

  it('triggers signal successfully', async () => {
    await adapter.initialize()

    const result = await adapter.triggerSignal('child-abc', 'keyboard')

    expect(result.success).toBe(true)
    expect(result.platform).toBe('ios')
    expect(result.queueId).toContain('ios_queue_')
  })
})

// ============================================================================
// Platform Detection Tests
// ============================================================================

describe('detectPlatform', () => {
  const originalNavigator = global.navigator
  const originalChrome = (global as { chrome?: unknown }).chrome

  afterEach(() => {
    // Restore original values
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
    ;(global as { chrome?: unknown }).chrome = originalChrome
  })

  it('detects Chrome extension context', () => {
    ;(global as { chrome?: unknown }).chrome = {
      runtime: { id: 'test-extension-id' },
    }

    expect(detectPlatform()).toBe('chrome')
  })

  it('detects Android user agent', () => {
    ;(global as { chrome?: unknown }).chrome = undefined
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G960F)' },
      writable: true,
    })

    expect(detectPlatform()).toBe('android')
  })

  it('detects iOS user agent', () => {
    ;(global as { chrome?: unknown }).chrome = undefined
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)' },
      writable: true,
    })

    expect(detectPlatform()).toBe('ios')
  })

  it('detects iPad user agent', () => {
    ;(global as { chrome?: unknown }).chrome = undefined
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0)' },
      writable: true,
    })

    expect(detectPlatform()).toBe('ios')
  })

  it('defaults to web for desktop browsers', () => {
    ;(global as { chrome?: unknown }).chrome = undefined
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      writable: true,
    })

    expect(detectPlatform()).toBe('web')
  })
})

// ============================================================================
// Platform Adapter Factory Tests
// ============================================================================

describe('createPlatformAdapter', () => {
  it('creates web adapter by default', () => {
    const adapter = createPlatformAdapter('web')
    expect(adapter.platform).toBe('web')
    expect(adapter).toBeInstanceOf(WebPlatformAdapter)
  })

  it('creates chrome adapter', () => {
    const adapter = createPlatformAdapter('chrome')
    expect(adapter.platform).toBe('chrome')
    expect(adapter).toBeInstanceOf(ChromePlatformAdapter)
  })

  it('creates android adapter', () => {
    const adapter = createPlatformAdapter('android')
    expect(adapter.platform).toBe('android')
    expect(adapter).toBeInstanceOf(AndroidPlatformAdapter)
  })

  it('creates ios adapter', () => {
    const adapter = createPlatformAdapter('ios')
    expect(adapter.platform).toBe('ios')
    expect(adapter).toBeInstanceOf(iOSPlatformAdapter)
  })
})

// ============================================================================
// Singleton Tests
// ============================================================================

describe('getPlatformAdapter singleton', () => {
  beforeEach(() => {
    resetPlatformAdapter()
  })

  afterEach(() => {
    resetPlatformAdapter()
  })

  it('returns same instance on multiple calls', () => {
    const adapter1 = getPlatformAdapter()
    const adapter2 = getPlatformAdapter()

    expect(adapter1).toBe(adapter2)
  })

  it('creates new instance after reset', () => {
    const adapter1 = getPlatformAdapter()
    resetPlatformAdapter()
    const adapter2 = getPlatformAdapter()

    expect(adapter1).not.toBe(adapter2)
  })
})

// ============================================================================
// Cross-Platform Consistency Tests
// ============================================================================

describe('Cross-Platform Consistency', () => {
  const platforms: PlatformType[] = ['web', 'chrome', 'android', 'ios']

  it.each(platforms)('%s adapter implements required interface', async (platform) => {
    const adapter = createPlatformAdapter(platform)

    // Check all required properties and methods exist
    expect(adapter.platform).toBe(platform)
    expect(adapter.capabilities).toBeDefined()
    expect(typeof adapter.initialize).toBe('function')
    expect(typeof adapter.triggerSignal).toBe('function')
    expect(typeof adapter.getGestureConfig).toBe('function')
    expect(typeof adapter.isOnline).toBe('function')
    expect(typeof adapter.getQueueStatus).toBe('function')
    expect(typeof adapter.processQueue).toBe('function')
    expect(typeof adapter.destroy).toBe('function')

    await adapter.destroy()
  })

  it.each(platforms)('%s adapter returns consistent signal result structure', async (platform) => {
    const adapter = createPlatformAdapter(platform)
    await adapter.initialize()

    const result = await adapter.triggerSignal('test-child', 'tap')

    // All adapters should return consistent structure
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.queued).toBe('boolean')
    expect(result.platform).toBe(platform)

    if (result.success) {
      expect(result.queueId).toBeDefined()
    }

    await adapter.destroy()
  })

  it.each(platforms)('%s adapter returns gesture config with required fields', (platform) => {
    const adapter = createPlatformAdapter(platform)
    const config = adapter.getGestureConfig()

    expect(typeof config.tapCountRequired).toBe('number')
    expect(typeof config.tapWindowMs).toBe('number')
    expect(typeof config.keyboardPressesRequired).toBe('number')
    expect(typeof config.keyboardWindowMs).toBe('number')

    // Gesture counts should be consistent across platforms
    expect(config.tapCountRequired).toBe(5) // 5 taps
    expect(config.keyboardPressesRequired).toBe(3) // 3 keyboard shortcuts
  })

  it('all platforms use same gesture counts for consistency', () => {
    const configs = platforms.map((p) => createPlatformAdapter(p).getGestureConfig())

    // All should require same number of taps
    const tapCounts = configs.map((c) => c.tapCountRequired)
    expect(new Set(tapCounts).size).toBe(1)

    // All should require same number of keyboard shortcuts
    const keyboardCounts = configs.map((c) => c.keyboardPressesRequired)
    expect(new Set(keyboardCounts).size).toBe(1)
  })
})

// ============================================================================
// INV-002 Invariant Tests
// ============================================================================

describe('INV-002: Safety signals NEVER visible to family', () => {
  it('signal result does not contain family-visible data', async () => {
    const adapter = createPlatformAdapter('web')
    await adapter.initialize()

    const result = await adapter.triggerSignal('child-123', 'tap')

    // Result should not contain family IDs or family-accessible data
    expect((result as { familyId?: string }).familyId).toBeUndefined()
    expect((result as { parentId?: string }).parentId).toBeUndefined()
    expect((result as { auditId?: string }).auditId).toBeUndefined()

    await adapter.destroy()
  })

  it('queue status does not expose signal content', async () => {
    const adapter = createPlatformAdapter('web')
    await adapter.initialize()

    const status = await adapter.getQueueStatus()

    // Status should only contain counts, not signal content
    expect(typeof status.pendingCount).toBe('number')
    expect((status as { signals?: unknown[] }).signals).toBeUndefined()
    expect((status as { childIds?: string[] }).childIds).toBeUndefined()

    await adapter.destroy()
  })
})
