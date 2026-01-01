/**
 * OfflineScheduleCard Component Tests - Story 32.1
 *
 * Tests for family offline schedule configuration card.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OfflineScheduleCard } from './OfflineScheduleCard'
import type { OfflineScheduleConfig } from '../../hooks/useFamilyOfflineSchedule'

// Mock OFFLINE_PRESET_LABELS
vi.mock('@fledgely/shared', () => ({
  OFFLINE_PRESET_LABELS: {
    custom: 'Custom',
    dinner_time: 'Dinner Time',
    bedtime: 'Bedtime',
  },
}))

describe('OfflineScheduleCard - Story 32.1', () => {
  const mockSchedule: OfflineScheduleConfig = {
    enabled: true,
    preset: 'custom',
    weekdayStart: '21:00',
    weekdayEnd: '07:00',
    weekendStart: '22:00',
    weekendEnd: '08:00',
    appliesToParents: true,
    timezone: 'America/New_York',
  }

  const mockOnScheduleChange = vi.fn()
  const mockOnApplyPreset = vi.fn((preset) => ({
    ...mockSchedule,
    preset,
    enabled: true,
  }))
  const mockOnSave = vi.fn().mockResolvedValue({ success: true })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders card with title', () => {
    render(
      <OfflineScheduleCard
        schedule={mockSchedule}
        onScheduleChange={mockOnScheduleChange}
        onApplyPreset={mockOnApplyPreset}
        onSave={mockOnSave}
        hasChanges={false}
        loading={false}
        error={null}
      />
    )

    expect(screen.getByText('Family Offline Time')).toBeDefined()
    expect(screen.getByText('Everyone unplugs together')).toBeDefined()
  })

  it('shows loading state', () => {
    render(
      <OfflineScheduleCard
        schedule={null}
        onScheduleChange={mockOnScheduleChange}
        onApplyPreset={mockOnApplyPreset}
        onSave={mockOnSave}
        hasChanges={false}
        loading={true}
        error={null}
      />
    )

    expect(screen.getByTestId('offline-schedule-card-loading')).toBeDefined()
    expect(screen.getByText('Loading...')).toBeDefined()
  })

  describe('Toggle - AC1', () => {
    it('toggles schedule on/off', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      const toggle = screen.getByTestId('schedule-toggle')
      expect(toggle.getAttribute('aria-checked')).toBe('true')

      fireEvent.click(toggle)

      expect(mockOnScheduleChange).toHaveBeenCalledWith({
        ...mockSchedule,
        enabled: false,
      })
    })

    it('hides content when disabled', () => {
      const disabledSchedule = { ...mockSchedule, enabled: false }

      render(
        <OfflineScheduleCard
          schedule={disabledSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      expect(screen.queryByTestId('preset-dinner')).toBeNull()
      expect(screen.queryByTestId('start-time-select')).toBeNull()
    })
  })

  describe('Presets - AC3', () => {
    it('shows preset buttons', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      expect(screen.getByTestId('preset-dinner')).toBeDefined()
      expect(screen.getByTestId('preset-bedtime')).toBeDefined()
      expect(screen.getByTestId('preset-custom')).toBeDefined()
    })

    it('applies dinner_time preset', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      fireEvent.click(screen.getByTestId('preset-dinner'))

      expect(mockOnApplyPreset).toHaveBeenCalledWith('dinner_time')
      expect(mockOnScheduleChange).toHaveBeenCalled()
    })

    it('applies bedtime preset', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      fireEvent.click(screen.getByTestId('preset-bedtime'))

      expect(mockOnApplyPreset).toHaveBeenCalledWith('bedtime')
      expect(mockOnScheduleChange).toHaveBeenCalled()
    })
  })

  describe('Weekday/Weekend tabs - AC2', () => {
    it('shows weekday and weekend tabs', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      expect(screen.getByTestId('tab-weekdays')).toBeDefined()
      expect(screen.getByTestId('tab-weekends')).toBeDefined()
    })

    it('defaults to weekdays tab', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      const weekdaysTab = screen.getByTestId('tab-weekdays')
      expect(weekdaysTab.getAttribute('aria-selected')).toBe('true')
    })

    it('switches to weekends tab', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      fireEvent.click(screen.getByTestId('tab-weekends'))

      const weekendsTab = screen.getByTestId('tab-weekends')
      expect(weekendsTab.getAttribute('aria-selected')).toBe('true')
    })
  })

  describe('Time pickers - AC1', () => {
    it('shows start and end time selects', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      expect(screen.getByTestId('start-time-select')).toBeDefined()
      expect(screen.getByTestId('end-time-select')).toBeDefined()
    })

    it('updates weekday start time', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      const startSelect = screen.getByTestId('start-time-select')
      fireEvent.change(startSelect, { target: { value: '20:00' } })

      expect(mockOnScheduleChange).toHaveBeenCalledWith({
        ...mockSchedule,
        weekdayStart: '20:00',
        preset: 'custom',
      })
    })

    it('updates weekend times when weekends tab is active', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      // Switch to weekends
      fireEvent.click(screen.getByTestId('tab-weekends'))

      const startSelect = screen.getByTestId('start-time-select')
      fireEvent.change(startSelect, { target: { value: '23:00' } })

      expect(mockOnScheduleChange).toHaveBeenCalledWith({
        ...mockSchedule,
        weekendStart: '23:00',
        preset: 'custom',
      })
    })
  })

  describe('Parents option - AC4', () => {
    it('shows parents toggle', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      expect(screen.getByTestId('parents-toggle')).toBeDefined()
      expect(screen.getByText('Include parents')).toBeDefined()
    })

    it('toggles parents option', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      const toggle = screen.getByTestId('parents-toggle')
      fireEvent.click(toggle)

      expect(mockOnScheduleChange).toHaveBeenCalledWith({
        ...mockSchedule,
        appliesToParents: false,
      })
    })
  })

  describe('Save functionality', () => {
    it('shows save button when enabled', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={true}
          loading={false}
          error={null}
        />
      )

      expect(screen.getByTestId('save-button')).toBeDefined()
    })

    it('disables save button when no changes', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error={null}
        />
      )

      const saveButton = screen.getByTestId('save-button')
      expect(saveButton.hasAttribute('disabled')).toBe(true)
    })

    it('calls onSave when save button clicked', async () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={true}
          loading={false}
          error={null}
        />
      )

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(mockSchedule)
      })
    })

    it('shows success state after save', async () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={true}
          loading={false}
          error={null}
        />
      )

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByText('Saved!')).toBeDefined()
      })
    })

    it('shows error message on save failure', async () => {
      const mockOnSaveError = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to save schedule',
      })

      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSaveError}
          hasChanges={true}
          loading={false}
          error={null}
        />
      )

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeDefined()
        expect(screen.getByText('Failed to save schedule')).toBeDefined()
      })
    })
  })

  describe('Error handling', () => {
    it('displays error from props', () => {
      render(
        <OfflineScheduleCard
          schedule={mockSchedule}
          onScheduleChange={mockOnScheduleChange}
          onApplyPreset={mockOnApplyPreset}
          onSave={mockOnSave}
          hasChanges={false}
          loading={false}
          error="Failed to load schedule"
        />
      )

      expect(screen.getByTestId('error-message')).toBeDefined()
      expect(screen.getByText('Failed to load schedule')).toBeDefined()
    })
  })
})
