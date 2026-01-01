/**
 * useFocusModeConfig Hook Tests - Story 33.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useFocusModeConfig } from './useFocusModeConfig'

// Mock Firebase
const mockOnSnapshot = vi.fn()
const mockSetDoc = vi.fn()
const mockUpdateDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ path: 'test-path' })),
  onSnapshot: (
    ref: unknown,
    onNext: (snapshot: { exists: () => boolean; data: () => unknown }) => void,
    onError?: (error: Error) => void
  ) => mockOnSnapshot(ref, onNext, onError),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  arrayUnion: vi.fn((value) => ({ type: 'arrayUnion', value })),
  arrayRemove: vi.fn((value) => ({ type: 'arrayRemove', value })),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

describe('useFocusModeConfig - Story 33.2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSnapshot.mockImplementation((_ref, callback) => {
      // Simulate existing config
      callback({
        exists: () => true,
        data: () => ({
          childId: 'child-1',
          familyId: 'family-1',
          useDefaultCategories: true,
          customAllowList: [],
          customBlockList: [],
          allowedCategories: [],
          blockedCategories: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      })
      return vi.fn() // unsubscribe
    })
    mockSetDoc.mockResolvedValue(undefined)
    mockUpdateDoc.mockResolvedValue(undefined)
  })

  describe('Initialization', () => {
    it('returns loading state initially', () => {
      mockOnSnapshot.mockImplementation(() => vi.fn())

      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      expect(result.current.loading).toBe(true)
    })

    it('loads existing config from Firestore', async () => {
      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.config).not.toBeNull()
      expect(result.current.config?.childId).toBe('child-1')
      expect(result.current.config?.familyId).toBe('family-1')
    })

    it('initializes config if it does not exist', async () => {
      mockOnSnapshot.mockImplementation((_ref, callback) => {
        callback({
          exists: () => false,
          data: () => null,
        })
        return vi.fn()
      })

      renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(mockSetDoc).toHaveBeenCalled()
      })

      const setDocCall = mockSetDoc.mock.calls[0]
      expect(setDocCall[1]).toMatchObject({
        childId: 'child-1',
        familyId: 'family-1',
        useDefaultCategories: true,
      })
    })

    it('returns empty state when childId is null', () => {
      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: null,
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.config).toBeNull()
    })
  })

  describe('Default Apps (AC1, AC2)', () => {
    it('includes default allowed apps when useDefaultCategories is true', async () => {
      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should include Google Docs from education category
      const googleDocs = result.current.effectiveAllowList.find(
        (app) => app.pattern === 'docs.google.com'
      )
      expect(googleDocs).toBeDefined()
      expect(googleDocs?.isDefault).toBe(true)
    })

    it('includes default blocked apps when useDefaultCategories is true', async () => {
      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should include TikTok from social_media category
      const tiktok = result.current.effectiveBlockList.find((app) => app.pattern === 'tiktok.com')
      expect(tiktok).toBeDefined()
      expect(tiktok?.isDefault).toBe(true)
    })
  })

  describe('Custom App Configuration (AC3)', () => {
    it('adds app to allow list', async () => {
      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.addToAllowList('custom-app.com', 'Custom App')
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
      const updateCall = mockUpdateDoc.mock.calls[0]
      expect(updateCall[1].customAllowList).toBeDefined()
      expect(updateCall[1].customAllowList.value.pattern).toBe('custom-app.com')
    })

    it('adds app to block list', async () => {
      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.addToBlockList('distraction.com', 'Distraction Site')
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
      const updateCall = mockUpdateDoc.mock.calls[0]
      expect(updateCall[1].customBlockList).toBeDefined()
      expect(updateCall[1].customBlockList.value.pattern).toBe('distraction.com')
    })

    it('removes app from allow list', async () => {
      mockOnSnapshot.mockImplementation((_ref, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            childId: 'child-1',
            familyId: 'family-1',
            useDefaultCategories: true,
            customAllowList: [
              {
                pattern: 'custom-app.com',
                name: 'Custom App',
                isWildcard: false,
                addedAt: Date.now(),
                addedByUid: 'parent-1',
              },
            ],
            customBlockList: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.removeFromAllowList('custom-app.com')
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('removes app from block list', async () => {
      mockOnSnapshot.mockImplementation((_ref, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            childId: 'child-1',
            familyId: 'family-1',
            useDefaultCategories: true,
            customAllowList: [],
            customBlockList: [
              {
                pattern: 'blocked-app.com',
                name: 'Blocked App',
                isWildcard: false,
                addedAt: Date.now(),
                addedByUid: 'parent-1',
              },
            ],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.removeFromBlockList('blocked-app.com')
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
    })
  })

  describe('Category Toggle', () => {
    it('toggles default categories on/off', async () => {
      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleDefaultCategories(false)
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
      const updateCall = mockUpdateDoc.mock.calls[0]
      expect(updateCall[1].useDefaultCategories).toBe(false)
    })

    it('moves category to allowed list', async () => {
      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleCategory('streaming', 'allowed')
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('moves category to blocked list', async () => {
      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleCategory('productivity', 'blocked')
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
    })
  })

  describe('Effective Lists', () => {
    it('includes custom apps in effective allow list', async () => {
      mockOnSnapshot.mockImplementation((_ref, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            childId: 'child-1',
            familyId: 'family-1',
            useDefaultCategories: true,
            customAllowList: [
              {
                pattern: 'custom-edu.com',
                name: 'Custom Education',
                isWildcard: false,
                addedAt: Date.now(),
                addedByUid: 'parent-1',
              },
            ],
            customBlockList: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const customApp = result.current.effectiveAllowList.find(
        (app) => app.pattern === 'custom-edu.com'
      )
      expect(customApp).toBeDefined()
      expect(customApp?.isDefault).toBe(false)
    })

    it('removes duplicates from effective lists', async () => {
      mockOnSnapshot.mockImplementation((_ref, callback) => {
        callback({
          exists: () => true,
          data: () => ({
            childId: 'child-1',
            familyId: 'family-1',
            useDefaultCategories: true,
            customAllowList: [
              {
                pattern: 'docs.google.com', // Duplicate of default
                name: 'Google Docs Custom',
                isWildcard: false,
                addedAt: Date.now(),
                addedByUid: 'parent-1',
              },
            ],
            customBlockList: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        })
        return vi.fn()
      })

      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const googleDocsApps = result.current.effectiveAllowList.filter(
        (app) => app.pattern === 'docs.google.com'
      )
      expect(googleDocsApps).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    it('sets error state on Firestore error', async () => {
      mockOnSnapshot.mockImplementation((_ref, _onNext, onError) => {
        if (onError) {
          onError(new Error('Firestore error'))
        }
        return vi.fn()
      })

      const { result } = renderHook(() =>
        useFocusModeConfig({
          childId: 'child-1',
          familyId: 'family-1',
          parentUid: 'parent-1',
        })
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load focus mode configuration')
      })
    })
  })
})
