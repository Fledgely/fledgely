/**
 * Graduation Path Explainer Tests - Story 38.1 Task 5
 *
 * Tests for the graduation path explainer component.
 * AC3: Child sees clear path to end of monitoring
 * AC5: Eligibility triggers conversation, not auto-graduation
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GraduationPathExplainer } from './GraduationPathExplainer'

describe('GraduationPathExplainer - Story 38.1 Task 5', () => {
  describe('Rendering', () => {
    it('should render the component', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      expect(screen.getByTestId('graduation-path-explainer')).toBeInTheDocument()
    })

    it('should render header', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      expect(screen.getByTestId('explainer-header')).toBeInTheDocument()
    })

    it('should render all sections', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      expect(screen.getByTestId('path-overview-section')).toBeInTheDocument()
      expect(screen.getByTestId('requirements-section')).toBeInTheDocument()
      expect(screen.getByTestId('milestones-section')).toBeInTheDocument()
      expect(screen.getByTestId('eligibility-section')).toBeInTheDocument()
      expect(screen.getByTestId('after-section')).toBeInTheDocument()
      expect(screen.getByTestId('encouragement-section')).toBeInTheDocument()
    })
  })

  describe('Child View', () => {
    it('should show child-appropriate header', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      expect(screen.getByText('Your Path to Graduation')).toBeInTheDocument()
    })

    it('should show path overview', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      const overview = screen.getByTestId('path-overview-text')
      expect(overview.textContent).toContain('12')
      expect(overview.textContent).toContain('100%')
    })

    it('should show child-friendly requirements', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      expect(screen.getByText('Maintain 100% Trust')).toBeInTheDocument()
      expect(screen.getByText('12 Consecutive Months')).toBeInTheDocument()
      expect(screen.getByText('Family Conversation')).toBeInTheDocument()
    })

    it('should show child-appropriate encouragement', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      const encouragement = screen.getByTestId('encouragement-text')
      expect(encouragement.textContent).toContain("You've got this")
    })
  })

  describe('Parent View', () => {
    it('should show parent-appropriate header without child name', () => {
      render(<GraduationPathExplainer viewerType="parent" />)

      expect(screen.getByText('Understanding the Graduation Path')).toBeInTheDocument()
    })

    it('should show parent-appropriate header with child name', () => {
      render(<GraduationPathExplainer viewerType="parent" childName="Emma" />)

      expect(screen.getByText("Understanding Emma's Graduation Path")).toBeInTheDocument()
    })

    it('should show parent-appropriate requirements', () => {
      render(<GraduationPathExplainer viewerType="parent" />)

      const requirements = screen.getByTestId('requirements-list')
      expect(requirements.textContent).toContain('maintain a perfect trust score')
    })

    it('should show parent-appropriate encouragement', () => {
      render(<GraduationPathExplainer viewerType="parent" />)

      const encouragement = screen.getByTestId('encouragement-text')
      expect(encouragement.textContent).toContain('encouragement')
    })
  })

  describe('Path Overview (AC3)', () => {
    it('should explain 12 month requirement for child', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      const overview = screen.getByTestId('path-overview-text')
      expect(overview.textContent).toContain('12')
    })

    it('should explain 100% trust requirement', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      const overview = screen.getByTestId('path-overview-text')
      expect(overview.textContent).toContain('100%')
    })

    it('should mention graduation outcome', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      const overview = screen.getByTestId('path-overview-text')
      expect(overview.textContent?.toLowerCase()).toContain('graduation')
    })
  })

  describe('Milestones (AC3)', () => {
    it('should show all four milestones', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      expect(screen.getByTestId('milestone-explainer-3')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-explainer-6')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-explainer-9')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-explainer-12')).toBeInTheDocument()
    })

    it('should show milestone labels', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      expect(screen.getByText('First Quarter')).toBeInTheDocument()
      expect(screen.getByText('Halfway Point')).toBeInTheDocument()
      expect(screen.getByText('Almost There')).toBeInTheDocument()
      expect(screen.getByText('Graduation Eligible')).toBeInTheDocument()
    })

    it('should show milestone months', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      expect(screen.getByText('3 months')).toBeInTheDocument()
      expect(screen.getByText('6 months')).toBeInTheDocument()
      expect(screen.getByText('9 months')).toBeInTheDocument()
      expect(screen.getByText('12 months')).toBeInTheDocument()
    })
  })

  describe('Eligibility Explanation (AC5)', () => {
    it('should explain eligibility triggers conversation for child', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      const explanation = screen.getByTestId('eligibility-explanation')
      expect(explanation.textContent?.toLowerCase()).toContain('conversation')
    })

    it('should explain not automatic for child', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      const note = screen.getByTestId('important-note')
      expect(note.textContent?.toLowerCase()).toContain(
        "doesn't mean monitoring ends automatically"
      )
    })

    it('should explain parent maintains control', () => {
      render(<GraduationPathExplainer viewerType="parent" />)

      const note = screen.getByTestId('important-note')
      expect(note.textContent?.toLowerCase()).toContain('control')
    })
  })

  describe('Requirements Section', () => {
    it('should show three requirements', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      expect(screen.getByTestId('requirement-0')).toBeInTheDocument()
      expect(screen.getByTestId('requirement-1')).toBeInTheDocument()
      expect(screen.getByTestId('requirement-2')).toBeInTheDocument()
    })

    it('should include icons for visual appeal', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      // Check that requirements have icon content
      const req0 = screen.getByTestId('requirement-0')
      expect(req0.textContent).toContain('🎯')
    })
  })

  describe('After Section', () => {
    it('should explain post-graduation for child', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      const afterText = screen.getByTestId('after-explanation')
      expect(afterText.textContent).toContain('independence')
    })

    it('should explain customizable for parent', () => {
      render(<GraduationPathExplainer viewerType="parent" />)

      const afterText = screen.getByTestId('after-explanation')
      expect(afterText.textContent).toContain('customizable')
    })
  })

  describe('Close Button', () => {
    it('should render close button when callback provided', () => {
      const onClose = vi.fn()

      render(<GraduationPathExplainer viewerType="child" onClose={onClose} />)

      expect(screen.getByTestId('close-button')).toBeInTheDocument()
    })

    it('should not render close button when no callback', () => {
      render(<GraduationPathExplainer viewerType="child" />)

      expect(screen.queryByTestId('close-button')).not.toBeInTheDocument()
    })

    it('should call onClose when clicked', () => {
      const onClose = vi.fn()

      render(<GraduationPathExplainer viewerType="child" onClose={onClose} />)

      fireEvent.click(screen.getByTestId('close-button'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should have accessible label', () => {
      const onClose = vi.fn()

      render(<GraduationPathExplainer viewerType="child" onClose={onClose} />)

      expect(screen.getByTestId('close-button')).toHaveAttribute('aria-label', 'Close')
    })
  })

  describe('AC Verification', () => {
    describe('AC3: Child sees clear path to end of monitoring', () => {
      it('should provide complete overview of path', () => {
        render(<GraduationPathExplainer viewerType="child" />)

        // Path overview present
        expect(screen.getByTestId('path-overview-text')).toBeInTheDocument()

        // Requirements listed
        expect(screen.getByTestId('requirements-list')).toBeInTheDocument()

        // Milestones shown
        expect(screen.getByTestId('milestones-list')).toBeInTheDocument()

        // Clear end point visible (12 month graduation milestone)
        expect(screen.getByTestId('milestone-explainer-12')).toBeInTheDocument()
      })
    })

    describe('AC5: Eligibility triggers conversation, not auto-graduation', () => {
      it('should clearly state not automatic for child', () => {
        render(<GraduationPathExplainer viewerType="child" />)

        const explanation = screen.getByTestId('eligibility-explanation')
        const note = screen.getByTestId('important-note')

        // Must mention conversation
        expect(explanation.textContent?.toLowerCase()).toContain('conversation')
        // Must clarify not automatic
        expect(note.textContent?.toLowerCase()).toContain('automatically')
      })

      it('should clearly state not automatic for parent', () => {
        render(<GraduationPathExplainer viewerType="parent" />)

        const note = screen.getByTestId('important-note')

        // Must clarify parent control
        expect(note.textContent?.toLowerCase()).toContain('conversation')
        expect(note.textContent?.toLowerCase()).toContain('not an automatic')
      })
    })
  })
})
