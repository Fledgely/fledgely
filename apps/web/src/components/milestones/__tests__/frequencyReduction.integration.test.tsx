/**
 * Frequency Reduction Integration Tests - Story 37.2 Task 5
 *
 * Integration tests for the complete frequency reduction system.
 * Tests all acceptance criteria together.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  getFrequencyForMilestone,
  calculateFrequencyChange,
  applyFrequencyReduction,
  DEFAULT_FREQUENCY_MINUTES,
  MILESTONE_FREQUENCIES,
} from '@fledgely/shared'
import { FrequencyChangeNotification } from '../FrequencyChangeNotification'
import { FrequencyDisplay } from '../FrequencyDisplay'

describe('Frequency Reduction Integration - Story 37.2 Task 5', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'))
  })

  describe('AC1: Growing milestone reduces to 15 minutes', () => {
    it('should return 15 minutes for growing milestone', () => {
      expect(MILESTONE_FREQUENCIES.growing).toBe(15)
      expect(getFrequencyForMilestone('growing')).toBe(15)
    })

    it('should calculate correct change from default to growing', () => {
      const change = calculateFrequencyChange('child-1', null, 'growing')

      expect(change.previousFrequency).toBe(5)
      expect(change.newFrequency).toBe(15)
      expect(change.isReduction).toBe(true)
    })

    it('should apply 15 minute frequency on growing milestone', () => {
      const update = applyFrequencyReduction('child-1', 'growing', null)

      expect(update.newFrequencyMinutes).toBe(15)
      expect(update.success).toBe(true)
    })
  })

  describe('AC2: Maturing milestone reduces to 30 minutes', () => {
    it('should return 30 minutes for maturing milestone', () => {
      expect(MILESTONE_FREQUENCIES.maturing).toBe(30)
      expect(getFrequencyForMilestone('maturing')).toBe(30)
    })

    it('should calculate correct change from growing to maturing', () => {
      const change = calculateFrequencyChange('child-1', 'growing', 'maturing')

      expect(change.previousFrequency).toBe(15)
      expect(change.newFrequency).toBe(30)
      expect(change.isReduction).toBe(true)
    })

    it('should apply 30 minute frequency on maturing milestone', () => {
      const update = applyFrequencyReduction('child-1', 'maturing', 'growing')

      expect(update.newFrequencyMinutes).toBe(30)
      expect(update.success).toBe(true)
    })
  })

  describe('AC3: Ready for Independence reduces to 60 minutes', () => {
    it('should return 60 minutes for ready-for-independence milestone', () => {
      expect(MILESTONE_FREQUENCIES['ready-for-independence']).toBe(60)
      expect(getFrequencyForMilestone('ready-for-independence')).toBe(60)
    })

    it('should calculate correct change from maturing to ready-for-independence', () => {
      const change = calculateFrequencyChange('child-1', 'maturing', 'ready-for-independence')

      expect(change.previousFrequency).toBe(30)
      expect(change.newFrequency).toBe(60)
      expect(change.isReduction).toBe(true)
    })

    it('should apply 60 minute frequency on ready-for-independence milestone', () => {
      const update = applyFrequencyReduction('child-1', 'ready-for-independence', 'maturing')

      expect(update.newFrequencyMinutes).toBe(60)
      expect(update.success).toBe(true)
    })
  })

  describe('AC4: Automatic frequency changes', () => {
    it('should automatically apply changes upon milestone achievement', () => {
      // Simulate milestone transition
      const update = applyFrequencyReduction('child-1', 'growing', null)

      expect(update.success).toBe(true)
      expect(update.appliedAt).toBeInstanceOf(Date)
      expect(update.newFrequencyMinutes).toBe(15)
    })

    it('should support complete milestone progression', () => {
      // No milestone -> Growing
      let update = applyFrequencyReduction('child-1', 'growing', null)
      expect(update.newFrequencyMinutes).toBe(15)

      // Growing -> Maturing
      update = applyFrequencyReduction('child-1', 'maturing', 'growing')
      expect(update.newFrequencyMinutes).toBe(30)

      // Maturing -> Ready for Independence
      update = applyFrequencyReduction('child-1', 'ready-for-independence', 'maturing')
      expect(update.newFrequencyMinutes).toBe(60)
    })
  })

  describe('AC5: Celebratory notification', () => {
    it('should show celebratory notification for child', () => {
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

    it('should use developmental language in notification', () => {
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
      expect(notification.textContent?.toLowerCase()).not.toContain('earned')
      expect(notification.textContent?.toLowerCase()).not.toContain('reward')
    })

    it('should show old and new frequency', () => {
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
      expect(screen.getByTestId('new-frequency')).toHaveTextContent('15')
    })
  })

  describe('AC6: Parent dashboard frequency display', () => {
    it('should show current frequency on parent dashboard', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('current-frequency')).toHaveTextContent('15')
    })

    it('should show milestone connection', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('milestone-connection')).toHaveTextContent(/growing/i)
    })

    it('should include child name', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={15}
          milestoneLevel="growing"
          viewerType="parent"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('frequency-display')).toHaveTextContent('Alex')
    })
  })

  describe('Frequency progression flow', () => {
    it('should correctly display default frequency', () => {
      render(
        <FrequencyDisplay
          frequencyMinutes={DEFAULT_FREQUENCY_MINUTES}
          milestoneLevel={null}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('current-frequency')).toHaveTextContent('5')
    })

    it('should show frequency comparison in notification', () => {
      const { rerender } = render(
        <FrequencyChangeNotification
          milestoneLevel="growing"
          previousFrequency={5}
          newFrequency={15}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('frequency-comparison')).toBeInTheDocument()

      // Rerender with next milestone
      rerender(
        <FrequencyChangeNotification
          milestoneLevel="maturing"
          previousFrequency={15}
          newFrequency={30}
          viewerType="child"
          childName="Alex"
        />
      )

      expect(screen.getByTestId('previous-frequency')).toHaveTextContent('15')
      expect(screen.getByTestId('new-frequency')).toHaveTextContent('30')
    })
  })

  describe('Regression handling', () => {
    it('should return to baseline on regression to no milestone', () => {
      const update = applyFrequencyReduction('child-1', null, 'growing')

      expect(update.newFrequencyMinutes).toBe(DEFAULT_FREQUENCY_MINUTES)
    })

    it('should adjust frequency on regression to lower milestone', () => {
      const update = applyFrequencyReduction('child-1', 'growing', 'maturing')

      expect(update.newFrequencyMinutes).toBe(15)
      expect(update.previousFrequencyMinutes).toBe(30)
    })
  })
})
