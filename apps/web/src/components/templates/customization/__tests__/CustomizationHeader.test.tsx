/**
 * CustomizationHeader Tests
 *
 * Story 4.5: Template Customization Preview - Task 1.2, Task 6
 * AC #7: Parent can revert to original template at any time
 *
 * Tests:
 * - Basic rendering
 * - Revert button behavior
 * - Confirmation dialog
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomizationHeader } from '../CustomizationHeader'

describe('CustomizationHeader', () => {
  const defaultProps = {
    templateName: 'Balanced Agreement (Ages 8-10)',
    changeCount: 0,
    onRevert: vi.fn(),
  }

  describe('basic rendering', () => {
    it('renders heading', () => {
      render(<CustomizationHeader {...defaultProps} />)
      expect(screen.getByText('Customize Template')).toBeInTheDocument()
    })

    it('renders template name', () => {
      render(<CustomizationHeader {...defaultProps} />)
      expect(screen.getByText('Balanced Agreement (Ages 8-10)')).toBeInTheDocument()
    })

    it('renders revert button', () => {
      render(<CustomizationHeader {...defaultProps} />)
      expect(screen.getByRole('button', { name: /revert/i })).toBeInTheDocument()
    })
  })

  describe('change count badge', () => {
    it('does not show badge when no changes', () => {
      render(<CustomizationHeader {...defaultProps} changeCount={0} />)
      expect(screen.queryByText(/change/)).not.toBeInTheDocument()
    })

    it('shows badge for 1 change', () => {
      render(<CustomizationHeader {...defaultProps} changeCount={1} />)
      expect(screen.getByText('1 change')).toBeInTheDocument()
    })

    it('shows badge for multiple changes with plural', () => {
      render(<CustomizationHeader {...defaultProps} changeCount={5} />)
      expect(screen.getByText('5 changes')).toBeInTheDocument()
    })
  })

  describe('last modified display', () => {
    it('shows last modified time', () => {
      const recentDate = new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 min ago
      render(<CustomizationHeader {...defaultProps} lastModified={recentDate} />)
      expect(screen.getByText(/5 min ago/)).toBeInTheDocument()
    })

    it('shows "Just now" for recent changes', () => {
      const justNow = new Date(Date.now() - 30 * 1000).toISOString() // 30 sec ago
      render(<CustomizationHeader {...defaultProps} lastModified={justNow} />)
      expect(screen.getByText(/just now/i)).toBeInTheDocument()
    })

    it('shows hours for older changes', () => {
      const hoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      render(<CustomizationHeader {...defaultProps} lastModified={hoursAgo} />)
      expect(screen.getByText(/2 hours ago/)).toBeInTheDocument()
    })
  })

  describe('revert button behavior', () => {
    it('revert button is disabled when no changes', () => {
      render(<CustomizationHeader {...defaultProps} changeCount={0} />)
      expect(screen.getByRole('button', { name: /revert/i })).toBeDisabled()
    })

    it('revert button is enabled when there are changes', () => {
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)
      expect(screen.getByRole('button', { name: /revert/i })).not.toBeDisabled()
    })

    it('shows confirmation dialog when clicked', async () => {
      const user = userEvent.setup()
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not show dialog when no changes', async () => {
      const user = userEvent.setup()
      render(<CustomizationHeader {...defaultProps} changeCount={0} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('confirmation dialog (AC #7)', () => {
    it('shows dialog title', async () => {
      const user = userEvent.setup()
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))

      expect(screen.getByText(/revert to original template/i)).toBeInTheDocument()
    })

    it('shows change count in dialog', async () => {
      const user = userEvent.setup()
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))

      // The dialog mentions the number of changes - check within dialog text
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveTextContent(/You have made.*3.*change/)
    })

    it('shows warning message', async () => {
      const user = userEvent.setup()
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))

      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
    })

    it('calls onRevert when confirmed', async () => {
      const user = userEvent.setup()
      const onRevert = vi.fn()
      render(<CustomizationHeader {...defaultProps} changeCount={3} onRevert={onRevert} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))
      await user.click(screen.getByRole('button', { name: /revert to original$/i }))

      expect(onRevert).toHaveBeenCalled()
    })

    it('closes dialog when confirmed', async () => {
      const user = userEvent.setup()
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))
      await user.click(screen.getByRole('button', { name: /revert to original$/i }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes dialog when cancelled', async () => {
      const user = userEvent.setup()
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))
      await user.click(screen.getByRole('button', { name: /keep changes/i }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not call onRevert when cancelled', async () => {
      const user = userEvent.setup()
      const onRevert = vi.fn()
      render(<CustomizationHeader {...defaultProps} changeCount={3} onRevert={onRevert} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))
      await user.click(screen.getByRole('button', { name: /keep changes/i }))

      expect(onRevert).not.toHaveBeenCalled()
    })
  })

  describe('close button', () => {
    it('renders close button when onClose provided', () => {
      render(<CustomizationHeader {...defaultProps} onClose={vi.fn()} />)
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })

    it('does not render close button when onClose not provided', () => {
      render(<CustomizationHeader {...defaultProps} />)
      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
    })

    it('calls onClose when clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<CustomizationHeader {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByRole('button', { name: /close/i }))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('revert button has accessible label with change count', () => {
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)
      expect(
        screen.getByRole('button', { name: /revert all 3 changes/i })
      ).toBeInTheDocument()
    })

    it('dialog has proper role', async () => {
      const user = userEvent.setup()
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('dialog has aria-modal', async () => {
      const user = userEvent.setup()
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('dialog has aria-labelledby', async () => {
      const user = userEvent.setup()
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)

      await user.click(screen.getByRole('button', { name: /revert/i }))

      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-labelledby',
        'revert-dialog-title'
      )
    })

    it('buttons meet minimum touch target (44px)', () => {
      render(<CustomizationHeader {...defaultProps} onClose={vi.fn()} />)
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton.className).toContain('min-h-[44px]')
    })
  })

  describe('visual styling', () => {
    it('revert button has danger styling when enabled', () => {
      render(<CustomizationHeader {...defaultProps} changeCount={3} />)
      const button = screen.getByRole('button', { name: /revert/i })
      expect(button.className).toContain('text-red')
    })

    it('revert button has disabled styling when no changes', () => {
      render(<CustomizationHeader {...defaultProps} changeCount={0} />)
      const button = screen.getByRole('button', { name: /revert/i })
      expect(button.className).toContain('text-gray-400')
    })
  })
})
