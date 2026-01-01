/**
 * CalendarIntegrationSettings Component Tests - Story 33.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CalendarIntegrationSettings } from './CalendarIntegrationSettings'

// Mock the hook
const mockCalendarIntegration = vi.fn()

vi.mock('../../hooks/useCalendarIntegration', () => ({
  useCalendarIntegration: () => mockCalendarIntegration(),
}))

describe('CalendarIntegrationSettings - Story 33.4', () => {
  const defaultHookReturn = {
    config: {
      autoActivateFocusMode: false,
      syncFrequencyMinutes: 30,
      focusTriggerKeywords: ['study', 'homework', 'focus'],
    },
    loading: false,
    error: null,
    isConnected: false,
    connectedEmail: null,
    lastSyncAt: null,
    lastSyncError: null,
    focusEligibleEvents: [],
    updateAutoActivation: vi.fn(),
    updateSyncFrequency: vi.fn(),
    addKeyword: vi.fn(),
    removeKeyword: vi.fn(),
    resetKeywords: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCalendarIntegration.mockReturnValue(defaultHookReturn)
  })

  describe('loading and error states', () => {
    it('shows loading state', () => {
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        loading: true,
      })

      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByTestId('calendar-settings-loading')).toBeInTheDocument()
    })

    it('shows error state', () => {
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        error: 'Failed to load calendar settings',
      })

      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByTestId('calendar-settings-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load calendar settings')).toBeInTheDocument()
    })
  })

  describe('disconnected state', () => {
    it('shows not connected status when calendar is not connected', () => {
      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByTestId('calendar-connection-status')).toBeInTheDocument()
      expect(screen.getByText('Not Connected')).toBeInTheDocument()
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })

    it('shows instruction for child to connect', () => {
      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByText(/Emma needs to connect their Google Calendar/)).toBeInTheDocument()
    })

    it('hides settings sections when not connected', () => {
      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.queryByTestId('auto-activation-section')).not.toBeInTheDocument()
      expect(screen.queryByTestId('keywords-section')).not.toBeInTheDocument()
    })
  })

  describe('connected state (AC5: Parent Visibility)', () => {
    const connectedHookReturn = {
      ...defaultHookReturn,
      isConnected: true,
      connectedEmail: 'emma@example.com',
      lastSyncAt: Date.now() - 300000, // 5 min ago
    }

    beforeEach(() => {
      mockCalendarIntegration.mockReturnValue(connectedHookReturn)
    })

    it('shows connected email', () => {
      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByText(/Connected to emma@example.com/)).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('shows last sync time', () => {
      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByText(/Synced/)).toBeInTheDocument()
    })

    it('shows sync error if present', () => {
      mockCalendarIntegration.mockReturnValue({
        ...connectedHookReturn,
        lastSyncError: 'API quota exceeded',
      })

      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByTestId('sync-error')).toBeInTheDocument()
      expect(screen.getByText(/API quota exceeded/)).toBeInTheDocument()
    })

    it('shows all settings sections when connected', () => {
      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByTestId('auto-activation-section')).toBeInTheDocument()
      expect(screen.getByTestId('sync-frequency-section')).toBeInTheDocument()
      expect(screen.getByTestId('keywords-section')).toBeInTheDocument()
      expect(screen.getByTestId('upcoming-events-section')).toBeInTheDocument()
    })
  })

  describe('auto-activation toggle (AC6)', () => {
    beforeEach(() => {
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectedEmail: 'emma@example.com',
      })
    })

    it('shows auto-activation toggle', () => {
      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByTestId('auto-activation-toggle')).toBeInTheDocument()
      expect(screen.getByText('Auto-Activate Focus Mode')).toBeInTheDocument()
    })

    it('calls updateAutoActivation when toggle is clicked', async () => {
      const updateAutoActivation = vi.fn()
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectedEmail: 'emma@example.com',
        updateAutoActivation,
      })

      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      fireEvent.click(screen.getByTestId('auto-activation-toggle'))

      await waitFor(() => {
        expect(updateAutoActivation).toHaveBeenCalledWith(true)
      })
    })
  })

  describe('sync frequency (AC6)', () => {
    beforeEach(() => {
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectedEmail: 'emma@example.com',
      })
    })

    it('shows sync frequency selector', () => {
      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByTestId('sync-frequency-select')).toBeInTheDocument()
    })

    it('calls updateSyncFrequency when changed', async () => {
      const updateSyncFrequency = vi.fn()
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectedEmail: 'emma@example.com',
        updateSyncFrequency,
      })

      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      fireEvent.change(screen.getByTestId('sync-frequency-select'), {
        target: { value: '15' },
      })

      await waitFor(() => {
        expect(updateSyncFrequency).toHaveBeenCalledWith(15)
      })
    })
  })

  describe('keyword configuration (AC6)', () => {
    beforeEach(() => {
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectedEmail: 'emma@example.com',
      })
    })

    it('shows current keywords', () => {
      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByText('study')).toBeInTheDocument()
      expect(screen.getByText('homework')).toBeInTheDocument()
      expect(screen.getByText('focus')).toBeInTheDocument()
    })

    it('allows adding a new keyword', async () => {
      const addKeyword = vi.fn()
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectedEmail: 'emma@example.com',
        addKeyword,
      })

      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      fireEvent.change(screen.getByTestId('new-keyword-input'), {
        target: { value: 'exam' },
      })
      fireEvent.click(screen.getByTestId('add-keyword-button'))

      await waitFor(() => {
        expect(addKeyword).toHaveBeenCalledWith('exam')
      })
    })

    it('allows removing a keyword', async () => {
      const removeKeyword = vi.fn()
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectedEmail: 'emma@example.com',
        removeKeyword,
      })

      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      fireEvent.click(screen.getByTestId('remove-keyword-study'))

      await waitFor(() => {
        expect(removeKeyword).toHaveBeenCalledWith('study')
      })
    })

    it('allows resetting keywords to defaults', async () => {
      const resetKeywords = vi.fn()
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectedEmail: 'emma@example.com',
        resetKeywords,
      })

      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      fireEvent.click(screen.getByTestId('reset-keywords-button'))

      await waitFor(() => {
        expect(resetKeywords).toHaveBeenCalled()
      })
    })
  })

  describe('upcoming focus events (AC5)', () => {
    it('shows no events message when no focus-eligible events', () => {
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectedEmail: 'emma@example.com',
        focusEligibleEvents: [],
      })

      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByText('No upcoming focus-eligible events found')).toBeInTheDocument()
    })

    it('shows upcoming focus events with matched keywords', () => {
      const events = [
        {
          id: 'event-1',
          title: 'Math Homework',
          startTime: Date.now() + 3600000,
          endTime: Date.now() + 7200000,
          isFocusEligible: true,
          matchedKeywords: ['homework'],
          description: null,
          isAllDay: false,
          processed: false,
        },
      ]

      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectedEmail: 'emma@example.com',
        focusEligibleEvents: events,
      })

      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByTestId('focus-event-event-1')).toBeInTheDocument()
      expect(screen.getByText('Math Homework')).toBeInTheDocument()
      // 'homework' appears both in keywords and in event matched keywords
      expect(screen.getAllByText('homework').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('privacy notice (AC5)', () => {
    it('shows privacy notice when connected', () => {
      mockCalendarIntegration.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        connectedEmail: 'emma@example.com',
      })

      render(<CalendarIntegrationSettings childId="child-1" familyId="family-1" childName="Emma" />)

      expect(screen.getByText('Privacy Note')).toBeInTheDocument()
      expect(
        screen.getByText(/cannot access or modify Emma's actual calendar events/)
      ).toBeInTheDocument()
    })
  })
})
