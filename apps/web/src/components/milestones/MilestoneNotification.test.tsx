/**
 * MilestoneNotification Component Tests - Story 37.1 Task 3
 *
 * Tests for milestone notification display.
 * AC3: Milestone notifications sent to both parties
 * AC4: Language: "Recognizing your growth" not "You've earned"
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MilestoneNotification } from './MilestoneNotification'
import type { TrustMilestoneLevel } from '@fledgely/shared'

describe('MilestoneNotification - Story 37.1 Task 3', () => {
  describe('AC3: Milestone notifications for both parties', () => {
    it('should render notification for child view', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      expect(screen.getByTestId('milestone-notification')).toBeInTheDocument()
    })

    it('should render notification for parent view', () => {
      render(
        <MilestoneNotification milestoneLevel="growing" viewerType="parent" childName="Alex" />
      )

      expect(screen.getByTestId('milestone-notification')).toBeInTheDocument()
    })

    it('should show child name in parent view', () => {
      render(
        <MilestoneNotification milestoneLevel="growing" viewerType="parent" childName="Alex" />
      )

      expect(screen.getByTestId('milestone-notification')).toHaveTextContent('Alex')
    })

    it('should show personalized message in child view', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      const notification = screen.getByTestId('milestone-notification')
      // Should use "you" or "your" for child view
      expect(notification.textContent?.toLowerCase()).toMatch(/you|your/)
    })
  })

  describe('AC4: Developmental language', () => {
    it('should use recognition language', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      const notification = screen.getByTestId('milestone-notification')
      expect(notification.textContent?.toLowerCase()).toMatch(/recogniz|growth|growing/)
    })

    it('should NOT use reward language', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      const notification = screen.getByTestId('milestone-notification')
      expect(notification.textContent?.toLowerCase()).not.toContain('earned')
      expect(notification.textContent?.toLowerCase()).not.toContain('reward')
      expect(notification.textContent?.toLowerCase()).not.toContain('deserve')
    })

    it('should use developmental language for all milestones', () => {
      const milestones: TrustMilestoneLevel[] = ['growing', 'maturing', 'ready-for-independence']

      milestones.forEach((level) => {
        const { unmount } = render(
          <MilestoneNotification milestoneLevel={level} viewerType="child" childName="Alex" />
        )

        const notification = screen.getByTestId('milestone-notification')
        expect(notification.textContent?.toLowerCase()).not.toContain('earned')
        expect(notification.textContent?.toLowerCase()).not.toContain('reward')
        unmount()
      })
    })
  })

  describe('Milestone display', () => {
    it('should display milestone level name', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      expect(screen.getByTestId('milestone-level')).toBeInTheDocument()
    })

    it('should display milestone benefits', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      expect(screen.getByTestId('milestone-benefits')).toBeInTheDocument()
    })

    it('should show growing milestone correctly', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      expect(screen.getByTestId('milestone-level')).toHaveTextContent(/growing/i)
    })

    it('should show maturing milestone correctly', () => {
      render(
        <MilestoneNotification milestoneLevel="maturing" viewerType="child" childName="Alex" />
      )

      expect(screen.getByTestId('milestone-level')).toHaveTextContent(/maturing/i)
    })

    it('should show ready-for-independence milestone correctly', () => {
      render(
        <MilestoneNotification
          milestoneLevel="ready-for-independence"
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('milestone-level')).toHaveTextContent(/ready.*independence/i)
    })
  })

  describe('Celebratory elements', () => {
    it('should have celebratory styling', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      const notification = screen.getByTestId('milestone-notification')
      expect(notification).toHaveAttribute('data-celebratory', 'true')
    })

    it('should display celebration icon', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      expect(screen.getByTestId('celebration-icon')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have appropriate heading', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('should have alert role for notifications', () => {
      render(<MilestoneNotification milestoneLevel="growing" viewerType="child" childName="Alex" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
