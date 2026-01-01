/**
 * WorkModeSettings Component Tests - Story 33.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WorkModeSettings } from './WorkModeSettings'
import type { WorkModeConfig } from '@fledgely/shared'

// Mock the hook
const mockAddSchedule = vi.fn()
const mockRemoveSchedule = vi.fn()
const mockToggleScheduleEnabled = vi.fn()
const mockAddWorkApp = vi.fn()
const mockRemoveWorkApp = vi.fn()
const mockToggleDefaultWorkApps = vi.fn()
const mockTogglePauseScreenshots = vi.fn()
const mockToggleSuspendTimeLimits = vi.fn()
const mockToggleAllowManualActivation = vi.fn()

vi.mock('../../hooks/useWorkModeConfig', () => ({
  useWorkModeConfig: () => ({
    config: mockConfig,
    loading: mockLoading,
    error: mockError,
    addSchedule: mockAddSchedule,
    removeSchedule: mockRemoveSchedule,
    toggleScheduleEnabled: mockToggleScheduleEnabled,
    addWorkApp: mockAddWorkApp,
    removeWorkApp: mockRemoveWorkApp,
    toggleDefaultWorkApps: mockToggleDefaultWorkApps,
    togglePauseScreenshots: mockTogglePauseScreenshots,
    toggleSuspendTimeLimits: mockToggleSuspendTimeLimits,
    toggleAllowManualActivation: mockToggleAllowManualActivation,
    effectiveWorkApps: mockEffectiveWorkApps,
  }),
}))

let mockConfig: WorkModeConfig | null = null
let mockLoading = false
let mockError: string | null = null
let mockEffectiveWorkApps: { pattern: string; name: string; isDefault: boolean }[] = []

describe('WorkModeSettings - Story 33.3', () => {
  const defaultProps = {
    childId: 'child-1',
    familyId: 'family-1',
    parentUid: 'parent-1',
    childName: 'Emma',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockConfig = {
      childId: 'child-1',
      familyId: 'family-1',
      schedules: [],
      useDefaultWorkApps: true,
      customWorkApps: [],
      pauseScreenshots: true,
      suspendTimeLimits: true,
      allowManualActivation: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    mockLoading = false
    mockError = null
    mockEffectiveWorkApps = [
      { pattern: 'slack.com', name: 'Slack', isDefault: true },
      { pattern: 'teams.microsoft.com', name: 'Teams', isDefault: true },
    ]
    mockAddSchedule.mockResolvedValue('schedule-1')
    mockRemoveSchedule.mockResolvedValue(undefined)
    mockAddWorkApp.mockResolvedValue(undefined)
    mockRemoveWorkApp.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders loading state', () => {
      mockLoading = true
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByTestId('work-mode-settings-loading')).toBeInTheDocument()
    })

    it('renders error state', () => {
      mockError = 'Failed to load'
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByTestId('work-mode-settings-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })

    it('renders main settings view', () => {
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByTestId('work-mode-settings')).toBeInTheDocument()
      expect(screen.getByText('Work Mode Settings')).toBeInTheDocument()
      expect(screen.getByText(/Configure work schedules/)).toBeInTheDocument()
    })

    it('shows child name in description', () => {
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByText(/Emma/)).toBeInTheDocument()
    })
  })

  describe('schedule management', () => {
    it('shows empty state when no schedules', () => {
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByText(/No schedules configured/)).toBeInTheDocument()
    })

    it('shows add schedule button', () => {
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByTestId('add-schedule-button')).toBeInTheDocument()
    })

    it('opens schedule form when add button clicked', () => {
      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-schedule-button'))

      expect(screen.getByTestId('schedule-form')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-name-input')).toBeInTheDocument()
    })

    it('can toggle day selection', () => {
      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-schedule-button'))

      const mondayButton = screen.getByTestId('day-toggle-monday')
      fireEvent.click(mondayButton)

      expect(mondayButton).toHaveClass('bg-blue-600')
    })

    it('can add a schedule', async () => {
      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-schedule-button'))

      fireEvent.change(screen.getByTestId('schedule-name-input'), {
        target: { value: 'Coffee Shop' },
      })
      fireEvent.click(screen.getByTestId('day-toggle-saturday'))
      fireEvent.click(screen.getByTestId('day-toggle-sunday'))

      fireEvent.click(screen.getByTestId('save-schedule-button'))

      await waitFor(() => {
        expect(mockAddSchedule).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Coffee Shop',
            days: expect.arrayContaining(['saturday', 'sunday']),
          })
        )
      })
    })

    it('can cancel schedule form', () => {
      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-schedule-button'))
      expect(screen.getByTestId('schedule-form')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('cancel-schedule-button'))
      expect(screen.queryByTestId('schedule-form')).not.toBeInTheDocument()
    })

    it('renders existing schedules', () => {
      mockConfig = {
        ...mockConfig!,
        schedules: [
          {
            id: 'schedule-1',
            name: 'Coffee Shop',
            days: ['saturday', 'sunday'],
            startTime: '10:00',
            endTime: '16:00',
            isEnabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      }

      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByTestId('schedule-schedule-1')).toBeInTheDocument()
      expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
      expect(screen.getByText(/Sat, Sun/)).toBeInTheDocument()
    })

    it('can toggle schedule enabled', () => {
      mockConfig = {
        ...mockConfig!,
        schedules: [
          {
            id: 'schedule-1',
            name: 'Coffee Shop',
            days: ['saturday'],
            startTime: '10:00',
            endTime: '16:00',
            isEnabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      }

      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.click(screen.getByTestId('schedule-toggle-schedule-1'))

      expect(mockToggleScheduleEnabled).toHaveBeenCalledWith('schedule-1')
    })

    it('can remove a schedule', () => {
      mockConfig = {
        ...mockConfig!,
        schedules: [
          {
            id: 'schedule-1',
            name: 'Coffee Shop',
            days: ['saturday'],
            startTime: '10:00',
            endTime: '16:00',
            isEnabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      }

      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.click(screen.getByTestId('remove-schedule-schedule-1'))

      expect(mockRemoveSchedule).toHaveBeenCalledWith('schedule-1')
    })
  })

  describe('work mode toggles', () => {
    it('renders pause screenshots toggle', () => {
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByTestId('pause-screenshots-toggle')).toBeInTheDocument()
    })

    it('can toggle pause screenshots', () => {
      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.click(screen.getByTestId('pause-screenshots-toggle'))

      expect(mockTogglePauseScreenshots).toHaveBeenCalledWith(false)
    })

    it('renders suspend time limits toggle', () => {
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByTestId('suspend-time-limits-toggle')).toBeInTheDocument()
    })

    it('can toggle suspend time limits', () => {
      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.click(screen.getByTestId('suspend-time-limits-toggle'))

      expect(mockToggleSuspendTimeLimits).toHaveBeenCalledWith(false)
    })

    it('renders allow manual activation toggle', () => {
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByTestId('allow-manual-activation-toggle')).toBeInTheDocument()
    })

    it('can toggle allow manual activation', () => {
      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.click(screen.getByTestId('allow-manual-activation-toggle'))

      expect(mockToggleAllowManualActivation).toHaveBeenCalledWith(false)
    })
  })

  describe('default work apps', () => {
    it('renders default work apps toggle', () => {
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByTestId('default-work-apps-toggle')).toBeInTheDocument()
    })

    it('can toggle default work apps', () => {
      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.click(screen.getByTestId('default-work-apps-toggle'))

      expect(mockToggleDefaultWorkApps).toHaveBeenCalledWith(false)
    })
  })

  describe('work app whitelist', () => {
    it('renders work apps list', () => {
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getByTestId('work-apps-list')).toBeInTheDocument()
      // Slack appears in both default categories and work apps list
      expect(screen.getAllByText('Slack').length).toBeGreaterThan(0)
    })

    it('shows default badge for default apps', () => {
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.getAllByText('default').length).toBeGreaterThan(0)
    })

    it('can add a custom work app', async () => {
      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.change(screen.getByTestId('work-app-pattern-input'), {
        target: { value: 'customapp.com' },
      })
      fireEvent.change(screen.getByTestId('work-app-name-input'), {
        target: { value: 'Custom App' },
      })
      fireEvent.click(screen.getByTestId('add-work-app-button'))

      await waitFor(() => {
        expect(mockAddWorkApp).toHaveBeenCalledWith('customapp.com', 'Custom App')
      })
    })

    it('can remove a custom work app', () => {
      mockEffectiveWorkApps = [{ pattern: 'customapp.com', name: 'Custom App', isDefault: false }]

      render(<WorkModeSettings {...defaultProps} />)

      fireEvent.click(screen.getByTestId('remove-work-app-customapp.com'))

      expect(mockRemoveWorkApp).toHaveBeenCalledWith('customapp.com')
    })

    it('does not show remove button for default apps', () => {
      render(<WorkModeSettings {...defaultProps} />)

      expect(screen.queryByTestId('remove-work-app-slack.com')).not.toBeInTheDocument()
    })
  })
})
