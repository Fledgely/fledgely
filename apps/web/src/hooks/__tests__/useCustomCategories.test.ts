/**
 * Tests for useCustomCategories hook.
 *
 * Story 30.4: Custom Category Creation - AC1, AC6
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCustomCategories } from '../useCustomCategories'
import { MAX_CUSTOM_CATEGORIES_PER_FAMILY } from '@fledgely/shared'

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
}))

vi.mock('../../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore'

describe('useCustomCategories', () => {
  let mockUnsubscribe: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUnsubscribe = vi.fn()

    // Setup mock implementations
    vi.mocked(collection).mockReturnValue({} as ReturnType<typeof collection>)
    vi.mocked(doc).mockReturnValue({} as ReturnType<typeof doc>)
    vi.mocked(query).mockReturnValue({} as ReturnType<typeof query>)
    vi.mocked(orderBy).mockReturnValue({} as ReturnType<typeof orderBy>)

    // Capture the onSnapshot callback for testing
    vi.mocked(onSnapshot).mockImplementation((q, callback, _errorCallback) => {
      // Immediately call with empty snapshot
      setTimeout(() => {
        callback({ docs: [] })
      }, 0)
      return mockUnsubscribe
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should start with loading true when familyId is provided', () => {
      const { result } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      expect(result.current.loading).toBe(true)
    })

    it('should return empty categories when no familyId', () => {
      const { result } = renderHook(() => useCustomCategories({ familyId: null }))

      expect(result.current.categories).toEqual([])
      expect(result.current.loading).toBe(false)
    })

    it('should return empty categories when disabled', () => {
      const { result } = renderHook(() =>
        useCustomCategories({ familyId: 'test-family-id', enabled: false })
      )

      expect(result.current.categories).toEqual([])
      expect(result.current.loading).toBe(false)
    })
  })

  describe('loading categories', () => {
    it('should load categories from Firestore', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          data: () => ({
            name: 'Homework',
            apps: ['khan-academy'],
            createdBy: 'user1',
            createdAt: 1234567890,
            updatedAt: 1234567890,
          }),
        },
      ]

      vi.mocked(onSnapshot).mockImplementation((q, callback, _errorCallback) => {
        setTimeout(() => {
          callback({ docs: mockCategories })
        }, 0)
        return mockUnsubscribe
      })

      const { result } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.categories).toHaveLength(1)
      expect(result.current.categories[0].name).toBe('Homework')
    })

    it('should handle Firestore errors', async () => {
      vi.mocked(onSnapshot).mockImplementation((q, callback, errorCallback) => {
        setTimeout(() => {
          if (errorCallback) {
            errorCallback(new Error('Firestore error'))
          }
        }, 0)
        return mockUnsubscribe
      })

      const { result } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load custom categories')
      })
    })
  })

  describe('canAddMore - AC6', () => {
    it('should return true when under limit', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          data: () => ({ name: 'Cat 1', apps: [], createdBy: 'user1', createdAt: 1, updatedAt: 1 }),
        },
      ]

      vi.mocked(onSnapshot).mockImplementation((q, callback) => {
        setTimeout(() => callback({ docs: mockCategories }), 0)
        return mockUnsubscribe
      })

      const { result } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.canAddMore).toBe(true)
    })

    it('should return false when at limit', async () => {
      const mockCategories = Array.from({ length: MAX_CUSTOM_CATEGORIES_PER_FAMILY }, (_, i) => ({
        id: `cat${i}`,
        data: () => ({
          name: `Cat ${i}`,
          apps: [],
          createdBy: 'user1',
          createdAt: i,
          updatedAt: i,
        }),
      }))

      vi.mocked(onSnapshot).mockImplementation((q, callback) => {
        setTimeout(() => callback({ docs: mockCategories }), 0)
        return mockUnsubscribe
      })

      const { result } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.canAddMore).toBe(false)
    })
  })

  describe('createCategory - AC1', () => {
    it('should create a new category', async () => {
      const mockDocRef = { id: 'new-cat-id' }
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as ReturnType<typeof addDoc>)

      const { result } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const createResult = await act(async () => {
        return result.current.createCategory('Homework Apps', 'user123', ['khan-academy'])
      })

      expect(createResult.success).toBe(true)
      expect(createResult.id).toBe('new-cat-id')
      expect(addDoc).toHaveBeenCalled()
    })

    it('should reject names over 30 characters', async () => {
      const { result } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const longName = 'A'.repeat(31)
      const createResult = await act(async () => {
        return result.current.createCategory(longName, 'user123')
      })

      expect(createResult.success).toBe(false)
      expect(createResult.error).toBe('Category name must be 30 characters or less')
    })

    it('should reject when at max category limit', async () => {
      const mockCategories = Array.from({ length: MAX_CUSTOM_CATEGORIES_PER_FAMILY }, (_, i) => ({
        id: `cat${i}`,
        data: () => ({
          name: `Cat ${i}`,
          apps: [],
          createdBy: 'user1',
          createdAt: i,
          updatedAt: i,
        }),
      }))

      vi.mocked(onSnapshot).mockImplementation((q, callback) => {
        setTimeout(() => callback({ docs: mockCategories }), 0)
        return mockUnsubscribe
      })

      const { result } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const createResult = await act(async () => {
        return result.current.createCategory('New Category', 'user123')
      })

      expect(createResult.success).toBe(false)
      expect(createResult.error).toContain('Maximum')
    })
  })

  describe('updateCategory', () => {
    it('should update an existing category', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined)

      const { result } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const updateResult = await act(async () => {
        return result.current.updateCategory('cat1', { name: 'Updated Name' })
      })

      expect(updateResult.success).toBe(true)
      expect(updateDoc).toHaveBeenCalled()
    })

    it('should reject updated names over 30 characters', async () => {
      const { result } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const longName = 'A'.repeat(31)
      const updateResult = await act(async () => {
        return result.current.updateCategory('cat1', { name: longName })
      })

      expect(updateResult.success).toBe(false)
      expect(updateResult.error).toBe('Category name must be 30 characters or less')
    })
  })

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      vi.mocked(deleteDoc).mockResolvedValue(undefined)

      const { result } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const deleteResult = await act(async () => {
        return result.current.deleteCategory('cat1')
      })

      expect(deleteResult.success).toBe(true)
      expect(deleteDoc).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderHook(() => useCustomCategories({ familyId: 'test-family-id' }))

      await waitFor(() => {
        // Wait for initial snapshot to be called
      })

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
