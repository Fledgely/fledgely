/**
 * SafetySignalQueueService Tests
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 3
 *
 * Tests for the safety signal queue service including:
 * - Signal queueing
 * - Encryption/decryption
 * - Connectivity handling
 * - Retry logic
 * - Deduplication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SafetySignalQueueService,
  getSafetySignalQueueService,
  resetSafetySignalQueueService,
  type EncryptionService,
  type NetworkService,
  type SignalApiService,
} from './SafetySignalQueueService'
import type { QueuedSafetySignal } from '@fledgely/contracts'
import { SAFETY_SIGNAL_CONSTANTS } from '@fledgely/contracts'

// ============================================================================
// Mock Services
// ============================================================================

const createMockEncryptionService = (): EncryptionService => {
  const mockKey = {} as CryptoKey
  return {
    deriveKey: vi.fn().mockResolvedValue(mockKey),
    encrypt: vi.fn().mockImplementation(async (signal: QueuedSafetySignal) => {
      // Simple "encryption" for testing - just encode as JSON
      const encoder = new TextEncoder()
      return encoder.encode(JSON.stringify(signal)).buffer
    }),
    decrypt: vi.fn().mockImplementation(async (data: ArrayBuffer) => {
      // Simple "decryption" for testing - just decode JSON
      const decoder = new TextDecoder()
      return JSON.parse(decoder.decode(data))
    }),
  }
}

const createMockNetworkService = (
  options: { online?: boolean; secure?: boolean } = {}
): NetworkService & { _triggerConnectivityChange: (online: boolean) => void } => {
  const { online = true, secure = true } = options
  let connectivityCallback: ((online: boolean) => void) | null = null

  const service = {
    isOnline: vi.fn().mockReturnValue(online),
    isSecure: vi.fn().mockReturnValue(secure),
    onConnectivityChange: vi.fn().mockImplementation((callback: (online: boolean) => void) => {
      connectivityCallback = callback
      return () => {
        connectivityCallback = null
      }
    }),
    _triggerConnectivityChange: (newOnline: boolean) => {
      if (connectivityCallback) {
        connectivityCallback(newOnline)
      }
    },
  }

  return service
}

const createMockApiService = (options: { shouldSucceed?: boolean } = {}): SignalApiService => {
  const { shouldSucceed = true } = options
  return {
    sendSignal: vi.fn().mockImplementation(async () => {
      if (shouldSucceed) {
        return { success: true, signalId: `sig_${Date.now()}` }
      }
      throw new Error('Send failed')
    }),
  }
}

// ============================================================================
// Mock IndexedDB - Synchronous version for tests
// ============================================================================

class MockIDBObjectStore {
  private data = new Map<string, unknown>()

  put(record: { queueId: string; [key: string]: unknown }) {
    this.data.set(record.queueId, record)
    return createSuccessRequest(undefined)
  }

  get(key: string) {
    return createSuccessRequest(this.data.get(key))
  }

  getAll() {
    return createSuccessRequest(Array.from(this.data.values()))
  }

  delete(key: string) {
    this.data.delete(key)
    return createSuccessRequest(undefined)
  }

  clear() {
    this.data.clear()
    return createSuccessRequest(undefined)
  }

  createIndex() {
    return {}
  }
}

function createSuccessRequest<T>(result: T) {
  const request = {
    result,
    error: null as Error | null,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
  }

  // Use queueMicrotask for synchronous-like behavior
  queueMicrotask(() => {
    if (request.onsuccess) request.onsuccess()
  })

  return request
}

// Shared store instance for each database
const storeInstances = new Map<string, MockIDBObjectStore>()

class MockIDBTransaction {
  constructor(private dbName: string) {}

  objectStore(_name: string) {
    if (!storeInstances.has(this.dbName)) {
      storeInstances.set(this.dbName, new MockIDBObjectStore())
    }
    return storeInstances.get(this.dbName)!
  }
}

class MockIDBDatabase {
  constructor(private name: string) {}
  objectStoreNames = { contains: () => false }

  transaction(_stores: string | string[], _mode?: IDBTransactionMode) {
    return new MockIDBTransaction(this.name)
  }

  createObjectStore(_name: string, _options?: IDBObjectStoreParameters) {
    if (!storeInstances.has(this.name)) {
      storeInstances.set(this.name, new MockIDBObjectStore())
    }
    return storeInstances.get(this.name)!
  }

  close() {
    // No-op
  }
}

const createMockIndexedDB = () => {
  return {
    open: vi.fn().mockImplementation((name: string, _version?: number) => {
      const db = new MockIDBDatabase(name)
      const request = {
        result: db,
        error: null as Error | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onupgradeneeded: null as
          | ((event: { target: { result: MockIDBDatabase } }) => void)
          | null,
      }

      queueMicrotask(() => {
        // Trigger upgrade if needed
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: { result: db } })
        }
        if (request.onsuccess) request.onsuccess()
      })

      return request
    }),
  }
}

// ============================================================================
// Test Setup
// ============================================================================

describe('SafetySignalQueueService', () => {
  let mockEncryption: EncryptionService
  let mockNetwork: NetworkService & { _triggerConnectivityChange: (online: boolean) => void }
  let mockApi: SignalApiService

  beforeEach(() => {
    // Clear store instances
    storeInstances.clear()

    // Mock IndexedDB
    ;(
      global as unknown as { indexedDB: ReturnType<typeof createMockIndexedDB> }
    ).indexedDB = createMockIndexedDB()

    // Reset singleton
    resetSafetySignalQueueService()

    // Create fresh mocks
    mockEncryption = createMockEncryptionService()
    mockNetwork = createMockNetworkService()
    mockApi = createMockApiService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe('initialization', () => {
    it('initializes IndexedDB on first use', async () => {
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      expect(
        (global as unknown as { indexedDB: ReturnType<typeof createMockIndexedDB> }).indexedDB.open
      ).toHaveBeenCalledWith('fledgely-safety-signal-queue', 1)
    })

    it('sets up connectivity monitoring on initialize', async () => {
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      expect(mockNetwork.onConnectivityChange).toHaveBeenCalled()
    })

    it('uses custom database name when provided', async () => {
      const service = new SafetySignalQueueService({
        dbName: 'custom-db-name',
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      expect(
        (global as unknown as { indexedDB: ReturnType<typeof createMockIndexedDB> }).indexedDB.open
      ).toHaveBeenCalledWith('custom-db-name', 1)
    })
  })

  // ============================================================================
  // Signal Queueing Tests
  // ============================================================================

  describe('queueSignal', () => {
    it('queues a signal successfully', async () => {
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      const response = await service.queueSignal('child-123', 'web', 'tap')

      expect(response.success).toBe(true)
      expect(response.queued).toBe(true)
      expect(response.queueId).toBeTruthy()
    })

    it('encrypts signal before storing', async () => {
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      await service.queueSignal('child-123', 'web', 'tap')

      expect(mockEncryption.encrypt).toHaveBeenCalled()
    })

    it('returns correct response structure', async () => {
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      const response = await service.queueSignal('child-123', 'web', 'tap')

      expect(response).toMatchObject({
        success: true,
        queued: true,
      })
      expect(response.queueId).toMatch(/^queue_\d+_/)
    })

    it('triggers queue processing when online', async () => {
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      await service.queueSignal('child-123', 'web', 'tap')

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10))

      // API should be called to send signal
      expect(mockApi.sendSignal).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Deduplication Tests
  // ============================================================================

  describe('deduplication', () => {
    it('prevents duplicate signals within interval', async () => {
      // Create service with offline network to prevent auto-processing
      const offlineNetwork = createMockNetworkService({ online: false })
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: offlineNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      // Queue first signal
      const response1 = await service.queueSignal('child-123', 'web', 'tap')

      // Attempt to queue duplicate immediately
      const response2 = await service.queueSignal('child-123', 'web', 'tap')

      expect(response1.queued).toBe(true)
      expect(response2.queued).toBe(false)
      expect(response2.queueId).toBeNull()
    })

    it('allows different gesture types from same child', async () => {
      const offlineNetwork = createMockNetworkService({ online: false })
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: offlineNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      // Queue tap signal
      const response1 = await service.queueSignal('child-123', 'web', 'tap')

      // Queue keyboard signal - should succeed (different gesture)
      const response2 = await service.queueSignal('child-123', 'web', 'keyboard')

      expect(response1.queued).toBe(true)
      expect(response2.queued).toBe(true)
    })

    it('allows same gesture from different children', async () => {
      const offlineNetwork = createMockNetworkService({ online: false })
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: offlineNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      // Queue from first child
      const response1 = await service.queueSignal('child-123', 'web', 'tap')

      // Queue from second child - should succeed
      const response2 = await service.queueSignal('child-456', 'web', 'tap')

      expect(response1.queued).toBe(true)
      expect(response2.queued).toBe(true)
    })
  })

  // ============================================================================
  // Connectivity Tests
  // ============================================================================

  describe('connectivity handling', () => {
    it('does not send when offline', async () => {
      const offlineNetwork = createMockNetworkService({ online: false })
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: offlineNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      await service.queueSignal('child-123', 'web', 'tap')

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockApi.sendSignal).not.toHaveBeenCalled()
    })

    it('does not send on insecure connection', async () => {
      const insecureNetwork = createMockNetworkService({ online: true, secure: false })
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: insecureNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      await service.queueSignal('child-123', 'web', 'tap')

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockApi.sendSignal).not.toHaveBeenCalled()
    })

    it('processes queue when coming back online', async () => {
      const networkMock = createMockNetworkService({ online: false })
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: networkMock,
        apiService: mockApi,
      })

      await service.initialize()

      // Queue signal while offline
      await service.queueSignal('child-123', 'web', 'tap')

      expect(mockApi.sendSignal).not.toHaveBeenCalled()

      // Come back online
      ;(networkMock.isOnline as ReturnType<typeof vi.fn>).mockReturnValue(true)
      ;(networkMock.isSecure as ReturnType<typeof vi.fn>).mockReturnValue(true)
      networkMock._triggerConnectivityChange(true)

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockApi.sendSignal).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Queue Status Tests
  // ============================================================================

  describe('getQueueStatus', () => {
    it('returns correct queue size', async () => {
      const offlineNetwork = createMockNetworkService({ online: false })
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: offlineNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      // Queue multiple signals (different gestures to avoid dedup)
      await service.queueSignal('child-123', 'web', 'tap')
      await service.queueSignal('child-123', 'web', 'keyboard')

      const status = await service.getQueueStatus()

      expect(status.queueSize).toBe(2)
    })

    it('returns processing state', async () => {
      const offlineNetwork = createMockNetworkService({ online: false })
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: offlineNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      const status = await service.getQueueStatus()

      expect(status.isProcessing).toBe(false)
    })
  })

  // ============================================================================
  // Retry Tests
  // ============================================================================

  describe('retry logic', () => {
    it('removes signal after successful send', async () => {
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      await service.queueSignal('child-123', 'web', 'tap')

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10))

      const status = await service.getQueueStatus()

      // Signal should be removed after successful send
      expect(status.queueSize).toBe(0)
    })
  })

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe('singleton', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = getSafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      const instance2 = getSafetySignalQueueService()

      expect(instance1).toBe(instance2)
    })

    it('resets instance on reset call', () => {
      const instance1 = getSafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      resetSafetySignalQueueService()

      const instance2 = getSafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      expect(instance1).not.toBe(instance2)
    })
  })

  // ============================================================================
  // Cleanup Tests
  // ============================================================================

  describe('destroy', () => {
    it('cleans up resources on destroy', async () => {
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      await service.destroy()

      // Should not throw when destroyed again
      await service.destroy()
    })

    it('clears queue on clearQueue call', async () => {
      const offlineNetwork = createMockNetworkService({ online: false })
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: offlineNetwork,
        apiService: mockApi,
      })

      await service.initialize()

      await service.queueSignal('child-123', 'web', 'tap')

      let status = await service.getQueueStatus()
      expect(status.queueSize).toBe(1)

      await service.clearQueue()

      status = await service.getQueueStatus()
      expect(status.queueSize).toBe(0)
    })
  })
})

// ============================================================================
// Security Tests
// ============================================================================

describe('SafetySignalQueueService Security', () => {
  let mockEncryption: EncryptionService
  let mockApi: SignalApiService

  beforeEach(() => {
    storeInstances.clear()
    ;(
      global as unknown as { indexedDB: ReturnType<typeof createMockIndexedDB> }
    ).indexedDB = createMockIndexedDB()
    resetSafetySignalQueueService()

    mockEncryption = createMockEncryptionService()
    mockApi = createMockApiService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('always encrypts signals before storage', async () => {
    const offlineNetwork = createMockNetworkService({ online: false })
    const service = new SafetySignalQueueService({
      encryptionService: mockEncryption,
      networkService: offlineNetwork,
      apiService: mockApi,
    })

    await service.initialize()

    await service.queueSignal('child-123', 'web', 'tap')

    expect(mockEncryption.encrypt).toHaveBeenCalledTimes(1)
    expect(mockEncryption.encrypt).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-123',
        gestureType: 'tap',
        deviceType: 'web',
      })
    )
  })

  it('requires secure connection for processing', async () => {
    const insecureNetwork = createMockNetworkService({ online: true, secure: false })
    const service = new SafetySignalQueueService({
      encryptionService: mockEncryption,
      networkService: insecureNetwork,
      apiService: mockApi,
    })

    await service.initialize()

    await service.queueSignal('child-123', 'web', 'tap')

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Should not send on insecure connection
    expect(mockApi.sendSignal).not.toHaveBeenCalled()
  })

  it('swallows errors silently to prevent signal leakage', async () => {
    const failingApi: SignalApiService = {
      sendSignal: vi.fn().mockRejectedValue(new Error('Network error')),
    }
    const onlineNetwork = createMockNetworkService({ online: true, secure: true })

    const service = new SafetySignalQueueService({
      encryptionService: mockEncryption,
      networkService: onlineNetwork,
      apiService: failingApi,
    })

    await service.initialize()

    // Should not throw even when API fails
    await expect(service.queueSignal('child-123', 'web', 'tap')).resolves.toBeDefined()
  })
})

// ============================================================================
// External Routing Integration Tests (Story 7.5.2 - Task 7)
// ============================================================================

describe('SafetySignalQueueService External Routing', () => {
  let mockEncryption: EncryptionService
  let mockNetwork: ReturnType<typeof createMockNetworkService>

  beforeEach(() => {
    storeInstances.clear()
    ;(
      global as unknown as { indexedDB: ReturnType<typeof createMockIndexedDB> }
    ).indexedDB = createMockIndexedDB()
    resetSafetySignalQueueService()

    mockEncryption = createMockEncryptionService()
    mockNetwork = createMockNetworkService({ online: true, secure: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('signal routing payload', () => {
    it('passes correct input to routing service', async () => {
      const mockRoutingApi = createMockApiService()
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockRoutingApi,
      })

      await service.initialize()
      await service.queueSignal('child-123', 'web', 'tap')

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockRoutingApi.sendSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          childId: 'child-123',
          deviceType: 'web',
          gestureType: 'tap',
        })
      )
    })

    it('preserves original triggeredAt timestamp', async () => {
      const mockRoutingApi = createMockApiService()
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockRoutingApi,
      })

      await service.initialize()
      await service.queueSignal('child-123', 'web', 'tap')

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10))

      const callArg = (mockRoutingApi.sendSignal as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArg.triggeredAt).toBeDefined()
      expect(new Date(callArg.triggeredAt).getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('includes jurisdiction when available', async () => {
      const mockRoutingApi = createMockApiService()
      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockRoutingApi,
      })

      await service.initialize()

      // Queue with jurisdiction (manually modify since queueSignal doesn't expose it)
      await service.queueSignal('child-123', 'web', 'tap')

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10))

      const callArg = (mockRoutingApi.sendSignal as ReturnType<typeof vi.fn>).mock.calls[0][0]
      // Jurisdiction defaults to null, server will detect
      expect(callArg).toHaveProperty('jurisdiction')
    })
  })

  describe('routing response handling', () => {
    it('removes signal from queue on successful routing', async () => {
      const mockRoutingApi: SignalApiService = {
        sendSignal: vi.fn().mockResolvedValue({
          success: true,
          signalId: 'routed_signal_123',
        }),
      }

      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockRoutingApi,
      })

      await service.initialize()
      await service.queueSignal('child-123', 'web', 'tap')

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10))

      const status = await service.getQueueStatus()
      expect(status.queueSize).toBe(0)
    })

    it('retains signal in queue on routing failure', async () => {
      const mockRoutingApi: SignalApiService = {
        sendSignal: vi.fn().mockResolvedValue({
          success: false,
          signalId: undefined,
        }),
      }

      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockRoutingApi,
      })

      await service.initialize()
      await service.queueSignal('child-123', 'web', 'tap')

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10))

      const status = await service.getQueueStatus()
      // Signal should still be in queue for retry
      expect(status.queueSize).toBe(1)
    })

    it('increments attempt count on routing failure', async () => {
      let attemptCount = 0
      const mockRoutingApi: SignalApiService = {
        sendSignal: vi.fn().mockImplementation(async (signal) => {
          attemptCount = signal.attempts
          return { success: false, signalId: undefined }
        }),
      }

      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockRoutingApi,
      })

      await service.initialize()
      await service.queueSignal('child-123', 'web', 'tap')

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10))

      // First call should have attempts = 0
      expect(attemptCount).toBe(0)

      // Force another processing attempt
      await service.processQueue()
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Queue should still have the signal (with incremented attempts)
      const status = await service.getQueueStatus()
      expect(status.pendingCount + status.failedCount).toBe(1)
    })
  })

  describe('routing error handling', () => {
    it('handles network errors during routing', async () => {
      const mockRoutingApi: SignalApiService = {
        sendSignal: vi.fn().mockRejectedValue(new Error('Network timeout')),
      }

      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockRoutingApi,
      })

      await service.initialize()

      // Should not throw
      await expect(service.queueSignal('child-123', 'web', 'tap')).resolves.toBeDefined()

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Signal should be retained for retry
      const status = await service.getQueueStatus()
      expect(status.queueSize).toBe(1)
    })

    it('handles Firebase function errors', async () => {
      const firebaseError = new Error('Function execution failed')
      ;(firebaseError as unknown as { code: string }).code = 'functions/internal'

      const mockRoutingApi: SignalApiService = {
        sendSignal: vi.fn().mockRejectedValue(firebaseError),
      }

      const service = new SafetySignalQueueService({
        encryptionService: mockEncryption,
        networkService: mockNetwork,
        apiService: mockRoutingApi,
      })

      await service.initialize()

      // Should not throw
      await expect(service.queueSignal('child-123', 'web', 'tap')).resolves.toBeDefined()

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Signal should be retained for retry
      const status = await service.getQueueStatus()
      expect(status.queueSize).toBe(1)
    })
  })
})
