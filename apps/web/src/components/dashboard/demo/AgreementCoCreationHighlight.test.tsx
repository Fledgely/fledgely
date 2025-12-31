/**
 * Tests for AgreementCoCreationHighlight Component
 *
 * Story 8.5.6: Demo for Child Explanation
 * AC4: Demo emphasizes agreement co-creation ("You help decide the rules")
 * AC5: Language is at 6th-grade reading level
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AgreementCoCreationHighlight } from './AgreementCoCreationHighlight'

describe('AgreementCoCreationHighlight', () => {
  describe('basic rendering', () => {
    it('should render the highlight', () => {
      render(<AgreementCoCreationHighlight />)
      const highlight = screen.getByTestId('agreement-cocreation-highlight')
      expect(highlight).toBeInTheDocument()
    })

    it('should display handshake emoji icon (AC4)', () => {
      render(<AgreementCoCreationHighlight />)
      const icon = screen.getByTestId('callout-icon')
      expect(icon).toHaveTextContent('🤝')
    })

    it('should display "You Help Decide the Rules" title (AC4)', () => {
      render(<AgreementCoCreationHighlight />)
      const title = screen.getByTestId('callout-title')
      expect(title).toHaveTextContent('You Help Decide the Rules')
    })

    it('should display empowering message about co-creation (AC4)', () => {
      render(<AgreementCoCreationHighlight />)
      const message = screen.getByTestId('callout-message')
      expect(message).toHaveTextContent('You get to help decide')
      expect(message).toHaveTextContent('agree on what works')
    })
  })

  describe('negotiable rules list (AC4)', () => {
    it('should show negotiable rules container', () => {
      render(<AgreementCoCreationHighlight />)
      const container = screen.getByTestId('negotiable-rules-container')
      expect(container).toBeInTheDocument()
    })

    it('should display sample negotiable rules', () => {
      render(<AgreementCoCreationHighlight />)
      const rules = screen.getAllByTestId('negotiable-rule')
      expect(rules.length).toBeGreaterThan(0)
    })

    it('should show screen time limits as a negotiable rule', () => {
      render(<AgreementCoCreationHighlight />)
      const rules = screen.getAllByTestId('negotiable-rule')
      const ruleTexts = rules.map((rule) => rule.textContent)
      expect(ruleTexts.some((text) => text?.includes('Screen time limits'))).toBe(true)
    })

    it('should show check mark for each rule', () => {
      render(<AgreementCoCreationHighlight />)
      const rules = screen.getAllByTestId('negotiable-rule')
      rules.forEach((rule) => {
        expect(rule.textContent).toContain('✓')
      })
    })

    it('should include examples for each rule', () => {
      render(<AgreementCoCreationHighlight />)
      const rules = screen.getAllByTestId('negotiable-rule')
      const ruleTexts = rules.map((rule) => rule.textContent)
      expect(ruleTexts.some((text) => text?.includes('How many hours per day'))).toBe(true)
    })
  })

  describe('styling', () => {
    it('should have sky blue background', () => {
      render(<AgreementCoCreationHighlight />)
      const highlight = screen.getByTestId('agreement-cocreation-highlight')
      expect(highlight).toHaveStyle({ backgroundColor: '#e0f2fe' })
    })

    it('should have sky border', () => {
      render(<AgreementCoCreationHighlight />)
      const highlight = screen.getByTestId('agreement-cocreation-highlight')
      expect(highlight).toHaveStyle({ border: '1px solid #7dd3fc' })
    })

    it('should have sky title text', () => {
      render(<AgreementCoCreationHighlight />)
      const title = screen.getByTestId('callout-title')
      expect(title).toHaveStyle({ color: '#0369a1' })
    })
  })

  describe('compact mode', () => {
    it('should render in compact mode when compact=true', () => {
      render(<AgreementCoCreationHighlight compact />)
      const highlight = screen.getByTestId('agreement-cocreation-highlight')
      expect(highlight).toHaveStyle({ borderRadius: '6px' })
    })

    it('should have smaller padding in compact mode', () => {
      render(<AgreementCoCreationHighlight compact />)
      const highlight = screen.getByTestId('agreement-cocreation-highlight')
      expect(highlight).toHaveStyle({ padding: '10px 12px' })
    })

    it('should have smaller icon in compact mode', () => {
      render(<AgreementCoCreationHighlight compact />)
      const icon = screen.getByTestId('callout-icon')
      expect(icon).toHaveStyle({ fontSize: '18px' })
    })
  })

  describe('6th-grade reading level (AC5)', () => {
    it('should use simple language in message', () => {
      render(<AgreementCoCreationHighlight />)
      const message = screen.getByTestId('callout-message')
      const text = message.textContent || ''

      // Check for simple words (no complex jargon)
      expect(text).not.toContain('negotiate')
      expect(text).not.toContain('co-creation')
      expect(text).not.toContain('consensus')
      expect(text).not.toContain('collaborative')

      // Check for empowering language
      expect(text.toLowerCase()).toContain('you')
    })

    it('should use short sentences', () => {
      render(<AgreementCoCreationHighlight />)
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
      render(<AgreementCoCreationHighlight />)
      const icon = screen.getByTestId('callout-icon')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
