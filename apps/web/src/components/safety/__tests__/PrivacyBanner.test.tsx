/**
 * Privacy Banner Tests
 *
 * Story 7.3: Child Allowlist Visibility - Task 1.3
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrivacyBanner } from '../PrivacyBanner'

describe('PrivacyBanner', () => {
  describe('Content Display (AC: 6)', () => {
    it('displays the headline "These Sites Are Always Private"', () => {
      render(<PrivacyBanner />)

      expect(
        screen.getByRole('heading', { name: /these sites are always private/i })
      ).toBeInTheDocument()
    })

    it('displays the privacy promise message', () => {
      render(<PrivacyBanner />)

      expect(
        screen.getByText(/when you visit any of these websites/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/your parents will never see it/i)
      ).toBeInTheDocument()
    })

    it('displays the emphasis message about parents never seeing visits', () => {
      render(<PrivacyBanner />)

      expect(
        screen.getByText(/your parents can never see visits to these sites/i)
      ).toBeInTheDocument()
    })
  })

  describe('Reading Level (AC: 4)', () => {
    it('uses simple, short sentences appropriate for children', () => {
      render(<PrivacyBanner />)

      // Check for presence of simple language
      const bodyText = screen.getByText(/when you visit any of these websites/i)
      expect(bodyText).toBeInTheDocument()

      // The message should be clear and direct
      expect(bodyText.textContent).toContain('promise')
      expect(bodyText.textContent).toContain('help')
    })
  })

  describe('Accessibility', () => {
    it('has role="banner"', () => {
      render(<PrivacyBanner />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('has accessible headline with proper id', () => {
      render(<PrivacyBanner />)

      const headline = screen.getByRole('heading', { level: 1 })
      expect(headline).toHaveAttribute('id', 'privacy-headline')
    })

    it('banner is labeled by headline', () => {
      render(<PrivacyBanner />)

      const banner = screen.getByRole('banner')
      expect(banner).toHaveAttribute('aria-labelledby', 'privacy-headline')
    })
  })

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<PrivacyBanner className="custom-class" />)

      const banner = screen.getByRole('banner')
      expect(banner).toHaveClass('custom-class')
    })

    it('has green theme for reassurance', () => {
      render(<PrivacyBanner />)

      const banner = screen.getByRole('banner')
      expect(banner).toHaveClass('bg-green-50')
      expect(banner).toHaveClass('border-green-200')
    })
  })
})
