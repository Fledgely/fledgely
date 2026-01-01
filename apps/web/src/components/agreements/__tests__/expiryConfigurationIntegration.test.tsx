/**
 * Agreement Expiry Configuration Integration Tests - Story 35.1
 *
 * Integration tests for the complete expiry configuration flow.
 * Tests all acceptance criteria working together.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExpiryDateSelector } from '../ExpiryDateSelector'
import { AgreementExpiryDisplay } from '../AgreementExpiryDisplay'
import { useAgreementExpiry } from '../../../hooks/useAgreementExpiry'
import {
  getExpiryConfig,
  formatExpiryStatus,
  getExpiryRecommendation,
} from '../../../services/expiryService'
import { renderHook, act } from '@testing-library/react'
import type { ExpiryDuration } from '@fledgely/shared'

describe('Agreement Expiry Configuration Integration - Story 35.1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('complete flow: selection to display (AC1, AC3)', () => {
    it('should flow from selector to hook to display', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      // Select 3-months duration
      act(() => {
        result.current.setDuration('3-months')
      })

      // Render display with the calculated date
      render(<AgreementExpiryDisplay expiryDate={result.current.expiryDate} />)

      // Should show September date (3 months from June)
      expect(screen.getByText(/Sep/)).toBeInTheDocument()
    })

    it('should show no-expiry state correctly', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      // Select no-expiry
      act(() => {
        result.current.setDuration('no-expiry')
      })

      // Render display
      render(
        <AgreementExpiryDisplay
          expiryDate={result.current.expiryDate}
          showAnnualReview
          annualReviewDate={result.current.annualReviewDate ?? undefined}
        />
      )

      // Should show no expiry message and annual review
      expect(screen.getByText(/no expiry/i)).toBeInTheDocument()
      expect(screen.getByText(/annual review/i)).toBeInTheDocument()
    })
  })

  describe('age-based recommendations flow (AC2)', () => {
    it('should recommend correctly for younger children', () => {
      const childAge = 10
      const recommendation = getExpiryRecommendation(childAge)

      expect(recommendation.duration).toBe('6-months')

      // Verify hook respects recommendation
      const { result } = renderHook(() => useAgreementExpiry({ childAge }))

      expect(result.current.recommendedDuration).toBe('6-months')
    })

    it('should recommend correctly for teens', () => {
      const childAge = 15
      const recommendation = getExpiryRecommendation(childAge)

      expect(recommendation.duration).toBe('1-year')

      // Verify hook respects recommendation
      const { result } = renderHook(() => useAgreementExpiry({ childAge }))

      expect(result.current.recommendedDuration).toBe('1-year')
    })
  })

  describe('expiry warning flow', () => {
    it('should show warning when approaching expiry', () => {
      const soonDate = new Date('2024-06-15') // 14 days away

      render(<AgreementExpiryDisplay expiryDate={soonDate} />)

      expect(screen.getByText(/Expiring soon/i)).toBeInTheDocument()
    })

    it('should show expired state correctly', () => {
      const pastDate = new Date('2024-05-01')

      render(<AgreementExpiryDisplay expiryDate={pastDate} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  describe('service and hook integration', () => {
    it('should have consistent configuration across layers', () => {
      const durations: ExpiryDuration[] = ['3-months', '6-months', '1-year', 'no-expiry']

      durations.forEach((duration) => {
        const config = getExpiryConfig(duration)
        expect(config.id).toBe(duration)
      })
    })

    it('should format status consistently', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      act(() => {
        result.current.setDuration('6-months')
      })

      const status = formatExpiryStatus(result.current.expiryDate)
      expect(status).toContain('Dec')
    })
  })

  describe('selector interaction flow', () => {
    it('should allow changing selection', () => {
      const onSelect = vi.fn()

      render(<ExpiryDateSelector selectedDuration="6-months" onSelect={onSelect} />)

      const oneYearOption = screen.getByRole('radio', { name: /1 year/i })
      fireEvent.click(oneYearOption)

      expect(onSelect).toHaveBeenCalledWith('1-year')
    })

    it('should show recommendations with age', () => {
      const onSelect = vi.fn()

      render(<ExpiryDateSelector selectedDuration="6-months" onSelect={onSelect} childAge={10} />)

      // 6-months should be marked as recommended
      const sixMonthsOption = screen
        .getByRole('radio', { name: /6 months/i })
        .closest('[data-option]')
      expect(sixMonthsOption).toHaveAttribute('data-recommended', 'true')
    })
  })

  describe('child view (AC6)', () => {
    it('should render child-friendly display', () => {
      const expiryDate = new Date('2024-12-01')

      render(<AgreementExpiryDisplay expiryDate={expiryDate} variant="child" />)

      // Should show the date
      expect(screen.getByText(/Dec 1, 2024/)).toBeInTheDocument()
    })
  })

  describe('compact mode integration', () => {
    it('should work in compact mode for both components', () => {
      const onSelect = vi.fn()

      // Compact selector
      const { rerender } = render(
        <ExpiryDateSelector selectedDuration="6-months" onSelect={onSelect} compact />
      )

      expect(screen.getByRole('radiogroup')).toBeInTheDocument()

      // Compact display
      const expiryDate = new Date('2024-12-01')
      rerender(<AgreementExpiryDisplay expiryDate={expiryDate} compact />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('end-to-end workflow', () => {
    it('should complete full workflow: select duration -> calculate -> display', () => {
      // 1. User selects a duration
      const { result } = renderHook(() => useAgreementExpiry({ childAge: 12 }))

      // Should have recommendation for younger child
      expect(result.current.recommendedDuration).toBe('6-months')

      // 2. User follows recommendation
      act(() => {
        result.current.setDuration('6-months')
      })

      // 3. Display shows the calculated expiry
      render(<AgreementExpiryDisplay expiryDate={result.current.expiryDate} />)

      expect(screen.getByText(/Dec/)).toBeInTheDocument()
      expect(result.current.daysUntilExpiry).toBeGreaterThan(0)
      expect(result.current.isExpiringSoon).toBe(false)
    })

    it('should handle no-expiry workflow with annual review', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      // Select no-expiry
      act(() => {
        result.current.setDuration('no-expiry')
      })

      // Verify annual review is set
      expect(result.current.annualReviewDate).toBeDefined()
      expect(result.current.annualReviewDate?.getFullYear()).toBe(2025)
      expect(result.current.expiryDate).toBeNull()

      // Display handles no-expiry
      render(
        <AgreementExpiryDisplay
          expiryDate={null}
          showAnnualReview
          annualReviewDate={result.current.annualReviewDate ?? undefined}
        />
      )

      expect(screen.getByText(/no expiry/i)).toBeInTheDocument()
    })
  })
})
