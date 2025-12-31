/**
 * TermExplanation Component Tests - Story 19C.2
 *
 * Task 2.4: Add data-testid for testing
 * Task 5.2: Test tooltip displays on hover/tap
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TermExplanation } from './TermExplanation'

describe('TermExplanation', () => {
  const defaultProps = {
    explanation: 'This is a simple explanation',
    children: <span>Technical Term</span>,
  }

  it('should render with correct test id', () => {
    render(<TermExplanation {...defaultProps} />)
    expect(screen.getByTestId('term-explanation')).toBeInTheDocument()
  })

  it('should render children correctly', () => {
    render(<TermExplanation {...defaultProps} />)
    expect(screen.getByText('Technical Term')).toBeInTheDocument()
  })

  it('should not show tooltip initially', () => {
    render(<TermExplanation {...defaultProps} />)
    expect(screen.queryByTestId('term-explanation-tooltip')).not.toBeInTheDocument()
  })

  it('should show tooltip on mouse enter', () => {
    render(<TermExplanation {...defaultProps} />)
    const trigger = screen.getByTestId('term-explanation-trigger')

    fireEvent.mouseEnter(trigger)

    expect(screen.getByTestId('term-explanation-tooltip')).toBeInTheDocument()
    // Multiple elements contain the text (visible tooltip + srOnly), use getAllByText
    expect(screen.getAllByText('This is a simple explanation').length).toBeGreaterThan(0)
  })

  it('should hide tooltip on mouse leave', () => {
    render(<TermExplanation {...defaultProps} />)
    const trigger = screen.getByTestId('term-explanation-trigger')

    fireEvent.mouseEnter(trigger)
    expect(screen.getByTestId('term-explanation-tooltip')).toBeInTheDocument()

    fireEvent.mouseLeave(trigger)
    expect(screen.queryByTestId('term-explanation-tooltip')).not.toBeInTheDocument()
  })

  it('should toggle tooltip on click (for touch devices)', () => {
    render(<TermExplanation {...defaultProps} />)
    const trigger = screen.getByTestId('term-explanation-trigger')

    // First click shows tooltip
    fireEvent.click(trigger)
    expect(screen.getByTestId('term-explanation-tooltip')).toBeInTheDocument()

    // Second click hides tooltip
    fireEvent.click(trigger)
    expect(screen.queryByTestId('term-explanation-tooltip')).not.toBeInTheDocument()
  })

  it('should have accessible role and tabIndex', () => {
    render(<TermExplanation {...defaultProps} />)
    const trigger = screen.getByTestId('term-explanation-trigger')

    expect(trigger).toHaveAttribute('role', 'button')
    expect(trigger).toHaveAttribute('tabIndex', '0')
  })

  it('should show tooltip on Enter key press', () => {
    render(<TermExplanation {...defaultProps} />)
    const trigger = screen.getByTestId('term-explanation-trigger')

    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'Enter' })

    expect(screen.getByTestId('term-explanation-tooltip')).toBeInTheDocument()
  })

  it('should show tooltip on Space key press', () => {
    render(<TermExplanation {...defaultProps} />)
    const trigger = screen.getByTestId('term-explanation-trigger')

    trigger.focus()
    fireEvent.keyDown(trigger, { key: ' ' })

    expect(screen.getByTestId('term-explanation-tooltip')).toBeInTheDocument()
  })

  it('should hide tooltip on Escape key press', () => {
    render(<TermExplanation {...defaultProps} />)
    const trigger = screen.getByTestId('term-explanation-trigger')

    // Show tooltip first
    fireEvent.click(trigger)
    expect(screen.getByTestId('term-explanation-tooltip')).toBeInTheDocument()

    // Press Escape to hide
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByTestId('term-explanation-tooltip')).not.toBeInTheDocument()
  })

  it('should have tooltip role for accessibility', () => {
    render(<TermExplanation {...defaultProps} />)
    const trigger = screen.getByTestId('term-explanation-trigger')

    fireEvent.mouseEnter(trigger)

    const tooltip = screen.getByTestId('term-explanation-tooltip')
    expect(tooltip).toHaveAttribute('role', 'tooltip')
  })

  it('should have aria-describedby when tooltip is visible', () => {
    render(<TermExplanation {...defaultProps} />)
    const trigger = screen.getByTestId('term-explanation-trigger')

    // Before showing tooltip
    expect(trigger).not.toHaveAttribute('aria-describedby')

    // After showing tooltip
    fireEvent.mouseEnter(trigger)
    expect(trigger).toHaveAttribute('aria-describedby')
  })

  it('should apply custom trigger styles', () => {
    const customStyle = { color: 'rgb(255, 0, 0)' }
    render(<TermExplanation {...defaultProps} triggerStyle={customStyle} />)
    const trigger = screen.getByTestId('term-explanation-trigger')

    expect(trigger).toHaveStyle({ color: 'rgb(255, 0, 0)' })
  })

  it('should have visual indicator (dashed underline)', () => {
    render(<TermExplanation {...defaultProps} />)
    const trigger = screen.getByTestId('term-explanation-trigger')

    expect(trigger).toHaveStyle({ borderBottom: '1px dashed #0ea5e9' })
  })
})
