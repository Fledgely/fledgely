/**
 * Tests for TermExplanationTooltip Component
 *
 * Story 5.2: Visual Agreement Builder - Task 3.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionTermType } from '@fledgely/contracts'
import { TermExplanationTooltip, TermTooltipTrigger } from '../TermExplanationTooltip'
import { TERM_EXPLANATIONS, TERM_TYPE_LABELS } from '../termUtils'

// ============================================
// TEST SETUP
// ============================================

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('TermExplanationTooltip', () => {
  describe('basic rendering', () => {
    it('renders children correctly', () => {
      render(
        <TermExplanationTooltip termType="screen_time" data-testid="test-tooltip">
          <span>Trigger Text</span>
        </TermExplanationTooltip>
      )

      expect(screen.getByText('Trigger Text')).toBeInTheDocument()
    })

    it('does not show tooltip by default', () => {
      render(
        <TermExplanationTooltip termType="screen_time" data-testid="test-tooltip">
          <span>Trigger Text</span>
        </TermExplanationTooltip>
      )

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('renders with custom data-testid', () => {
      render(
        <TermExplanationTooltip termType="screen_time" data-testid="custom-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      expect(screen.getByTestId('custom-tooltip')).toBeInTheDocument()
    })
  })

  // ============================================
  // HOVER BEHAVIOR TESTS
  // ============================================

  describe('hover behavior', () => {
    it('shows tooltip on mouse enter after delay', async () => {
      render(
        <TermExplanationTooltip termType="screen_time" showDelay={200} data-testid="test-tooltip">
          <span>Hover me</span>
        </TermExplanationTooltip>
      )

      const trigger = screen.getByTestId('test-tooltip')
      fireEvent.mouseEnter(trigger)

      // Should not appear immediately
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

      // Advance timers past delay
      act(() => {
        vi.advanceTimersByTime(250)
      })

      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    it('hides tooltip on mouse leave after delay', async () => {
      render(
        <TermExplanationTooltip termType="screen_time" showDelay={0} hideDelay={100} data-testid="test-tooltip">
          <span>Hover me</span>
        </TermExplanationTooltip>
      )

      const trigger = screen.getByTestId('test-tooltip')
      fireEvent.mouseEnter(trigger)

      act(() => {
        vi.advanceTimersByTime(10)
      })

      expect(screen.getByRole('tooltip')).toBeInTheDocument()

      fireEvent.mouseLeave(trigger)

      // Should still be visible before delay
      expect(screen.getByRole('tooltip')).toBeInTheDocument()

      // Advance timers past hide delay
      act(() => {
        vi.advanceTimersByTime(150)
      })

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('cancels show when mouse leaves quickly', async () => {
      render(
        <TermExplanationTooltip termType="screen_time" showDelay={200} data-testid="test-tooltip">
          <span>Hover me</span>
        </TermExplanationTooltip>
      )

      const trigger = screen.getByTestId('test-tooltip')
      fireEvent.mouseEnter(trigger)

      // Leave before show delay completes
      act(() => {
        vi.advanceTimersByTime(100)
      })
      fireEvent.mouseLeave(trigger)

      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Should never have shown
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // FOCUS BEHAVIOR TESTS
  // ============================================

  describe('focus behavior', () => {
    it('shows tooltip immediately on focus', () => {
      render(
        <TermExplanationTooltip termType="bedtime" showDelay={200} data-testid="test-tooltip">
          <button>Focus me</button>
        </TermExplanationTooltip>
      )

      const trigger = screen.getByTestId('test-tooltip')
      fireEvent.focus(trigger)

      // Should appear immediately without delay
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    it('hides tooltip immediately on blur', () => {
      render(
        <TermExplanationTooltip termType="bedtime" hideDelay={200} data-testid="test-tooltip">
          <button>Focus me</button>
        </TermExplanationTooltip>
      )

      const trigger = screen.getByTestId('test-tooltip')
      fireEvent.focus(trigger)
      expect(screen.getByRole('tooltip')).toBeInTheDocument()

      fireEvent.blur(trigger)
      // Should hide immediately without delay
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // CONTENT TESTS - ALL TERM TYPES
  // ============================================

  describe('tooltip content for all term types', () => {
    const termTypes: SessionTermType[] = [
      'screen_time',
      'bedtime',
      'monitoring',
      'rule',
      'consequence',
      'reward',
    ]

    it.each(termTypes)('shows correct label for %s', (termType) => {
      render(
        <TermExplanationTooltip termType={termType} isOpen data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      expect(screen.getByText(TERM_TYPE_LABELS[termType])).toBeInTheDocument()
    })

    it.each(termTypes)('shows correct explanation for %s', (termType) => {
      render(
        <TermExplanationTooltip termType={termType} isOpen data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      expect(screen.getByText(TERM_EXPLANATIONS[termType])).toBeInTheDocument()
    })
  })

  describe('child-friendly explanations (NFR65)', () => {
    it('screen_time explanation uses simple language', () => {
      render(
        <TermExplanationTooltip termType="screen_time" isOpen>
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const explanation = screen.getByText(/How much time you can use screens each day/)
      expect(explanation).toBeInTheDocument()
    })

    it('bedtime explanation uses simple language', () => {
      render(
        <TermExplanationTooltip termType="bedtime" isOpen>
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const explanation = screen.getByText(/When devices need to be put away/)
      expect(explanation).toBeInTheDocument()
    })

    it('monitoring explanation uses simple language', () => {
      render(
        <TermExplanationTooltip termType="monitoring" isOpen>
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const explanation = screen.getByText(/How your parents can see what you are doing/)
      expect(explanation).toBeInTheDocument()
    })

    it('rule explanation uses simple language', () => {
      render(
        <TermExplanationTooltip termType="rule" isOpen>
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const explanation = screen.getByText(/An agreement about how you will use technology/)
      expect(explanation).toBeInTheDocument()
    })

    it('consequence explanation uses simple language', () => {
      render(
        <TermExplanationTooltip termType="consequence" isOpen>
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const explanation = screen.getByText(/What happens if the agreement is not followed/)
      expect(explanation).toBeInTheDocument()
    })

    it('reward explanation uses simple language', () => {
      render(
        <TermExplanationTooltip termType="reward" isOpen>
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const explanation = screen.getByText(/Something good that happens when you follow/)
      expect(explanation).toBeInTheDocument()
    })
  })

  // ============================================
  // POSITION TESTS
  // ============================================

  describe('tooltip positioning', () => {
    it('positions tooltip at top by default', () => {
      render(
        <TermExplanationTooltip termType="screen_time" isOpen data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const tooltip = screen.getByTestId('test-tooltip-content')
      expect(tooltip.className).toContain('bottom-full')
      expect(tooltip.className).toContain('mb-2')
    })

    it('positions tooltip at bottom when specified', () => {
      render(
        <TermExplanationTooltip termType="screen_time" position="bottom" isOpen data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const tooltip = screen.getByTestId('test-tooltip-content')
      expect(tooltip.className).toContain('top-full')
      expect(tooltip.className).toContain('mt-2')
    })

    it('positions tooltip at left when specified', () => {
      render(
        <TermExplanationTooltip termType="screen_time" position="left" isOpen data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const tooltip = screen.getByTestId('test-tooltip-content')
      expect(tooltip.className).toContain('right-full')
      expect(tooltip.className).toContain('mr-2')
    })

    it('positions tooltip at right when specified', () => {
      render(
        <TermExplanationTooltip termType="screen_time" position="right" isOpen data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const tooltip = screen.getByTestId('test-tooltip-content')
      expect(tooltip.className).toContain('left-full')
      expect(tooltip.className).toContain('ml-2')
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has role="tooltip"', () => {
      render(
        <TermExplanationTooltip termType="screen_time" isOpen data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    it('has unique id for aria-describedby', () => {
      render(
        <TermExplanationTooltip termType="screen_time" isOpen data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip.id).toMatch(/^tooltip-screen_time-/)
    })

    it('sets aria-describedby on trigger when open', () => {
      const { container } = render(
        <TermExplanationTooltip termType="screen_time" isOpen data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const tooltip = screen.getByRole('tooltip')
      const triggerWrapper = container.querySelector('[aria-describedby]')
      expect(triggerWrapper?.getAttribute('aria-describedby')).toBe(tooltip.id)
    })

    it('does not set aria-describedby when closed', () => {
      const { container } = render(
        <TermExplanationTooltip termType="screen_time" isOpen={false} data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const triggerWrapper = container.querySelector('[aria-describedby]')
      expect(triggerWrapper).toBeNull()
    })

    it('tooltip arrow is hidden from screen readers', () => {
      render(
        <TermExplanationTooltip termType="screen_time" isOpen data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const tooltip = screen.getByRole('tooltip')
      const arrow = tooltip.querySelector('[aria-hidden="true"]')
      expect(arrow).toBeInTheDocument()
    })
  })

  // ============================================
  // CONTROLLED MODE TESTS
  // ============================================

  describe('controlled mode', () => {
    it('respects isOpen prop', () => {
      const { rerender } = render(
        <TermExplanationTooltip termType="screen_time" isOpen={false} data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

      rerender(
        <TermExplanationTooltip termType="screen_time" isOpen={true} data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    it('calls onOpenChange when visibility should change', () => {
      const handleOpenChange = vi.fn()

      render(
        <TermExplanationTooltip
          termType="screen_time"
          isOpen={false}
          onOpenChange={handleOpenChange}
          showDelay={0}
          data-testid="test-tooltip"
        >
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const trigger = screen.getByTestId('test-tooltip')
      fireEvent.focus(trigger)

      expect(handleOpenChange).toHaveBeenCalledWith(true)
    })
  })

  // ============================================
  // CUSTOM CLASS TESTS
  // ============================================

  describe('custom styling', () => {
    it('applies custom className to tooltip', () => {
      render(
        <TermExplanationTooltip termType="screen_time" isOpen className="my-custom-class" data-testid="test-tooltip">
          <span>Trigger</span>
        </TermExplanationTooltip>
      )

      const tooltip = screen.getByTestId('test-tooltip-content')
      expect(tooltip.className).toContain('my-custom-class')
    })
  })
})

// ============================================
// TERM TOOLTIP TRIGGER TESTS
// ============================================

describe('TermTooltipTrigger', () => {
  it('renders children with tooltip behavior', () => {
    render(
      <TermTooltipTrigger termType="screen_time">
        Screen Time
      </TermTooltipTrigger>
    )

    expect(screen.getByText('Screen Time')).toBeInTheDocument()
  })

  it('wraps children in focusable span', () => {
    render(
      <TermTooltipTrigger termType="screen_time">
        Help Text
      </TermTooltipTrigger>
    )

    const span = screen.getByText('Help Text')
    expect(span.tagName).toBe('SPAN')
    expect(span).toHaveAttribute('tabIndex', '0')
  })

  it('has cursor-help style', () => {
    render(
      <TermTooltipTrigger termType="screen_time">
        Help Text
      </TermTooltipTrigger>
    )

    const span = screen.getByText('Help Text')
    expect(span.className).toContain('cursor-help')
  })

  it('shows tooltip on focus', () => {
    render(
      <TermTooltipTrigger termType="bedtime">
        Bedtime Help
      </TermTooltipTrigger>
    )

    // Get the wrapper div (parent of the span)
    const span = screen.getByText('Bedtime Help')
    const wrapper = span.closest('[class*="relative"]')!

    fireEvent.focus(wrapper)

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('Bedtime')).toBeInTheDocument()
  })
})
