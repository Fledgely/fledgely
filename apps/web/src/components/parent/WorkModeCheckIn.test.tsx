/**
 * WorkModeCheckIn Tests - Story 33.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WorkModeCheckIn } from './WorkModeCheckIn'

// Mock the service
vi.mock('../../services/workModeService', () => ({
  sendParentCheckIn: vi.fn().mockResolvedValue('check-in-id'),
}))

import { sendParentCheckIn } from '../../services/workModeService'

describe('WorkModeCheckIn - Story 33.6', () => {
  const defaultProps = {
    familyId: 'family-1',
    childId: 'child-1',
    childName: 'Jake',
    parentId: 'parent-1',
    parentName: 'Mom',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with child name', () => {
    render(<WorkModeCheckIn {...defaultProps} />)

    expect(screen.getByText(/Check in with Jake/)).toBeInTheDocument()
  })

  it('displays friendly template options', () => {
    render(<WorkModeCheckIn {...defaultProps} />)

    expect(screen.getByTestId('template-0')).toBeInTheDocument()
    expect(screen.getByTestId('template-1')).toBeInTheDocument()
    expect(screen.getByTestId('template-2')).toBeInTheDocument()
  })

  it('allows selecting a template', async () => {
    render(<WorkModeCheckIn {...defaultProps} />)

    const template = screen.getByTestId('template-0')
    fireEvent.click(template)

    expect(template).toHaveClass('bg-blue-100')
  })

  it('allows entering custom message', async () => {
    render(<WorkModeCheckIn {...defaultProps} />)

    const input = screen.getByTestId('custom-message-input')
    fireEvent.change(input, { target: { value: 'Great job today!' } })

    expect(input).toHaveValue('Great job today!')
  })

  it('clears template selection when typing custom message', async () => {
    render(<WorkModeCheckIn {...defaultProps} />)

    // Select a template first
    const template = screen.getByTestId('template-0')
    fireEvent.click(template)
    expect(template).toHaveClass('bg-blue-100')

    // Type custom message
    const input = screen.getByTestId('custom-message-input')
    fireEvent.change(input, { target: { value: 'Hello' } })

    // Template should be deselected
    expect(template).not.toHaveClass('bg-blue-100')
  })

  it('sends check-in with template message', async () => {
    const onSent = vi.fn()
    render(<WorkModeCheckIn {...defaultProps} onSent={onSent} />)

    // Select template
    fireEvent.click(screen.getByTestId('template-0'))

    // Send
    fireEvent.click(screen.getByTestId('send-button'))

    await waitFor(() => {
      expect(sendParentCheckIn).toHaveBeenCalledWith(
        'family-1',
        'child-1',
        'parent-1',
        'Mom',
        expect.any(String)
      )
    })

    expect(onSent).toHaveBeenCalled()
  })

  it('sends check-in with custom message', async () => {
    const onSent = vi.fn()
    render(<WorkModeCheckIn {...defaultProps} onSent={onSent} />)

    // Type custom message
    fireEvent.change(screen.getByTestId('custom-message-input'), {
      target: { value: 'Keep up the good work!' },
    })

    // Send
    fireEvent.click(screen.getByTestId('send-button'))

    await waitFor(() => {
      expect(sendParentCheckIn).toHaveBeenCalledWith(
        'family-1',
        'child-1',
        'parent-1',
        'Mom',
        'Keep up the good work!'
      )
    })

    expect(onSent).toHaveBeenCalled()
  })

  it('disables send button when no message selected', () => {
    render(<WorkModeCheckIn {...defaultProps} />)

    // Send button should be disabled without a message
    expect(screen.getByTestId('send-button')).toBeDisabled()
  })

  it('disables send button while sending', async () => {
    // Make the service slow
    vi.mocked(sendParentCheckIn).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('id'), 100))
    )

    render(<WorkModeCheckIn {...defaultProps} />)

    fireEvent.click(screen.getByTestId('template-0'))
    fireEvent.click(screen.getByTestId('send-button'))

    expect(screen.getByTestId('send-button')).toBeDisabled()
    expect(screen.getByTestId('send-button')).toHaveTextContent('Sending...')
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn()
    render(<WorkModeCheckIn {...defaultProps} onCancel={onCancel} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(onCancel).toHaveBeenCalled()
  })

  it('shows character count for custom message', async () => {
    render(<WorkModeCheckIn {...defaultProps} />)

    expect(screen.getByText('0/500 characters')).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('custom-message-input'), {
      target: { value: 'Hello' },
    })

    expect(screen.getByText('5/500 characters')).toBeInTheDocument()
  })

  it('has trust-based framing in description', () => {
    render(<WorkModeCheckIn {...defaultProps} />)

    expect(screen.getByText(/Send a friendly message about work/)).toBeInTheDocument()
    expect(screen.getByText(/can respond but isn't required to/)).toBeInTheDocument()
  })
})
