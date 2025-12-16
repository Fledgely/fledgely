/**
 * Tests for ScrollProgress Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 5.5
 *
 * Tests for the scroll progress tracking display component.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScrollProgress } from '../ScrollProgress'

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('ScrollProgress', () => {
  describe('basic rendering', () => {
    it('renders without crashing', () => {
      render(
        <ScrollProgress
          parentProgress={0}
          childProgress={0}
          parentComplete={false}
          childComplete={false}
        />
      )
      expect(screen.getByTestId('scroll-progress')).toBeInTheDocument()
    })

    it('renders with custom data-testid', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
          data-testid="custom-progress"
        />
      )
      expect(screen.getByTestId('custom-progress')).toBeInTheDocument()
    })

    it('renders header text', () => {
      render(
        <ScrollProgress
          parentProgress={0}
          childProgress={0}
          parentComplete={false}
          childComplete={false}
        />
      )
      expect(screen.getByText('Reading Progress')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <ScrollProgress
          parentProgress={0}
          childProgress={0}
          parentComplete={false}
          childComplete={false}
          className="custom-class"
        />
      )
      expect(screen.getByTestId('scroll-progress')).toHaveClass('custom-class')
    })
  })

  // ============================================
  // PROGRESS BAR TESTS
  // ============================================

  describe('progress bars', () => {
    it('renders parent progress bar', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={0}
          parentComplete={false}
          childComplete={false}
        />
      )
      expect(screen.getByTestId('progress-parent')).toBeInTheDocument()
    })

    it('renders child progress bar', () => {
      render(
        <ScrollProgress
          parentProgress={0}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      expect(screen.getByTestId('progress-child')).toBeInTheDocument()
    })

    it('displays parent progress percentage', () => {
      render(
        <ScrollProgress
          parentProgress={75}
          childProgress={0}
          parentComplete={false}
          childComplete={false}
        />
      )
      const parentProgress = screen.getByTestId('progress-parent')
      expect(parentProgress.textContent).toContain('75%')
    })

    it('displays child progress percentage', () => {
      render(
        <ScrollProgress
          parentProgress={0}
          childProgress={42}
          parentComplete={false}
          childComplete={false}
        />
      )
      const childProgress = screen.getByTestId('progress-child')
      expect(childProgress.textContent).toContain('42%')
    })

    it('shows "Done" text when parent completes', () => {
      render(
        <ScrollProgress
          parentProgress={100}
          childProgress={0}
          parentComplete={true}
          childComplete={false}
        />
      )
      const parentProgress = screen.getByTestId('progress-parent')
      expect(parentProgress.textContent).toContain('Done')
    })

    it('shows "Done" text when child completes', () => {
      render(
        <ScrollProgress
          parentProgress={0}
          childProgress={100}
          parentComplete={false}
          childComplete={true}
        />
      )
      const childProgress = screen.getByTestId('progress-child')
      expect(childProgress.textContent).toContain('Done')
    })
  })

  // ============================================
  // COMPLETION STATE TESTS
  // ============================================

  describe('completion states', () => {
    it('shows instruction message when neither complete', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={25}
          parentComplete={false}
          childComplete={false}
        />
      )
      expect(
        screen.getByText('Please scroll through the entire agreement before signing.')
      ).toBeInTheDocument()
    })

    it('shows instruction when only parent complete', () => {
      render(
        <ScrollProgress
          parentProgress={100}
          childProgress={50}
          parentComplete={true}
          childComplete={false}
        />
      )
      expect(
        screen.getByText('Please scroll through the entire agreement before signing.')
      ).toBeInTheDocument()
    })

    it('shows instruction when only child complete', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={100}
          parentComplete={false}
          childComplete={true}
        />
      )
      expect(
        screen.getByText('Please scroll through the entire agreement before signing.')
      ).toBeInTheDocument()
    })

    it('shows success message when both complete', () => {
      render(
        <ScrollProgress
          parentProgress={100}
          childProgress={100}
          parentComplete={true}
          childComplete={true}
        />
      )
      expect(
        screen.getByText('You both read through the agreement. You can now continue to sign.')
      ).toBeInTheDocument()
    })

    it('shows "Ready to Sign" badge when both complete', () => {
      render(
        <ScrollProgress
          parentProgress={100}
          childProgress={100}
          parentComplete={true}
          childComplete={true}
        />
      )
      expect(screen.getByText('Ready to Sign')).toBeInTheDocument()
    })

    it('shows helper text when not complete', () => {
      render(
        <ScrollProgress
          parentProgress={0}
          childProgress={0}
          parentComplete={false}
          childComplete={false}
        />
      )
      expect(screen.getByText('Both must read the agreement')).toBeInTheDocument()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has role="region" on container', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('has aria-label on container', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      expect(screen.getByLabelText('Scroll progress tracking')).toBeInTheDocument()
    })

    it('progress bars have role="progressbar"', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      const progressbars = screen.getAllByRole('progressbar')
      expect(progressbars).toHaveLength(2)
    })

    it('progress bars have aria-valuenow', () => {
      render(
        <ScrollProgress
          parentProgress={75}
          childProgress={25}
          parentComplete={false}
          childComplete={false}
        />
      )
      const progressbars = screen.getAllByRole('progressbar')
      expect(progressbars[0]).toHaveAttribute('aria-valuenow', '75')
      expect(progressbars[1]).toHaveAttribute('aria-valuenow', '25')
    })

    it('progress bars have aria-valuemin and aria-valuemax', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      const progressbars = screen.getAllByRole('progressbar')
      progressbars.forEach((bar) => {
        expect(bar).toHaveAttribute('aria-valuemin', '0')
        expect(bar).toHaveAttribute('aria-valuemax', '100')
      })
    })

    it('has screen reader status element', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('screen reader announces completion status', () => {
      render(
        <ScrollProgress
          parentProgress={100}
          childProgress={100}
          parentComplete={true}
          childComplete={true}
        />
      )
      const status = screen.getByRole('status')
      expect(status.textContent).toContain('Both parent and child have read the agreement')
    })

    it('screen reader announces incomplete status', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={25}
          parentComplete={false}
          childComplete={false}
        />
      )
      const status = screen.getByRole('status')
      expect(status.textContent).toContain('Parent: 50% read')
      expect(status.textContent).toContain('Child: 25% read')
    })
  })

  // ============================================
  // ACTIVE CONTRIBUTOR TESTS
  // ============================================

  describe('active contributor', () => {
    it('highlights parent when activeContributor is parent', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
          activeContributor="parent"
        />
      )
      // Component should apply active styling to parent progress
      expect(screen.getByTestId('progress-parent')).toBeInTheDocument()
    })

    it('highlights child when activeContributor is child', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
          activeContributor="child"
        />
      )
      // Component should apply active styling to child progress
      expect(screen.getByTestId('progress-child')).toBeInTheDocument()
    })
  })

  // ============================================
  // VISUAL STYLING TESTS
  // ============================================

  describe('visual styling', () => {
    it('applies success styling when both complete', () => {
      const { container } = render(
        <ScrollProgress
          parentProgress={100}
          childProgress={100}
          parentComplete={true}
          childComplete={true}
        />
      )
      const component = container.querySelector('[data-testid="scroll-progress"]')
      expect(component?.className).toContain('bg-green')
    })

    it('applies default styling when not complete', () => {
      const { container } = render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      const component = container.querySelector('[data-testid="scroll-progress"]')
      expect(component?.className).toContain('bg-gray')
    })
  })

  // ============================================
  // CONTRIBUTOR BADGE TESTS
  // ============================================

  describe('contributor badges', () => {
    it('displays parent badge with correct label', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      const parentProgress = screen.getByTestId('progress-parent')
      expect(parentProgress.textContent).toContain('Parent')
    })

    it('displays child badge with correct label', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      const childProgress = screen.getByTestId('progress-child')
      expect(childProgress.textContent).toContain('Child')
    })
  })
})
