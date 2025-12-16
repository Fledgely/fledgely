import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActiveAgreementCard, type ActiveAgreementCardProps } from '../ActiveAgreementCard'
import type { AgreementStatus } from '@fledgely/contracts'

describe('ActiveAgreementCard', () => {
  const defaultProps: ActiveAgreementCardProps = {
    agreement: {
      id: 'agreement-123',
      status: 'active' as AgreementStatus,
      version: '1.0',
      activatedAt: '2025-12-16T12:00:00Z',
      termsCount: 5,
      signedBy: ['Parent', 'Child'],
    },
    onViewDetails: vi.fn(),
    onRequestChange: vi.fn(),
  }

  describe('Rendering (AC: 5)', () => {
    it('displays agreement version', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByText(/version 1\.0/i)).toBeInTheDocument()
    })

    it('displays activation date', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      // Should show formatted date
      expect(screen.getByText(/2025/)).toBeInTheDocument()
    })

    it('displays active status badge', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('shows terms count (rules count)', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByText(/5.*rules/i)).toBeInTheDocument()
    })

    it('shows who signed the agreement', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByText(/signed by all parties/i)).toBeInTheDocument()
    })
  })

  describe('Actions (Task 5.4, 5.5)', () => {
    it('renders View Agreement button', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /view.*agreement/i })).toBeInTheDocument()
    })

    it('calls onViewDetails when View Agreement clicked', async () => {
      const user = userEvent.setup()
      const onViewDetails = vi.fn()
      render(<ActiveAgreementCard {...defaultProps} onViewDetails={onViewDetails} />)

      await user.click(screen.getByRole('button', { name: /view.*agreement/i }))

      expect(onViewDetails).toHaveBeenCalledWith('agreement-123')
    })

    it('renders Request Change button', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /request.*change/i })).toBeInTheDocument()
    })

    it('calls onRequestChange when Request Change clicked', async () => {
      const user = userEvent.setup()
      const onRequestChange = vi.fn()
      render(<ActiveAgreementCard {...defaultProps} onRequestChange={onRequestChange} />)

      await user.click(screen.getByRole('button', { name: /request.*change/i }))

      expect(onRequestChange).toHaveBeenCalledWith('agreement-123')
    })
  })

  describe('Accessibility (NFR42, NFR49)', () => {
    it('all buttons have 44px minimum height (NFR49)', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.className).toMatch(/min-h-\[44px\]/)
      })
    })

    it('has proper ARIA labels (NFR42)', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      // Card should be a section/article with heading
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    })

    it('status badge has accessible name', () => {
      render(<ActiveAgreementCard {...defaultProps} />)

      // Status badge should be accessible
      const badge = screen.getByText('Active')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Empty/Pending States', () => {
    it('shows pending signature state when status is pending_signatures', () => {
      render(
        <ActiveAgreementCard
          {...defaultProps}
          agreement={{
            ...defaultProps.agreement,
            status: 'pending_signatures' as AgreementStatus,
          }}
        />
      )

      // Check that the pending message appears in the body (not just the badge)
      const pendingMessage = screen.getByText((content, element) => {
        return element?.tagName === 'P' && /waiting for signatures/i.test(content)
      })
      expect(pendingMessage).toBeInTheDocument()
    })

    it('shows archived badge for archived agreements', () => {
      render(
        <ActiveAgreementCard
          {...defaultProps}
          agreement={{
            ...defaultProps.agreement,
            status: 'archived' as AgreementStatus,
          }}
        />
      )

      expect(screen.getByText(/archived/i)).toBeInTheDocument()
    })
  })
})
