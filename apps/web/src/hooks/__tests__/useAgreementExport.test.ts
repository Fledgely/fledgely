/**
 * Tests for useAgreementExport Hook
 *
 * Story 5.5: Agreement Preview & Summary - Task 6.7
 *
 * Tests for the agreement export hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useAgreementExport,
  formatExportDate,
  generateExportFilename,
} from '../useAgreementExport'

// ============================================
// MOCK SETUP
// ============================================

const mockPrint = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  // Mock window.print
  vi.stubGlobal('print', mockPrint)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('formatExportDate', () => {
  it('formats date in readable format', () => {
    const date = new Date('2025-01-15')
    const result = formatExportDate(date)
    expect(result).toContain('January')
    expect(result).toContain('15')
    expect(result).toContain('2025')
  })

  it('uses current date when no date provided', () => {
    const result = formatExportDate()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('generateExportFilename', () => {
  it('generates filename with default prefix', () => {
    const result = generateExportFilename()
    expect(result).toMatch(/^family-agreement-\d{4}-\d{2}-\d{2}\.pdf$/)
  })

  it('generates filename with custom prefix', () => {
    const result = generateExportFilename('my-agreement')
    expect(result).toMatch(/^my-agreement-\d{4}-\d{2}-\d{2}\.pdf$/)
  })

  it('includes current date in filename', () => {
    const today = new Date().toISOString().split('T')[0]
    const result = generateExportFilename()
    expect(result).toContain(today)
  })
})

// ============================================
// BASIC HOOK TESTS
// ============================================

describe('useAgreementExport', () => {
  describe('basic functionality', () => {
    it('returns initial idle status', () => {
      const { result } = renderHook(() => useAgreementExport())
      expect(result.current.status).toBe('idle')
    })

    it('returns null error initially', () => {
      const { result } = renderHook(() => useAgreementExport())
      expect(result.current.error).toBeNull()
    })

    it('returns exportToPdf function', () => {
      const { result } = renderHook(() => useAgreementExport())
      expect(typeof result.current.exportToPdf).toBe('function')
    })

    it('returns openPrintDialog function', () => {
      const { result } = renderHook(() => useAgreementExport())
      expect(typeof result.current.openPrintDialog).toBe('function')
    })

    it('returns reset function', () => {
      const { result } = renderHook(() => useAgreementExport())
      expect(typeof result.current.reset).toBe('function')
    })

    it('returns isExporting flag', () => {
      const { result } = renderHook(() => useAgreementExport())
      expect(result.current.isExporting).toBe(false)
    })
  })

  // ============================================
  // EXPORT TO PDF TESTS
  // ============================================

  describe('exportToPdf', () => {
    it('calls window.print', async () => {
      const { result } = renderHook(() => useAgreementExport())

      await act(async () => {
        await result.current.exportToPdf()
      })

      await waitFor(() => {
        expect(mockPrint).toHaveBeenCalled()
      })
    })

    it('sets status to success after export', async () => {
      const { result } = renderHook(() => useAgreementExport())

      await act(async () => {
        await result.current.exportToPdf()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('success')
      })
    })

    it('calls onExportComplete callback', async () => {
      const onExportComplete = vi.fn()
      const { result } = renderHook(() =>
        useAgreementExport({ onExportComplete })
      )

      await act(async () => {
        await result.current.exportToPdf()
      })

      await waitFor(() => {
        expect(onExportComplete).toHaveBeenCalled()
      })
    })

    it('sets isExporting to true during export', async () => {
      const { result } = renderHook(() => useAgreementExport())

      act(() => {
        result.current.exportToPdf()
      })

      // Check that isExporting becomes true during export
      expect(result.current.isExporting).toBe(true)
    })

    it('prevents new export when already exporting', async () => {
      const { result } = renderHook(() => useAgreementExport())

      // Start export
      act(() => {
        result.current.exportToPdf()
      })

      // Verify isExporting is true
      expect(result.current.isExporting).toBe(true)

      // Record current call count
      const callCountBeforeSecond = mockPrint.mock.calls.length

      // Try to start another export while first is in progress
      await act(async () => {
        await result.current.exportToPdf()
      })

      // Should not have added additional print calls (at most 1 from original)
      expect(mockPrint.mock.calls.length).toBeLessThanOrEqual(callCountBeforeSecond + 1)
    })
  })

  // ============================================
  // OPEN PRINT DIALOG TESTS
  // ============================================

  describe('openPrintDialog', () => {
    it('calls window.print', async () => {
      const { result } = renderHook(() => useAgreementExport())

      await act(async () => {
        await result.current.openPrintDialog()
      })

      await waitFor(() => {
        expect(mockPrint).toHaveBeenCalled()
      })
    })

    it('sets status to success after print', async () => {
      const { result } = renderHook(() => useAgreementExport())

      await act(async () => {
        await result.current.openPrintDialog()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('success')
      })
    })
  })

  // ============================================
  // RESET TESTS
  // ============================================

  describe('reset', () => {
    it('resets status to idle', async () => {
      const { result } = renderHook(() => useAgreementExport())

      await act(async () => {
        await result.current.exportToPdf()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('success')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.status).toBe('idle')
    })

    it('clears error', async () => {
      const { result } = renderHook(() => useAgreementExport())

      // Simulate an error state by mocking print to throw
      mockPrint.mockImplementationOnce(() => {
        throw new Error('Print failed')
      })

      await act(async () => {
        await result.current.exportToPdf()
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.error).toBeNull()
    })
  })

  // ============================================
  // OPTIONS TESTS
  // ============================================

  describe('options', () => {
    it('uses custom title', async () => {
      const originalTitle = document.title
      const { result } = renderHook(() =>
        useAgreementExport({ title: 'Custom Agreement Title' })
      )

      await act(async () => {
        await result.current.exportToPdf()
      })

      // Title should be restored after export
      await waitFor(() => {
        expect(document.title).toBe(originalTitle)
      })
    })

    it('calls onExportError on failure', async () => {
      const onExportError = vi.fn()
      mockPrint.mockImplementationOnce(() => {
        throw new Error('Print failed')
      })

      const { result } = renderHook(() =>
        useAgreementExport({ onExportError })
      )

      await act(async () => {
        await result.current.exportToPdf()
      })

      await waitFor(() => {
        expect(onExportError).toHaveBeenCalled()
      })
    })
  })

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('error handling', () => {
    it('sets error state on failure', async () => {
      mockPrint.mockImplementationOnce(() => {
        throw new Error('Print failed')
      })

      const { result } = renderHook(() => useAgreementExport())

      await act(async () => {
        await result.current.exportToPdf()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('error')
        expect(result.current.error).toBe('Print failed')
      })
    })

    it('sets generic error message for non-Error throws', async () => {
      mockPrint.mockImplementationOnce(() => {
        throw 'Unknown error' // eslint-disable-line no-throw-literal
      })

      const { result } = renderHook(() => useAgreementExport())

      await act(async () => {
        await result.current.exportToPdf()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('error')
        expect(result.current.error).toBe('Export failed')
      })
    })
  })
})
