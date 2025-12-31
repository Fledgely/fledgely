/**
 * Confidence Badge Tests
 *
 * Story 20.3: Confidence Score Assignment - AC5
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfidenceBadge, { ConfidenceIndicator } from './ConfidenceBadge'

describe('ConfidenceBadge', () => {
  // Story 20.3: AC5 - Confidence score visible to parent on screenshot detail
  describe('confidence display', () => {
    it('displays confidence percentage', () => {
      render(<ConfidenceBadge confidence={85} />)

      expect(screen.getByText('85%')).toBeInTheDocument()
    })

    it('displays high confidence label', () => {
      render(<ConfidenceBadge confidence={85} />)

      expect(screen.getByText('(High)')).toBeInTheDocument()
    })

    it('displays medium confidence label', () => {
      render(<ConfidenceBadge confidence={75} />)

      expect(screen.getByText('(Medium)')).toBeInTheDocument()
    })

    it('displays low confidence label', () => {
      render(<ConfidenceBadge confidence={50} />)

      expect(screen.getByText('(Low)')).toBeInTheDocument()
    })

    it('displays uncertain label for isLowConfidence=true', () => {
      render(<ConfidenceBadge confidence={25} isLowConfidence={true} />)

      expect(screen.getByText('(Uncertain)')).toBeInTheDocument()
    })
  })

  // AC2, AC3, AC4 threshold tests
  describe('confidence thresholds', () => {
    it('shows High for confidence >= 85', () => {
      render(<ConfidenceBadge confidence={85} />)
      expect(screen.getByText('(High)')).toBeInTheDocument()

      render(<ConfidenceBadge confidence={100} />)
      expect(screen.getAllByText('(High)').length).toBe(2)
    })

    it('shows Medium for confidence 60-84', () => {
      render(<ConfidenceBadge confidence={60} />)
      expect(screen.getByText('(Medium)')).toBeInTheDocument()
    })

    it('shows Low for confidence < 60', () => {
      render(<ConfidenceBadge confidence={59} />)
      expect(screen.getByText('(Low)')).toBeInTheDocument()
    })

    it('handles boundary at 85 correctly', () => {
      const { rerender } = render(<ConfidenceBadge confidence={85} />)
      expect(screen.getByText('(High)')).toBeInTheDocument()

      rerender(<ConfidenceBadge confidence={84} />)
      expect(screen.getByText('(Medium)')).toBeInTheDocument()
    })

    it('handles boundary at 60 correctly', () => {
      const { rerender } = render(<ConfidenceBadge confidence={60} />)
      expect(screen.getByText('(Medium)')).toBeInTheDocument()

      rerender(<ConfidenceBadge confidence={59} />)
      expect(screen.getByText('(Low)')).toBeInTheDocument()
    })
  })

  describe('label visibility', () => {
    it('hides label when showLabel=false', () => {
      render(<ConfidenceBadge confidence={85} showLabel={false} />)

      expect(screen.getByText('85%')).toBeInTheDocument()
      expect(screen.queryByText('(High)')).not.toBeInTheDocument()
    })

    it('shows label by default', () => {
      render(<ConfidenceBadge confidence={85} />)

      expect(screen.getByText('(High)')).toBeInTheDocument()
    })
  })

  describe('tooltip functionality', () => {
    it('shows tooltip on hover', () => {
      render(<ConfidenceBadge confidence={85} />)

      const badge = screen.getByRole('status')
      fireEvent.mouseEnter(badge.parentElement!)

      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByText('High Confidence')).toBeInTheDocument()
    })

    it('hides tooltip on mouse leave', () => {
      render(<ConfidenceBadge confidence={85} />)

      const badge = screen.getByRole('status')
      fireEvent.mouseEnter(badge.parentElement!)
      fireEvent.mouseLeave(badge.parentElement!)

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('does not show tooltip when showTooltip=false', () => {
      render(<ConfidenceBadge confidence={85} showTooltip={false} />)

      const badge = screen.getByRole('status')
      fireEvent.mouseEnter(badge.parentElement!)

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('shows correct description for each level', () => {
      const { rerender } = render(<ConfidenceBadge confidence={85} />)

      // High confidence
      fireEvent.mouseEnter(screen.getByRole('status').parentElement!)
      expect(screen.getByText(/confident about this category/)).toBeInTheDocument()
      fireEvent.mouseLeave(screen.getByRole('status').parentElement!)

      // Medium confidence
      rerender(<ConfidenceBadge confidence={75} />)
      fireEvent.mouseEnter(screen.getByRole('status').parentElement!)
      expect(screen.getByText(/reasonably sure/)).toBeInTheDocument()
      fireEvent.mouseLeave(screen.getByRole('status').parentElement!)

      // Low confidence
      rerender(<ConfidenceBadge confidence={50} />)
      fireEvent.mouseEnter(screen.getByRole('status').parentElement!)
      expect(screen.getByText(/less certain/)).toBeInTheDocument()
      fireEvent.mouseLeave(screen.getByRole('status').parentElement!)

      // Uncertain
      rerender(<ConfidenceBadge confidence={25} isLowConfidence={true} />)
      fireEvent.mouseEnter(screen.getByRole('status').parentElement!)
      expect(screen.getByText(/could not confidently categorize/)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has accessible role and label', () => {
      render(<ConfidenceBadge confidence={85} />)

      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('aria-label')
      expect(badge.getAttribute('aria-label')).toContain('85%')
      expect(badge.getAttribute('aria-label')).toContain('High confidence')
    })

    it('includes confidence description in aria-label', () => {
      render(<ConfidenceBadge confidence={50} />)

      const badge = screen.getByRole('status')
      expect(badge.getAttribute('aria-label')).toContain('Low confidence')
      expect(badge.getAttribute('aria-label')).toContain('less certain')
    })

    it('is focusable when tooltip is enabled', () => {
      render(<ConfidenceBadge confidence={85} showTooltip={true} />)

      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('tabIndex', '0')
    })

    it('is not focusable when tooltip is disabled', () => {
      render(<ConfidenceBadge confidence={85} showTooltip={false} />)

      const badge = screen.getByRole('status')
      expect(badge).not.toHaveAttribute('tabIndex')
    })

    it('shows tooltip on focus', () => {
      render(<ConfidenceBadge confidence={85} />)

      const badge = screen.getByRole('status')
      fireEvent.focus(badge.parentElement!)

      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    it('hides tooltip on blur', () => {
      render(<ConfidenceBadge confidence={85} />)

      const badge = screen.getByRole('status')
      fireEvent.focus(badge.parentElement!)
      fireEvent.blur(badge.parentElement!)

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  describe('custom styling', () => {
    it('accepts additional className', () => {
      render(<ConfidenceBadge confidence={85} className="custom-class" />)

      const badge = screen.getByRole('status')
      expect(badge.className).toContain('custom-class')
    })
  })
})

describe('ConfidenceIndicator', () => {
  it('renders simplified badge without label', () => {
    render(<ConfidenceIndicator confidence={85} />)

    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.queryByText('(High)')).not.toBeInTheDocument()
  })

  it('does not show tooltip', () => {
    render(<ConfidenceIndicator confidence={85} />)

    const badge = screen.getByRole('status')
    fireEvent.mouseEnter(badge.parentElement!)

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('handles isLowConfidence', () => {
    render(<ConfidenceIndicator confidence={25} isLowConfidence={true} />)

    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  // Edge case tests for extreme values
  it('handles 0% confidence', () => {
    render(<ConfidenceIndicator confidence={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('handles 100% confidence', () => {
    render(<ConfidenceIndicator confidence={100} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
