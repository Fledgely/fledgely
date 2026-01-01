/**
 * HomeworkExceptionRequest Component Tests - Story 32.5 AC4
 *
 * Tests for child homework exception request UI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HomeworkExceptionRequest } from './HomeworkExceptionRequest'

// Mock hooks
const mockRequestHomeworkTime = vi.fn()
const mockCancelRequest = vi.fn()

const mockUseHomeworkException = vi.fn()

vi.mock('../../hooks/useHomeworkException', () => ({
  useHomeworkException: (...args: unknown[]) => mockUseHomeworkException(...args),
}))

vi.mock('@fledgely/shared', () => ({
  OFFLINE_EXCEPTION_MESSAGES: {
    childHomeworkActive: "You're in homework mode! Education sites are available.",
  },
}))

describe('HomeworkExceptionRequest - Story 32.5 AC4', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseHomeworkException.mockReturnValue({
      pendingRequest: null,
      activeException: null,
      loading: false,
      error: null,
      requestHomeworkTime: mockRequestHomeworkTime,
      cancelRequest: mockCancelRequest,
      timeRemainingMinutes: null,
      canRequest: true,
    })
  })

  describe('rendering', () => {
    it('returns null when familyId is null', () => {
      const { container } = render(
        <HomeworkExceptionRequest familyId={null} childId="child-1" childName="Emma" />
      )

      expect(container.firstChild).toBeNull()
    })

    it('returns null when childId is null', () => {
      const { container } = render(
        <HomeworkExceptionRequest familyId="family-1" childId={null} childName="Emma" />
      )

      expect(container.firstChild).toBeNull()
    })

    it('shows loading state', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: null,
        loading: true,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: false,
      })

      render(<HomeworkExceptionRequest familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows request form when can request', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: true,
      })

      render(
        <HomeworkExceptionRequest
          familyId="family-1"
          childId="child-1"
          childName="Emma"
          isOfflineTimeActive={true}
        />
      )

      expect(screen.getByText('Need Homework Time?')).toBeInTheDocument()
      expect(screen.getByText('How much time do you need?')).toBeInTheDocument()
    })

    it('shows "browse freely" message when offline time not active', () => {
      render(
        <HomeworkExceptionRequest
          familyId="family-1"
          childId="child-1"
          childName="Emma"
          isOfflineTimeActive={false}
        />
      )

      expect(screen.getByText('Offline time is not active right now')).toBeInTheDocument()
      expect(screen.getByText('You can browse freely!')).toBeInTheDocument()
    })
  })

  describe('pending request state', () => {
    it('shows pending request status', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: {
          id: 'req-1',
          requestedDuration: 3600000, // 60 minutes
          status: 'pending',
        },
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: false,
      })

      render(<HomeworkExceptionRequest familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByText('Waiting for Approval')).toBeInTheDocument()
      expect(screen.getByText('Your parent will decide soon')).toBeInTheDocument()
      expect(screen.getByText('Request sent!')).toBeInTheDocument()
    })

    it('shows requested duration in pending state', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: {
          id: 'req-1',
          requestedDuration: 1800000, // 30 minutes
          status: 'pending',
        },
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: false,
      })

      render(<HomeworkExceptionRequest familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByText(/30 minutes/)).toBeInTheDocument()
    })

    it('shows cancel button for pending request', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: {
          id: 'req-1',
          requestedDuration: 3600000,
          status: 'pending',
        },
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: false,
      })

      render(<HomeworkExceptionRequest familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByRole('button', { name: /cancel request/i })).toBeInTheDocument()
    })
  })

  describe('active exception state', () => {
    it('shows active homework mode', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: {
          id: 'exc-1',
          type: 'homework',
          status: 'active',
          endTime: Date.now() + 3600000,
        },
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: 60,
        canRequest: false,
      })

      render(<HomeworkExceptionRequest familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByText('Homework Mode Active')).toBeInTheDocument()
      expect(screen.getByText('You can access education websites!')).toBeInTheDocument()
    })

    it('shows time remaining', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: {
          id: 'exc-1',
          type: 'homework',
          status: 'active',
          endTime: Date.now() + 1800000,
        },
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: 30,
        canRequest: false,
      })

      render(<HomeworkExceptionRequest familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByText('30')).toBeInTheDocument()
      expect(screen.getByText('minutes remaining')).toBeInTheDocument()
    })

    it('shows singular minute text when 1 minute remaining', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: {
          id: 'exc-1',
          type: 'homework',
          status: 'active',
          endTime: Date.now() + 60000,
        },
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: 1,
        canRequest: false,
      })

      render(<HomeworkExceptionRequest familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByText('minute remaining')).toBeInTheDocument()
    })
  })

  describe('duration selection', () => {
    it('shows duration options', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: true,
      })

      render(
        <HomeworkExceptionRequest
          familyId="family-1"
          childId="child-1"
          childName="Emma"
          isOfflineTimeActive={true}
        />
      )

      expect(screen.getByText('30 min')).toBeInTheDocument()
      expect(screen.getByText('1 hour')).toBeInTheDocument()
      expect(screen.getByText('1.5 hours')).toBeInTheDocument()
      expect(screen.getByText('2 hours')).toBeInTheDocument()
    })

    it('selects duration on click', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: true,
      })

      render(
        <HomeworkExceptionRequest
          familyId="family-1"
          childId="child-1"
          childName="Emma"
          isOfflineTimeActive={true}
        />
      )

      const option30Min = screen.getByText('30 min')
      fireEvent.click(option30Min)

      // Button should have selected styling (we can check via style or class)
      expect(option30Min).toHaveStyle({ borderColor: '#3b82f6' })
    })
  })

  describe('request submission', () => {
    it('calls requestHomeworkTime with selected duration', async () => {
      mockRequestHomeworkTime.mockResolvedValue('new-req-id')

      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: true,
      })

      render(
        <HomeworkExceptionRequest
          familyId="family-1"
          childId="child-1"
          childName="Emma"
          isOfflineTimeActive={true}
        />
      )

      // Select 30 minutes
      const option30Min = screen.getByText('30 min')
      fireEvent.click(option30Min)

      // Submit
      const submitButton = screen.getByRole('button', { name: /ask for homework time/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockRequestHomeworkTime).toHaveBeenCalledWith('Emma', 30)
      })
    })

    it('shows loading state during submission', async () => {
      mockRequestHomeworkTime.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: true,
      })

      render(
        <HomeworkExceptionRequest
          familyId="family-1"
          childId="child-1"
          childName="Emma"
          isOfflineTimeActive={true}
        />
      )

      const submitButton = screen.getByRole('button', { name: /ask for homework time/i })
      fireEvent.click(submitButton)

      expect(screen.getByText('Sending Request...')).toBeInTheDocument()
    })

    it('shows error message on failure', async () => {
      mockRequestHomeworkTime.mockRejectedValue(new Error('Network error'))

      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: true,
      })

      render(
        <HomeworkExceptionRequest
          familyId="family-1"
          childId="child-1"
          childName="Emma"
          isOfflineTimeActive={true}
        />
      )

      const submitButton = screen.getByRole('button', { name: /ask for homework time/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Could not send request. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('cancel request', () => {
    it('calls cancelRequest on cancel click', async () => {
      mockCancelRequest.mockResolvedValue(undefined)

      mockUseHomeworkException.mockReturnValue({
        pendingRequest: {
          id: 'req-1',
          requestedDuration: 3600000,
          status: 'pending',
        },
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: false,
      })

      render(<HomeworkExceptionRequest familyId="family-1" childId="child-1" childName="Emma" />)

      const cancelButton = screen.getByRole('button', { name: /cancel request/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(mockCancelRequest).toHaveBeenCalled()
      })
    })

    it('shows loading state during cancellation', async () => {
      mockCancelRequest.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      mockUseHomeworkException.mockReturnValue({
        pendingRequest: {
          id: 'req-1',
          requestedDuration: 3600000,
          status: 'pending',
        },
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: false,
      })

      render(<HomeworkExceptionRequest familyId="family-1" childId="child-1" childName="Emma" />)

      const cancelButton = screen.getByRole('button', { name: /cancel request/i })
      fireEvent.click(cancelButton)

      expect(screen.getByText('Cancelling...')).toBeInTheDocument()
    })
  })

  describe('child-friendly messaging', () => {
    it('shows note about education sites only', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: null,
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: null,
        canRequest: true,
      })

      render(
        <HomeworkExceptionRequest
          familyId="family-1"
          childId="child-1"
          childName="Emma"
          isOfflineTimeActive={true}
        />
      )

      expect(
        screen.getByText('Only education websites will work during homework time')
      ).toBeInTheDocument()
    })

    it('shows auto-resume message in active state', () => {
      mockUseHomeworkException.mockReturnValue({
        pendingRequest: null,
        activeException: {
          id: 'exc-1',
          type: 'homework',
          status: 'active',
        },
        loading: false,
        error: null,
        requestHomeworkTime: mockRequestHomeworkTime,
        cancelRequest: mockCancelRequest,
        timeRemainingMinutes: 30,
        canRequest: false,
      })

      render(<HomeworkExceptionRequest familyId="family-1" childId="child-1" childName="Emma" />)

      expect(
        screen.getByText('When homework time ends, offline time will resume automatically.')
      ).toBeInTheDocument()
    })
  })
})
