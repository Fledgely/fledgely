/**
 * Tests for TermCountIndicator Component
 *
 * Story 5.2: Visual Agreement Builder - Task 5.5
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  TermCountIndicator,
  TermCountBadge,
  getCountStatus,
  useCanAddTerm,
  getRemainingCapacity,
  MAX_TERMS,
  WARNING_THRESHOLD,
} from '../TermCountIndicator'
import { renderHook } from '@testing-library/react'

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('getCountStatus', () => {
  it('returns "normal" when count is below warning threshold', () => {
    expect(getCountStatus(0, 100, 90)).toBe('normal')
    expect(getCountStatus(50, 100, 90)).toBe('normal')
    expect(getCountStatus(89, 100, 90)).toBe('normal')
  })

  it('returns "warning" when count is at or above warning threshold', () => {
    expect(getCountStatus(90, 100, 90)).toBe('warning')
    expect(getCountStatus(95, 100, 90)).toBe('warning')
    expect(getCountStatus(99, 100, 90)).toBe('warning')
  })

  it('returns "limit" when count equals max', () => {
    expect(getCountStatus(100, 100, 90)).toBe('limit')
  })

  it('returns "limit" when count exceeds max', () => {
    expect(getCountStatus(101, 100, 90)).toBe('limit')
    expect(getCountStatus(150, 100, 90)).toBe('limit')
  })
})

describe('useCanAddTerm', () => {
  it('returns true when count is below max', () => {
    const { result } = renderHook(() => useCanAddTerm(0))
    expect(result.current).toBe(true)
  })

  it('returns true when count is at 99', () => {
    const { result } = renderHook(() => useCanAddTerm(99))
    expect(result.current).toBe(true)
  })

  it('returns false when count equals max', () => {
    const { result } = renderHook(() => useCanAddTerm(100))
    expect(result.current).toBe(false)
  })

  it('returns false when count exceeds max', () => {
    const { result } = renderHook(() => useCanAddTerm(150))
    expect(result.current).toBe(false)
  })

  it('respects custom maxTerms', () => {
    const { result } = renderHook(() => useCanAddTerm(50, 50))
    expect(result.current).toBe(false)
  })
})

describe('getRemainingCapacity', () => {
  it('returns correct remaining count', () => {
    expect(getRemainingCapacity(0)).toBe(100)
    expect(getRemainingCapacity(50)).toBe(50)
    expect(getRemainingCapacity(99)).toBe(1)
  })

  it('returns 0 when at max', () => {
    expect(getRemainingCapacity(100)).toBe(0)
  })

  it('returns 0 when above max', () => {
    expect(getRemainingCapacity(150)).toBe(0)
  })

  it('respects custom maxTerms', () => {
    expect(getRemainingCapacity(25, 50)).toBe(25)
  })
})

// ============================================
// CONSTANTS TESTS
// ============================================

describe('constants', () => {
  it('MAX_TERMS is 100 per NFR60', () => {
    expect(MAX_TERMS).toBe(100)
  })

  it('WARNING_THRESHOLD is 90', () => {
    expect(WARNING_THRESHOLD).toBe(90)
  })
})

// ============================================
// TERM COUNT INDICATOR COMPONENT TESTS
// ============================================

describe('TermCountIndicator', () => {
  describe('basic rendering', () => {
    it('renders with correct data-testid', () => {
      render(<TermCountIndicator count={50} />)
      expect(screen.getByTestId('term-count-indicator')).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      render(<TermCountIndicator count={50} data-testid="custom-indicator" />)
      expect(screen.getByTestId('custom-indicator')).toBeInTheDocument()
    })

    it('displays count and max (X/100 format)', () => {
      render(<TermCountIndicator count={42} />)
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('uses custom maxTerms when provided', () => {
      render(<TermCountIndicator count={25} maxTerms={50} />)
      expect(screen.getByText('50')).toBeInTheDocument()
    })
  })

  describe('status states', () => {
    it('has normal status when below warning threshold', () => {
      render(<TermCountIndicator count={50} />)
      const indicator = screen.getByTestId('term-count-indicator')
      expect(indicator).toHaveAttribute('data-status', 'normal')
    })

    it('has warning status at warning threshold', () => {
      render(<TermCountIndicator count={90} />)
      const indicator = screen.getByTestId('term-count-indicator')
      expect(indicator).toHaveAttribute('data-status', 'warning')
    })

    it('has limit status at max', () => {
      render(<TermCountIndicator count={100} />)
      const indicator = screen.getByTestId('term-count-indicator')
      expect(indicator).toHaveAttribute('data-status', 'limit')
    })
  })

  describe('warning message', () => {
    it('does not show message in normal state', () => {
      render(<TermCountIndicator count={50} />)
      expect(screen.queryByTestId('term-count-message')).not.toBeInTheDocument()
    })

    it('shows warning message at warning threshold', () => {
      render(<TermCountIndicator count={90} />)
      const message = screen.getByTestId('term-count-message')
      expect(message).toBeInTheDocument()
      expect(message.textContent).toContain('Getting close to the limit')
    })

    it('shows limit message at max', () => {
      render(<TermCountIndicator count={100} />)
      const message = screen.getByTestId('term-count-message')
      expect(message).toBeInTheDocument()
      expect(message.textContent).toContain('reached the maximum')
    })
  })

  describe('accessibility', () => {
    it('has progressbar role', () => {
      render(<TermCountIndicator count={50} />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('has correct aria-valuenow', () => {
      render(<TermCountIndicator count={42} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '42')
    })

    it('has correct aria-valuemax', () => {
      render(<TermCountIndicator count={42} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    })

    it('has aria-label describing the count', () => {
      render(<TermCountIndicator count={42} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-label', '42 of 100 terms used')
    })

    it('message has aria-live for screen reader announcements', () => {
      render(<TermCountIndicator count={90} />)
      const message = screen.getByTestId('term-count-message')
      expect(message).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('visual indicators', () => {
    it('shows warning icon at warning state', () => {
      const { container } = render(<TermCountIndicator count={95} />)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('shows limit icon at limit state', () => {
      const { container } = render(<TermCountIndicator count={100} />)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<TermCountIndicator count={50} className="my-custom-class" />)
      const indicator = screen.getByTestId('term-count-indicator')
      expect(indicator.className).toContain('my-custom-class')
    })
  })
})

// ============================================
// TERM COUNT BADGE COMPONENT TESTS
// ============================================

describe('TermCountBadge', () => {
  it('renders with correct data-testid', () => {
    render(<TermCountBadge count={50} />)
    expect(screen.getByTestId('term-count-badge')).toBeInTheDocument()
  })

  it('displays count/max format', () => {
    render(<TermCountBadge count={42} />)
    expect(screen.getByText('42/100')).toBeInTheDocument()
  })

  it('has normal status styling below warning', () => {
    render(<TermCountBadge count={50} />)
    const badge = screen.getByTestId('term-count-badge')
    expect(badge).toHaveAttribute('data-status', 'normal')
  })

  it('has warning status styling at warning', () => {
    render(<TermCountBadge count={90} />)
    const badge = screen.getByTestId('term-count-badge')
    expect(badge).toHaveAttribute('data-status', 'warning')
  })

  it('has limit status styling at max', () => {
    render(<TermCountBadge count={100} />)
    const badge = screen.getByTestId('term-count-badge')
    expect(badge).toHaveAttribute('data-status', 'limit')
  })

  it('applies custom className', () => {
    render(<TermCountBadge count={50} className="my-badge-class" />)
    const badge = screen.getByTestId('term-count-badge')
    expect(badge.className).toContain('my-badge-class')
  })

  it('uses custom maxTerms', () => {
    render(<TermCountBadge count={25} maxTerms={50} />)
    expect(screen.getByText('25/50')).toBeInTheDocument()
  })
})
