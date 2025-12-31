/**
 * Tests for CrisisResourcesPreview Component
 *
 * Story 8.5.6: Demo for Child Explanation
 * AC3: Demo shows what crisis resources look like (protected)
 * AC5: Language is at 6th-grade reading level
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CrisisResourcesPreview } from './CrisisResourcesPreview'

describe('CrisisResourcesPreview', () => {
  describe('basic rendering', () => {
    it('should render the preview', () => {
      render(<CrisisResourcesPreview />)
      const preview = screen.getByTestId('crisis-resources-preview')
      expect(preview).toBeInTheDocument()
    })

    it('should display shield emoji icon (AC3)', () => {
      render(<CrisisResourcesPreview />)
      const icon = screen.getByTestId('callout-icon')
      expect(icon).toHaveTextContent('🛡️')
    })

    it('should display "Help Sites Stay Private" title (AC3)', () => {
      render(<CrisisResourcesPreview />)
      const title = screen.getByTestId('callout-title')
      expect(title).toHaveTextContent('Help Sites Stay Private')
    })

    it('should display reassuring message about privacy (AC3)', () => {
      render(<CrisisResourcesPreview />)
      const message = screen.getByTestId('callout-message')
      expect(message).toHaveTextContent('no pictures are taken')
      expect(message).toHaveTextContent('always private')
    })
  })

  describe('protected sites list (AC3)', () => {
    it('should show protected sites container', () => {
      render(<CrisisResourcesPreview />)
      const container = screen.getByTestId('protected-sites-container')
      expect(container).toBeInTheDocument()
    })

    it('should display sample protected sites', () => {
      render(<CrisisResourcesPreview />)
      const sites = screen.getAllByTestId('protected-site')
      expect(sites.length).toBeGreaterThan(0)
    })

    it('should show Crisis Text Line as a protected site', () => {
      render(<CrisisResourcesPreview />)
      const sites = screen.getAllByTestId('protected-site')
      const siteTexts = sites.map((site) => site.textContent)
      expect(siteTexts.some((text) => text?.includes('Crisis Text Line'))).toBe(true)
    })

    it('should show lock emoji for each protected site', () => {
      render(<CrisisResourcesPreview />)
      const sites = screen.getAllByTestId('protected-site')
      sites.forEach((site) => {
        expect(site.textContent).toContain('🔒')
      })
    })
  })

  describe('styling', () => {
    it('should have amber warning-style background', () => {
      render(<CrisisResourcesPreview />)
      const preview = screen.getByTestId('crisis-resources-preview')
      expect(preview).toHaveStyle({ backgroundColor: '#fef3c7' })
    })

    it('should have amber border', () => {
      render(<CrisisResourcesPreview />)
      const preview = screen.getByTestId('crisis-resources-preview')
      expect(preview).toHaveStyle({ border: '1px solid #fcd34d' })
    })

    it('should have amber title text', () => {
      render(<CrisisResourcesPreview />)
      const title = screen.getByTestId('callout-title')
      expect(title).toHaveStyle({ color: '#92400e' })
    })
  })

  describe('compact mode', () => {
    it('should render in compact mode when compact=true', () => {
      render(<CrisisResourcesPreview compact />)
      const preview = screen.getByTestId('crisis-resources-preview')
      expect(preview).toHaveStyle({ borderRadius: '6px' })
    })

    it('should have smaller padding in compact mode', () => {
      render(<CrisisResourcesPreview compact />)
      const preview = screen.getByTestId('crisis-resources-preview')
      expect(preview).toHaveStyle({ padding: '10px 12px' })
    })

    it('should have smaller icon in compact mode', () => {
      render(<CrisisResourcesPreview compact />)
      const icon = screen.getByTestId('callout-icon')
      expect(icon).toHaveStyle({ fontSize: '18px' })
    })
  })

  describe('6th-grade reading level (AC5)', () => {
    it('should use simple language in message', () => {
      render(<CrisisResourcesPreview />)
      const message = screen.getByTestId('callout-message')
      const text = message.textContent || ''

      // Check for simple words (no complex jargon)
      expect(text).not.toContain('crisis')
      expect(text).not.toContain('monitoring')
      expect(text).not.toContain('capture')
      expect(text).not.toContain('surveillance')

      // Check for reassuring language
      expect(text.toLowerCase()).toContain('private')
    })

    it('should use short sentences', () => {
      render(<CrisisResourcesPreview />)
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
      render(<CrisisResourcesPreview />)
      const icon = screen.getByTestId('callout-icon')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
