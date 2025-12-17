/**
 * SafeAdultStorageService Tests
 *
 * Story 7.5.4: Safe Adult Designation - Task 3
 *
 * Tests for encrypted IndexedDB storage for safe adult contacts.
 *
 * CRITICAL INVARIANT (INV-002): Safe adult contact NEVER visible to family.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { SafeAdultContactInput } from '@fledgely/contracts'
import {
  MockSafeAdultStorageService,
  SafeAdultStorageError,
  createMockSafeAdultStorageService,
  getSafeAdultStorageService,
  resetSafeAdultStorageService,
  type SaveSafeAdultInput,
} from '../SafeAdultStorageService'
import { createMockSafeAdultEncryptionService } from '../SafeAdultEncryptionService'

// ============================================================================
// Test Fixtures
// ============================================================================

const mockPhoneInput: SaveSafeAdultInput = {
  childId: 'child-123',
  childFirstName: 'Alex',
  contact: {
    type: 'phone',
    value: '5551234567',
  },
}

const mockEmailInput: SaveSafeAdultInput = {
  childId: 'child-456',
  childFirstName: 'Jordan',
  contact: {
    type: 'email',
    value: 'trusted@example.com',
  },
}

// ============================================================================
// MockSafeAdultStorageService Tests
// ============================================================================

describe('MockSafeAdultStorageService', () => {
  let service: MockSafeAdultStorageService
  let encryptionService: ReturnType<typeof createMockSafeAdultEncryptionService>

  beforeEach(async () => {
    encryptionService = createMockSafeAdultEncryptionService()
    service = new MockSafeAdultStorageService(encryptionService)
    await service.initialize()
  })

  afterEach(async () => {
    await service.destroy()
  })

  describe('initialize', () => {
    it('initializes successfully', async () => {
      const newService = new MockSafeAdultStorageService(encryptionService)
      await expect(newService.initialize()).resolves.not.toThrow()
      await newService.destroy()
    })

    it('can be configured to fail', async () => {
      const newService = new MockSafeAdultStorageService(encryptionService)
      newService.setFailure(true, 'Init failed')
      await expect(newService.initialize()).rejects.toThrow(SafeAdultStorageError)
    })
  })

  describe('save', () => {
    it('saves phone contact successfully', async () => {
      await expect(service.save(mockPhoneInput)).resolves.not.toThrow()
    })

    it('saves email contact successfully', async () => {
      await expect(service.save(mockEmailInput)).resolves.not.toThrow()
    })

    it('stores encrypted contact data', async () => {
      await service.save(mockPhoneInput)
      const stored = service.getStorageMap().get('child-123')

      expect(stored).toBeDefined()
      expect(stored?.encryptedContact.encryptedData).toBeDefined()
      expect(stored?.encryptedContact.algorithm).toBe('AES-GCM')
    })

    it('stores child first name for notification', async () => {
      await service.save(mockPhoneInput)
      const stored = service.getStorageMap().get('child-123')

      expect(stored?.childFirstName).toBe('Alex')
    })

    it('stores contact type for UI display', async () => {
      await service.save(mockPhoneInput)
      const stored = service.getStorageMap().get('child-123')

      expect(stored?.contactType).toBe('phone')
    })

    it('sets timestamps on create', async () => {
      const before = new Date().toISOString()
      await service.save(mockPhoneInput)
      const after = new Date().toISOString()

      const stored = service.getStorageMap().get('child-123')
      expect(stored?.createdAt).toBeDefined()
      expect(stored?.createdAt >= before).toBe(true)
      expect(stored?.createdAt <= after).toBe(true)
      expect(stored?.updatedAt).toBe(stored?.createdAt)
    })

    it('preserves createdAt on update', async () => {
      await service.save(mockPhoneInput)
      const firstCreatedAt = service.getStorageMap().get('child-123')?.createdAt

      // Wait a tiny bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Update with new contact
      await service.save({
        ...mockPhoneInput,
        contact: { type: 'email', value: 'new@example.com' },
      })

      const updated = service.getStorageMap().get('child-123')
      expect(updated?.createdAt).toBe(firstCreatedAt)
      expect(updated?.updatedAt).not.toBe(firstCreatedAt)
    })

    it('throws when not initialized', async () => {
      const uninitService = new MockSafeAdultStorageService(encryptionService)
      await expect(uninitService.save(mockPhoneInput)).rejects.toThrow('not initialized')
    })

    it('can be configured to fail', async () => {
      service.setFailure(true, 'Save failed')
      await expect(service.save(mockPhoneInput)).rejects.toThrow(SafeAdultStorageError)
    })
  })

  describe('load', () => {
    it('loads saved phone contact', async () => {
      await service.save(mockPhoneInput)
      const result = await service.load('child-123')

      expect(result).not.toBeNull()
      expect(result?.childId).toBe('child-123')
      expect(result?.childFirstName).toBe('Alex')
      expect(result?.contact.type).toBe('phone')
      expect(result?.contact.value).toBe('5551234567')
    })

    it('loads saved email contact', async () => {
      await service.save(mockEmailInput)
      const result = await service.load('child-456')

      expect(result).not.toBeNull()
      expect(result?.contact.type).toBe('email')
      expect(result?.contact.value).toBe('trusted@example.com')
    })

    it('returns null for non-existent child', async () => {
      const result = await service.load('non-existent')
      expect(result).toBeNull()
    })

    it('includes key ID for notification', async () => {
      await service.save(mockPhoneInput)
      const result = await service.load('child-123')

      expect(result?.keyId).toBeDefined()
    })

    it('includes timestamps', async () => {
      await service.save(mockPhoneInput)
      const result = await service.load('child-123')

      expect(result?.createdAt).toBeDefined()
      expect(result?.updatedAt).toBeDefined()
    })

    it('throws when not initialized', async () => {
      const uninitService = new MockSafeAdultStorageService(encryptionService)
      await expect(uninitService.load('child-123')).rejects.toThrow('not initialized')
    })

    it('can be configured to fail', async () => {
      await service.save(mockPhoneInput)
      service.setFailure(true, 'Load failed')
      await expect(service.load('child-123')).rejects.toThrow(SafeAdultStorageError)
    })
  })

  describe('exists', () => {
    it('returns true for existing designation', async () => {
      await service.save(mockPhoneInput)
      const result = await service.exists('child-123')
      expect(result).toBe(true)
    })

    it('returns false for non-existent designation', async () => {
      const result = await service.exists('non-existent')
      expect(result).toBe(false)
    })

    it('returns false after deletion', async () => {
      await service.save(mockPhoneInput)
      await service.delete('child-123')
      const result = await service.exists('child-123')
      expect(result).toBe(false)
    })
  })

  describe('delete', () => {
    it('deletes existing designation', async () => {
      await service.save(mockPhoneInput)
      await service.delete('child-123')

      const result = await service.load('child-123')
      expect(result).toBeNull()
    })

    it('succeeds for non-existent designation', async () => {
      await expect(service.delete('non-existent')).resolves.not.toThrow()
    })

    it('can be configured to fail', async () => {
      await service.save(mockPhoneInput)
      service.setFailure(true, 'Delete failed')
      await expect(service.delete('child-123')).rejects.toThrow(SafeAdultStorageError)
    })
  })

  describe('getEncryptedForNotification', () => {
    it('returns encrypted contact without decrypting', async () => {
      await service.save(mockPhoneInput)
      const result = await service.getEncryptedForNotification('child-123')

      expect(result).not.toBeNull()
      expect(result?.encryptedContact.encryptedData).toBeDefined()
      expect(result?.encryptedContact.keyId).toBeDefined()
      expect(result?.childFirstName).toBe('Alex')
    })

    it('returns null for non-existent child', async () => {
      const result = await service.getEncryptedForNotification('non-existent')
      expect(result).toBeNull()
    })

    it('throws when not initialized', async () => {
      const uninitService = new MockSafeAdultStorageService(encryptionService)
      await expect(uninitService.getEncryptedForNotification('child-123')).rejects.toThrow(
        'not initialized'
      )
    })
  })

  describe('clear', () => {
    it('clears all designations', async () => {
      await service.save(mockPhoneInput)
      await service.save(mockEmailInput)

      await service.clear()

      expect(await service.exists('child-123')).toBe(false)
      expect(await service.exists('child-456')).toBe(false)
    })

    it('succeeds when already empty', async () => {
      await expect(service.clear()).resolves.not.toThrow()
    })
  })

  describe('destroy', () => {
    it('clears data on destroy', async () => {
      await service.save(mockPhoneInput)
      await service.destroy()

      expect(service.getStorageMap().size).toBe(0)
    })
  })
})

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createMockSafeAdultStorageService', () => {
  it('creates MockSafeAdultStorageService', () => {
    const service = createMockSafeAdultStorageService()
    expect(service).toBeInstanceOf(MockSafeAdultStorageService)
  })

  it('accepts custom encryption service', () => {
    const encryptionService = createMockSafeAdultEncryptionService()
    const service = createMockSafeAdultStorageService(encryptionService)
    expect(service).toBeInstanceOf(MockSafeAdultStorageService)
  })
})

// ============================================================================
// Singleton Tests
// ============================================================================

describe('getSafeAdultStorageService', () => {
  beforeEach(() => {
    resetSafeAdultStorageService()
  })

  afterEach(() => {
    resetSafeAdultStorageService()
  })

  it('returns singleton instance', () => {
    const instance1 = getSafeAdultStorageService(true) // Use mock
    const instance2 = getSafeAdultStorageService(true)

    expect(instance1).toBe(instance2)
  })

  it('returns new instance after reset', () => {
    const instance1 = getSafeAdultStorageService(true)
    resetSafeAdultStorageService()
    const instance2 = getSafeAdultStorageService(true)

    expect(instance1).not.toBe(instance2)
  })

  it('returns mock service when requested', () => {
    const mockInstance = getSafeAdultStorageService(true)
    expect(mockInstance).toBeInstanceOf(MockSafeAdultStorageService)
  })
})

// ============================================================================
// Security Tests (INV-002 Compliance)
// ============================================================================

describe('Security Requirements (INV-002)', () => {
  let service: MockSafeAdultStorageService
  let encryptionService: ReturnType<typeof createMockSafeAdultEncryptionService>

  beforeEach(async () => {
    encryptionService = createMockSafeAdultEncryptionService()
    service = new MockSafeAdultStorageService(encryptionService)
    await service.initialize()
  })

  afterEach(async () => {
    await service.destroy()
  })

  describe('Data Encryption', () => {
    it('stores contact data encrypted, not plaintext', async () => {
      await service.save(mockPhoneInput)
      const stored = service.getStorageMap().get('child-123')

      // The encrypted data should not contain plaintext phone number
      expect(stored?.encryptedContact.encryptedData).not.toContain('5551234567')
    })

    it('uses encryption service for all contact storage', async () => {
      await service.save(mockPhoneInput)
      const stored = service.getStorageMap().get('child-123')

      expect(stored?.encryptedContact.algorithm).toBe('AES-GCM')
      expect(stored?.encryptedContact.keyId).toBeDefined()
    })
  })

  describe('Data Isolation', () => {
    it('does not leak contact value in stored record', async () => {
      await service.save(mockPhoneInput)
      const stored = service.getStorageMap().get('child-123')
      const storedJson = JSON.stringify(stored)

      expect(storedJson).not.toContain('5551234567')
    })

    it('does not leak contact value in stored email record', async () => {
      await service.save(mockEmailInput)
      const stored = service.getStorageMap().get('child-456')
      const storedJson = JSON.stringify(stored)

      expect(storedJson).not.toContain('trusted@example.com')
    })

    it('stores only childFirstName for notification message', async () => {
      await service.save(mockPhoneInput)
      const stored = service.getStorageMap().get('child-123')

      // First name is stored for notification, but that's intentional
      expect(stored?.childFirstName).toBe('Alex')
      // But contact should be encrypted
      expect(stored?.encryptedContact).toBeDefined()
    })
  })

  describe('Complete Data Removal', () => {
    it('completely removes data on delete', async () => {
      await service.save(mockPhoneInput)
      await service.delete('child-123')

      expect(service.getStorageMap().has('child-123')).toBe(false)
    })

    it('completely removes all data on clear', async () => {
      await service.save(mockPhoneInput)
      await service.save(mockEmailInput)
      await service.clear()

      expect(service.getStorageMap().size).toBe(0)
    })
  })

  describe('Round-trip Integrity', () => {
    it('maintains phone contact integrity through save/load', async () => {
      const input: SaveSafeAdultInput = {
        childId: 'integrity-test-1',
        childFirstName: 'TestChild',
        contact: { type: 'phone', value: '18005551234' },
      }

      await service.save(input)
      const result = await service.load('integrity-test-1')

      expect(result?.contact).toEqual(input.contact)
    })

    it('maintains email contact integrity through save/load', async () => {
      const input: SaveSafeAdultInput = {
        childId: 'integrity-test-2',
        childFirstName: 'TestChild',
        contact: { type: 'email', value: 'test+special@subdomain.example.org' },
      }

      await service.save(input)
      const result = await service.load('integrity-test-2')

      expect(result?.contact).toEqual(input.contact)
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Storage Integration', () => {
  let service: MockSafeAdultStorageService

  beforeEach(async () => {
    const encryptionService = createMockSafeAdultEncryptionService()
    service = new MockSafeAdultStorageService(encryptionService)
    await service.initialize()
  })

  afterEach(async () => {
    await service.destroy()
  })

  it('handles multiple children with different contacts', async () => {
    await service.save(mockPhoneInput)
    await service.save(mockEmailInput)

    const child1 = await service.load('child-123')
    const child2 = await service.load('child-456')

    expect(child1?.contact.type).toBe('phone')
    expect(child2?.contact.type).toBe('email')
    expect(child1?.childFirstName).toBe('Alex')
    expect(child2?.childFirstName).toBe('Jordan')
  })

  it('handles updating contact type', async () => {
    // Save phone first
    await service.save(mockPhoneInput)

    // Update to email
    await service.save({
      childId: 'child-123',
      childFirstName: 'Alex',
      contact: { type: 'email', value: 'alex-trusted@example.com' },
    })

    const result = await service.load('child-123')
    expect(result?.contact.type).toBe('email')
    expect(result?.contact.value).toBe('alex-trusted@example.com')
  })

  it('notification flow: save -> getEncrypted -> (would send to server)', async () => {
    // Save designation
    await service.save(mockPhoneInput)

    // Get encrypted for notification (simulates what would be sent to server)
    const forNotification = await service.getEncryptedForNotification('child-123')

    expect(forNotification).not.toBeNull()
    expect(forNotification?.childFirstName).toBe('Alex')
    expect(forNotification?.encryptedContact.encryptedData).toBeDefined()
    expect(forNotification?.encryptedContact.keyId).toBeDefined()
    expect(forNotification?.encryptedContact.algorithm).toBe('AES-GCM')
  })

  it('pre-configuration flow: save -> exists -> load -> update', async () => {
    // Initial save
    await service.save(mockPhoneInput)

    // Check exists
    expect(await service.exists('child-123')).toBe(true)

    // Load
    const initial = await service.load('child-123')
    expect(initial?.contact.value).toBe('5551234567')

    // Update
    await service.save({
      childId: 'child-123',
      childFirstName: 'Alex',
      contact: { type: 'phone', value: '5559999999' },
    })

    const updated = await service.load('child-123')
    expect(updated?.contact.value).toBe('5559999999')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  let service: MockSafeAdultStorageService

  beforeEach(async () => {
    const encryptionService = createMockSafeAdultEncryptionService()
    service = new MockSafeAdultStorageService(encryptionService)
    await service.initialize()
  })

  afterEach(async () => {
    await service.destroy()
  })

  it('handles child ID with special characters', async () => {
    const input: SaveSafeAdultInput = {
      childId: 'child-with-special-chars_123!@#',
      childFirstName: 'Special',
      contact: { type: 'phone', value: '5551234567' },
    }

    await service.save(input)
    const result = await service.load('child-with-special-chars_123!@#')

    expect(result?.childId).toBe('child-with-special-chars_123!@#')
  })

  it('handles Unicode in child first name', async () => {
    const input: SaveSafeAdultInput = {
      childId: 'unicode-child',
      childFirstName: '田中太郎',
      contact: { type: 'phone', value: '5551234567' },
    }

    await service.save(input)
    const result = await service.load('unicode-child')

    expect(result?.childFirstName).toBe('田中太郎')
  })

  it('handles empty child ID gracefully', async () => {
    // This should be caught by schema validation in real usage
    // but storage should handle it without crashing
    const input: SaveSafeAdultInput = {
      childId: '',
      childFirstName: 'Test',
      contact: { type: 'phone', value: '5551234567' },
    }

    await service.save(input)
    const result = await service.load('')

    expect(result?.contact.type).toBe('phone')
  })

  it('handles rapid save/load operations', async () => {
    const promises: Promise<void>[] = []

    // Rapid saves
    for (let i = 0; i < 10; i++) {
      promises.push(
        service.save({
          childId: `rapid-child-${i}`,
          childFirstName: `Child${i}`,
          contact: { type: 'phone', value: `555000000${i}` },
        })
      )
    }

    await Promise.all(promises)

    // Verify all saved
    for (let i = 0; i < 10; i++) {
      const result = await service.load(`rapid-child-${i}`)
      expect(result?.contact.value).toBe(`555000000${i}`)
    }
  })
})
