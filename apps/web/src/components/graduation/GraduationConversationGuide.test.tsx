/**
 * Graduation Conversation Guide Tests - Story 38.2 Task 6
 *
 * Tests for GraduationConversationGuide component.
 * AC5: Conversation template provided with discussion points
 * AC7: Respects child's demonstrated readiness for independence
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GraduationConversationGuide from './GraduationConversationGuide'
import type { ConversationTemplate } from '@fledgely/shared'

describe('GraduationConversationGuide - Story 38.2 Task 6', () => {
  const mockOnSchedule = vi.fn()
  const mockOnComplete = vi.fn()

  const createMockTemplate = (): ConversationTemplate => ({
    id: 'default',
    title: 'Graduation Conversation Guide',
    introduction:
      'This guide will help your family have a meaningful conversation about graduating from monitoring.',
    discussionPoints: [
      {
        topic: 'Celebrating Achievement',
        forChild:
          "You've shown 12 months of consistent responsibility. How do you feel about this milestone?",
        forParent:
          'Your child has demonstrated sustained trustworthy behavior. Share your pride in their growth.',
        optional: false,
      },
      {
        topic: 'Readiness for Independence',
        forChild: 'What does more independence mean to you?',
        forParent: 'What aspects of monitoring do you feel comfortable reducing?',
        optional: false,
      },
      {
        topic: 'Transition Timeline',
        forChild: 'What timeline feels right for transitioning off monitoring?',
        forParent: 'What transition approach would work for your family?',
        optional: true,
      },
    ],
    suggestedQuestions: [
      'What have you learned during this monitoring period?',
      'How has trust grown in our family?',
    ],
    closingMessage: 'Remember, graduation is the beginning of a new chapter.',
    resources: [
      {
        title: 'Healthy Digital Independence Guide',
        url: '/resources/digital-independence',
        description: 'Tips for maintaining healthy digital habits.',
      },
      {
        title: 'Post-Graduation Support',
        url: '/resources/post-graduation',
      },
    ],
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the title', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(
        screen.getByRole('heading', { name: 'Graduation Conversation Guide' })
      ).toBeInTheDocument()
    })

    it('renders the introduction', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByText(/meaningful conversation/i)).toBeInTheDocument()
    })

    it('renders discussion points section', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByText('Discussion Points')).toBeInTheDocument()
      expect(screen.getByText('2 required')).toBeInTheDocument()
      expect(screen.getByText('1 optional')).toBeInTheDocument()
    })

    it('renders all discussion point topics', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByText('Celebrating Achievement')).toBeInTheDocument()
      expect(screen.getByText('Readiness for Independence')).toBeInTheDocument()
      expect(screen.getByText('Transition Timeline')).toBeInTheDocument()
    })

    it('renders suggested questions section', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByText('Suggested Questions')).toBeInTheDocument()
      expect(
        screen.getByText('What have you learned during this monitoring period?')
      ).toBeInTheDocument()
      expect(screen.getByText('How has trust grown in our family?')).toBeInTheDocument()
    })

    it('renders resources section', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByText('Helpful Resources')).toBeInTheDocument()
      expect(screen.getByText('Healthy Digital Independence Guide')).toBeInTheDocument()
      expect(screen.getByText('Post-Graduation Support')).toBeInTheDocument()
    })

    it('renders closing message', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByText('Closing Thoughts')).toBeInTheDocument()
      expect(screen.getByText(/new chapter/)).toBeInTheDocument()
    })
  })

  describe('viewer-specific content (AC5)', () => {
    it('shows child prompts for child viewer', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByText(/How do you feel about this milestone/)).toBeInTheDocument()
      expect(screen.getByText(/What does more independence mean to you/)).toBeInTheDocument()
    })

    it('shows parent prompts for parent viewer', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="parent"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByText(/Share your pride in their growth/)).toBeInTheDocument()
      expect(
        screen.getByText(/What aspects of monitoring do you feel comfortable reducing/)
      ).toBeInTheDocument()
    })

    it('personalizes introduction for parent', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="parent"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByText(/Emma's graduation/)).toBeInTheDocument()
    })
  })

  describe('discussion point checkboxes', () => {
    it('renders checkboxes for each discussion point', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(3)
    })

    it('allows checking off discussion points', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      const firstCheckbox = screen.getAllByRole('checkbox')[0]
      expect(firstCheckbox).not.toBeChecked()

      fireEvent.click(firstCheckbox)
      expect(firstCheckbox).toBeChecked()
    })

    it('shows progress when topics are checked', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])
      fireEvent.click(checkboxes[1])

      expect(screen.getByText(/2 of 3 topics discussed/)).toBeInTheDocument()
    })
  })

  describe('scheduling actions', () => {
    it('shows schedule section when status is acknowledged', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
          onSchedule={mockOnSchedule}
        />
      )

      expect(screen.getByText('Schedule Your Conversation')).toBeInTheDocument()
      expect(screen.getByLabelText('Select date for conversation')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Schedule Conversation' })).toBeInTheDocument()
    })

    it('does not show schedule section when status is pending', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="pending"
          onSchedule={mockOnSchedule}
        />
      )

      expect(screen.queryByText('Schedule Your Conversation')).not.toBeInTheDocument()
    })

    it('calls onSchedule with selected date', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
          onSchedule={mockOnSchedule}
        />
      )

      const dateInput = screen.getByLabelText('Select date for conversation')
      fireEvent.change(dateInput, { target: { value: '2025-01-15' } })

      fireEvent.click(screen.getByRole('button', { name: 'Schedule Conversation' }))

      expect(mockOnSchedule).toHaveBeenCalledTimes(1)
      expect(mockOnSchedule).toHaveBeenCalledWith(expect.any(Date))
    })
  })

  describe('completion actions', () => {
    it('shows completion section when status is scheduled', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="scheduled"
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByText('Record Conversation Outcome')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Complete Graduation' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Defer for Now' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
    })

    it('does not show completion section when not scheduled', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
          onComplete={mockOnComplete}
        />
      )

      expect(screen.queryByText('Record Conversation Outcome')).not.toBeInTheDocument()
    })

    it('calls onComplete with graduated outcome', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="scheduled"
          onComplete={mockOnComplete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Complete Graduation' }))

      expect(mockOnComplete).toHaveBeenCalledWith('graduated')
    })

    it('calls onComplete with deferred outcome', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="scheduled"
          onComplete={mockOnComplete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Defer for Now' }))

      expect(mockOnComplete).toHaveBeenCalledWith('deferred')
    })

    it('calls onComplete with declined outcome', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="scheduled"
          onComplete={mockOnComplete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Decline' }))

      expect(mockOnComplete).toHaveBeenCalledWith('declined')
    })
  })

  describe('optional vs required points', () => {
    it('marks optional points with badge', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      // Find the optional badge within discussion points
      const optionalBadges = screen.getAllByText('Optional')
      expect(optionalBadges.length).toBeGreaterThan(0)
    })
  })

  describe('resource links', () => {
    it('renders resource links with correct hrefs', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      const digitalIndependenceLink = screen.getByRole('link', {
        name: 'Healthy Digital Independence Guide',
      })
      expect(digitalIndependenceLink).toHaveAttribute('href', '/resources/digital-independence')
    })

    it('shows resource descriptions when available', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByText('Tips for maintaining healthy digital habits.')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has accessible article role', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Graduation conversation guide for you'
      )
    })

    it('has accessible article label for parent', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="parent"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Graduation conversation guide for Emma'
      )
    })

    it('checkboxes have accessible labels', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      expect(
        screen.getByRole('checkbox', { name: /Mark "Celebrating Achievement" as discussed/ })
      ).toBeInTheDocument()
    })

    it('sections have proper heading hierarchy', () => {
      render(
        <GraduationConversationGuide
          template={createMockTemplate()}
          viewerType="child"
          childName="Emma"
          conversationStatus="acknowledged"
        />
      )

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('Graduation Conversation Guide')

      const h2s = screen.getAllByRole('heading', { level: 2 })
      expect(h2s.length).toBeGreaterThanOrEqual(3) // Discussion Points, Questions, Resources
    })
  })

  describe('AC Verification', () => {
    describe('AC5: Conversation template provided with discussion points', () => {
      it('displays discussion points with viewer-appropriate prompts', () => {
        const { rerender } = render(
          <GraduationConversationGuide
            template={createMockTemplate()}
            viewerType="child"
            childName="Emma"
            conversationStatus="acknowledged"
          />
        )

        // Child sees child prompts
        expect(screen.getByText(/How do you feel about this milestone/)).toBeInTheDocument()

        rerender(
          <GraduationConversationGuide
            template={createMockTemplate()}
            viewerType="parent"
            childName="Emma"
            conversationStatus="acknowledged"
          />
        )

        // Parent sees parent prompts
        expect(screen.getByText(/Share your pride in their growth/)).toBeInTheDocument()
      })

      it('includes suggested questions', () => {
        render(
          <GraduationConversationGuide
            template={createMockTemplate()}
            viewerType="child"
            childName="Emma"
            conversationStatus="acknowledged"
          />
        )

        expect(
          screen.getByText('What have you learned during this monitoring period?')
        ).toBeInTheDocument()
      })

      it('includes helpful resources', () => {
        render(
          <GraduationConversationGuide
            template={createMockTemplate()}
            viewerType="child"
            childName="Emma"
            conversationStatus="acknowledged"
          />
        )

        expect(screen.getByText('Healthy Digital Independence Guide')).toBeInTheDocument()
      })
    })

    describe('AC7: Respects child demonstrated readiness', () => {
      it('uses positive celebratory language', () => {
        render(
          <GraduationConversationGuide
            template={createMockTemplate()}
            viewerType="child"
            childName="Emma"
            conversationStatus="acknowledged"
          />
        )

        expect(screen.getByText('Celebrating Achievement')).toBeInTheDocument()
        expect(screen.getByText(/responsibility/i)).toBeInTheDocument()
      })

      it('focuses on independence and growth', () => {
        render(
          <GraduationConversationGuide
            template={createMockTemplate()}
            viewerType="child"
            childName="Emma"
            conversationStatus="acknowledged"
          />
        )

        expect(screen.getByText('Readiness for Independence')).toBeInTheDocument()
        // Multiple elements mention independence
        expect(screen.getAllByText(/independence/i).length).toBeGreaterThan(0)
      })

      it('offers graduation completion option', () => {
        render(
          <GraduationConversationGuide
            template={createMockTemplate()}
            viewerType="child"
            childName="Emma"
            conversationStatus="scheduled"
            onComplete={mockOnComplete}
          />
        )

        expect(screen.getByRole('button', { name: 'Complete Graduation' })).toBeInTheDocument()
      })
    })
  })
})
