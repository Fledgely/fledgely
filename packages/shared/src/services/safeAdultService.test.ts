/**
 * SafeAdultService Tests - Story 7.5.4 Task 2
 *
 * Tests for managing safe adult designations.
 * AC1: Safe adult notification option
 * AC3: Pre-configured safe adult
 * AC4: Safe adult data isolation
 *
 * CRITICAL: Safe adult data is completely isolated from family access.
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  // Service functions
  setPreConfiguredSafeAdult,
  getPreConfiguredSafeAdult,
  designateSafeAdultForSignal,
  updatePreConfiguredSafeAdult,
  removePreConfiguredSafeAdult,
  validateSafeAdultContact,
  hasSafeAdultConfigured,
  // Helper functions
  getSafeAdultById,
  getAllSafeAdultsForChild,
  getSignalTimeSafeAdult,
} from './safeAdultService'
import type { SafeAdultDesignation } from '../contracts/safeAdult'

// Mock Firestore
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockDelete = vi.fn()
const mockUpdate = vi.fn()
const mockWhere = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockGetDocs = vi.fn()

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGet(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  setDoc: (...args: unknown[]) => mockSet(...args),
  updateDoc: (...args: unknown[]) => mockUpdate(...args),
  deleteDoc: (...args: unknown[]) => mockDelete(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  query: vi.fn((collection, ...constraints) => ({ collection, constraints })),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
    now: vi.fn(() => ({ toDate: () => new Date() })),
  },
}))

describe('SafeAdultService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // setPreConfiguredSafeAdult Tests
  // ============================================

  describe('setPreConfiguredSafeAdult', () => {
    it('should create pre-configured safe adult with phone', async () => {
      mockSet.mockResolvedValue(undefined)

      const result = await setPreConfiguredSafeAdult(
        'child_123',
        { phone: '+15551234567' },
        'Aunt Jane'
      )

      expect(result).toBeDefined()
      expect(result.childId).toBe('child_123')
      expect(result.phoneNumber).toBe('+15551234567')
      expect(result.displayName).toBe('Aunt Jane')
      expect(result.isPreConfigured).toBe(true)
      expect(result.preferredMethod).toBe('sms')
    })

    it('should create pre-configured safe adult with email', async () => {
      mockSet.mockResolvedValue(undefined)

      const result = await setPreConfiguredSafeAdult(
        'child_123',
        { email: 'aunt@example.com' },
        'Aunt Jane'
      )

      expect(result.email).toBe('aunt@example.com')
      expect(result.preferredMethod).toBe('email')
    })

    it('should create pre-configured safe adult with both contacts', async () => {
      mockSet.mockResolvedValue(undefined)

      const result = await setPreConfiguredSafeAdult(
        'child_123',
        { phone: '+15551234567', email: 'aunt@example.com' },
        'Aunt Jane'
      )

      expect(result.phoneNumber).toBe('+15551234567')
      expect(result.email).toBe('aunt@example.com')
      expect(result.preferredMethod).toBe('sms') // Phone preferred
    })

    it('should store designation in Firestore', async () => {
      mockSet.mockResolvedValue(undefined)

      await setPreConfiguredSafeAdult('child_123', { phone: '+15551234567' }, 'Aunt Jane')

      expect(mockSet).toHaveBeenCalled()
    })

    it('should throw on missing contact', async () => {
      await expect(setPreConfiguredSafeAdult('child_123', {}, 'Aunt Jane')).rejects.toThrow(
        'contact method'
      )
    })

    it('should throw on empty childId', async () => {
      await expect(
        setPreConfiguredSafeAdult('', { phone: '+15551234567' }, 'Aunt Jane')
      ).rejects.toThrow('childId')
    })

    it('should throw on empty displayName', async () => {
      await expect(
        setPreConfiguredSafeAdult('child_123', { phone: '+15551234567' }, '')
      ).rejects.toThrow('displayName')
    })

    it('should store with isolated encryption key', async () => {
      mockSet.mockResolvedValue(undefined)

      const result = await setPreConfiguredSafeAdult('child_123', { phone: '+15551234567' }, 'Aunt')

      expect(result.encryptionKeyId).toBeTruthy()
      expect(result.encryptionKeyId).toMatch(/^sakey_/)
    })

    it('should replace existing pre-configured adult', async () => {
      mockSet.mockResolvedValue(undefined)
      mockGet.mockResolvedValue({ exists: () => true, data: () => ({ id: 'existing' }) })

      const result = await setPreConfiguredSafeAdult(
        'child_123',
        { phone: '+15559998888' },
        'Uncle Bob'
      )

      expect(result.phoneNumber).toBe('+15559998888')
      expect(result.displayName).toBe('Uncle Bob')
    })
  })

  // ============================================
  // getPreConfiguredSafeAdult Tests
  // ============================================

  describe('getPreConfiguredSafeAdult', () => {
    it('should return null when no pre-configured adult exists', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

      const result = await getPreConfiguredSafeAdult('child_123')

      expect(result).toBeNull()
    })

    it('should return pre-configured adult when exists', async () => {
      const mockData: SafeAdultDesignation = {
        id: 'sa_123',
        childId: 'child_123',
        phoneNumber: '+15551234567',
        email: null,
        preferredMethod: 'sms',
        displayName: 'Aunt Jane',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPreConfigured: true,
        encryptionKeyId: 'sakey_123',
      }
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'sa_123', data: () => mockData }],
      })

      const result = await getPreConfiguredSafeAdult('child_123')

      expect(result).not.toBeNull()
      expect(result?.childId).toBe('child_123')
      expect(result?.isPreConfigured).toBe(true)
    })

    it('should query by childId and isPreConfigured', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

      await getPreConfiguredSafeAdult('child_123')

      expect(mockWhere).toHaveBeenCalledWith('childId', '==', 'child_123')
      expect(mockWhere).toHaveBeenCalledWith('isPreConfigured', '==', true)
    })

    it('should throw on empty childId', async () => {
      await expect(getPreConfiguredSafeAdult('')).rejects.toThrow('childId')
    })
  })

  // ============================================
  // designateSafeAdultForSignal Tests
  // ============================================

  describe('designateSafeAdultForSignal', () => {
    it('should create signal-time designation with phone', async () => {
      mockSet.mockResolvedValue(undefined)

      const result = await designateSafeAdultForSignal('sig_123', 'child_123', {
        phone: '+15551234567',
      })

      expect(result.childId).toBe('child_123')
      expect(result.phoneNumber).toBe('+15551234567')
      expect(result.isPreConfigured).toBe(false)
    })

    it('should create signal-time designation with email', async () => {
      mockSet.mockResolvedValue(undefined)

      const result = await designateSafeAdultForSignal('sig_123', 'child_123', {
        email: 'help@example.com',
      })

      expect(result.email).toBe('help@example.com')
      expect(result.preferredMethod).toBe('email')
    })

    it('should use default display name', async () => {
      mockSet.mockResolvedValue(undefined)

      const result = await designateSafeAdultForSignal('sig_123', 'child_123', {
        phone: '+15551234567',
      })

      expect(result.displayName).toBe('Trusted Adult')
    })

    it('should store in Firestore', async () => {
      mockSet.mockResolvedValue(undefined)

      await designateSafeAdultForSignal('sig_123', 'child_123', { phone: '+15551234567' })

      expect(mockSet).toHaveBeenCalled()
    })

    it('should throw on missing contact', async () => {
      await expect(designateSafeAdultForSignal('sig_123', 'child_123', {})).rejects.toThrow(
        'contact method'
      )
    })

    it('should throw on empty signalId', async () => {
      await expect(
        designateSafeAdultForSignal('', 'child_123', { phone: '+15551234567' })
      ).rejects.toThrow('signalId')
    })

    it('should throw on empty childId', async () => {
      await expect(
        designateSafeAdultForSignal('sig_123', '', { phone: '+15551234567' })
      ).rejects.toThrow('childId')
    })
  })

  // ============================================
  // updatePreConfiguredSafeAdult Tests
  // ============================================

  describe('updatePreConfiguredSafeAdult', () => {
    const existingDesignation: SafeAdultDesignation = {
      id: 'sa_123',
      childId: 'child_123',
      phoneNumber: '+15551234567',
      email: null,
      preferredMethod: 'sms',
      displayName: 'Aunt Jane',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPreConfigured: true,
      encryptionKeyId: 'sakey_123',
    }

    it('should update phone number', async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'sa_123', data: () => existingDesignation }],
      })
      mockUpdate.mockResolvedValue(undefined)

      const result = await updatePreConfiguredSafeAdult('child_123', {
        phoneNumber: '+15559998888',
      })

      expect(result.phoneNumber).toBe('+15559998888')
    })

    it('should update email', async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'sa_123', data: () => existingDesignation }],
      })
      mockUpdate.mockResolvedValue(undefined)

      const result = await updatePreConfiguredSafeAdult('child_123', {
        email: 'newemail@example.com',
      })

      expect(result.email).toBe('newemail@example.com')
    })

    it('should update display name', async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'sa_123', data: () => existingDesignation }],
      })
      mockUpdate.mockResolvedValue(undefined)

      const result = await updatePreConfiguredSafeAdult('child_123', {
        displayName: 'Uncle Bob',
      })

      expect(result.displayName).toBe('Uncle Bob')
    })

    it('should update preferred method', async () => {
      const designationWithBoth = { ...existingDesignation, email: 'test@example.com' }
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'sa_123', data: () => designationWithBoth }],
      })
      mockUpdate.mockResolvedValue(undefined)

      const result = await updatePreConfiguredSafeAdult('child_123', {
        preferredMethod: 'email',
      })

      expect(result.preferredMethod).toBe('email')
    })

    it('should update updatedAt timestamp', async () => {
      const oldDate = new Date('2024-01-01')
      const oldDesignation = { ...existingDesignation, updatedAt: oldDate }
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'sa_123', data: () => oldDesignation }],
      })
      mockUpdate.mockResolvedValue(undefined)

      const result = await updatePreConfiguredSafeAdult('child_123', {
        displayName: 'New Name',
      })

      expect(result.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime())
    })

    it('should throw when no pre-configured adult exists', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

      await expect(
        updatePreConfiguredSafeAdult('child_123', { displayName: 'New Name' })
      ).rejects.toThrow('pre-configured')
    })

    it('should throw on empty childId', async () => {
      await expect(updatePreConfiguredSafeAdult('', { displayName: 'New Name' })).rejects.toThrow(
        'childId'
      )
    })

    it('should call Firestore update', async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'sa_123', data: () => existingDesignation }],
      })
      mockUpdate.mockResolvedValue(undefined)

      await updatePreConfiguredSafeAdult('child_123', { displayName: 'New Name' })

      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  // ============================================
  // removePreConfiguredSafeAdult Tests
  // ============================================

  describe('removePreConfiguredSafeAdult', () => {
    const existingDesignation: SafeAdultDesignation = {
      id: 'sa_123',
      childId: 'child_123',
      phoneNumber: '+15551234567',
      email: null,
      preferredMethod: 'sms',
      displayName: 'Aunt Jane',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPreConfigured: true,
      encryptionKeyId: 'sakey_123',
    }

    it('should delete pre-configured adult', async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'sa_123', data: () => existingDesignation }],
      })
      mockDelete.mockResolvedValue(undefined)

      await removePreConfiguredSafeAdult('child_123')

      expect(mockDelete).toHaveBeenCalled()
    })

    it('should succeed when no pre-configured adult exists', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

      await expect(removePreConfiguredSafeAdult('child_123')).resolves.not.toThrow()
    })

    it('should throw on empty childId', async () => {
      await expect(removePreConfiguredSafeAdult('')).rejects.toThrow('childId')
    })
  })

  // ============================================
  // validateSafeAdultContact Tests
  // ============================================

  describe('validateSafeAdultContact', () => {
    it('should return valid for phone only', () => {
      const result = validateSafeAdultContact({ phone: '+15551234567' })

      expect(result.valid).toBe(true)
      expect(result.hasPhone).toBe(true)
      expect(result.hasEmail).toBe(false)
    })

    it('should return valid for email only', () => {
      const result = validateSafeAdultContact({ email: 'test@example.com' })

      expect(result.valid).toBe(true)
      expect(result.hasPhone).toBe(false)
      expect(result.hasEmail).toBe(true)
    })

    it('should return valid for both contacts', () => {
      const result = validateSafeAdultContact({
        phone: '+15551234567',
        email: 'test@example.com',
      })

      expect(result.valid).toBe(true)
      expect(result.hasPhone).toBe(true)
      expect(result.hasEmail).toBe(true)
    })

    it('should return invalid for empty contact', () => {
      const result = validateSafeAdultContact({})

      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should return invalid for empty strings', () => {
      const result = validateSafeAdultContact({ phone: '', email: '' })

      expect(result.valid).toBe(false)
    })

    it('should accept phone with empty email', () => {
      const result = validateSafeAdultContact({ phone: '+15551234567', email: '' })

      expect(result.valid).toBe(true)
      expect(result.hasPhone).toBe(true)
    })

    it('should accept email with empty phone', () => {
      const result = validateSafeAdultContact({ phone: '', email: 'test@example.com' })

      expect(result.valid).toBe(true)
      expect(result.hasEmail).toBe(true)
    })
  })

  // ============================================
  // hasSafeAdultConfigured Tests
  // ============================================

  describe('hasSafeAdultConfigured', () => {
    it('should return true when pre-configured adult exists', async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'sa_123', data: () => ({}) }],
      })

      const result = await hasSafeAdultConfigured('child_123')

      expect(result).toBe(true)
    })

    it('should return false when no pre-configured adult exists', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

      const result = await hasSafeAdultConfigured('child_123')

      expect(result).toBe(false)
    })

    it('should throw on empty childId', async () => {
      await expect(hasSafeAdultConfigured('')).rejects.toThrow('childId')
    })
  })

  // ============================================
  // getSafeAdultById Tests
  // ============================================

  describe('getSafeAdultById', () => {
    it('should return designation when exists', async () => {
      const mockData: SafeAdultDesignation = {
        id: 'sa_123',
        childId: 'child_123',
        phoneNumber: '+15551234567',
        email: null,
        preferredMethod: 'sms',
        displayName: 'Aunt Jane',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPreConfigured: true,
        encryptionKeyId: 'sakey_123',
      }
      mockGet.mockResolvedValue({ exists: () => true, data: () => mockData })

      const result = await getSafeAdultById('sa_123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('sa_123')
    })

    it('should return null when not exists', async () => {
      mockGet.mockResolvedValue({ exists: () => false })

      const result = await getSafeAdultById('sa_nonexistent')

      expect(result).toBeNull()
    })

    it('should throw on empty id', async () => {
      await expect(getSafeAdultById('')).rejects.toThrow('id')
    })
  })

  // ============================================
  // getAllSafeAdultsForChild Tests
  // ============================================

  describe('getAllSafeAdultsForChild', () => {
    it('should return empty array when none exist', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

      const result = await getAllSafeAdultsForChild('child_123')

      expect(result).toEqual([])
    })

    it('should return all designations for child', async () => {
      const mockData1: SafeAdultDesignation = {
        id: 'sa_1',
        childId: 'child_123',
        phoneNumber: '+15551234567',
        email: null,
        preferredMethod: 'sms',
        displayName: 'Aunt Jane',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPreConfigured: true,
        encryptionKeyId: 'sakey_1',
      }
      const mockData2: SafeAdultDesignation = {
        id: 'sa_2',
        childId: 'child_123',
        phoneNumber: null,
        email: 'teacher@example.com',
        preferredMethod: 'email',
        displayName: 'Trusted Adult',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPreConfigured: false,
        encryptionKeyId: 'sakey_2',
      }
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          { id: 'sa_1', data: () => mockData1 },
          { id: 'sa_2', data: () => mockData2 },
        ],
      })

      const result = await getAllSafeAdultsForChild('child_123')

      expect(result.length).toBe(2)
    })

    it('should throw on empty childId', async () => {
      await expect(getAllSafeAdultsForChild('')).rejects.toThrow('childId')
    })
  })

  // ============================================
  // getSignalTimeSafeAdult Tests
  // ============================================

  describe('getSignalTimeSafeAdult', () => {
    it('should return null when no signal-time adult exists', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

      const result = await getSignalTimeSafeAdult('child_123', 'sig_123')

      expect(result).toBeNull()
    })

    it('should return signal-time adult when exists', async () => {
      const mockData: SafeAdultDesignation = {
        id: 'sa_123',
        childId: 'child_123',
        phoneNumber: '+15551234567',
        email: null,
        preferredMethod: 'sms',
        displayName: 'Trusted Adult',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPreConfigured: false,
        encryptionKeyId: 'sakey_123',
      }
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'sa_123', data: () => mockData }],
      })

      const result = await getSignalTimeSafeAdult('child_123', 'sig_123')

      expect(result).not.toBeNull()
      expect(result?.isPreConfigured).toBe(false)
    })
  })
})
