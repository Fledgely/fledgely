/**
 * ChildSignalDisplayService Tests - Story 7.5.7 Task 5
 *
 * TDD tests for child interface concealment during blackout.
 * AC6: Countdown not visible to child
 *
 * CRITICAL SAFETY:
 * - Child sees only "Help is on the way" confirmation
 * - No countdown visible anywhere
 * - Resources continue to be available
 * - Normal app interface shown
 * - Prevents child anxiety during safety response
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  getChildSignalView,
  filterBlackoutFromChildView,
  getChildResources,
  getConfirmationMessage,
} from './childSignalDisplayService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}))

describe('ChildSignalDisplayService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getChildSignalView', () => {
    it('should return signalReceived as true when signal exists', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({
              id: 'signal-123',
              status: 'active',
            }),
          },
        ],
      } as any)

      const result = await getChildSignalView('child-456', 'signal-123')

      expect(result.signalReceived).toBe(true)
    })

    it('should return signalReceived as false when signal not found', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const result = await getChildSignalView('child-456', 'signal-123')

      expect(result.signalReceived).toBe(false)
    })

    it('should include confirmation message', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({
              id: 'signal-123',
              status: 'active',
            }),
          },
        ],
      } as any)

      const result = await getChildSignalView('child-456', 'signal-123')

      expect(result.confirmationMessage).toBeDefined()
      expect(result.confirmationMessage.length).toBeGreaterThan(0)
    })

    it('should include resources array', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({
              id: 'signal-123',
              status: 'active',
            }),
          },
        ],
      } as any)

      const result = await getChildSignalView('child-456', 'signal-123')

      expect(result.resources).toBeDefined()
      expect(Array.isArray(result.resources)).toBe(true)
    })

    it('should NEVER include countdown property', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({
              id: 'signal-123',
              status: 'active',
            }),
          },
        ],
      } as any)

      const result = await getChildSignalView('child-456', 'signal-123')

      // CRITICAL: countdown must NEVER be present
      expect('countdown' in result).toBe(false)
    })

    it('should NEVER include blackoutActive property', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({
              id: 'signal-123',
              status: 'active',
            }),
          },
        ],
      } as any)

      const result = await getChildSignalView('child-456', 'signal-123')

      // CRITICAL: blackoutActive must NEVER be present
      expect('blackoutActive' in result).toBe(false)
    })

    it('should NEVER include timeRemaining property', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({
              id: 'signal-123',
              status: 'active',
            }),
          },
        ],
      } as any)

      const result = await getChildSignalView('child-456', 'signal-123')

      // CRITICAL: timeRemaining must NEVER be present
      expect('timeRemaining' in result).toBe(false)
    })

    it('should NEVER include expiresAt property', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({
              id: 'signal-123',
              status: 'active',
            }),
          },
        ],
      } as any)

      const result = await getChildSignalView('child-456', 'signal-123')

      // CRITICAL: expiresAt must NEVER be present
      expect('expiresAt' in result).toBe(false)
    })

    it('should require childId', async () => {
      await expect(getChildSignalView('', 'signal-123')).rejects.toThrow('childId is required')
    })

    it('should require signalId', async () => {
      await expect(getChildSignalView('child-456', '')).rejects.toThrow('signalId is required')
    })
  })

  describe('filterBlackoutFromChildView', () => {
    it('should remove countdown from data', () => {
      const data = {
        id: 'test',
        countdown: 3600000,
        message: 'Test message',
      }

      const result = filterBlackoutFromChildView(data)

      expect('countdown' in result).toBe(false)
      expect(result.message).toBe('Test message')
    })

    it('should remove blackoutActive from data', () => {
      const data = {
        id: 'test',
        blackoutActive: true,
        message: 'Test message',
      }

      const result = filterBlackoutFromChildView(data)

      expect('blackoutActive' in result).toBe(false)
      expect(result.message).toBe('Test message')
    })

    it('should remove timeRemaining from data', () => {
      const data = {
        id: 'test',
        timeRemaining: 172800000,
        message: 'Test message',
      }

      const result = filterBlackoutFromChildView(data)

      expect('timeRemaining' in result).toBe(false)
      expect(result.message).toBe('Test message')
    })

    it('should remove expiresAt from data', () => {
      const data = {
        id: 'test',
        expiresAt: new Date(),
        message: 'Test message',
      }

      const result = filterBlackoutFromChildView(data)

      expect('expiresAt' in result).toBe(false)
      expect(result.message).toBe('Test message')
    })

    it('should remove blackoutExpiry from data', () => {
      const data = {
        id: 'test',
        blackoutExpiry: new Date(),
        message: 'Test message',
      }

      const result = filterBlackoutFromChildView(data)

      expect('blackoutExpiry' in result).toBe(false)
    })

    it('should remove suppressionActive from data', () => {
      const data = {
        id: 'test',
        suppressionActive: true,
        message: 'Test message',
      }

      const result = filterBlackoutFromChildView(data)

      expect('suppressionActive' in result).toBe(false)
    })

    it('should keep safe properties', () => {
      const data = {
        id: 'test',
        message: 'Help is on the way',
        resources: [{ name: 'Crisis Line', url: 'tel:123' }],
        confirmationMessage: 'We received your signal',
      }

      const result = filterBlackoutFromChildView(data)

      expect(result.id).toBe('test')
      expect(result.message).toBe('Help is on the way')
      expect(result.resources).toEqual([{ name: 'Crisis Line', url: 'tel:123' }])
      expect(result.confirmationMessage).toBe('We received your signal')
    })

    it('should handle nested objects', () => {
      const data = {
        id: 'test',
        nested: {
          countdown: 3600000,
          safeData: 'keep this',
        },
      }

      const result = filterBlackoutFromChildView(data)

      expect('countdown' in result.nested).toBe(false)
      expect(result.nested.safeData).toBe('keep this')
    })

    it('should handle null input', () => {
      const result = filterBlackoutFromChildView(null)
      expect(result).toBeNull()
    })

    it('should handle undefined input', () => {
      const result = filterBlackoutFromChildView(undefined)
      expect(result).toBeUndefined()
    })

    it('should handle primitive values', () => {
      expect(filterBlackoutFromChildView('string')).toBe('string')
      expect(filterBlackoutFromChildView(123)).toBe(123)
      expect(filterBlackoutFromChildView(true)).toBe(true)
    })
  })

  describe('getChildResources', () => {
    it('should return resources for child', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({
              name: 'Crisis Text Line',
              type: 'text',
              contact: 'Text HOME to 741741',
            }),
          },
          {
            data: () => ({
              name: 'National Suicide Prevention',
              type: 'phone',
              contact: '988',
            }),
          },
        ],
      } as any)

      const result = await getChildResources('child-456')

      expect(result.length).toBe(2)
      expect(result[0].name).toBe('Crisis Text Line')
    })

    it('should return default resources when none found', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const result = await getChildResources('child-456')

      expect(result.length).toBeGreaterThan(0)
      expect(result[0].name).toBeDefined()
    })

    it('should require childId', async () => {
      await expect(getChildResources('')).rejects.toThrow('childId is required')
    })

    it('should never include countdown in resources', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({
              name: 'Crisis Line',
              countdown: 3600000, // Should be filtered
            }),
          },
        ],
      } as any)

      const result = await getChildResources('child-456')

      expect('countdown' in result[0]).toBe(false)
    })
  })

  describe('getConfirmationMessage', () => {
    it('should return confirmation message', async () => {
      const result = await getConfirmationMessage('child-456', 'signal-123')

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include reassuring language', async () => {
      const result = await getConfirmationMessage('child-456', 'signal-123')

      // Should contain reassuring language
      const lowerResult = result.toLowerCase()
      expect(
        lowerResult.includes('help') ||
          lowerResult.includes('safe') ||
          lowerResult.includes('received') ||
          lowerResult.includes('way')
      ).toBe(true)
    })

    it('should not mention timing', async () => {
      const result = await getConfirmationMessage('child-456', 'signal-123')

      // Should NOT mention any timing information
      const lowerResult = result.toLowerCase()
      expect(lowerResult.includes('48 hour')).toBe(false)
      expect(lowerResult.includes('countdown')).toBe(false)
      expect(lowerResult.includes('expire')).toBe(false)
    })

    it('should require childId', async () => {
      await expect(getConfirmationMessage('', 'signal-123')).rejects.toThrow('childId is required')
    })

    it('should require signalId', async () => {
      await expect(getConfirmationMessage('child-456', '')).rejects.toThrow('signalId is required')
    })
  })
})
