/**
 * BypassAttemptCard Component Tests - Story 36.5 Task 2
 *
 * Tests for displaying a single bypass attempt.
 * AC1: Log bypass attempts with timestamp and context
 * AC2: Show bypass attempt impact on trust score
 * AC5: Parent can see bypass attempts with non-punitive framing
 * AC6: Distinguish between intentional bypass vs accidental
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BypassAttemptCard } from './BypassAttemptCard'
import { type BypassAttempt } from '@fledgely/shared'

const createBypassAttempt = (overrides: Partial<BypassAttempt> = {}): BypassAttempt => ({
  id: 'bypass-123',
  childId: 'child-123',
  deviceId: 'device-456',
  attemptType: 'extension-disable',
  context: 'Chrome extension was disabled from settings',
  occurredAt: new Date('2025-12-15T10:30:00Z'),
  expiresAt: new Date('2026-01-14T10:30:00Z'),
  impactOnScore: -10,
  wasIntentional: null,
  ...overrides,
})

describe('BypassAttemptCard - Story 36.5 Task 2', () => {
  describe('AC1: Display bypass attempt with timestamp and context', () => {
    it('should render the card container', () => {
      const attempt = createBypassAttempt()

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('bypass-attempt-card')).toBeInTheDocument()
    })

    it('should display bypass type', () => {
      const attempt = createBypassAttempt({ attemptType: 'vpn-detected' })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('attempt-type')).toHaveTextContent(/vpn/i)
    })

    it('should display context/description', () => {
      const attempt = createBypassAttempt({
        context: 'VPN connection detected while browsing',
      })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('attempt-context')).toHaveTextContent(
        'VPN connection detected while browsing'
      )
    })

    it('should display timestamp', () => {
      const attempt = createBypassAttempt({
        occurredAt: new Date('2025-12-15T10:30:00Z'),
      })

      render(<BypassAttemptCard attempt={attempt} />)

      const timestamp = screen.getByTestId('attempt-timestamp')
      expect(timestamp).toBeInTheDocument()
    })

    it('should display icon for attempt type', () => {
      const attempt = createBypassAttempt({ attemptType: 'extension-disable' })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('attempt-icon')).toBeInTheDocument()
    })
  })

  describe('AC2: Show impact on trust score', () => {
    it('should display impact value', () => {
      const attempt = createBypassAttempt({ impactOnScore: -15 })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('attempt-impact')).toHaveTextContent('-15')
    })

    it('should show negative impact styling', () => {
      const attempt = createBypassAttempt({ impactOnScore: -20 })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('bypass-attempt-card')).toHaveAttribute('data-impact', 'negative')
    })

    it('should show reduced impact when unintentional', () => {
      const attempt = createBypassAttempt({
        impactOnScore: -5,
        wasIntentional: false,
      })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('attempt-impact')).toHaveTextContent('-5')
      expect(screen.getByTestId('impact-reduced-badge')).toBeInTheDocument()
    })
  })

  describe('AC5: Non-punitive framing', () => {
    it('should use non-punitive language', () => {
      const attempt = createBypassAttempt()

      render(<BypassAttemptCard attempt={attempt} />)

      const card = screen.getByTestId('bypass-attempt-card')
      // Should not contain punitive language
      expect(card.textContent).not.toMatch(/caught|violated|broke|punish/i)
    })

    it('should frame as trust impact, not punishment', () => {
      const attempt = createBypassAttempt()

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('attempt-impact')).toHaveTextContent(/trust score/i)
    })

    it('should use neutral type labels', () => {
      const attempt = createBypassAttempt({ attemptType: 'vpn-detected' })

      render(<BypassAttemptCard attempt={attempt} />)

      const typeLabel = screen.getByTestId('attempt-type')
      expect(typeLabel.textContent).not.toMatch(/illegal|forbidden|banned/i)
    })
  })

  describe('AC6: Mark as accidental', () => {
    it('should show "This was accidental" button', () => {
      const attempt = createBypassAttempt({ wasIntentional: null })

      render(<BypassAttemptCard attempt={attempt} onMarkAccidental={vi.fn()} />)

      expect(screen.getByTestId('mark-accidental-button')).toBeInTheDocument()
    })

    it('should call onMarkAccidental when button clicked', () => {
      const onMarkAccidental = vi.fn()
      const attempt = createBypassAttempt({ wasIntentional: null })

      render(<BypassAttemptCard attempt={attempt} onMarkAccidental={onMarkAccidental} />)

      fireEvent.click(screen.getByTestId('mark-accidental-button'))

      expect(onMarkAccidental).toHaveBeenCalledWith(attempt.id)
    })

    it('should not show button when already marked as unintentional', () => {
      const attempt = createBypassAttempt({ wasIntentional: false })

      render(<BypassAttemptCard attempt={attempt} onMarkAccidental={vi.fn()} />)

      expect(screen.queryByTestId('mark-accidental-button')).not.toBeInTheDocument()
    })

    it('should show "Marked as accidental" badge when unintentional', () => {
      const attempt = createBypassAttempt({ wasIntentional: false })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('accidental-badge')).toBeInTheDocument()
    })

    it('should not show mark button when no callback provided', () => {
      const attempt = createBypassAttempt({ wasIntentional: null })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.queryByTestId('mark-accidental-button')).not.toBeInTheDocument()
    })
  })

  describe('Attempt type icons and labels', () => {
    it.each([
      ['extension-disable', 'Extension Disabled'],
      ['settings-change', 'Settings Changed'],
      ['vpn-detected', 'VPN Detected'],
      ['proxy-detected', 'Proxy Detected'],
      ['other', 'Other'],
    ])('should display correct label for %s', (attemptType, expectedLabel) => {
      const attempt = createBypassAttempt({
        attemptType: attemptType as BypassAttempt['attemptType'],
      })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('attempt-type')).toHaveTextContent(expectedLabel)
    })
  })

  describe('Expiry status', () => {
    it('should show active status when not expired', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)

      const attempt = createBypassAttempt({ expiresAt: futureDate })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('bypass-attempt-card')).toHaveAttribute('data-status', 'active')
    })

    it('should show expired status when past expiry', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)

      const attempt = createBypassAttempt({ expiresAt: pastDate })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('bypass-attempt-card')).toHaveAttribute('data-status', 'expired')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible aria label', () => {
      const attempt = createBypassAttempt()

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('bypass-attempt-card')).toHaveAttribute('aria-label')
    })

    it('should have keyboard accessible button', () => {
      const attempt = createBypassAttempt({ wasIntentional: null })

      render(<BypassAttemptCard attempt={attempt} onMarkAccidental={vi.fn()} />)

      const button = screen.getByTestId('mark-accidental-button')
      expect(button).toHaveAttribute('type', 'button')
    })
  })
})
