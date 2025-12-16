/**
 * Tests for DiscussionPrompt Component
 *
 * Story 5.4: Negotiation & Discussion Support - Task 2.6
 *
 * Tests for discussion prompts with child-friendly language.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiscussionPrompt } from '../DiscussionPrompt'
import { DISCUSSION_PROMPTS, DEFAULT_PROMPTS } from '../discussionUtils'

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('DiscussionPrompt', () => {
  describe('basic rendering', () => {
    it('renders the component', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt')).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      render(
        <DiscussionPrompt
          termType="screen_time"
          contributor="child"
          data-testid="custom-prompt"
        />
      )
      expect(screen.getByTestId('custom-prompt')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <DiscussionPrompt
          termType="screen_time"
          contributor="child"
          className="custom-class"
        />
      )
      expect(screen.getByTestId('discussion-prompt')).toHaveClass('custom-class')
    })
  })

  // ============================================
  // SINGLE PROMPT MODE TESTS
  // ============================================

  describe('single prompt mode', () => {
    it('shows child prompt for child contributor', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        DISCUSSION_PROMPTS.screen_time.child
      )
    })

    it('shows parent prompt for parent contributor', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="parent" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        DISCUSSION_PROMPTS.screen_time.parent
      )
    })

    it('shows prompt icon', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-icon')).toBeInTheDocument()
    })

    it('uses pink styling for child', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" />)
      const prompt = screen.getByTestId('discussion-prompt')
      expect(prompt.className).toMatch(/pink/)
    })

    it('uses blue styling for parent', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="parent" />)
      const prompt = screen.getByTestId('discussion-prompt')
      expect(prompt.className).toMatch(/blue/)
    })
  })

  // ============================================
  // DUAL PROMPT MODE TESTS
  // ============================================

  describe('dual prompt mode (showBoth)', () => {
    it('shows both prompts when showBoth is true', () => {
      render(<DiscussionPrompt termType="bedtime" contributor="child" showBoth />)
      expect(screen.getByTestId('discussion-prompt-child')).toBeInTheDocument()
      expect(screen.getByTestId('discussion-prompt-parent')).toBeInTheDocument()
    })

    it('shows title in dual mode', () => {
      render(<DiscussionPrompt termType="bedtime" contributor="parent" showBoth />)
      expect(screen.getByTestId('discussion-prompt-title')).toHaveTextContent(
        'Questions to discuss'
      )
    })

    it('shows child prompt in child section', () => {
      render(<DiscussionPrompt termType="bedtime" contributor="child" showBoth />)
      expect(screen.getByTestId('discussion-prompt-child')).toHaveTextContent(
        DISCUSSION_PROMPTS.bedtime.child
      )
    })

    it('shows parent prompt in parent section', () => {
      render(<DiscussionPrompt termType="bedtime" contributor="parent" showBoth />)
      expect(screen.getByTestId('discussion-prompt-parent')).toHaveTextContent(
        DISCUSSION_PROMPTS.bedtime.parent
      )
    })

    it('uses region role with label', () => {
      render(<DiscussionPrompt termType="bedtime" contributor="child" showBoth />)
      expect(screen.getByRole('region')).toBeInTheDocument()
    })
  })

  // ============================================
  // TERM TYPE SPECIFIC TESTS
  // ============================================

  describe('term type specific prompts', () => {
    it('shows screen_time prompts', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        'Why is this screen time important to you?'
      )
    })

    it('shows bedtime prompts', () => {
      render(<DiscussionPrompt termType="bedtime" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        'Why do you want to stay up later?'
      )
    })

    it('shows monitoring prompts', () => {
      render(<DiscussionPrompt termType="monitoring" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        'How does this make you feel?'
      )
    })

    it('shows rule prompts', () => {
      render(<DiscussionPrompt termType="rule" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        'What would help you follow this rule?'
      )
    })

    it('shows consequence prompts', () => {
      render(<DiscussionPrompt termType="consequence" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        'Does this feel fair to you?'
      )
    })

    it('shows reward prompts', () => {
      render(<DiscussionPrompt termType="reward" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        'What would make this reward exciting?'
      )
    })
  })

  // ============================================
  // PARENT SPECIFIC PROMPT TESTS
  // ============================================

  describe('parent specific prompts', () => {
    it('shows screen_time parent prompt', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="parent" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        'What concerns do you have about screen time?'
      )
    })

    it('shows bedtime parent prompt', () => {
      render(<DiscussionPrompt termType="bedtime" contributor="parent" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        'Why is this bedtime important for your family?'
      )
    })

    it('shows monitoring parent prompt', () => {
      render(<DiscussionPrompt termType="monitoring" contributor="parent" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        'Why is this level of monitoring needed?'
      )
    })

    it('shows rule parent prompt', () => {
      render(<DiscussionPrompt termType="rule" contributor="parent" />)
      expect(screen.getByTestId('discussion-prompt-text')).toHaveTextContent(
        'What problem does this rule solve?'
      )
    })
  })

  // ============================================
  // ICON TESTS
  // ============================================

  describe('icons', () => {
    it('shows phone icon for screen_time', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-icon')).toHaveTextContent('📱')
    })

    it('shows moon icon for bedtime', () => {
      render(<DiscussionPrompt termType="bedtime" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-icon')).toHaveTextContent('🌙')
    })

    it('shows eyes icon for monitoring', () => {
      render(<DiscussionPrompt termType="monitoring" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-icon')).toHaveTextContent('👀')
    })

    it('shows clipboard icon for rule', () => {
      render(<DiscussionPrompt termType="rule" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-icon')).toHaveTextContent('📋')
    })

    it('shows scales icon for consequence', () => {
      render(<DiscussionPrompt termType="consequence" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-icon')).toHaveTextContent('⚖️')
    })

    it('shows gift icon for reward', () => {
      render(<DiscussionPrompt termType="reward" contributor="child" />)
      expect(screen.getByTestId('discussion-prompt-icon')).toHaveTextContent('🎁')
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS (NFR42)
  // ============================================

  describe('accessibility (NFR42)', () => {
    it('has note role for single prompt', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" />)
      expect(screen.getByRole('note')).toBeInTheDocument()
    })

    it('has aria-label describing the prompt', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" />)
      const prompt = screen.getByRole('note')
      expect(prompt).toHaveAttribute('aria-label')
      expect(prompt.getAttribute('aria-label')).toContain('Discussion prompt')
    })

    it('has aria-live for screen reader updates', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" />)
      const prompt = screen.getByTestId('discussion-prompt')
      expect(prompt).toHaveAttribute('aria-live', 'polite')
    })

    it('hides decorative icon from screen readers', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" />)
      const icon = screen.getByTestId('discussion-prompt-icon')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    it('has region role with label in dual mode', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" showBoth />)
      const region = screen.getByRole('region')
      expect(region).toHaveAttribute('aria-labelledby')
    })

    it('has note roles for each prompt in dual mode', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" showBoth />)
      const notes = screen.getAllByRole('note')
      expect(notes).toHaveLength(2)
    })

    it('labels child prompt section', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" showBoth />)
      const childPrompt = screen.getByTestId('discussion-prompt-child')
      expect(childPrompt).toHaveAttribute('aria-label', 'Question for child')
    })

    it('labels parent prompt section', () => {
      render(<DiscussionPrompt termType="screen_time" contributor="child" showBoth />)
      const parentPrompt = screen.getByTestId('discussion-prompt-parent')
      expect(parentPrompt).toHaveAttribute('aria-label', 'Question for parent')
    })
  })

  // ============================================
  // READING LEVEL TESTS (NFR65)
  // ============================================

  describe('reading level (NFR65)', () => {
    it('child prompts are simple questions', () => {
      // All child prompts should be simple, short questions
      Object.values(DISCUSSION_PROMPTS).forEach((promptSet) => {
        // Should be a question (ends with ?)
        expect(promptSet.child).toMatch(/\?$/)
        // Should be reasonably short (under 60 chars)
        expect(promptSet.child.length).toBeLessThan(60)
      })
    })

    it('parent prompts are clear questions', () => {
      Object.values(DISCUSSION_PROMPTS).forEach((promptSet) => {
        expect(promptSet.parent).toMatch(/\?$/)
        expect(promptSet.parent.length).toBeLessThan(60)
      })
    })

    it('prompts use simple vocabulary', () => {
      // Check that prompts don't use complex words
      const complexWords = ['subsequently', 'consequently', 'furthermore', 'nevertheless']
      Object.values(DISCUSSION_PROMPTS).forEach((promptSet) => {
        complexWords.forEach((word) => {
          expect(promptSet.child.toLowerCase()).not.toContain(word)
          expect(promptSet.parent.toLowerCase()).not.toContain(word)
        })
      })
    })
  })
})

// ============================================
// UTILS TESTS
// ============================================

describe('discussionUtils', () => {
  describe('getDiscussionPrompt', () => {
    it('returns child prompt for child contributor', async () => {
      const { getDiscussionPrompt } = await import('../discussionUtils')
      const prompt = getDiscussionPrompt('screen_time', 'child')
      expect(prompt).toBe(DISCUSSION_PROMPTS.screen_time.child)
    })

    it('returns parent prompt for parent contributor', async () => {
      const { getDiscussionPrompt } = await import('../discussionUtils')
      const prompt = getDiscussionPrompt('screen_time', 'parent')
      expect(prompt).toBe(DISCUSSION_PROMPTS.screen_time.parent)
    })
  })

  describe('getDiscussionPrompts', () => {
    it('returns prompt set for term type', async () => {
      const { getDiscussionPrompts } = await import('../discussionUtils')
      const prompts = getDiscussionPrompts('bedtime')
      expect(prompts.child).toBe(DISCUSSION_PROMPTS.bedtime.child)
      expect(prompts.parent).toBe(DISCUSSION_PROMPTS.bedtime.parent)
    })

    it('returns default prompts for unknown term type', async () => {
      const { getDiscussionPrompts, DEFAULT_PROMPTS } = await import('../discussionUtils')
      // @ts-expect-error Testing fallback behavior
      const prompts = getDiscussionPrompts('unknown_type')
      expect(prompts).toEqual(DEFAULT_PROMPTS)
    })
  })
})
