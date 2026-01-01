/**
 * FocusModeButton Component Tests - Story 33.1
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FocusModeButton } from './FocusModeButton'

describe('FocusModeButton - Story 33.1', () => {
  it('renders focus mode button', () => {
    render(<FocusModeButton onClick={() => {}} />)

    expect(screen.getByTestId('focus-mode-button')).toBeInTheDocument()
    expect(screen.getByText('Focus Mode')).toBeInTheDocument()
  })

  it('shows tap to start message when inactive', () => {
    render(<FocusModeButton onClick={() => {}} isActive={false} />)

    expect(screen.getByText('Tap to start focusing')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<FocusModeButton onClick={handleClick} />)

    fireEvent.click(screen.getByTestId('focus-mode-button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn()
    render(<FocusModeButton onClick={handleClick} disabled />)

    fireEvent.click(screen.getByTestId('focus-mode-button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('shows active state when isActive', () => {
    render(<FocusModeButton onClick={() => {}} isActive />)

    expect(screen.getByText(/Focus mode active/i)).toBeInTheDocument()
    expect(screen.getByText('In progress...')).toBeInTheDocument()
  })

  it('does not call onClick when active', () => {
    const handleClick = vi.fn()
    render(<FocusModeButton onClick={handleClick} isActive />)

    fireEvent.click(screen.getByTestId('focus-mode-button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('displays target emoji when inactive', () => {
    render(<FocusModeButton onClick={() => {}} isActive={false} />)

    expect(screen.getByText('🎯')).toBeInTheDocument()
  })

  it('displays checkmark emoji when active', () => {
    render(<FocusModeButton onClick={() => {}} isActive />)

    expect(screen.getByText('✅')).toBeInTheDocument()
  })
})
