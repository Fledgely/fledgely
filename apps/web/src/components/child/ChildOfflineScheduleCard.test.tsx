/**
 * ChildOfflineScheduleCard Component Tests - Story 32.1
 *
 * Tests for child-facing offline schedule display.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChildOfflineScheduleCard } from './ChildOfflineScheduleCard'
import type { OfflineScheduleConfig } from '../../hooks/useFamilyOfflineSchedule'

describe('ChildOfflineScheduleCard - Story 32.1 AC5', () => {
  const enabledSchedule: OfflineScheduleConfig = {
    enabled: true,
    preset: 'custom',
    weekdayStart: '21:00',
    weekdayEnd: '07:00',
    weekendStart: '22:00',
    weekendEnd: '08:00',
    appliesToParents: true,
    timezone: 'America/New_York',
  }

  const sameSchedule: OfflineScheduleConfig = {
    enabled: true,
    preset: 'dinner_time',
    weekdayStart: '18:00',
    weekdayEnd: '19:00',
    weekendStart: '18:00',
    weekendEnd: '19:00',
    appliesToParents: true,
    timezone: 'America/New_York',
  }

  describe('When schedule is enabled', () => {
    it('renders card with title', () => {
      render(<ChildOfflineScheduleCard schedule={enabledSchedule} />)

      expect(screen.getByText('Family Offline Time')).toBeDefined()
    })

    it('displays "Everyone unplugs together!" message (AC5)', () => {
      render(<ChildOfflineScheduleCard schedule={enabledSchedule} />)

      expect(screen.getByTestId('offline-message')).toBeDefined()
      expect(screen.getByText('Everyone unplugs together!')).toBeDefined()
    })

    it('shows schedule times', () => {
      render(<ChildOfflineScheduleCard schedule={enabledSchedule} />)

      expect(screen.getByTestId('schedule-times')).toBeDefined()
      // Should show both weekday and weekend since they're different
      const scheduleText = screen.getByTestId('schedule-times').textContent
      expect(scheduleText).toContain('Weekdays')
      expect(scheduleText).toContain('Weekends')
    })

    it('formats times in 12-hour format', () => {
      render(<ChildOfflineScheduleCard schedule={enabledSchedule} />)

      const scheduleText = screen.getByTestId('schedule-times').textContent
      expect(scheduleText).toContain('9:00 PM')
      expect(scheduleText).toContain('7:00 AM')
    })

    it('shows simplified schedule when weekday and weekend are same', () => {
      render(<ChildOfflineScheduleCard schedule={sameSchedule} />)

      const scheduleText = screen.getByTestId('schedule-times').textContent
      expect(scheduleText).toContain('Every day')
      expect(scheduleText).toContain('6:00 PM - 7:00 PM')
    })
  })

  describe('When schedule is disabled', () => {
    it('does not render anything', () => {
      const disabledSchedule = { ...enabledSchedule, enabled: false }
      const { container } = render(<ChildOfflineScheduleCard schedule={disabledSchedule} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('When schedule is null', () => {
    it('does not render anything', () => {
      const { container } = render(<ChildOfflineScheduleCard schedule={null} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Loading state', () => {
    it('shows loading state when loading', () => {
      render(<ChildOfflineScheduleCard schedule={enabledSchedule} loading={true} />)

      expect(screen.getByTestId('child-offline-schedule-loading')).toBeDefined()
      expect(screen.getByText('Loading...')).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    it('uses proper heading structure', () => {
      render(<ChildOfflineScheduleCard schedule={enabledSchedule} />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading.textContent).toBe('Family Offline Time')
    })
  })
})
