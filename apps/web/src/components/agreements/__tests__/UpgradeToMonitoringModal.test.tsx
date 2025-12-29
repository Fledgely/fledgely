/**
 * Tests for UpgradeToMonitoringModal component.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC5
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { UpgradeToMonitoringModal } from '../UpgradeToMonitoringModal'

describe('UpgradeToMonitoringModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    childName: 'Alex',
    existingTermsCount: 5,
  }

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByTestId('upgrade-to-monitoring-modal')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId('upgrade-to-monitoring-modal')).not.toBeInTheDocument()
    })

    it('should display modal title', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByText('Add Device Monitoring')).toBeInTheDocument()
    })
  })

  describe('what will change section', () => {
    it('should show existing terms will be preserved', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByText(/5 existing agreement terms will stay the same/)).toBeInTheDocument()
    })

    it('should show monitoring rules will be available', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByText('You can add device monitoring rules')).toBeInTheDocument()
    })

    it('should show device activity visibility', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      // Text appears in both the changes list and checkbox, so use getAllByText
      const matches = screen.getAllByText(/see Alex's device activity/)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('should show device enrollment will be available', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByText('Device enrollment will become available')).toBeInTheDocument()
    })

    it('should use correct terms count', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} existingTermsCount={12} />)

      expect(screen.getByText(/12 existing agreement terms will stay the same/)).toBeInTheDocument()
    })
  })

  describe('child explanation (NFR65)', () => {
    it('should show talk to child first message', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByText('Talk to Alex first')).toBeInTheDocument()
    })

    it('should explain importance of discussion', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(
        screen.getByText(/Before you add monitoring, we suggest talking with Alex about why/)
      ).toBeInTheDocument()
    })

    it('should use child name in explanation', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} childName="Jordan" />)

      expect(screen.getByText('Talk to Jordan first')).toBeInTheDocument()
      expect(screen.getByText(/talking with Jordan about why/)).toBeInTheDocument()
    })
  })

  describe('confirmation checkbox', () => {
    it('should render confirmation checkbox', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByTestId('upgrade-confirm-checkbox')).toBeInTheDocument()
    })

    it('should be unchecked initially', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByTestId('upgrade-confirm-checkbox')).not.toBeChecked()
    })

    it('should toggle when clicked', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      const checkbox = screen.getByTestId('upgrade-confirm-checkbox')
      fireEvent.click(checkbox)

      expect(checkbox).toBeChecked()
    })

    it('should include child name in checkbox label', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(
        screen.getByText(
          /I understand that adding monitoring will let me see Alex's device activity/
        )
      ).toBeInTheDocument()
    })
  })

  describe('buttons', () => {
    it('should render cancel button', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByTestId('upgrade-cancel-button')).toBeInTheDocument()
    })

    it('should render confirm button', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByTestId('upgrade-confirm-button')).toBeInTheDocument()
    })

    it('should call onClose when cancel is clicked', () => {
      const onClose = vi.fn()
      render(<UpgradeToMonitoringModal {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('upgrade-cancel-button'))

      expect(onClose).toHaveBeenCalled()
    })

    it('should disable confirm button when checkbox unchecked', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByTestId('upgrade-confirm-button')).toBeDisabled()
    })

    it('should enable confirm button when checkbox checked', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('upgrade-confirm-checkbox'))

      expect(screen.getByTestId('upgrade-confirm-button')).not.toBeDisabled()
    })

    it('should call onConfirm when confirm is clicked and checkbox is checked', () => {
      const onConfirm = vi.fn()
      render(<UpgradeToMonitoringModal {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByTestId('upgrade-confirm-checkbox'))
      fireEvent.click(screen.getByTestId('upgrade-confirm-button'))

      expect(onConfirm).toHaveBeenCalled()
    })

    it('should not call onConfirm when checkbox unchecked', () => {
      const onConfirm = vi.fn()
      render(<UpgradeToMonitoringModal {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByTestId('upgrade-confirm-button'))

      expect(onConfirm).not.toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('should show loading text when isLoading is true', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} isLoading />)

      expect(screen.getByText('Adding...')).toBeInTheDocument()
    })

    it('should disable buttons when loading', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} isLoading />)

      expect(screen.getByTestId('upgrade-cancel-button')).toBeDisabled()
      expect(screen.getByTestId('upgrade-confirm-button')).toBeDisabled()
    })

    it('should not call onConfirm when loading', () => {
      const onConfirm = vi.fn()
      render(<UpgradeToMonitoringModal {...defaultProps} onConfirm={onConfirm} isLoading />)

      fireEvent.click(screen.getByTestId('upgrade-confirm-checkbox'))
      fireEvent.click(screen.getByTestId('upgrade-confirm-button'))

      expect(onConfirm).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have dialog role', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-modal attribute', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('should have labeled dialog', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'upgrade-modal-title')
    })

    it('should have minimum touch target size for buttons', () => {
      render(<UpgradeToMonitoringModal {...defaultProps} />)

      expect(screen.getByTestId('upgrade-cancel-button')).toHaveClass('min-h-[44px]')
      expect(screen.getByTestId('upgrade-confirm-button')).toHaveClass('min-h-[44px]')
    })
  })
})
