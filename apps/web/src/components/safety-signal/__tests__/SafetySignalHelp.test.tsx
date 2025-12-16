/**
 * SafetySignalHelp Tests
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 5
 *
 * Tests for the child-accessible help documentation component.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SafetySignalHelp } from '../SafetySignalHelp'

describe('SafetySignalHelp', () => {
  it('renders with collapsed state by default', () => {
    render(<SafetySignalHelp />)

    // Header should be visible
    expect(screen.getByText('Secret Safety Signal')).toBeInTheDocument()
    expect(screen.getByText('A hidden way to ask for help')).toBeInTheDocument()

    // Content should not be visible
    expect(screen.queryByText('What is this?')).not.toBeInTheDocument()
  })

  it('expands when header is clicked', () => {
    render(<SafetySignalHelp />)

    // Click the header to expand
    fireEvent.click(screen.getByRole('button'))

    // Content should now be visible
    expect(screen.getByText('What is this?')).toBeInTheDocument()
    expect(screen.getByText('How to use it')).toBeInTheDocument()
    expect(screen.getByText('What happens next')).toBeInTheDocument()
  })

  it('renders expanded by default when defaultExpanded=true', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    // Content should be visible immediately
    expect(screen.getByText('What is this?')).toBeInTheDocument()
  })

  it('collapses when clicked again', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    // Content should be visible
    expect(screen.getByText('What is this?')).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(screen.getByRole('button'))

    // Content should be hidden
    expect(screen.queryByText('What is this?')).not.toBeInTheDocument()
  })

  it('has accessible button with aria-expanded', () => {
    render(<SafetySignalHelp />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('displays tap gesture instructions', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    expect(screen.getByText('Tap the Logo')).toBeInTheDocument()
    expect(screen.getByText(/Tap the Fledgely logo/)).toBeInTheDocument()
    expect(screen.getByText(/5 times fast/)).toBeInTheDocument()
  })

  it('displays keyboard shortcut instructions', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    expect(screen.getByText('Keyboard Shortcut')).toBeInTheDocument()
    expect(screen.getByText('Shift')).toBeInTheDocument()
    expect(screen.getByText('Ctrl')).toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText(/3 times fast/)).toBeInTheDocument()
  })

  it('displays privacy assurance', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    expect(screen.getByText('Your Privacy is Protected')).toBeInTheDocument()
    // Text is split by <strong> element, so check separately
    expect(screen.getByText('cannot')).toBeInTheDocument()
    expect(screen.getByText(/see when you use this signal/)).toBeInTheDocument()
  })

  it('displays what happens next section', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    expect(screen.getByText(/A safe adult will be quietly told/)).toBeInTheDocument()
    expect(screen.getByText(/No one else in your family will know/)).toBeInTheDocument()
    expect(screen.getByText(/It works even if the internet is slow/)).toBeInTheDocument()
  })

  it('includes practice tip', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    expect(screen.getByText(/You can practice the tapping motion/)).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<SafetySignalHelp className="custom-class" />)

    expect(screen.getByTestId('safety-signal-help')).toHaveClass('custom-class')
  })

  it('uses custom testId', () => {
    render(<SafetySignalHelp testId="custom-test-id" />)

    expect(screen.getByTestId('custom-test-id')).toBeInTheDocument()
  })
})

describe('SafetySignalHelp Accessibility', () => {
  it('has accessible name for expand/collapse button', () => {
    render(<SafetySignalHelp />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('has aria-controls pointing to content', () => {
    render(<SafetySignalHelp />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-controls', 'safety-signal-help-content')
  })

  it('content has proper id for aria-controls', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    expect(screen.getByText('What is this?').closest('#safety-signal-help-content')).toBeInTheDocument()
  })

  it('uses semantic heading elements', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    // Main heading
    expect(screen.getByRole('heading', { name: 'Secret Safety Signal' })).toBeInTheDocument()

    // Section headings
    expect(screen.getByRole('heading', { name: 'What is this?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How to use it' })).toBeInTheDocument()
  })
})

describe('SafetySignalHelp Readability', () => {
  it('uses simple language', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    // Check for simple, child-friendly terms
    expect(screen.getByText(/secret way to let someone know/)).toBeInTheDocument()
    expect(screen.getByText(/No one watching your screen/)).toBeInTheDocument()
    expect(screen.getByText(/just looks like you tapped/)).toBeInTheDocument()
  })

  it('avoids complex jargon', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    // Should not contain complex terms
    const content = screen.getByTestId('safety-signal-help').textContent || ''

    // These technical terms should NOT appear
    expect(content.includes('IndexedDB')).toBe(false)
    expect(content.includes('encryption')).toBe(false)
    expect(content.includes('queue')).toBe(false)
    expect(content.includes('API')).toBe(false)
    expect(content.includes('authentication')).toBe(false)
  })
})
