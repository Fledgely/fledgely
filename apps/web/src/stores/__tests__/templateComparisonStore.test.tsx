/**
 * Tests for templateComparisonStore (React Context implementation)
 *
 * Story 4.3: Template Preview & Selection - Task 4
 *
 * Tests the React Context for managing template comparison state.
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, type ReactNode } from 'vitest'
import {
  useTemplateComparisonStore,
  TemplateComparisonProvider,
} from '../templateComparisonStore'

// Wrapper component for tests
function wrapper({ children }: { children: ReactNode }) {
  return <TemplateComparisonProvider>{children}</TemplateComparisonProvider>
}

describe('templateComparisonStore', () => {
  describe('initial state', () => {
    it('starts with empty selection', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })
      expect(result.current.selectedForComparison).toEqual([])
    })

    it('isComparing is false initially', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })
      expect(result.current.isComparing).toBe(false)
    })

    it('comparisonCount is 0 initially', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })
      expect(result.current.comparisonCount).toBe(0)
    })
  })

  describe('addToComparison', () => {
    it('adds a template ID to comparison', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
      })

      expect(result.current.selectedForComparison).toContain('template-1')
      expect(result.current.comparisonCount).toBe(1)
    })

    it('can add up to 3 templates', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
        result.current.addToComparison('template-2')
        result.current.addToComparison('template-3')
      })

      expect(result.current.selectedForComparison).toHaveLength(3)
      expect(result.current.comparisonCount).toBe(3)
    })

    it('does not add more than 3 templates', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
        result.current.addToComparison('template-2')
        result.current.addToComparison('template-3')
        result.current.addToComparison('template-4')
      })

      expect(result.current.selectedForComparison).toHaveLength(3)
      expect(result.current.selectedForComparison).not.toContain('template-4')
    })

    it('does not add duplicate template IDs', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
        result.current.addToComparison('template-1')
      })

      expect(result.current.selectedForComparison).toHaveLength(1)
    })

    it('sets isComparing to true when templates are selected', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
      })

      expect(result.current.isComparing).toBe(true)
    })
  })

  describe('removeFromComparison', () => {
    it('removes a template ID from comparison', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
        result.current.addToComparison('template-2')
      })

      act(() => {
        result.current.removeFromComparison('template-1')
      })

      expect(result.current.selectedForComparison).not.toContain('template-1')
      expect(result.current.selectedForComparison).toContain('template-2')
      expect(result.current.comparisonCount).toBe(1)
    })

    it('handles removing non-existent template gracefully', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
      })

      act(() => {
        result.current.removeFromComparison('non-existent')
      })

      expect(result.current.selectedForComparison).toHaveLength(1)
    })

    it('sets isComparing to false when all templates are removed', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
      })

      act(() => {
        result.current.removeFromComparison('template-1')
      })

      expect(result.current.isComparing).toBe(false)
    })
  })

  describe('clearComparison', () => {
    it('clears all selected templates', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
        result.current.addToComparison('template-2')
        result.current.addToComparison('template-3')
      })

      act(() => {
        result.current.clearComparison()
      })

      expect(result.current.selectedForComparison).toEqual([])
      expect(result.current.comparisonCount).toBe(0)
      expect(result.current.isComparing).toBe(false)
    })
  })

  describe('toggleComparison', () => {
    it('adds template if not in comparison', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.toggleComparison('template-1')
      })

      expect(result.current.selectedForComparison).toContain('template-1')
    })

    it('removes template if already in comparison', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
      })

      act(() => {
        result.current.toggleComparison('template-1')
      })

      expect(result.current.selectedForComparison).not.toContain('template-1')
    })
  })

  describe('isInComparison', () => {
    it('returns true if template is in comparison', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
      })

      expect(result.current.isInComparison('template-1')).toBe(true)
    })

    it('returns false if template is not in comparison', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      expect(result.current.isInComparison('non-existent')).toBe(false)
    })
  })

  describe('canAddMore', () => {
    it('returns true when less than 3 templates selected', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
      })

      expect(result.current.canAddMore).toBe(true)
    })

    it('returns false when 3 templates are selected', () => {
      const { result } = renderHook(() => useTemplateComparisonStore(), { wrapper })

      act(() => {
        result.current.addToComparison('template-1')
        result.current.addToComparison('template-2')
        result.current.addToComparison('template-3')
      })

      expect(result.current.canAddMore).toBe(false)
    })
  })

  describe('context error handling', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useTemplateComparisonStore())
      }).toThrow('useTemplateComparisonStore must be used within a TemplateComparisonProvider')

      consoleSpy.mockRestore()
    })
  })
})
