/**
 * WorkModeControls Component Tests - Story 33.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WorkModeControls } from './WorkModeControls'
import type { WorkModeConfig, WorkSchedule } from '@fledgely/shared'

// Mock the hooks
const mockStartWorkMode = vi.fn()
const mockStopWorkMode = vi.fn()

let mockWorkModeState = {
  loading: false,
  error: null as string | null,
  isActive: false,
  currentSession: null as unknown,
  timeElapsedFormatted: null as string | null,
  timeRemainingFormatted: null as string | null,
  startWorkMode: mockStartWorkMode,
  stopWorkMode: mockStopWorkMode,
  isInScheduledHours: false,
  currentSchedule: null as WorkSchedule | null,
  nextScheduleStart: null as Date | null,
  totalSessionsThisWeek: 0,
  totalWorkTimeThisWeek: 0,
  workState: null,
  timeElapsedMs: null,
  timeRemainingMs: null,
}

let mockConfig: WorkModeConfig | null = null

vi.mock('../../hooks/useWorkMode', () => ({
  useWorkMode: () => mockWorkModeState,
}))

vi.mock('../../hooks/useWorkModeConfig', () => ({
  useWorkModeConfig: () => ({
    config: mockConfig,
    loading: false,
    error: null,
  }),
}))

describe('WorkModeControls - Story 33.3', () => {
  const defaultProps = {
    childId: 'child-1',
    familyId: 'family-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStartWorkMode.mockResolvedValue(undefined)
    mockStopWorkMode.mockResolvedValue(undefined)

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

    mockWorkModeState = {
      loading: false,
      error: null,
      isActive: false,
      currentSession: null,
      timeElapsedFormatted: null,
      timeRemainingFormatted: null,
      startWorkMode: mockStartWorkMode,
      stopWorkMode: mockStopWorkMode,
      isInScheduledHours: false,
      currentSchedule: null,
      nextScheduleStart: null,
      totalSessionsThisWeek: 0,
      totalWorkTimeThisWeek: 0,
      workState: null,
      timeElapsedMs: null,
      timeRemainingMs: null,
    }
  })

  describe('rendering', () => {
    it('renders loading state', () => {
      mockWorkModeState.loading = true
      render(<WorkModeControls {...defaultProps} />)

      expect(screen.getByTestId('work-mode-controls-loading')).toBeInTheDocument()
    })

    it('renders error state', () => {
      mockWorkModeState.error = 'Failed to load'
      render(<WorkModeControls {...defaultProps} />)

      expect(screen.getByTestId('work-mode-controls-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })

    it('renders inactive state', () => {
      render(<WorkModeControls {...defaultProps} />)

      expect(screen.getByTestId('work-mode-controls')).toBeInTheDocument()
      expect(screen.getByTestId('work-mode-status-card')).toBeInTheDocument()
      expect(screen.getByTestId('work-mode-status-title')).toHaveTextContent('Work Mode')
    })

    it('renders active state', () => {
      mockWorkModeState.isActive = true
      mockWorkModeState.currentSession = {
        id: 'work-1',
        activationType: 'manual',
        scheduleName: null,
      }
      mockWorkModeState.timeElapsedFormatted = '30m'

      render(<WorkModeControls {...defaultProps} />)

      // WORK_MODE_MESSAGES.active(null) returns "Work mode active (manual)"
      expect(screen.getByTestId('work-mode-status-title')).toHaveTextContent(
        'Work mode active (manual)'
      )
      expect(screen.getByTestId('work-mode-timer')).toBeInTheDocument()
      expect(screen.getByText('30m')).toBeInTheDocument()
    })
  })

  describe('manual controls', () => {
    it('shows start button when inactive', () => {
      render(<WorkModeControls {...defaultProps} />)

      expect(screen.getByTestId('work-mode-start-button')).toBeInTheDocument()
      expect(screen.getByText('Start Work Mode')).toBeInTheDocument()
    })

    it('shows stop button when active', () => {
      mockWorkModeState.isActive = true
      mockWorkModeState.currentSession = {
        id: 'work-1',
        activationType: 'manual',
        scheduleName: null,
      }

      render(<WorkModeControls {...defaultProps} />)

      expect(screen.getByTestId('work-mode-stop-button')).toBeInTheDocument()
      expect(screen.getByTestId('work-mode-stop-button')).toHaveTextContent('End Work Mode')
    })

    it('calls startWorkMode when start button clicked', async () => {
      render(<WorkModeControls {...defaultProps} />)

      fireEvent.click(screen.getByTestId('work-mode-start-button'))

      await waitFor(() => {
        expect(mockStartWorkMode).toHaveBeenCalled()
      })
    })

    it('calls stopWorkMode when stop button clicked', async () => {
      mockWorkModeState.isActive = true
      mockWorkModeState.currentSession = {
        id: 'work-1',
        activationType: 'manual',
      }

      render(<WorkModeControls {...defaultProps} />)

      fireEvent.click(screen.getByTestId('work-mode-stop-button'))

      await waitFor(() => {
        expect(mockStopWorkMode).toHaveBeenCalled()
      })
    })

    it('hides controls when manual activation is disabled', () => {
      mockConfig = {
        ...mockConfig!,
        allowManualActivation: false,
      }

      render(<WorkModeControls {...defaultProps} />)

      expect(screen.queryByTestId('work-mode-start-button')).not.toBeInTheDocument()
    })
  })

  describe('schedule info', () => {
    it('shows next schedule when available', () => {
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
      mockWorkModeState.nextScheduleStart = new Date(Date.now() + 24 * 60 * 60 * 1000)

      render(<WorkModeControls {...defaultProps} />)

      expect(screen.getByTestId('work-mode-schedule-info')).toBeInTheDocument()
      expect(screen.getByTestId('next-schedule-time')).toBeInTheDocument()
    })

    it('hides schedule info when active', () => {
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
      mockWorkModeState.isActive = true
      mockWorkModeState.currentSession = {
        id: 'work-1',
        activationType: 'scheduled',
        scheduleName: 'Coffee Shop',
      }

      render(<WorkModeControls {...defaultProps} />)

      expect(screen.queryByTestId('work-mode-schedule-info')).not.toBeInTheDocument()
    })
  })

  describe('stats display', () => {
    it('shows stats when there are sessions today', () => {
      mockWorkModeState.totalSessionsThisWeek = 2
      mockWorkModeState.totalWorkTimeThisWeek = 7200000 // 2 hours

      render(<WorkModeControls {...defaultProps} />)

      expect(screen.getByTestId('work-mode-stats')).toBeInTheDocument()
      expect(screen.getByTestId('sessions-today')).toHaveTextContent('2')
      expect(screen.getByTestId('total-work-time')).toHaveTextContent('2h 0m')
    })

    it('hides stats when no sessions today', () => {
      mockWorkModeState.totalSessionsThisWeek = 0
      mockWorkModeState.totalWorkTimeThisWeek = 0

      render(<WorkModeControls {...defaultProps} />)

      expect(screen.queryByTestId('work-mode-stats')).not.toBeInTheDocument()
    })
  })

  describe('benefits display', () => {
    it('shows benefits when active', () => {
      mockWorkModeState.isActive = true
      mockWorkModeState.currentSession = {
        id: 'work-1',
        activationType: 'manual',
      }

      render(<WorkModeControls {...defaultProps} />)

      expect(screen.getByTestId('work-mode-benefits')).toBeInTheDocument()
      expect(screen.getByText(/Screenshot capture paused/)).toBeInTheDocument()
      expect(screen.getByText(/App time limits suspended/)).toBeInTheDocument()
    })

    it('hides benefits when inactive', () => {
      render(<WorkModeControls {...defaultProps} />)

      expect(screen.queryByTestId('work-mode-benefits')).not.toBeInTheDocument()
    })
  })

  describe('scheduled activation display', () => {
    it('shows schedule name when auto-started', () => {
      mockWorkModeState.isActive = true
      mockWorkModeState.currentSession = {
        id: 'work-1',
        activationType: 'scheduled',
        scheduleName: 'Coffee Shop',
      }

      render(<WorkModeControls {...defaultProps} />)

      expect(screen.getByTestId('work-mode-status-subtitle')).toHaveTextContent(
        /Auto-started: Coffee Shop/
      )
    })

    it('shows manual start message when manually started', () => {
      mockWorkModeState.isActive = true
      mockWorkModeState.currentSession = {
        id: 'work-1',
        activationType: 'manual',
        scheduleName: null,
      }

      render(<WorkModeControls {...defaultProps} />)

      // WORK_MODE_MESSAGES.manualStart = 'Work mode started. Monitoring paused until you end it.'
      expect(screen.getByTestId('work-mode-status-subtitle')).toHaveTextContent(/Work mode started/)
    })
  })
})
