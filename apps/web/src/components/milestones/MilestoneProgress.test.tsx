/**
 * MilestoneProgress Component Tests - Story 37.1 Task 4
 *
 * Tests for milestone progress display.
 * AC1: Milestones at 80, 90, 95
 * AC2: Duration requirement of 30+ days
 * AC4: Developmental language
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MilestoneProgress } from './MilestoneProgress'

describe('MilestoneProgress - Story 37.1 Task 4', () => {
  describe('AC1: Milestone thresholds', () => {
    it('should display all three milestone levels', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      expect(screen.getByTestId('milestone-growing')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-maturing')).toBeInTheDocument()
      expect(screen.getByTestId('milestone-ready-for-independence')).toBeInTheDocument()
    })

    it('should show thresholds for each milestone', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      expect(screen.getByText(/80/)).toBeInTheDocument()
      expect(screen.getByText(/90/)).toBeInTheDocument()
      expect(screen.getByText(/95/)).toBeInTheDocument()
    })

    it('should highlight achieved milestone', () => {
      render(
        <MilestoneProgress currentScore={92} consecutiveDays={35} currentMilestone="maturing" />
      )

      const maturingSection = screen.getByTestId('milestone-maturing')
      expect(maturingSection).toHaveAttribute('data-achieved', 'true')
    })

    it('should not highlight unachieved milestones', () => {
      render(
        <MilestoneProgress currentScore={85} consecutiveDays={35} currentMilestone="growing" />
      )

      const maturingSection = screen.getByTestId('milestone-maturing')
      expect(maturingSection).toHaveAttribute('data-achieved', 'false')
    })
  })

  describe('AC2: Duration display', () => {
    it('should display consecutive days progress', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      expect(screen.getByTestId('days-progress')).toHaveTextContent('15')
    })

    it('should show 30 days requirement', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      expect(screen.getByTestId('days-progress')).toHaveTextContent('30')
    })

    it('should display days remaining', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      expect(screen.getByTestId('days-remaining')).toHaveTextContent('15')
    })

    it('should show zero days remaining when goal reached', () => {
      render(
        <MilestoneProgress currentScore={85} consecutiveDays={35} currentMilestone="growing" />
      )

      expect(screen.getByTestId('days-remaining')).toHaveTextContent('0')
    })
  })

  describe('AC4: Developmental language', () => {
    it('should use growth-focused language', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      const component = screen.getByTestId('milestone-progress')
      expect(component.textContent?.toLowerCase()).toMatch(/growth|growing|journey|progress/)
    })

    it('should NOT use reward language', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      const component = screen.getByTestId('milestone-progress')
      expect(component.textContent?.toLowerCase()).not.toContain('earned')
      expect(component.textContent?.toLowerCase()).not.toContain('reward')
      expect(component.textContent?.toLowerCase()).not.toContain('deserve')
    })
  })

  describe('Progress visualization', () => {
    it('should render progress bar', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
    })

    it('should show correct progress percentage', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '15')
      expect(progressBar).toHaveAttribute('aria-valuemax', '30')
    })

    it('should cap progress at 100% when exceeded', () => {
      render(
        <MilestoneProgress currentScore={85} consecutiveDays={45} currentMilestone="growing" />
      )

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '30')
    })
  })

  describe('Next milestone preview', () => {
    it('should show next milestone when at growing', () => {
      render(
        <MilestoneProgress currentScore={85} consecutiveDays={35} currentMilestone="growing" />
      )

      expect(screen.getByTestId('next-milestone')).toHaveTextContent(/maturing/i)
    })

    it('should show next milestone when at maturing', () => {
      render(
        <MilestoneProgress currentScore={92} consecutiveDays={35} currentMilestone="maturing" />
      )

      expect(screen.getByTestId('next-milestone')).toHaveTextContent(/ready.*independence/i)
    })

    it('should show no next milestone at highest level', () => {
      render(
        <MilestoneProgress
          currentScore={96}
          consecutiveDays={35}
          currentMilestone="ready-for-independence"
        />
      )

      expect(screen.queryByTestId('next-milestone')).not.toBeInTheDocument()
    })

    it('should show growing as next when at no milestone', () => {
      render(<MilestoneProgress currentScore={75} consecutiveDays={0} currentMilestone={null} />)

      expect(screen.getByTestId('next-milestone')).toHaveTextContent(/growing/i)
    })
  })

  describe('Current score display', () => {
    it('should display current score', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      expect(screen.getByTestId('current-score')).toHaveTextContent('85')
    })

    it('should indicate score meets threshold', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      const scoreElement = screen.getByTestId('current-score')
      expect(scoreElement).toHaveAttribute('data-above-threshold', 'true')
    })

    it('should indicate score below threshold', () => {
      render(<MilestoneProgress currentScore={75} consecutiveDays={0} currentMilestone={null} />)

      const scoreElement = screen.getByTestId('current-score')
      expect(scoreElement).toHaveAttribute('data-above-threshold', 'false')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible progress bar', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('role', 'progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    })

    it('should have accessible label', () => {
      render(<MilestoneProgress currentScore={85} consecutiveDays={15} currentMilestone={null} />)

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('aria-label')
    })
  })
})
