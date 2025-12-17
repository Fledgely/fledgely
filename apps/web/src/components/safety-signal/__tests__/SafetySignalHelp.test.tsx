/**
 * SafetySignalHelp Tests
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 5
 * Updated Story 7.5.4: Safe Adult Designation - Task 7
 *
 * Tests for the child-accessible help documentation component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

    expect(screen.getByText(/You can choose to tell a trusted adult/)).toBeInTheDocument()
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

describe('SafetySignalHelp Safe Adult Section (Story 7.5.4)', () => {
  it('displays safe adult section heading', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    expect(screen.getByText('Tell Someone You Trust (Optional)')).toBeInTheDocument()
  })

  it('explains the optional nature of safe adult notification', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    expect(screen.getByText(/your choice/i)).toBeInTheDocument()
    expect(screen.getByText(/you don't have to do this/i)).toBeInTheDocument()
  })

  it('describes how to contact a safe adult', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    expect(screen.getByText('How it works')).toBeInTheDocument()
    expect(screen.getByText(/phone number or email/)).toBeInTheDocument()
  })

  it('explains what the safe adult will see', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    expect(screen.getByText("What they'll see")).toBeInTheDocument()
    expect(screen.getByText(/doesn't mention this app/i)).toBeInTheDocument()
    expect(screen.getByText(/Nothing about this app/)).toBeInTheDocument()
  })

  it('mentions saved contact feature', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    expect(screen.getByText('Save for next time')).toBeInTheDocument()
    expect(screen.getByText(/remember it \(privately!\)/)).toBeInTheDocument()
  })

  it('uses child-friendly language for safe adult section', () => {
    render(<SafetySignalHelp defaultExpanded={true} />)

    // Check for simple terms instead of technical ones
    expect(screen.getByText(/teacher, coach, relative/)).toBeInTheDocument()
    expect(screen.getByText(/simple message/)).toBeInTheDocument()
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

describe('SafetySignalHelp Pre-Configuration Form (AC4)', () => {
  const mockOnSave = vi.fn()
  const mockOnRemove = vi.fn()
  const mockOnLoad = vi.fn()

  const defaultCallbacks = {
    onSave: mockOnSave,
    onRemove: mockOnRemove,
    onLoad: mockOnLoad,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnLoad.mockResolvedValue(null)
  })

  it('shows setup button when callbacks and childId are provided', async () => {
    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
    })
    expect(screen.getByText(/Set up a trusted adult now/)).toBeInTheDocument()
  })

  it('does not show setup section without childId', () => {
    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
      />
    )

    expect(screen.queryByTestId('safety-signal-help-safe-adult-setup')).not.toBeInTheDocument()
  })

  it('does not show setup section without callbacks', () => {
    render(
      <SafetySignalHelp
        defaultExpanded={true}
        childId="child-123"
      />
    )

    expect(screen.queryByTestId('safety-signal-help-safe-adult-setup')).not.toBeInTheDocument()
  })

  it('opens form when setup button is clicked', async () => {
    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-setup-btn'))

    expect(screen.getByTestId('safety-signal-help-safe-adult-form')).toBeInTheDocument()
    expect(screen.getByText('Enter their contact info')).toBeInTheDocument()
  })

  it('toggles between phone and email contact types', async () => {
    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-setup-btn'))

    // Phone is selected by default
    const phoneBtn = screen.getByTestId('safety-signal-help-safe-adult-type-phone')
    const emailBtn = screen.getByTestId('safety-signal-help-safe-adult-type-email')

    expect(phoneBtn).toHaveClass('bg-indigo-600')
    expect(emailBtn).not.toHaveClass('bg-indigo-600')

    // Switch to email
    fireEvent.click(emailBtn)
    expect(emailBtn).toHaveClass('bg-indigo-600')
    expect(phoneBtn).not.toHaveClass('bg-indigo-600')

    // Switch back to phone
    fireEvent.click(phoneBtn)
    expect(phoneBtn).toHaveClass('bg-indigo-600')
    expect(emailBtn).not.toHaveClass('bg-indigo-600')
  })

  it('shows validation error for invalid contact', async () => {
    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-setup-btn'))

    // Enter invalid phone number
    const input = screen.getByTestId('safety-signal-help-safe-adult-input')
    fireEvent.change(input, { target: { value: '123' } })

    // Try to save
    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-save'))

    // Should show error
    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-error')).toBeInTheDocument()
    })
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('calls onSave with valid phone contact', async () => {
    mockOnSave.mockResolvedValue(undefined)

    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-setup-btn'))

    // Enter valid phone number
    const input = screen.getByTestId('safety-signal-help-safe-adult-input')
    fireEvent.change(input, { target: { value: '5551234567' } })

    // Save
    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-save'))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        type: 'phone',
        value: '5551234567',
      })
    })
  })

  it('calls onSave with valid email contact', async () => {
    mockOnSave.mockResolvedValue(undefined)

    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-setup-btn'))

    // Switch to email
    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-type-email'))

    // Enter valid email
    const input = screen.getByTestId('safety-signal-help-safe-adult-input')
    fireEvent.change(input, { target: { value: 'teacher@school.edu' } })

    // Save
    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-save'))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        type: 'email',
        value: 'teacher@school.edu',
      })
    })
  })

  it('shows saved contact with masked value', async () => {
    mockOnLoad.mockResolvedValue({
      type: 'phone' as const,
      maskedValue: '***-***-4567',
    })

    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Saved contact')).toBeInTheDocument()
    })
    expect(screen.getByText('***-***-4567')).toBeInTheDocument()
  })

  it('shows change and remove buttons for saved contact', async () => {
    mockOnLoad.mockResolvedValue({
      type: 'phone' as const,
      maskedValue: '***-***-4567',
    })

    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-change')).toBeInTheDocument()
    })
    expect(screen.getByTestId('safety-signal-help-safe-adult-remove')).toBeInTheDocument()
  })

  it('opens form when change button is clicked', async () => {
    mockOnLoad.mockResolvedValue({
      type: 'email' as const,
      maskedValue: 't***@school.edu',
    })

    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-change')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-change'))

    // Form should open with email type selected
    expect(screen.getByTestId('safety-signal-help-safe-adult-form')).toBeInTheDocument()
    expect(screen.getByTestId('safety-signal-help-safe-adult-type-email')).toHaveClass('bg-indigo-600')
  })

  it('calls onRemove when remove button is clicked', async () => {
    mockOnLoad.mockResolvedValue({
      type: 'phone' as const,
      maskedValue: '***-***-4567',
    })
    mockOnRemove.mockResolvedValue(undefined)

    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-remove')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-remove'))

    await waitFor(() => {
      expect(mockOnRemove).toHaveBeenCalled()
    })
  })

  it('closes form when cancel is clicked', async () => {
    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-setup-btn'))
    expect(screen.getByTestId('safety-signal-help-safe-adult-form')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-cancel'))

    expect(screen.queryByTestId('safety-signal-help-safe-adult-form')).not.toBeInTheDocument()
    expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
  })

  it('has 44px minimum touch targets for accessibility', async () => {
    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-setup-btn'))

    // Check style attributes
    const phoneBtn = screen.getByTestId('safety-signal-help-safe-adult-type-phone')
    const emailBtn = screen.getByTestId('safety-signal-help-safe-adult-type-email')
    const input = screen.getByTestId('safety-signal-help-safe-adult-input')
    const cancelBtn = screen.getByTestId('safety-signal-help-safe-adult-cancel')
    const saveBtn = screen.getByTestId('safety-signal-help-safe-adult-save')

    expect(phoneBtn).toHaveStyle({ minHeight: '44px' })
    expect(emailBtn).toHaveStyle({ minHeight: '44px' })
    expect(input).toHaveStyle({ minHeight: '44px' })
    expect(cancelBtn).toHaveStyle({ minHeight: '44px' })
    expect(saveBtn).toHaveStyle({ minHeight: '44px' })
  })

  it('clears error when input changes', async () => {
    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-setup-btn'))

    // Enter invalid phone number
    const input = screen.getByTestId('safety-signal-help-safe-adult-input')
    fireEvent.change(input, { target: { value: '123' } })

    // Try to save to get error
    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-save'))

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-error')).toBeInTheDocument()
    })

    // Change input
    fireEvent.change(input, { target: { value: '1234' } })

    // Error should be cleared
    expect(screen.queryByTestId('safety-signal-help-safe-adult-error')).not.toBeInTheDocument()
  })

  it('disables save button when input is empty', async () => {
    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-setup-btn'))

    const saveBtn = screen.getByTestId('safety-signal-help-safe-adult-save')
    expect(saveBtn).toBeDisabled()

    // Enter some text
    const input = screen.getByTestId('safety-signal-help-safe-adult-input')
    fireEvent.change(input, { target: { value: '555' } })

    expect(saveBtn).not.toBeDisabled()
  })

  it('handles save error gracefully', async () => {
    mockOnSave.mockRejectedValue(new Error('Network error'))

    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-setup-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-setup-btn'))

    // Enter valid phone
    const input = screen.getByTestId('safety-signal-help-safe-adult-input')
    fireEvent.change(input, { target: { value: '5551234567' } })

    // Try to save
    fireEvent.click(screen.getByTestId('safety-signal-help-safe-adult-save'))

    await waitFor(() => {
      expect(screen.getByTestId('safety-signal-help-safe-adult-error')).toBeInTheDocument()
    })
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
  })

  it('shows phone icon for saved phone contact', async () => {
    mockOnLoad.mockResolvedValue({
      type: 'phone' as const,
      maskedValue: '***-***-4567',
    })

    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('📞')).toBeInTheDocument()
    })
  })

  it('shows email icon for saved email contact', async () => {
    mockOnLoad.mockResolvedValue({
      type: 'email' as const,
      maskedValue: 't***@school.edu',
    })

    render(
      <SafetySignalHelp
        defaultExpanded={true}
        safeAdultCallbacks={defaultCallbacks}
        childId="child-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('✉️')).toBeInTheDocument()
    })
  })
})
