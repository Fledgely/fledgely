/**
 * Tests for useTemplateSelection hook
 *
 * Story 4.3: Template Preview & Selection - Task 3
 *
 * Tests the hook for managing template selection state and
 * navigation to the agreement creation flow.
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTemplateSelection } from '../useTemplateSelection'
import type { AgreementTemplate } from '@fledgely/contracts'

// Mock Next.js router
const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/templates',
}))

// Mock template for testing
const mockTemplate: AgreementTemplate = {
  id: 'test-template-123',
  name: 'Test Template',
  description: 'A test template for testing.',
  ageGroup: '8-10',
  variation: 'balanced',
  concerns: ['screen_time', 'safety'],
  summary: {
    screenTimeLimit: '1 hour on school days',
    monitoringLevel: 'moderate',
    keyRules: ['Rule 1', 'Rule 2'],
  },
  sections: [
    {
      id: 'terms-test',
      type: 'terms',
      title: 'Test Terms',
      description: 'Test terms section.',
      defaultValue: 'Test terms content',
      customizable: true,
      order: 0,
    },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

const mockTemplate2: AgreementTemplate = {
  ...mockTemplate,
  id: 'test-template-456',
  name: 'Another Test Template',
}

describe('useTemplateSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns null selected template by default', () => {
      const { result } = renderHook(() => useTemplateSelection())

      expect(result.current.selectedTemplate).toBeNull()
    })

    it('returns false for isSelecting by default', () => {
      const { result } = renderHook(() => useTemplateSelection())

      expect(result.current.isSelecting).toBe(false)
    })

    it('returns null selectedTemplateId by default', () => {
      const { result } = renderHook(() => useTemplateSelection())

      expect(result.current.selectedTemplateId).toBeNull()
    })
  })

  describe('selectTemplate', () => {
    it('sets selected template when called', () => {
      const { result } = renderHook(() => useTemplateSelection())

      act(() => {
        result.current.selectTemplate(mockTemplate)
      })

      expect(result.current.selectedTemplate).toEqual(mockTemplate)
      expect(result.current.selectedTemplateId).toBe('test-template-123')
    })

    it('sets isSelecting to true when template is selected', () => {
      const { result } = renderHook(() => useTemplateSelection())

      act(() => {
        result.current.selectTemplate(mockTemplate)
      })

      expect(result.current.isSelecting).toBe(true)
    })

    it('replaces previous selection with new one', () => {
      const { result } = renderHook(() => useTemplateSelection())

      act(() => {
        result.current.selectTemplate(mockTemplate)
      })

      act(() => {
        result.current.selectTemplate(mockTemplate2)
      })

      expect(result.current.selectedTemplate?.id).toBe('test-template-456')
      expect(result.current.selectedTemplateId).toBe('test-template-456')
    })
  })

  describe('clearSelection', () => {
    it('clears selected template', () => {
      const { result } = renderHook(() => useTemplateSelection())

      act(() => {
        result.current.selectTemplate(mockTemplate)
      })

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.selectedTemplate).toBeNull()
      expect(result.current.selectedTemplateId).toBeNull()
    })

    it('sets isSelecting to false', () => {
      const { result } = renderHook(() => useTemplateSelection())

      act(() => {
        result.current.selectTemplate(mockTemplate)
      })

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.isSelecting).toBe(false)
    })
  })

  describe('proceedToAgreement', () => {
    it('navigates to agreement creation route with template ID', () => {
      const { result } = renderHook(() => useTemplateSelection())

      act(() => {
        result.current.selectTemplate(mockTemplate)
      })

      act(() => {
        result.current.proceedToAgreement()
      })

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/agreements/create')
      )
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('templateId=test-template-123')
      )
    })

    it('does not navigate if no template is selected', () => {
      const { result } = renderHook(() => useTemplateSelection())

      act(() => {
        result.current.proceedToAgreement()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('includes childId in URL when provided', () => {
      const { result } = renderHook(() => useTemplateSelection())

      act(() => {
        result.current.selectTemplate(mockTemplate)
      })

      act(() => {
        result.current.proceedToAgreement('child-123')
      })

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('childId=child-123')
      )
    })
  })

  describe('with initial selection', () => {
    it('accepts initial template via options', () => {
      const { result } = renderHook(() =>
        useTemplateSelection({ initialTemplate: mockTemplate })
      )

      expect(result.current.selectedTemplate).toEqual(mockTemplate)
      expect(result.current.selectedTemplateId).toBe('test-template-123')
    })

    it('sets isSelecting to true when initial template is provided', () => {
      const { result } = renderHook(() =>
        useTemplateSelection({ initialTemplate: mockTemplate })
      )

      expect(result.current.isSelecting).toBe(true)
    })
  })

  describe('getAgreementCreationUrl', () => {
    it('returns URL for selected template', () => {
      const { result } = renderHook(() => useTemplateSelection())

      act(() => {
        result.current.selectTemplate(mockTemplate)
      })

      const url = result.current.getAgreementCreationUrl()
      expect(url).toContain('/agreements/create')
      expect(url).toContain('templateId=test-template-123')
    })

    it('returns null when no template is selected', () => {
      const { result } = renderHook(() => useTemplateSelection())

      expect(result.current.getAgreementCreationUrl()).toBeNull()
    })

    it('includes childId when provided', () => {
      const { result } = renderHook(() => useTemplateSelection())

      act(() => {
        result.current.selectTemplate(mockTemplate)
      })

      const url = result.current.getAgreementCreationUrl('child-456')
      expect(url).toContain('childId=child-456')
    })
  })
})
