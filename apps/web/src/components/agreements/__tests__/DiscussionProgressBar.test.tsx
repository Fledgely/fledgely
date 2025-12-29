/**
 * Discussion Progress Bar Component Tests.
 *
 * Story 5.4: Negotiation & Discussion Support - AC5
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DiscussionProgressBar } from '../DiscussionProgressBar'
import type { DiscussionStatus } from '@fledgely/shared/contracts'

describe('DiscussionProgressBar', () => {
  describe('No Discussions', () => {
    it('renders minimal UI when no discussions needed', () => {
      render(<DiscussionProgressBar discussionStatuses={['none', 'none', 'none']} />)

      expect(screen.getByTestId('discussion-progress-bar')).toBeInTheDocument()
      expect(screen.getByText(/No discussions needed yet!/i)).toBeInTheDocument()
    })

    it('does not show progress bar when no discussions', () => {
      render(<DiscussionProgressBar discussionStatuses={['none', 'none']} />)

      expect(screen.queryByTestId('progress-fill')).not.toBeInTheDocument()
    })
  })

  describe('Progress Calculation', () => {
    it('shows correct count for pending discussions', () => {
      const statuses: DiscussionStatus[] = ['needs_discussion', 'needs_discussion', 'resolved']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      expect(screen.getByText('1/3')).toBeInTheDocument()
    })

    it('shows 100% progress when all resolved', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'resolved', 'resolved']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      expect(screen.getByText('3/3')).toBeInTheDocument()
    })

    it('renders progress bar with correct width', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'needs_discussion']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      const progressBar = screen.getByTestId('progress-fill')
      expect(progressBar).toHaveStyle({ width: '50%' })
    })
  })

  describe('Encouraging Messages', () => {
    it('shows starting message when just beginning', () => {
      const statuses: DiscussionStatus[] = ['needs_discussion', 'needs_discussion']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      expect(screen.getByTestId('progress-message')).toHaveTextContent(/Great start|Keep talking/i)
    })

    it('shows halfway message at 50%', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'needs_discussion']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      expect(screen.getByTestId('progress-message')).toHaveTextContent(/Halfway there/i)
    })

    it('shows almost done message at 75%+', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'resolved', 'resolved', 'needs_discussion']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      expect(screen.getByTestId('progress-message')).toHaveTextContent(/Almost done/i)
    })

    it('shows completion message when all resolved', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'resolved']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      expect(screen.getByTestId('progress-message')).toHaveTextContent(/All discussions resolved/i)
    })
  })

  describe('Detailed Breakdown', () => {
    it('shows pending and resolved counts when showDetails is true', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'needs_discussion', 'needs_discussion']
      render(<DiscussionProgressBar discussionStatuses={statuses} showDetails={true} />)

      expect(screen.getByText('2 pending')).toBeInTheDocument()
      expect(screen.getByText('1 resolved')).toBeInTheDocument()
    })

    it('hides detailed breakdown when showDetails is false', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'needs_discussion']
      render(<DiscussionProgressBar discussionStatuses={statuses} showDetails={false} />)

      expect(screen.queryByText('pending')).not.toBeInTheDocument()
    })
  })

  describe('Personalization', () => {
    it('shows personalized encouragement with child name', () => {
      const statuses: DiscussionStatus[] = ['needs_discussion', 'resolved']
      render(<DiscussionProgressBar discussionStatuses={statuses} childName="Emma" />)

      expect(screen.getByText(/Keep going, Emma! Work with your parent/i)).toBeInTheDocument()
    })

    it('does not show personalized message when all resolved', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'resolved']
      render(<DiscussionProgressBar discussionStatuses={statuses} childName="Emma" />)

      expect(screen.queryByText(/Keep going, Emma/i)).not.toBeInTheDocument()
    })
  })

  describe('Completion Celebration', () => {
    it('shows celebration when all discussions complete', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'resolved', 'resolved']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      expect(screen.getByTestId('completion-celebration')).toBeInTheDocument()
      expect(screen.getByText('All Discussions Complete!')).toBeInTheDocument()
    })

    it('includes child name in celebration message when provided', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'resolved']
      render(<DiscussionProgressBar discussionStatuses={statuses} childName="Emma" />)

      expect(screen.getByText(/Emma and parent worked together/i)).toBeInTheDocument()
    })

    it('uses generic message when no child name provided', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'resolved']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      expect(screen.getByText(/You worked together/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible progress bar with aria attributes', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'needs_discussion', 'needs_discussion']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      const progressBar = screen.getByTestId('progress-fill')
      expect(progressBar).toHaveAttribute('role', 'progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '1')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '3')
    })

    it('has descriptive aria-label on progress bar', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'needs_discussion']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      const progressBar = screen.getByTestId('progress-fill')
      expect(progressBar).toHaveAttribute('aria-label', '1 of 2 discussions resolved')
    })
  })

  describe('Visual States', () => {
    it('shows green progress bar when complete', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'resolved']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      const progressBar = screen.getByTestId('progress-fill')
      expect(progressBar.className).toContain('bg-green-500')
    })

    it('shows blue progress bar when in progress', () => {
      const statuses: DiscussionStatus[] = ['resolved', 'needs_discussion']
      render(<DiscussionProgressBar discussionStatuses={statuses} />)

      const progressBar = screen.getByTestId('progress-fill')
      expect(progressBar.className).toContain('bg-blue-500')
    })
  })
})
