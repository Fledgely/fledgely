/**
 * Guardian Removal Prevention Service Tests - Story 3A.6
 *
 * Tests for preventing co-parent removal in shared custody families.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  canRemoveGuardian,
  canDowngradeToCaregiver,
  getRemovalBlockedMessage,
  logGuardianRemovalAttempt,
  requiresMutualDissolution,
  getGuardianCount,
} from './guardianRemovalPreventionService'

// Mock Firebase
const mockGetDoc = vi.fn()
const mockDoc = vi.fn()
const mockHttpsCallable = vi.fn()
const mockCallableFunction = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}))

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => {
    mockHttpsCallable(...args)
    return mockCallableFunction
  },
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: () => ({}),
  getFunctionsInstance: () => ({}),
}))

describe('guardianRemovalPreventionService - Story 3A.6', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDoc.mockReturnValue('family-ref')
  })

  describe('canRemoveGuardian', () => {
    it('should return false for multi-guardian family', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'family-1',
          name: 'Test Family',
          guardians: [
            { uid: 'parent-1', role: 'primary_guardian', addedAt: new Date() },
            { uid: 'parent-2', role: 'guardian', addedAt: new Date() },
          ],
          guardianUids: ['parent-1', 'parent-2'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      const result = await canRemoveGuardian('family-1', 'parent-2')

      expect(result.allowed).toBe(false)
      expect(result.guardianCount).toBe(2)
      expect(result.reason).toContain('shared custody families')
    })

    it('should return false for single guardian (cannot orphan family)', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'family-1',
          name: 'Test Family',
          guardians: [{ uid: 'parent-1', role: 'primary_guardian', addedAt: new Date() }],
          guardianUids: ['parent-1'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      const result = await canRemoveGuardian('family-1', 'parent-1')

      expect(result.allowed).toBe(false)
      expect(result.guardianCount).toBe(1)
      expect(result.reason).toContain('only guardian')
    })

    it('should return false if family not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      const result = await canRemoveGuardian('non-existent', 'parent-1')

      expect(result.allowed).toBe(false)
      expect(result.guardianCount).toBe(0)
      expect(result.reason).toBe('Family not found')
    })

    it('should return false if target is not a guardian', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'family-1',
          name: 'Test Family',
          guardians: [{ uid: 'parent-1', role: 'primary_guardian', addedAt: new Date() }],
          guardianUids: ['parent-1'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      const result = await canRemoveGuardian('family-1', 'not-a-guardian')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('not a guardian')
    })

    it('should include guardian count in result', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'family-1',
          name: 'Test Family',
          guardians: [
            { uid: 'parent-1', role: 'primary_guardian', addedAt: new Date() },
            { uid: 'parent-2', role: 'guardian', addedAt: new Date() },
            { uid: 'parent-3', role: 'guardian', addedAt: new Date() },
          ],
          guardianUids: ['parent-1', 'parent-2', 'parent-3'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      const result = await canRemoveGuardian('family-1', 'parent-2')

      expect(result.guardianCount).toBe(3)
    })
  })

  describe('canDowngradeToCaregiver', () => {
    it('should return false for multi-guardian family', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'family-1',
          name: 'Test Family',
          guardians: [
            { uid: 'parent-1', role: 'primary_guardian', addedAt: new Date() },
            { uid: 'parent-2', role: 'guardian', addedAt: new Date() },
          ],
          guardianUids: ['parent-1', 'parent-2'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      const result = await canDowngradeToCaregiver('family-1', 'parent-2')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('shared custody families')
      expect(result.reason).toContain('downgraded')
    })

    it('should return false for single guardian', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'family-1',
          name: 'Test Family',
          guardians: [{ uid: 'parent-1', role: 'primary_guardian', addedAt: new Date() }],
          guardianUids: ['parent-1'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      const result = await canDowngradeToCaregiver('family-1', 'parent-1')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('only guardian')
    })

    it('should return false if family not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      const result = await canDowngradeToCaregiver('non-existent', 'parent-1')

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Family not found')
    })

    it('should return false if target is not a guardian', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'family-1',
          name: 'Test Family',
          guardians: [{ uid: 'parent-1', role: 'primary_guardian', addedAt: new Date() }],
          guardianUids: ['parent-1'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      const result = await canDowngradeToCaregiver('family-1', 'not-a-guardian')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('not a guardian')
    })
  })

  describe('getRemovalBlockedMessage', () => {
    it('should return structured message with title', () => {
      const message = getRemovalBlockedMessage()

      expect(message.title).toBe('Guardian Removal Not Available')
    })

    it('should return explanation about shared custody', () => {
      const message = getRemovalBlockedMessage()

      expect(message.explanation).toContain('shared custody families')
      expect(message.explanation).toContain('neither parent can remove')
    })

    it('should include dissolution option', () => {
      const message = getRemovalBlockedMessage()

      expect(message.options.dissolution.title).toContain('Family Dissolution')
      expect(message.options.dissolution.description).toContain('both parents agree')
    })

    it('should include self-removal option', () => {
      const message = getRemovalBlockedMessage()

      expect(message.options.selfRemoval.title).toContain('Self-Removal')
      expect(message.options.selfRemoval.description).toContain('remove yourself')
    })

    it('should include court order option with contact email', () => {
      const message = getRemovalBlockedMessage()

      expect(message.options.courtOrder.title).toContain('Court Order')
      expect(message.options.courtOrder.description).toContain('court order')
      expect(message.options.courtOrder.contactEmail).toBe('safety@fledgely.app')
    })

    it('should mention legal documentation path', () => {
      const message = getRemovalBlockedMessage()

      expect(message.options.courtOrder.description).toContain('legal documentation')
    })
  })

  describe('logGuardianRemovalAttempt', () => {
    it('should call cloud function with correct parameters', async () => {
      mockCallableFunction.mockResolvedValue({ data: { success: true } })

      await logGuardianRemovalAttempt({
        familyId: 'family-1',
        attemptedByUid: 'parent-1',
        targetUid: 'parent-2',
        targetEmail: 'parent2@example.com',
      })

      expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'logGuardianRemovalAttempt')
      expect(mockCallableFunction).toHaveBeenCalledWith({
        familyId: 'family-1',
        attemptedByUid: 'parent-1',
        targetUid: 'parent-2',
        targetEmail: 'parent2@example.com',
      })
    })

    it('should handle missing targetEmail', async () => {
      mockCallableFunction.mockResolvedValue({ data: { success: true } })

      await logGuardianRemovalAttempt({
        familyId: 'family-1',
        attemptedByUid: 'parent-1',
        targetUid: 'parent-2',
      })

      expect(mockCallableFunction).toHaveBeenCalledWith({
        familyId: 'family-1',
        attemptedByUid: 'parent-1',
        targetUid: 'parent-2',
        targetEmail: null,
      })
    })
  })

  describe('requiresMutualDissolution', () => {
    it('should return true for multi-guardian family', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'family-1',
          name: 'Test Family',
          guardians: [
            { uid: 'parent-1', role: 'primary_guardian', addedAt: new Date() },
            { uid: 'parent-2', role: 'guardian', addedAt: new Date() },
          ],
          guardianUids: ['parent-1', 'parent-2'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      const result = await requiresMutualDissolution('family-1')

      expect(result).toBe(true)
    })

    it('should return false for single-guardian family', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'family-1',
          name: 'Test Family',
          guardians: [{ uid: 'parent-1', role: 'primary_guardian', addedAt: new Date() }],
          guardianUids: ['parent-1'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      const result = await requiresMutualDissolution('family-1')

      expect(result).toBe(false)
    })

    it('should return false if family not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      const result = await requiresMutualDissolution('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('getGuardianCount', () => {
    it('should return correct count for multi-guardian family', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'family-1',
          name: 'Test Family',
          guardians: [
            { uid: 'parent-1', role: 'primary_guardian', addedAt: new Date() },
            { uid: 'parent-2', role: 'guardian', addedAt: new Date() },
          ],
          guardianUids: ['parent-1', 'parent-2'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      const count = await getGuardianCount('family-1')

      expect(count).toBe(2)
    })

    it('should return 1 for single-guardian family', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'family-1',
          name: 'Test Family',
          guardians: [{ uid: 'parent-1', role: 'primary_guardian', addedAt: new Date() }],
          guardianUids: ['parent-1'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })

      const count = await getGuardianCount('family-1')

      expect(count).toBe(1)
    })

    it('should return 0 if family not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      const count = await getGuardianCount('non-existent')

      expect(count).toBe(0)
    })
  })
})
