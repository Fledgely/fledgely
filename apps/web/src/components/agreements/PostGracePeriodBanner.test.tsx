/**
 * PostGracePeriodBanner Component Tests - Story 35.5
 *
 * Tests for post-grace period notification banner.
 * AC4: Both parties notified: "Monitoring paused - renew to resume"
 * AC5: Can renew at any time
 * AC6: No punitive device restrictions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PostGracePeriodBanner } from './PostGracePeriodBanner'

describe('PostGracePeriodBanner - Story 35.5', () => {
  const defaultProps = {
    userRole: 'parent' as const,
    onRenew: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render banner', () => {
      render(<PostGracePeriodBanner {...defaultProps} />)

      expect(screen.getByTestId('post-grace-banner')).toBeInTheDocument()
    })

    it('should display paused message (AC4)', () => {
      render(<PostGracePeriodBanner {...defaultProps} />)

      // Multiple elements contain "paused" - check heading is present
      expect(screen.getByRole('heading', { name: /paused/i })).toBeInTheDocument()
    })
  })

  describe('parent view (AC4, AC5)', () => {
    it('should show renew button for parent', () => {
      render(<PostGracePeriodBanner {...defaultProps} userRole="parent" />)

      expect(screen.getByRole('button', { name: /renew/i })).toBeInTheDocument()
    })

    it('should call onRenew when button clicked', () => {
      render(<PostGracePeriodBanner {...defaultProps} userRole="parent" />)

      fireEvent.click(screen.getByRole('button', { name: /renew/i }))

      expect(defaultProps.onRenew).toHaveBeenCalledTimes(1)
    })

    it('should mention data is safe (AC2 related)', () => {
      render(<PostGracePeriodBanner {...defaultProps} userRole="parent" />)

      // Check that at least one element mentions data is safe
      const elements = screen.getAllByText(/safe/i)
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  describe('child view (AC4, AC6)', () => {
    it('should show child-friendly message', () => {
      render(<PostGracePeriodBanner {...defaultProps} userRole="child" />)

      expect(screen.getByText(/expired/i)).toBeInTheDocument()
    })

    it('should not show renew button for child', () => {
      render(<PostGracePeriodBanner {...defaultProps} userRole="child" />)

      expect(screen.queryByRole('button', { name: /renew/i })).not.toBeInTheDocument()
    })

    it('should reassure device works normally (AC6)', () => {
      render(<PostGracePeriodBanner {...defaultProps} userRole="child" />)

      expect(screen.getByText(/normally/i)).toBeInTheDocument()
    })
  })

  describe('non-punitive messaging (AC6)', () => {
    it('should not use alarming language for parent', () => {
      render(<PostGracePeriodBanner {...defaultProps} userRole="parent" />)

      const banner = screen.getByTestId('post-grace-banner')
      const text = banner.textContent?.toLowerCase() || ''

      expect(text).not.toContain('blocked')
      expect(text).not.toContain('locked')
      expect(text).not.toContain('deleted')
    })

    it('should not use alarming language for child', () => {
      render(<PostGracePeriodBanner {...defaultProps} userRole="child" />)

      const banner = screen.getByTestId('post-grace-banner')
      const text = banner.textContent?.toLowerCase() || ''

      expect(text).not.toContain('blocked')
      expect(text).not.toContain('locked')
      expect(text).not.toContain('trouble')
    })
  })

  describe('accessibility', () => {
    it('should have appropriate role', () => {
      render(<PostGracePeriodBanner {...defaultProps} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should have accessible renew button', () => {
      render(<PostGracePeriodBanner {...defaultProps} userRole="parent" />)

      const button = screen.getByRole('button', { name: /renew/i })
      expect(button).toHaveAttribute('type', 'button')
    })
  })
})
