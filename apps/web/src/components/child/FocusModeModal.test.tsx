/**
 * FocusModeModal Component Tests - Story 33.1
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FocusModeModal } from './FocusModeModal'

describe('FocusModeModal - Story 33.1', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectDuration: vi.fn(),
    loading: false,
  }

  it('renders modal when open', () => {
    render(<FocusModeModal {...defaultProps} />)

    expect(screen.getByTestId('focus-mode-modal')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<FocusModeModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByTestId('focus-mode-modal')).not.toBeInTheDocument()
  })

  it('shows all duration options', () => {
    render(<FocusModeModal {...defaultProps} />)

    expect(screen.getByTestId('duration-pomodoro')).toBeInTheDocument()
    expect(screen.getByTestId('duration-oneHour')).toBeInTheDocument()
    expect(screen.getByTestId('duration-twoHours')).toBeInTheDocument()
    expect(screen.getByTestId('duration-untilOff')).toBeInTheDocument()
  })

  it('calls onSelectDuration with pomodoro when clicked', () => {
    const onSelectDuration = vi.fn()
    render(<FocusModeModal {...defaultProps} onSelectDuration={onSelectDuration} />)

    fireEvent.click(screen.getByTestId('duration-pomodoro'))
    expect(onSelectDuration).toHaveBeenCalledWith('pomodoro')
  })

  it('calls onSelectDuration with oneHour when clicked', () => {
    const onSelectDuration = vi.fn()
    render(<FocusModeModal {...defaultProps} onSelectDuration={onSelectDuration} />)

    fireEvent.click(screen.getByTestId('duration-oneHour'))
    expect(onSelectDuration).toHaveBeenCalledWith('oneHour')
  })

  it('calls onSelectDuration with twoHours when clicked', () => {
    const onSelectDuration = vi.fn()
    render(<FocusModeModal {...defaultProps} onSelectDuration={onSelectDuration} />)

    fireEvent.click(screen.getByTestId('duration-twoHours'))
    expect(onSelectDuration).toHaveBeenCalledWith('twoHours')
  })

  it('calls onSelectDuration with untilOff when clicked', () => {
    const onSelectDuration = vi.fn()
    render(<FocusModeModal {...defaultProps} onSelectDuration={onSelectDuration} />)

    fireEvent.click(screen.getByTestId('duration-untilOff'))
    expect(onSelectDuration).toHaveBeenCalledWith('untilOff')
  })

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn()
    render(<FocusModeModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('focus-mode-cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn()
    render(<FocusModeModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('focus-mode-modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables buttons when loading', () => {
    render(<FocusModeModal {...defaultProps} loading={true} />)

    expect(screen.getByTestId('duration-pomodoro')).toBeDisabled()
    expect(screen.getByTestId('duration-oneHour')).toBeDisabled()
    expect(screen.getByTestId('duration-twoHours')).toBeDisabled()
    expect(screen.getByTestId('duration-untilOff')).toBeDisabled()
  })

  it('displays child-friendly prompt', () => {
    render(<FocusModeModal {...defaultProps} />)

    expect(screen.getByText(/Ready to focus/i)).toBeInTheDocument()
  })

  it('displays duration emojis', () => {
    render(<FocusModeModal {...defaultProps} />)

    expect(screen.getByText('🍅')).toBeInTheDocument() // pomodoro
    expect(screen.getByText('⏰')).toBeInTheDocument() // oneHour
    expect(screen.getByText('📚')).toBeInTheDocument() // twoHours
    // 🎯 appears in both header and untilOff button, so use getAllByText
    expect(screen.getAllByText('🎯').length).toBeGreaterThan(0) // untilOff
  })
})
