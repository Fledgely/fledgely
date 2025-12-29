/**
 * Tests for useVersionHistory hook.
 *
 * Story 5.7: Draft Saving & Version History - AC3, AC4
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useVersionHistory } from '../useVersionHistory'
import type { AgreementTerm } from '@fledgely/shared/contracts'

const mockTerms: AgreementTerm[] = [
  {
    id: 'term-1',
    text: 'No phones at dinner',
    category: 'screen_time',
    party: 'family',
    order: 0,
    explanation: 'Family time is important',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'term-2',
    text: '30 minutes of reading daily',
    category: 'education',
    party: 'child',
    order: 1,
    explanation: 'Reading helps learn new things',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

describe('useVersionHistory', () => {
  const defaultOptions = {
    sessionId: 'session-123',
    currentUserUid: 'user-456',
  }

  describe('initial state', () => {
    it('should initialize with empty versions', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      expect(result.current.versions).toEqual([])
      expect(result.current.selectedVersion).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('createVersion', () => {
    it('should create a new version with provided data', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      let newVersion: ReturnType<typeof result.current.createVersion>
      act(() => {
        newVersion = result.current.createVersion('manual_save', mockTerms, 'Test save')
      })

      expect(newVersion!.type).toBe('manual_save')
      expect(newVersion!.description).toBe('Test save')
      expect(newVersion!.termsSnapshot).toHaveLength(2)
      expect(newVersion!.sessionId).toBe('session-123')
      expect(newVersion!.createdByUid).toBe('user-456')
      expect(newVersion!.createdAt).toBeInstanceOf(Date)
    })

    it('should add version to versions list', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      act(() => {
        result.current.createVersion('initial_draft', mockTerms)
      })

      expect(result.current.versions).toHaveLength(1)
    })

    it('should use default description when not provided', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      let newVersion: ReturnType<typeof result.current.createVersion>
      act(() => {
        newVersion = result.current.createVersion('initial_draft', mockTerms)
      })

      expect(newVersion!.description).toBe('Agreement started from template')
    })

    it('should call onVersionCreated callback', () => {
      const onVersionCreated = vi.fn()
      const { result } = renderHook(() =>
        useVersionHistory({
          ...defaultOptions,
          onVersionCreated,
        })
      )

      act(() => {
        result.current.createVersion('manual_save', mockTerms)
      })

      expect(onVersionCreated).toHaveBeenCalledTimes(1)
      expect(onVersionCreated.mock.calls[0][0].type).toBe('manual_save')
    })

    it('should clone terms to avoid reference issues', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      const originalTerms = [...mockTerms]
      let newVersion: ReturnType<typeof result.current.createVersion>
      act(() => {
        newVersion = result.current.createVersion('manual_save', originalTerms)
      })

      // Modify original
      originalTerms.push({
        id: 'term-3',
        text: 'New term',
        category: 'chores',
        party: 'parent',
        order: 2,
        explanation: 'New explanation',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Version should not be affected
      expect(newVersion!.termsSnapshot).toHaveLength(2)
    })
  })

  describe('getDefaultDescription', () => {
    it('should return correct descriptions for each version type', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      expect(result.current.getDefaultDescription('initial_draft')).toBe(
        'Agreement started from template'
      )
      expect(result.current.getDefaultDescription('child_additions')).toBe(
        'Child added their ideas'
      )
      expect(result.current.getDefaultDescription('negotiation_complete')).toBe(
        'All discussions resolved'
      )
      expect(result.current.getDefaultDescription('manual_save')).toBe('Draft saved')
      expect(result.current.getDefaultDescription('auto_save')).toBe('Auto-saved')
    })
  })

  describe('selectVersion', () => {
    it('should select a version by ID', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      let createdVersion: ReturnType<typeof result.current.createVersion>
      act(() => {
        createdVersion = result.current.createVersion('manual_save', mockTerms)
      })

      act(() => {
        result.current.selectVersion(createdVersion!.id)
      })

      expect(result.current.selectedVersion).toEqual(createdVersion)
    })

    it('should set selectedVersion to null for invalid ID', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      act(() => {
        result.current.createVersion('manual_save', mockTerms)
      })

      act(() => {
        result.current.selectVersion('invalid-id')
      })

      expect(result.current.selectedVersion).toBeNull()
    })
  })

  describe('clearSelection', () => {
    it('should clear selected version', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      let createdVersion: ReturnType<typeof result.current.createVersion>
      act(() => {
        createdVersion = result.current.createVersion('manual_save', mockTerms)
      })

      act(() => {
        result.current.selectVersion(createdVersion!.id)
      })

      expect(result.current.selectedVersion).not.toBeNull()

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.selectedVersion).toBeNull()
    })
  })

  describe('restoreVersion', () => {
    it('should return cloned terms from version', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      let createdVersion: ReturnType<typeof result.current.createVersion>
      act(() => {
        createdVersion = result.current.createVersion('manual_save', mockTerms)
      })

      let restoredTerms: AgreementTerm[] | null
      act(() => {
        restoredTerms = result.current.restoreVersion(createdVersion!.id)
      })

      expect(restoredTerms!).toHaveLength(2)
      expect(restoredTerms![0].text).toBe('No phones at dinner')
    })

    it('should return null for invalid version ID', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      let restoredTerms: AgreementTerm[] | null
      act(() => {
        restoredTerms = result.current.restoreVersion('invalid-id')
      })

      expect(restoredTerms).toBeNull()
    })

    it('should call onVersionRestored callback', () => {
      const onVersionRestored = vi.fn()
      const { result } = renderHook(() =>
        useVersionHistory({
          ...defaultOptions,
          onVersionRestored,
        })
      )

      let createdVersion: ReturnType<typeof result.current.createVersion>
      act(() => {
        createdVersion = result.current.createVersion('manual_save', mockTerms)
      })

      act(() => {
        result.current.restoreVersion(createdVersion!.id)
      })

      expect(onVersionRestored).toHaveBeenCalledTimes(1)
      expect(onVersionRestored.mock.calls[0][0].id).toBe(createdVersion!.id)
    })

    it('should return cloned terms that do not affect original', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      let createdVersion: ReturnType<typeof result.current.createVersion>
      act(() => {
        createdVersion = result.current.createVersion('manual_save', mockTerms)
      })

      let restoredTerms: AgreementTerm[] | null
      act(() => {
        restoredTerms = result.current.restoreVersion(createdVersion!.id)
      })

      // Modify restored terms
      restoredTerms!.push({
        id: 'term-3',
        text: 'New term',
        category: 'chores',
        party: 'parent',
        order: 2,
        explanation: 'New explanation',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Original version should not be affected
      expect(createdVersion!.termsSnapshot).toHaveLength(2)
    })
  })

  describe('multiple versions', () => {
    it('should maintain all created versions', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      act(() => {
        result.current.createVersion('initial_draft', mockTerms)
        result.current.createVersion('child_additions', mockTerms)
        result.current.createVersion('manual_save', mockTerms)
      })

      expect(result.current.versions).toHaveLength(3)
      expect(result.current.versions[0].type).toBe('initial_draft')
      expect(result.current.versions[1].type).toBe('child_additions')
      expect(result.current.versions[2].type).toBe('manual_save')
    })

    it('should generate unique IDs for each version', () => {
      const { result } = renderHook(() => useVersionHistory(defaultOptions))

      act(() => {
        result.current.createVersion('manual_save', mockTerms)
        result.current.createVersion('manual_save', mockTerms)
        result.current.createVersion('manual_save', mockTerms)
      })

      const ids = result.current.versions.map((v) => v.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(3)
    })
  })
})
