/**
 * Crisis Allowlist Service Tests
 *
 * Story 7.4: Emergency Allowlist Push
 *
 * Unit tests for crisis allowlist service functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { incrementVersion } from '@fledgely/shared'

// Test the incrementVersion function
describe('incrementVersion', () => {
  it('should increment patch version', () => {
    expect(incrementVersion('1.0.0')).toBe('1.0.1')
    expect(incrementVersion('1.0.5')).toBe('1.0.6')
    expect(incrementVersion('2.3.9')).toBe('2.3.10')
  })

  it('should handle missing parts', () => {
    expect(incrementVersion('1.0')).toBe('1.0.1')
    expect(incrementVersion('1')).toBe('1.0.1')
  })

  it('should handle edge cases', () => {
    expect(incrementVersion('0.0.0')).toBe('0.0.1')
    expect(incrementVersion('99.99.99')).toBe('99.99.100')
  })
})

// Mock Firestore for service tests
describe('crisisAllowlistService', () => {
  // We need to mock firebase-admin before importing the service
  const mockGet = vi.fn()
  const mockSet = vi.fn()
  const mockAdd = vi.fn()
  const mockDoc = vi.fn()
  const mockCollection = vi.fn()
  const mockTransactionGet = vi.fn()
  const mockTransactionSet = vi.fn()
  const mockRunTransaction = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock chain
    mockAdd.mockResolvedValue({ id: 'test-id' })
    mockSet.mockResolvedValue(undefined)
    mockGet.mockResolvedValue({ exists: false })
    mockTransactionGet.mockResolvedValue({ exists: false })
    mockTransactionSet.mockReturnValue(undefined)
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      collection: mockCollection,
    })
    mockCollection.mockReturnValue({
      doc: mockDoc,
      add: mockAdd,
    })

    // Mock runTransaction to execute callback with mock transaction
    mockRunTransaction.mockImplementation(async (callback: (t: unknown) => Promise<unknown>) => {
      const transaction = {
        get: mockTransactionGet,
        set: mockTransactionSet,
      }
      return callback(transaction)
    })

    // Mock firebase-admin/firestore
    vi.doMock('firebase-admin/firestore', () => ({
      getFirestore: () => ({
        collection: mockCollection,
        runTransaction: mockRunTransaction,
      }),
      FieldValue: {
        serverTimestamp: () => new Date(),
      },
    }))
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('getCurrentAllowlist', () => {
    it('should return Firestore allowlist if it exists', async () => {
      const mockData = {
        version: '1.0.1',
        lastUpdated: Date.now(),
        resources: [
          {
            id: 'test-resource',
            domain: 'example.org',
            pattern: null,
            category: 'crisis_general',
            name: 'Test Resource',
            description: 'Test description',
            phone: null,
            text: null,
            aliases: [],
            regional: false,
          },
        ],
      }
      mockGet.mockResolvedValue({ exists: true, data: () => mockData })

      const { getCurrentAllowlist } = await import('./crisisAllowlistService')
      const result = await getCurrentAllowlist()

      expect(result.version).toBe('1.0.1')
      expect(result.resources).toHaveLength(1)
      expect(result.resources[0].id).toBe('test-resource')
    })

    it('should return bundled defaults if Firestore is empty', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const { getCurrentAllowlist } = await import('./crisisAllowlistService')
      const result = await getCurrentAllowlist()

      expect(result.version).toBeDefined()
      expect(result.resources.length).toBeGreaterThan(0)
    })

    it('should return bundled defaults on error', async () => {
      mockGet.mockRejectedValue(new Error('Firestore error'))

      const { getCurrentAllowlist } = await import('./crisisAllowlistService')
      const result = await getCurrentAllowlist()

      expect(result.version).toBeDefined()
      expect(result.resources.length).toBeGreaterThan(0)
    })
  })

  describe('initializeAllowlist', () => {
    it('should return false if already initialized', async () => {
      mockGet.mockResolvedValue({ exists: true })

      const { initializeAllowlist } = await import('./crisisAllowlistService')
      const result = await initializeAllowlist()

      expect(result).toBe(false)
      expect(mockSet).not.toHaveBeenCalled()
    })

    it('should initialize and return true if empty', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const { initializeAllowlist } = await import('./crisisAllowlistService')
      const result = await initializeAllowlist('admin-uid')

      expect(result).toBe(true)
      expect(mockSet).toHaveBeenCalled()
    })
  })

  describe('pushEmergencyUpdate', () => {
    const testResource = {
      id: 'new-resource',
      domain: 'newcrisis.org',
      pattern: null,
      category: 'crisis_general' as const,
      name: 'New Crisis Resource',
      description: 'A new crisis resource',
      phone: '1-800-NEW-HELP',
      text: null,
      aliases: [],
      regional: false,
    }

    it('should add resource to empty allowlist', async () => {
      mockTransactionGet.mockResolvedValue({ exists: false })

      const { pushEmergencyUpdate } = await import('./crisisAllowlistService')
      const result = await pushEmergencyUpdate(
        { resource: testResource, reason: 'Emergency addition for new crisis' },
        'admin-123'
      )

      expect(result.success).toBe(true)
      expect(result.newVersion).toBe('1.0.1')
      expect(mockTransactionSet).toHaveBeenCalled()
    })

    it('should add resource to existing allowlist', async () => {
      const existingData = {
        version: '1.0.5',
        lastUpdated: Date.now(),
        resources: [
          {
            id: 'existing-resource',
            domain: 'existing.org',
            pattern: null,
            category: 'crisis_general',
            name: 'Existing Resource',
            description: 'Existing',
            phone: null,
            text: null,
            aliases: [],
            regional: false,
          },
        ],
      }
      mockTransactionGet.mockResolvedValue({ exists: true, data: () => existingData })

      const { pushEmergencyUpdate } = await import('./crisisAllowlistService')
      const result = await pushEmergencyUpdate(
        { resource: testResource, reason: 'Emergency addition for new crisis' },
        'admin-123'
      )

      expect(result.success).toBe(true)
      expect(result.newVersion).toBe('1.0.6')
    })

    it('should reject duplicate resource', async () => {
      const existingData = {
        version: '1.0.5',
        lastUpdated: Date.now(),
        resources: [testResource],
      }
      mockTransactionGet.mockResolvedValue({ exists: true, data: () => existingData })

      const { pushEmergencyUpdate } = await import('./crisisAllowlistService')
      const result = await pushEmergencyUpdate(
        { resource: testResource, reason: 'Duplicate addition attempt' },
        'admin-123'
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('already exists')
    })
  })

  describe('removeResource', () => {
    const existingResource = {
      id: 'resource-to-remove',
      domain: 'remove.org',
      pattern: null,
      category: 'crisis_general' as const,
      name: 'Resource to Remove',
      description: 'Will be removed',
      phone: null,
      text: null,
      aliases: [],
      regional: false,
    }

    it('should remove existing resource', async () => {
      const existingData = {
        version: '1.0.5',
        lastUpdated: Date.now(),
        resources: [existingResource],
      }
      mockTransactionGet.mockResolvedValue({ exists: true, data: () => existingData })

      const { removeResource } = await import('./crisisAllowlistService')
      const result = await removeResource(
        'resource-to-remove',
        'Resource no longer valid',
        'admin-123'
      )

      expect(result.success).toBe(true)
      expect(result.newVersion).toBe('1.0.6')
      expect(mockTransactionSet).toHaveBeenCalled()
    })

    it('should return failure if allowlist not initialized', async () => {
      mockTransactionGet.mockResolvedValue({ exists: false })

      const { removeResource } = await import('./crisisAllowlistService')
      const result = await removeResource('any-id', 'Test removal reason', 'admin-123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Allowlist not initialized')
    })

    it('should return failure if resource not found', async () => {
      const existingData = {
        version: '1.0.5',
        lastUpdated: Date.now(),
        resources: [existingResource],
      }
      mockTransactionGet.mockResolvedValue({ exists: true, data: () => existingData })

      const { removeResource } = await import('./crisisAllowlistService')
      const result = await removeResource(
        'non-existent-id',
        'Try to remove non-existent',
        'admin-123'
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('not found')
    })
  })

  describe('logAuditEntry', () => {
    it('should log audit entry to Firestore', async () => {
      const { logAuditEntry } = await import('./crisisAllowlistService')

      await logAuditEntry({
        timestamp: Date.now(),
        version: '1.0.1',
        operatorId: 'admin-123',
        reason: 'Test audit entry',
        resourcesAdded: ['resource-1'],
        resourcesRemoved: [],
        isEmergencyPush: true,
      })

      expect(mockAdd).toHaveBeenCalled()
    })

    it('should not throw on audit logging failure', async () => {
      mockAdd.mockRejectedValue(new Error('Audit write failed'))

      const { logAuditEntry } = await import('./crisisAllowlistService')

      // Should not throw
      await expect(
        logAuditEntry({
          timestamp: Date.now(),
          version: '1.0.1',
          operatorId: 'admin-123',
          reason: 'Test audit entry',
          resourcesAdded: [],
          resourcesRemoved: ['resource-1'],
          isEmergencyPush: true,
        })
      ).resolves.toBeUndefined()
    })
  })
})
