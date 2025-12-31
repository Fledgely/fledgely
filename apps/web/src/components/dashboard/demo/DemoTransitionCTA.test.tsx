/**
 * Tests for DemoTransitionCTA Component
 *
 * Story 8.5.5: Demo-to-Real Transition
 * AC1: Clear CTA visibility
 * AC6: Agreement flow integration
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DemoTransitionCTA } from './DemoTransitionCTA'

describe('DemoTransitionCTA', () => {
  const mockOnStartWithRealChild = vi.fn()
  const mockOnContinueExploring = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render with demo styling', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const cta = screen.getByTestId('demo-transition-cta')
      expect(cta).toBeInTheDocument()
    })

    it('should display "Start with Your Child" button (AC1)', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const button = screen.getByTestId('start-with-child-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Start with Your Child')
    })

    it('should display title', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const title = screen.getByTestId('cta-title')
      expect(title).toBeInTheDocument()
    })

    it('should display description', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const description = screen.getByTestId('cta-description')
      expect(description).toBeInTheDocument()
    })

    it('should display hint text', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const hint = screen.getByTestId('cta-hint')
      expect(hint).toBeInTheDocument()
    })
  })

  describe('unexplored state (hasExploredDemo = false)', () => {
    it('should show wave emoji icon', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const icon = screen.getByTestId('cta-icon')
      expect(icon).toHaveTextContent('👋')
    })

    it('should show "When You\'re Ready" title', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const title = screen.getByTestId('cta-title')
      expect(title).toHaveTextContent("When You're Ready")
    })

    it('should show exploration-focused description', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const description = screen.getByTestId('cta-description')
      expect(description).toHaveTextContent('Take your time exploring')
    })

    it('should show demo reference hint', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const hint = screen.getByTestId('cta-hint')
      expect(hint).toHaveTextContent('Demo will remain available')
    })

    it('should have purple button styling', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const button = screen.getByTestId('start-with-child-button')
      expect(button).toHaveStyle({ backgroundColor: '#7c3aed' })
    })

    it('should have dashed border', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const cta = screen.getByTestId('demo-transition-cta')
      expect(cta).toHaveStyle({ borderStyle: 'dashed' })
    })
  })

  describe('explored state (hasExploredDemo = true)', () => {
    it('should show rocket emoji icon', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} hasExploredDemo />)
      const icon = screen.getByTestId('cta-icon')
      expect(icon).toHaveTextContent('🚀')
    })

    it('should show "Ready to Get Started?" title', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} hasExploredDemo />)
      const title = screen.getByTestId('cta-title')
      expect(title).toHaveTextContent('Ready to Get Started?')
    })

    it('should show readiness-focused description', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} hasExploredDemo />)
      const description = screen.getByTestId('cta-description')
      expect(description).toHaveTextContent("You've seen how Fledgely works")
    })

    it('should mention family agreement (AC6)', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} hasExploredDemo />)
      const hint = screen.getByTestId('cta-hint')
      expect(hint).toHaveTextContent('family agreement')
    })

    it('should have green button styling', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} hasExploredDemo />)
      const button = screen.getByTestId('start-with-child-button')
      expect(button).toHaveStyle({ backgroundColor: '#22c55e' })
    })

    it('should have solid border', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} hasExploredDemo />)
      const cta = screen.getByTestId('demo-transition-cta')
      expect(cta).toHaveStyle({ borderStyle: 'solid' })
    })
  })

  describe('button interactions', () => {
    it('should call onStartWithRealChild when button clicked', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      const button = screen.getByTestId('start-with-child-button')
      fireEvent.click(button)
      expect(mockOnStartWithRealChild).toHaveBeenCalledTimes(1)
    })

    it('should show continue exploring button when callback provided', () => {
      render(
        <DemoTransitionCTA
          onStartWithRealChild={mockOnStartWithRealChild}
          onContinueExploring={mockOnContinueExploring}
        />
      )
      const button = screen.getByTestId('continue-exploring-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Continue Exploring Demo')
    })

    it('should not show continue exploring button when callback not provided', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} />)
      expect(screen.queryByTestId('continue-exploring-button')).not.toBeInTheDocument()
    })

    it('should call onContinueExploring when button clicked', () => {
      render(
        <DemoTransitionCTA
          onStartWithRealChild={mockOnStartWithRealChild}
          onContinueExploring={mockOnContinueExploring}
        />
      )
      const button = screen.getByTestId('continue-exploring-button')
      fireEvent.click(button)
      expect(mockOnContinueExploring).toHaveBeenCalledTimes(1)
    })
  })

  describe('starting state', () => {
    it('should show "Starting..." text when starting', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} starting />)
      const button = screen.getByTestId('start-with-child-button')
      expect(button).toHaveTextContent('Starting...')
    })

    it('should disable button when starting', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} starting />)
      const button = screen.getByTestId('start-with-child-button')
      expect(button).toBeDisabled()
    })

    it('should have reduced opacity when starting', () => {
      render(<DemoTransitionCTA onStartWithRealChild={mockOnStartWithRealChild} starting />)
      const button = screen.getByTestId('start-with-child-button')
      expect(button).toHaveStyle({ opacity: '0.7' })
    })
  })
})
