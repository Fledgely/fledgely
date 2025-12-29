/**
 * Tests for AgreementModeSelector component.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC1, AC6
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { AgreementModeSelector } from '../AgreementModeSelector'

describe('AgreementModeSelector', () => {
  const defaultProps = {
    selectedMode: null as 'agreement_only' | 'full_monitoring' | null,
    onModeSelect: vi.fn(),
    childName: 'Alex',
  }

  describe('rendering', () => {
    it('should render the selector container', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(screen.getByTestId('agreement-mode-selector')).toBeInTheDocument()
    })

    it('should display header with child name', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(screen.getByText('Choose How to Protect Alex')).toBeInTheDocument()
    })

    it('should render both mode cards', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(screen.getByTestId('mode-card-agreement_only')).toBeInTheDocument()
      expect(screen.getByTestId('mode-card-full_monitoring')).toBeInTheDocument()
    })

    it('should display agreement only mode title', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(screen.getByText('Agreement Only')).toBeInTheDocument()
    })

    it('should display full monitoring mode title', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(screen.getByText('Agreement + Monitoring')).toBeInTheDocument()
    })
  })

  describe('mode selection', () => {
    it('should call onModeSelect when agreement_only is clicked', () => {
      const onModeSelect = vi.fn()
      render(<AgreementModeSelector {...defaultProps} onModeSelect={onModeSelect} />)

      fireEvent.click(screen.getByTestId('mode-card-agreement_only'))

      expect(onModeSelect).toHaveBeenCalledWith('agreement_only')
    })

    it('should call onModeSelect when full_monitoring is clicked', () => {
      const onModeSelect = vi.fn()
      render(<AgreementModeSelector {...defaultProps} onModeSelect={onModeSelect} />)

      fireEvent.click(screen.getByTestId('mode-card-full_monitoring'))

      expect(onModeSelect).toHaveBeenCalledWith('full_monitoring')
    })

    it('should visually indicate selected mode', () => {
      render(<AgreementModeSelector {...defaultProps} selectedMode="agreement_only" />)

      const card = screen.getByTestId('mode-card-agreement_only')
      expect(card).toHaveAttribute('aria-pressed', 'true')
    })

    it('should not indicate unselected mode as pressed', () => {
      render(<AgreementModeSelector {...defaultProps} selectedMode="agreement_only" />)

      const card = screen.getByTestId('mode-card-full_monitoring')
      expect(card).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('feature lists', () => {
    it('should show included features for agreement_only', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      const card = screen.getByTestId('mode-card-agreement_only')
      expect(card).toHaveTextContent('Screen time limits')
      expect(card).toHaveTextContent('App and game rules')
      expect(card).toHaveTextContent('Family agreements')
    })

    it('should show excluded features for agreement_only', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      const card = screen.getByTestId('mode-card-agreement_only')
      expect(card).toHaveTextContent('Device screenshots')
      expect(card).toHaveTextContent('Activity tracking')
    })

    it('should show all features included for full_monitoring', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      const card = screen.getByTestId('mode-card-full_monitoring')
      expect(card).toHaveTextContent('Screen time limits')
      expect(card).toHaveTextContent('Device screenshots')
      expect(card).toHaveTextContent('Activity tracking')
    })
  })

  describe('child-friendly explanations (NFR65)', () => {
    it('should show default explanation when no mode selected', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(screen.getByText('What does this mean?')).toBeInTheDocument()
      expect(screen.getByText(/Choose an option above/)).toBeInTheDocument()
    })

    it('should show agreement_only explanation when selected', () => {
      render(<AgreementModeSelector {...defaultProps} selectedMode="agreement_only" />)

      expect(
        screen.getByText(/devices won't be watched, but you'll both promise to follow the rules/)
      ).toBeInTheDocument()
    })

    it('should show full_monitoring explanation when selected', () => {
      render(<AgreementModeSelector {...defaultProps} selectedMode="full_monitoring" />)

      expect(screen.getByText(/you'll be able to see what Alex does/)).toBeInTheDocument()
    })

    it('should use child name in explanations', () => {
      render(
        <AgreementModeSelector {...defaultProps} selectedMode="agreement_only" childName="Jordan" />
      )

      expect(screen.getByText(/Jordan's devices/)).toBeInTheDocument()
    })
  })

  describe('upgrade notice', () => {
    it('should show upgrade notice when agreement_only is selected', () => {
      render(<AgreementModeSelector {...defaultProps} selectedMode="agreement_only" />)

      expect(
        screen.getByText(/You can add device monitoring later if you decide you need it/)
      ).toBeInTheDocument()
    })

    it('should not show upgrade notice when full_monitoring is selected', () => {
      render(<AgreementModeSelector {...defaultProps} selectedMode="full_monitoring" />)

      expect(
        screen.queryByText(/You can add device monitoring later if you decide you need it/)
      ).not.toBeInTheDocument()
    })

    it('should not show upgrade notice when no mode selected', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(
        screen.queryByText(/You can add device monitoring later if you decide you need it/)
      ).not.toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('should disable mode cards when disabled prop is true', () => {
      render(<AgreementModeSelector {...defaultProps} disabled />)

      expect(screen.getByTestId('mode-card-agreement_only')).toBeDisabled()
      expect(screen.getByTestId('mode-card-full_monitoring')).toBeDisabled()
    })

    it('should not call onModeSelect when disabled', () => {
      const onModeSelect = vi.fn()
      render(<AgreementModeSelector {...defaultProps} onModeSelect={onModeSelect} disabled />)

      fireEvent.click(screen.getByTestId('mode-card-agreement_only'))

      expect(onModeSelect).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have radiogroup role', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('should have accessible label for radiogroup', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Select agreement mode')
    })

    it('should have buttons with minimum touch target size', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(screen.getByTestId('mode-card-agreement_only')).toHaveClass('min-h-[48px]')
      expect(screen.getByTestId('mode-card-full_monitoring')).toHaveClass('min-h-[48px]')
    })

    it('should have labeled feature lists', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(screen.getByRole('list', { name: 'Agreement Only features' })).toBeInTheDocument()
      expect(
        screen.getByRole('list', { name: 'Agreement + Monitoring features' })
      ).toBeInTheDocument()
    })
  })

  describe('icons', () => {
    it('should display document icon for agreement_only', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      const card = screen.getByTestId('mode-card-agreement_only')
      expect(card).toHaveTextContent('📝')
    })

    it('should display shield icon for full_monitoring', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      const card = screen.getByTestId('mode-card-full_monitoring')
      expect(card).toHaveTextContent('🛡️')
    })
  })

  describe('descriptions', () => {
    it('should show agreement_only description', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(
        screen.getByText(
          /Set screen time rules and family expectations together without device tracking/
        )
      ).toBeInTheDocument()
    })

    it('should show full_monitoring description', () => {
      render(<AgreementModeSelector {...defaultProps} />)

      expect(
        screen.getByText(/Full protection with device tracking, screenshots, and activity alerts/)
      ).toBeInTheDocument()
    })
  })
})
