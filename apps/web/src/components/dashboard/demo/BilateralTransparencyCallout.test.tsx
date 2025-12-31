/**
 * Tests for BilateralTransparencyCallout Component
 *
 * Story 8.5.6: Demo for Child Explanation
 * AC2: Demo highlights bilateral transparency ("You'll see this too!")
 * AC5: Language is at 6th-grade reading level
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BilateralTransparencyCallout } from './BilateralTransparencyCallout'

describe('BilateralTransparencyCallout', () => {
  describe('basic rendering', () => {
    it('should render the callout', () => {
      render(<BilateralTransparencyCallout />)
      const callout = screen.getByTestId('bilateral-transparency-callout')
      expect(callout).toBeInTheDocument()
    })

    it('should display eye emoji icon (AC2)', () => {
      render(<BilateralTransparencyCallout />)
      const icon = screen.getByTestId('callout-icon')
      expect(icon).toHaveTextContent('👀')
    })

    it('should display "You See This Too!" title (AC2)', () => {
      render(<BilateralTransparencyCallout />)
      const title = screen.getByTestId('callout-title')
      expect(title).toHaveTextContent('You See This Too!')
    })

    it('should display child-friendly message about bilateral transparency (AC2)', () => {
      render(<BilateralTransparencyCallout />)
      const message = screen.getByTestId('callout-message')
      expect(message).toHaveTextContent('both see the same pictures')
      expect(message).toHaveTextContent('fair for everyone')
    })
  })

  describe('styling', () => {
    it('should have green success-style background', () => {
      render(<BilateralTransparencyCallout />)
      const callout = screen.getByTestId('bilateral-transparency-callout')
      expect(callout).toHaveStyle({ backgroundColor: '#ecfdf5' })
    })

    it('should have green border', () => {
      render(<BilateralTransparencyCallout />)
      const callout = screen.getByTestId('bilateral-transparency-callout')
      expect(callout).toHaveStyle({ border: '1px solid #86efac' })
    })

    it('should have green title text', () => {
      render(<BilateralTransparencyCallout />)
      const title = screen.getByTestId('callout-title')
      expect(title).toHaveStyle({ color: '#166534' })
    })
  })

  describe('compact mode', () => {
    it('should render in compact mode when compact=true', () => {
      render(<BilateralTransparencyCallout compact />)
      const callout = screen.getByTestId('bilateral-transparency-callout')
      expect(callout).toHaveStyle({ borderRadius: '6px' })
    })

    it('should have smaller padding in compact mode', () => {
      render(<BilateralTransparencyCallout compact />)
      const callout = screen.getByTestId('bilateral-transparency-callout')
      expect(callout).toHaveStyle({ padding: '10px 12px' })
    })

    it('should have smaller icon in compact mode', () => {
      render(<BilateralTransparencyCallout compact />)
      const icon = screen.getByTestId('callout-icon')
      expect(icon).toHaveStyle({ fontSize: '18px' })
    })
  })

  describe('6th-grade reading level (AC5)', () => {
    it('should use simple language in message', () => {
      render(<BilateralTransparencyCallout />)
      const message = screen.getByTestId('callout-message')
      const text = message.textContent || ''

      // Check for simple words (no complex jargon)
      expect(text).not.toContain('bilateral')
      expect(text).not.toContain('transparency')
      expect(text).not.toContain('monitoring')

      // Check for direct "you" address
      expect(text.toLowerCase()).toContain('you')
    })

    it('should use short sentences', () => {
      render(<BilateralTransparencyCallout />)
      const message = screen.getByTestId('callout-message')
      const text = message.textContent || ''

      // Split into sentences and check length
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)

      sentences.forEach((sentence) => {
        const wordCount = sentence.trim().split(/\s+/).length
        // Each sentence should be 15 words or less
        expect(wordCount).toBeLessThanOrEqual(15)
      })
    })
  })

  describe('accessibility', () => {
    it('should have icon marked as aria-hidden', () => {
      render(<BilateralTransparencyCallout />)
      const icon = screen.getByTestId('callout-icon')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
