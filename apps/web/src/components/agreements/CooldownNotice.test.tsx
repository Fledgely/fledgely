/**
 * CooldownNotice Tests - Story 34.5
 *
 * Tests for 7-day cooldown display component.
 * AC4: 7-day cooldown for same change
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CooldownNotice } from './CooldownNotice'

describe('CooldownNotice - Story 34.5', () => {
  const defaultProps = {
    daysRemaining: 5,
    cooldownEndDate: new Date('2026-01-10'),
    declinedProposalId: 'proposal-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render when on cooldown', () => {
      render(<CooldownNotice {...defaultProps} />)

      expect(screen.getByText(/Cooldown Period Active/i)).toBeInTheDocument()
    })

    it('should show days remaining', () => {
      render(<CooldownNotice {...defaultProps} daysRemaining={5} />)

      expect(screen.getByText(/5/)).toBeInTheDocument()
      expect(screen.getByText(/days/i)).toBeInTheDocument()
    })

    it('should show singular "day" for 1 day remaining', () => {
      render(<CooldownNotice {...defaultProps} daysRemaining={1} />)

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText(/\bday\b remaining/i)).toBeInTheDocument()
    })

    it('should show cooldown end date', () => {
      render(<CooldownNotice {...defaultProps} />)

      expect(screen.getByText(/Jan 10/i)).toBeInTheDocument()
    })
  })

  describe('tone and messaging', () => {
    it('should use positive tone', () => {
      const { container } = render(<CooldownNotice {...defaultProps} />)

      const text = container.textContent?.toLowerCase() || ''
      expect(text).not.toContain('blocked')
      expect(text).not.toContain('prohibited')
      expect(text).not.toContain('cannot')
    })

    it('should indicate this is temporary', () => {
      render(<CooldownNotice {...defaultProps} />)

      // Should have messaging about being able to try again
      expect(screen.getAllByText(/propose again/i).length).toBeGreaterThan(0)
    })

    it('should explain why there is a cooldown', () => {
      render(<CooldownNotice {...defaultProps} />)

      expect(screen.getByText(/similar change was declined/i)).toBeInTheDocument()
    })
  })

  describe('visual styling', () => {
    it('should have a visible container', () => {
      render(<CooldownNotice {...defaultProps} />)

      const notice = screen.getByRole('alert')
      expect(notice).toBeInTheDocument()
    })

    it('should use informative color scheme (not error)', () => {
      render(<CooldownNotice {...defaultProps} />)

      const notice = screen.getByRole('alert')
      // Should use amber/yellow (info) not red (error)
      expect(notice.className).toMatch(/amber|yellow|orange/i)
    })
  })

  describe('accessibility', () => {
    it('should have alert role for screen readers', () => {
      render(<CooldownNotice {...defaultProps} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  describe('compact mode', () => {
    it('should render in compact mode when specified', () => {
      render(<CooldownNotice {...defaultProps} compact />)

      // Should still show essential info
      expect(screen.getByText(/5/)).toBeInTheDocument()
    })

    it('should have smaller styling in compact mode', () => {
      render(<CooldownNotice {...defaultProps} compact />)

      const notice = screen.getByRole('alert')
      expect(notice.className).toMatch(/p-2|p-3/)
    })
  })
})
