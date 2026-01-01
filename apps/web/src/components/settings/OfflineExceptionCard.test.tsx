/**
 * OfflineExceptionCard Component Tests - Story 32.5
 *
 * Tests for offline time exception management UI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OfflineExceptionCard } from './OfflineExceptionCard'

// Mock hooks
const mockPauseOfflineTime = vi.fn()
const mockResumeOfflineTime = vi.fn()
const mockSkipTonight = vi.fn()
const mockCancelException = vi.fn()
const mockGetDisplayMessage = vi.fn((exc) => `${exc.requestedByName} ${exc.type}ed offline time`)

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    firebaseUser: { uid: 'parent-123', displayName: 'Mom' },
    userProfile: { displayName: 'Mom' },
  }),
}))

vi.mock('../../contexts/FamilyContext', () => ({
  useFamily: () => ({
    family: { id: 'family-123', name: 'Test Family' },
  }),
}))

const mockUseOfflineExceptions = vi.fn()
const mockUseIsOfflineTimePaused = vi.fn()

vi.mock('../../hooks/useOfflineExceptions', () => ({
  useOfflineExceptions: (...args: unknown[]) => mockUseOfflineExceptions(...args),
  useIsOfflineTimePaused: (...args: unknown[]) => mockUseIsOfflineTimePaused(...args),
}))

describe('OfflineExceptionCard - Story 32.5', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseOfflineExceptions.mockReturnValue({
      exceptions: [],
      activeException: null,
      loading: false,
      error: null,
      pauseOfflineTime: mockPauseOfflineTime,
      resumeOfflineTime: mockResumeOfflineTime,
      skipTonight: mockSkipTonight,
      cancelException: mockCancelException,
      getDisplayMessage: mockGetDisplayMessage,
      messages: {
        pause: 'Pause',
        skip: 'Skip Tonight',
      },
    })

    mockUseIsOfflineTimePaused.mockReturnValue({
      isPaused: false,
      isSkipped: false,
      activeException: null,
      loading: false,
    })
  })

  describe('rendering', () => {
    it('renders the card with title', () => {
      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      expect(screen.getByText('Offline Time Exceptions')).toBeInTheDocument()
    })

    it('shows info banner when schedule is enabled but no exceptions', () => {
      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      expect(
        screen.getByText('Offline schedule is active. No exceptions currently in effect.')
      ).toBeInTheDocument()
    })

    it('shows empty state when schedule is disabled', () => {
      render(<OfflineExceptionCard offlineScheduleEnabled={false} />)

      expect(
        screen.getByText('Enable an offline schedule above to use exception controls.')
      ).toBeInTheDocument()
    })

    it('shows loading state', () => {
      mockUseOfflineExceptions.mockReturnValue({
        exceptions: [],
        activeException: null,
        loading: true,
        error: null,
        pauseOfflineTime: mockPauseOfflineTime,
        resumeOfflineTime: mockResumeOfflineTime,
        skipTonight: mockSkipTonight,
        cancelException: mockCancelException,
        getDisplayMessage: mockGetDisplayMessage,
        messages: {},
      })

      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows error message when error occurs', () => {
      mockUseOfflineExceptions.mockReturnValue({
        exceptions: [],
        activeException: null,
        loading: false,
        error: 'Failed to load exceptions',
        pauseOfflineTime: mockPauseOfflineTime,
        resumeOfflineTime: mockResumeOfflineTime,
        skipTonight: mockSkipTonight,
        cancelException: mockCancelException,
        getDisplayMessage: mockGetDisplayMessage,
        messages: {},
      })

      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      expect(screen.getByText('Failed to load exceptions')).toBeInTheDocument()
    })
  })

  describe('Pause functionality - AC1', () => {
    it('shows pause button when not paused', () => {
      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      expect(screen.getByRole('button', { name: /pause offline time/i })).toBeInTheDocument()
    })

    it('shows reason input on first pause click', () => {
      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      const pauseButton = screen.getByRole('button', { name: /pause offline time/i })
      fireEvent.click(pauseButton)

      expect(screen.getByPlaceholderText(/reason/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirm pause/i })).toBeInTheDocument()
    })

    it('calls pauseOfflineTime on confirm', async () => {
      mockPauseOfflineTime.mockResolvedValue('new-exception-id')

      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      // First click shows reason input
      const pauseButton = screen.getByRole('button', { name: /pause offline time/i })
      fireEvent.click(pauseButton)

      // Enter reason
      const reasonInput = screen.getByPlaceholderText(/reason/i)
      fireEvent.change(reasonInput, { target: { value: 'Emergency' } })

      // Confirm pause
      const confirmButton = screen.getByRole('button', { name: /confirm pause/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockPauseOfflineTime).toHaveBeenCalledWith('parent-123', 'Mom', 'Emergency')
      })
    })

    it('shows resume button when paused', () => {
      mockUseIsOfflineTimePaused.mockReturnValue({
        isPaused: true,
        isSkipped: false,
        activeException: {
          id: 'exc-1',
          type: 'pause',
          status: 'active',
          requestedByName: 'Mom',
        },
        loading: false,
      })

      mockUseOfflineExceptions.mockReturnValue({
        exceptions: [],
        activeException: {
          id: 'exc-1',
          type: 'pause',
          status: 'active',
          requestedByName: 'Mom',
        },
        loading: false,
        error: null,
        pauseOfflineTime: mockPauseOfflineTime,
        resumeOfflineTime: mockResumeOfflineTime,
        skipTonight: mockSkipTonight,
        cancelException: mockCancelException,
        getDisplayMessage: mockGetDisplayMessage,
        messages: {},
      })

      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      expect(screen.getByRole('button', { name: /resume offline time/i })).toBeInTheDocument()
    })

    it('calls resumeOfflineTime on resume click', async () => {
      mockResumeOfflineTime.mockResolvedValue(undefined)

      mockUseIsOfflineTimePaused.mockReturnValue({
        isPaused: true,
        isSkipped: false,
        activeException: { id: 'exc-1', type: 'pause', status: 'active' },
        loading: false,
      })

      mockUseOfflineExceptions.mockReturnValue({
        exceptions: [],
        activeException: { id: 'exc-1', type: 'pause', status: 'active' },
        loading: false,
        error: null,
        pauseOfflineTime: mockPauseOfflineTime,
        resumeOfflineTime: mockResumeOfflineTime,
        skipTonight: mockSkipTonight,
        cancelException: mockCancelException,
        getDisplayMessage: mockGetDisplayMessage,
        messages: {},
      })

      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      const resumeButton = screen.getByRole('button', { name: /resume offline time/i })
      fireEvent.click(resumeButton)

      await waitFor(() => {
        expect(mockResumeOfflineTime).toHaveBeenCalledWith('exc-1')
      })
    })
  })

  describe('Skip Tonight functionality - AC5', () => {
    it('shows skip tonight button when not skipped', () => {
      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      expect(screen.getByRole('button', { name: /skip tonight/i })).toBeInTheDocument()
    })

    it('calls skipTonight on confirm', async () => {
      mockSkipTonight.mockResolvedValue('new-skip-id')

      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      // First click shows reason input
      const skipButton = screen.getByRole('button', { name: /skip tonight/i })
      fireEvent.click(skipButton)

      // Enter reason
      const reasonInput = screen.getByPlaceholderText(/reason/i)
      fireEvent.change(reasonInput, { target: { value: 'Movie night' } })

      // Confirm skip
      const confirmButton = screen.getByRole('button', { name: /confirm skip tonight/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockSkipTonight).toHaveBeenCalledWith('parent-123', 'Mom', 'Movie night')
      })
    })

    it('hides skip button when already skipped', () => {
      mockUseIsOfflineTimePaused.mockReturnValue({
        isPaused: false,
        isSkipped: true,
        activeException: { id: 'exc-1', type: 'skip', status: 'active' },
        loading: false,
      })

      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      expect(screen.queryByRole('button', { name: /skip tonight/i })).not.toBeInTheDocument()
    })
  })

  describe('Exception history - AC6', () => {
    it('shows recent exceptions list', () => {
      mockUseOfflineExceptions.mockReturnValue({
        exceptions: [
          {
            id: 'exc-1',
            type: 'pause',
            status: 'completed',
            requestedByName: 'Mom',
            createdAt: Date.now() - 3600000,
          },
          {
            id: 'exc-2',
            type: 'skip',
            status: 'active',
            requestedByName: 'Dad',
            createdAt: Date.now(),
            reason: 'Movie night',
          },
        ],
        activeException: {
          id: 'exc-2',
          type: 'skip',
          status: 'active',
          requestedByName: 'Dad',
        },
        loading: false,
        error: null,
        pauseOfflineTime: mockPauseOfflineTime,
        resumeOfflineTime: mockResumeOfflineTime,
        skipTonight: mockSkipTonight,
        cancelException: mockCancelException,
        getDisplayMessage: mockGetDisplayMessage,
        messages: {},
      })

      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      expect(screen.getByText('Recent Exceptions')).toBeInTheDocument()
    })

    it('shows exception with reason', () => {
      mockUseOfflineExceptions.mockReturnValue({
        exceptions: [
          {
            id: 'exc-1',
            type: 'skip',
            status: 'active',
            requestedByName: 'Dad',
            createdAt: Date.now(),
            reason: 'Movie night',
          },
        ],
        activeException: null,
        loading: false,
        error: null,
        pauseOfflineTime: mockPauseOfflineTime,
        resumeOfflineTime: mockResumeOfflineTime,
        skipTonight: mockSkipTonight,
        cancelException: mockCancelException,
        getDisplayMessage: mockGetDisplayMessage,
        messages: {},
      })

      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      expect(screen.getByText('— Movie night')).toBeInTheDocument()
    })
  })

  describe('Cancel functionality', () => {
    it('shows cancel button when exception is active', () => {
      mockUseOfflineExceptions.mockReturnValue({
        exceptions: [],
        activeException: {
          id: 'exc-1',
          type: 'pause',
          status: 'active',
          requestedByName: 'Mom',
        },
        loading: false,
        error: null,
        pauseOfflineTime: mockPauseOfflineTime,
        resumeOfflineTime: mockResumeOfflineTime,
        skipTonight: mockSkipTonight,
        cancelException: mockCancelException,
        getDisplayMessage: mockGetDisplayMessage,
        messages: {},
      })

      mockUseIsOfflineTimePaused.mockReturnValue({
        isPaused: true,
        isSkipped: false,
        activeException: { id: 'exc-1', type: 'pause', status: 'active' },
        loading: false,
      })

      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      expect(screen.getByRole('button', { name: /cancel exception/i })).toBeInTheDocument()
    })

    it('calls cancelException on cancel click', async () => {
      mockCancelException.mockResolvedValue(undefined)

      mockUseOfflineExceptions.mockReturnValue({
        exceptions: [],
        activeException: {
          id: 'exc-1',
          type: 'pause',
          status: 'active',
          requestedByName: 'Mom',
        },
        loading: false,
        error: null,
        pauseOfflineTime: mockPauseOfflineTime,
        resumeOfflineTime: mockResumeOfflineTime,
        skipTonight: mockSkipTonight,
        cancelException: mockCancelException,
        getDisplayMessage: mockGetDisplayMessage,
        messages: {},
      })

      mockUseIsOfflineTimePaused.mockReturnValue({
        isPaused: true,
        isSkipped: false,
        activeException: { id: 'exc-1', type: 'pause', status: 'active' },
        loading: false,
      })

      render(<OfflineExceptionCard offlineScheduleEnabled={true} />)

      const cancelButton = screen.getByRole('button', { name: /cancel exception/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(mockCancelException).toHaveBeenCalledWith('exc-1')
      })
    })
  })

  describe('disabled state', () => {
    it('disables pause button when schedule is disabled', () => {
      render(<OfflineExceptionCard offlineScheduleEnabled={false} />)

      const pauseButton = screen.getByRole('button', { name: /pause offline time/i })
      expect(pauseButton).toBeDisabled()
    })

    it('disables skip button when schedule is disabled', () => {
      render(<OfflineExceptionCard offlineScheduleEnabled={false} />)

      const skipButton = screen.getByRole('button', { name: /skip tonight/i })
      expect(skipButton).toBeDisabled()
    })
  })
})
