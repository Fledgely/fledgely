/**
 * FrequencyChangeNotification Component Tests - Story 37.2 Task 3
 *
 * Tests for frequency change notification display.
 * AC5: Child notified of frequency reduction with celebratory message
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FrequencyChangeNotification } from './FrequencyChangeNotification'

describe('FrequencyChangeNotification - Story 37.2 Task 3', () => {
  describe('AC5: Celebratory notification', () => {
    it('should render notification for child view', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('frequency-notification')).toBeInTheDocument()
    })

    it('should render notification for parent view', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('frequency-notification')).toBeInTheDocument()
      expect(screen.getByTestId('frequency-notification')).toHaveTextContent('Alex')
    })

    it('should show celebratory elements', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('celebration-icon')).toBeInTheDocument()
      expect(screen.getByTestId('frequency-notification')).toHaveAttribute(
        'data-celebratory',
        'true'
      )
    })
  })

  describe('Frequency display', () => {
    it('should show old frequency', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('previous-frequency')).toHaveTextContent('5')
    })

    it('should show new frequency', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('new-frequency')).toHaveTextContent('15')
    })

    it('should show frequency comparison', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="maturing"
          previousFrequency={15}
          newFrequency={30}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('frequency-comparison')).toBeInTheDocument()
    })
  })

  describe('Developmental language', () => {
    it('should use recognition language', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="child"
          childName="Alex"
        />
      )

      const notification = screen.getByTestId('frequency-notification')
      expect(notification.textContent?.toLowerCase()).toMatch(/recogniz|growth|growing/)
    })

    it('should NOT use reward language', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="child"
          childName="Alex"
        />
      )

      const notification = screen.getByTestId('frequency-notification')
      expect(notification.textContent?.toLowerCase()).not.toContain('earned')
      expect(notification.textContent?.toLowerCase()).not.toContain('reward')
      expect(notification.textContent?.toLowerCase()).not.toContain('deserve')
    })
  })

  describe('Different milestone levels', () => {
    it('should handle growing milestone', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('milestone-level')).toHaveTextContent(/growing/i)
    })

    it('should handle maturing milestone', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="maturing"
          previousFrequency={15}
          newFrequency={30}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('milestone-level')).toHaveTextContent(/maturing/i)
    })

    it('should handle ready-for-independence milestone', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="ready-for-independence"
          previousFrequency={30}
          newFrequency={60}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('milestone-level')).toHaveTextContent(/ready.*independence/i)
    })
  })

  describe('Personalization', () => {
    it('should use "you" language for child view', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="child"
          childName="Alex"
        />
      )

      const notification = screen.getByTestId('frequency-notification')
      expect(notification.textContent?.toLowerCase()).toMatch(/you|your/)
    })

    it('should use child name for parent view', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('frequency-notification')).toHaveTextContent('Alex')
    })
  })

  describe('Accessibility', () => {
    it('should have appropriate heading', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('should have alert role for notifications', () => {
      render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
