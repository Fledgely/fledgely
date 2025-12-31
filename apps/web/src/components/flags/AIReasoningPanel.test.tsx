/**
 * AIReasoningPanel Tests - Story 22.2
 *
 * Tests for the AI reasoning display component.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AIReasoningPanel } from './AIReasoningPanel'

describe('AIReasoningPanel', () => {
  describe('AC2: AI reasoning panel explains why flagged', () => {
    it('should render the panel container', () => {
      render(<AIReasoningPanel reasoning="Test reasoning" category="Violence" />)

      expect(screen.getByTestId('ai-reasoning-panel')).toBeInTheDocument()
    })

    it('should display the reasoning text', () => {
      const reasoning = 'This content was flagged because it contains violent imagery.'
      render(<AIReasoningPanel reasoning={reasoning} category="Violence" />)

      const reasoningText = screen.getByTestId('reasoning-text')
      expect(reasoningText).toHaveTextContent(reasoning)
    })

    it('should display the panel title', () => {
      render(<AIReasoningPanel reasoning="Test reasoning" category="Violence" />)

      expect(screen.getByText('Why this was flagged')).toBeInTheDocument()
    })

    it('should display the AI icon', () => {
      render(<AIReasoningPanel reasoning="Test reasoning" category="Violence" />)

      // Check for robot emoji in the panel (parent has aria-hidden but emoji should be visible)
      const panel = screen.getByTestId('ai-reasoning-panel')
      expect(panel.textContent).toContain('\u{1F916}') // Robot emoji
    })
  })

  describe('AC2: Reasoning presented in clear, non-alarming language', () => {
    it('should display disclaimer about AI detection', () => {
      render(<AIReasoningPanel reasoning="Test reasoning" category="Violence" />)

      const disclaimer = screen.getByTestId('reasoning-disclaimer')
      expect(disclaimer).toHaveTextContent('AI')
      expect(disclaimer).toHaveTextContent('may not always be accurate')
    })

    it('should encourage parent judgment', () => {
      render(<AIReasoningPanel reasoning="Test reasoning" category="Violence" />)

      const disclaimer = screen.getByTestId('reasoning-disclaimer')
      expect(disclaimer).toHaveTextContent('judgment as a parent')
    })

    it('should mention feedback option', () => {
      render(<AIReasoningPanel reasoning="Test reasoning" category="Violence" />)

      const disclaimer = screen.getByTestId('reasoning-disclaimer')
      expect(disclaimer).toHaveTextContent('feedback')
    })
  })

  describe('Different categories', () => {
    const categories = [
      'Violence',
      'Adult Content',
      'Bullying',
      'Self-Harm Indicators',
      'Explicit Language',
      'Unknown Contacts',
    ]

    categories.forEach((category) => {
      it(`should render correctly for ${category} category`, () => {
        const reasoning = `Content flagged for ${category}`
        render(<AIReasoningPanel reasoning={reasoning} category={category} />)

        expect(screen.getByTestId('reasoning-text')).toHaveTextContent(reasoning)
      })
    })
  })

  describe('Long reasoning text', () => {
    it('should handle multi-line reasoning', () => {
      const longReasoning = `This content was flagged for multiple reasons:
1. It contains potentially violent imagery
2. The language used may be inappropriate for the child's age
3. There are references to dangerous activities`

      render(<AIReasoningPanel reasoning={longReasoning} category="Violence" />)

      const reasoningText = screen.getByTestId('reasoning-text')
      expect(reasoningText).toHaveTextContent('multiple reasons')
    })

    it('should handle empty reasoning gracefully', () => {
      render(<AIReasoningPanel reasoning="" category="Violence" />)

      const reasoningText = screen.getByTestId('reasoning-text')
      expect(reasoningText).toBeInTheDocument()
      expect(reasoningText.textContent).toBe('')
    })
  })
})
