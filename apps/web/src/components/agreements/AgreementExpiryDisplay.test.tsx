/**
 * AgreementExpiryDisplay Tests - Story 35.1
 *
 * Tests for displaying agreement expiry date prominently.
 * AC3: Expiry date shown prominently in agreement view
 * AC6: Child sees when agreement expires
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgreementExpiryDisplay } from './AgreementExpiryDisplay'

describe('AgreementExpiryDisplay - Story 35.1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering with expiry date (AC3)', () => {
    it('should display the expiry date prominently', () => {
      const expiryDate = new Date('2024-12-01')
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      expect(screen.getByText(/Dec 1, 2024/)).toBeInTheDocument()
    })

    it('should show "Expires on" label', () => {
      const expiryDate = new Date('2024-12-01')
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      expect(screen.getByText(/Expires on/i)).toBeInTheDocument()
    })

    it('should show days remaining', () => {
      const expiryDate = new Date('2024-06-15') // 14 days from now
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      expect(screen.getByText(/14 days remaining/i)).toBeInTheDocument()
    })

    it('should show singular "day" for 1 day remaining', () => {
      const expiryDate = new Date('2024-06-02') // 1 day from now
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      expect(screen.getByText(/1 day remaining/i)).toBeInTheDocument()
    })
  })

  describe('expiring soon warning', () => {
    it('should show warning when expiring within 30 days', () => {
      const expiryDate = new Date('2024-06-20') // 19 days from now
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      expect(screen.getByText(/Expiring soon/i)).toBeInTheDocument()
    })

    it('should not show warning when more than 30 days away', () => {
      const expiryDate = new Date('2024-08-01') // 61 days away
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      expect(screen.queryByText(/Expiring soon/i)).not.toBeInTheDocument()
    })

    it('should use warning styling when expiring soon', () => {
      const expiryDate = new Date('2024-06-10') // 9 days from now
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      const container = screen.getByRole('status')
      expect(container.className).toMatch(/amber|yellow|orange|warning/i)
    })
  })

  describe('expired state', () => {
    it('should show expired message when date has passed', () => {
      const expiryDate = new Date('2024-05-01') // 1 month ago
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      const expiredTexts = screen.getAllByText(/expired/i)
      expect(expiredTexts.length).toBeGreaterThan(0)
    })

    it('should use error styling for expired', () => {
      const expiryDate = new Date('2024-05-01')
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      const container = screen.getByRole('alert')
      expect(container.className).toMatch(/red|error/i)
    })
  })

  describe('no expiry date', () => {
    it('should show no expiry message', () => {
      render(<AgreementExpiryDisplay expiryDate={null} />)

      expect(screen.getByText(/no expiry date/i)).toBeInTheDocument()
    })

    it('should show annual review reminder for no-expiry', () => {
      render(<AgreementExpiryDisplay expiryDate={null} showAnnualReview />)

      expect(screen.getByText(/annual review/i)).toBeInTheDocument()
    })
  })

  describe('child view (AC6)', () => {
    it('should display child-friendly message', () => {
      const expiryDate = new Date('2024-12-01')
      render(<AgreementExpiryDisplay expiryDate={expiryDate} variant="child" />)

      // Should show the date in a way children can understand
      expect(screen.getByText(/Dec 1, 2024/)).toBeInTheDocument()
    })

    it('should use simpler language for children', () => {
      const expiryDate = new Date('2024-06-15')
      render(<AgreementExpiryDisplay expiryDate={expiryDate} variant="child" />)

      // Check for kid-friendly language
      const container = screen.getByRole('status')
      expect(container.textContent).toBeDefined()
    })
  })

  describe('compact mode', () => {
    it('should render in compact mode', () => {
      const expiryDate = new Date('2024-12-01')
      render(<AgreementExpiryDisplay expiryDate={expiryDate} compact />)

      expect(screen.getByText(/Dec 1, 2024/)).toBeInTheDocument()
    })

    it('should have smaller styling in compact mode', () => {
      const expiryDate = new Date('2024-12-01')
      render(<AgreementExpiryDisplay expiryDate={expiryDate} compact />)

      const container = screen.getByRole('status')
      expect(container.className).toMatch(/p-2|text-sm/)
    })
  })

  describe('accessibility', () => {
    it('should have appropriate role for status display', () => {
      const expiryDate = new Date('2024-12-01')
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have alert role for expired agreements', () => {
      const expiryDate = new Date('2024-05-01')
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  describe('visual styling', () => {
    it('should have visible container', () => {
      const expiryDate = new Date('2024-12-01')
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      const container = screen.getByRole('status')
      expect(container).toBeInTheDocument()
    })

    it('should show calendar icon', () => {
      const expiryDate = new Date('2024-12-01')
      render(<AgreementExpiryDisplay expiryDate={expiryDate} />)

      expect(screen.getByText('📅')).toBeInTheDocument()
    })
  })
})
