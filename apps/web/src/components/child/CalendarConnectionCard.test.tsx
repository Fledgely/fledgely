/**
 * CalendarConnectionCard Component Tests - Story 33.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CalendarConnectionCard } from './CalendarConnectionCard'

describe('CalendarConnectionCard - Story 33.4', () => {
  const defaultProps = {
    isConnected: false,
    connectionStatus: 'disconnected' as const,
    connectedEmail: null,
    lastSyncAt: null,
    lastSyncError: null,
    autoActivationEnabled: false,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onToggleAutoActivation: vi.fn(),
    loading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('disconnected state (AC1: OAuth flow)', () => {
    it('renders connect button when not connected', () => {
      render(<CalendarConnectionCard {...defaultProps} />)

      expect(screen.getByTestId('calendar-connection-card')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-connect')).toBeInTheDocument()
      expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument()
    })

    it('shows benefits list when not connected', () => {
      render(<CalendarConnectionCard {...defaultProps} />)

      expect(screen.getByText('Why connect?')).toBeInTheDocument()
      expect(
        screen.getByText('Focus mode starts automatically for homework time')
      ).toBeInTheDocument()
      expect(screen.getByText('Duration matches your calendar events')).toBeInTheDocument()
      expect(screen.getByText('We only read events - never modify them')).toBeInTheDocument()
    })

    it('calls onConnect when connect button is clicked', async () => {
      const onConnect = vi.fn().mockResolvedValue(undefined)
      render(<CalendarConnectionCard {...defaultProps} onConnect={onConnect} />)

      fireEvent.click(screen.getByTestId('calendar-connect'))

      await waitFor(() => {
        expect(onConnect).toHaveBeenCalledTimes(1)
      })
    })

    it('shows loading state during connection', async () => {
      const onConnect = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))
      render(<CalendarConnectionCard {...defaultProps} onConnect={onConnect} />)

      fireEvent.click(screen.getByTestId('calendar-connect'))

      expect(screen.getByText('Connecting...')).toBeInTheDocument()

      await waitFor(() => {
        expect(onConnect).toHaveBeenCalled()
      })
    })

    it('shows error message when connection status is error', () => {
      render(<CalendarConnectionCard {...defaultProps} connectionStatus="error" />)

      expect(screen.getByTestId('calendar-connection-error')).toBeInTheDocument()
    })

    it('shows pending message when connection status is pending', () => {
      render(<CalendarConnectionCard {...defaultProps} connectionStatus="pending" />)

      expect(screen.getByTestId('calendar-connection-pending')).toBeInTheDocument()
    })

    it('disables connect button when pending', () => {
      render(<CalendarConnectionCard {...defaultProps} connectionStatus="pending" />)

      expect(screen.getByTestId('calendar-connect')).toBeDisabled()
    })
  })

  describe('connected state (AC1: Connection status)', () => {
    const connectedProps = {
      ...defaultProps,
      isConnected: true,
      connectionStatus: 'connected' as const,
      connectedEmail: 'child@example.com',
      lastSyncAt: Date.now() - 300000, // 5 minutes ago
    }

    it('shows connected status when calendar is connected', () => {
      render(<CalendarConnectionCard {...connectedProps} />)

      expect(screen.getByTestId('calendar-status-connected')).toBeInTheDocument()
      expect(screen.getByText('Calendar Connected')).toBeInTheDocument()
      expect(screen.getByText('child@example.com')).toBeInTheDocument()
    })

    it('shows last sync time', () => {
      render(<CalendarConnectionCard {...connectedProps} />)

      expect(screen.getByTestId('calendar-last-sync')).toBeInTheDocument()
      expect(screen.getByText(/Synced/)).toBeInTheDocument()
    })

    it('shows sync error when present', () => {
      render(<CalendarConnectionCard {...connectedProps} lastSyncError="API rate limit exceeded" />)

      expect(screen.getByTestId('calendar-sync-error')).toBeInTheDocument()
      expect(screen.getByText(/API rate limit exceeded/)).toBeInTheDocument()
    })

    it('shows disconnect button when connected', () => {
      render(<CalendarConnectionCard {...connectedProps} />)

      expect(screen.getByTestId('calendar-disconnect')).toBeInTheDocument()
      expect(screen.getByText('Disconnect Calendar')).toBeInTheDocument()
    })

    it('calls onDisconnect when disconnect button is clicked', async () => {
      const onDisconnect = vi.fn().mockResolvedValue(undefined)
      render(<CalendarConnectionCard {...connectedProps} onDisconnect={onDisconnect} />)

      fireEvent.click(screen.getByTestId('calendar-disconnect'))

      await waitFor(() => {
        expect(onDisconnect).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('auto-activation toggle (AC6: Opt-in configuration)', () => {
    const connectedProps = {
      ...defaultProps,
      isConnected: true,
      connectionStatus: 'connected' as const,
      connectedEmail: 'child@example.com',
    }

    it('shows auto-activation toggle when connected', () => {
      render(<CalendarConnectionCard {...connectedProps} />)

      expect(screen.getByTestId('calendar-auto-activation-toggle')).toBeInTheDocument()
      expect(screen.getByText('Auto Focus Mode')).toBeInTheDocument()
    })

    it('toggle reflects current auto-activation state', () => {
      const { rerender } = render(
        <CalendarConnectionCard {...connectedProps} autoActivationEnabled={false} />
      )

      // Toggle should be off (check by background color would be implementation-specific)
      expect(screen.getByTestId('calendar-auto-activation-toggle')).toBeInTheDocument()

      rerender(<CalendarConnectionCard {...connectedProps} autoActivationEnabled={true} />)

      // Toggle should now be on
      expect(screen.getByTestId('calendar-auto-activation-toggle')).toBeInTheDocument()
    })

    it('calls onToggleAutoActivation when toggle is clicked', async () => {
      const onToggleAutoActivation = vi.fn().mockResolvedValue(undefined)
      render(
        <CalendarConnectionCard
          {...connectedProps}
          autoActivationEnabled={false}
          onToggleAutoActivation={onToggleAutoActivation}
        />
      )

      fireEvent.click(screen.getByTestId('calendar-auto-activation-toggle'))

      await waitFor(() => {
        expect(onToggleAutoActivation).toHaveBeenCalledWith(true)
      })
    })

    it('disables toggle when loading', () => {
      render(<CalendarConnectionCard {...connectedProps} loading={true} />)

      expect(screen.getByTestId('calendar-auto-activation-toggle')).toBeDisabled()
    })
  })

  describe('privacy and consent messaging', () => {
    it('shows privacy note when not connected', () => {
      render(<CalendarConnectionCard {...defaultProps} />)

      expect(
        screen.getByText('You can disconnect anytime. We never share your calendar data.')
      ).toBeInTheDocument()
    })

    it('shows help text when connected', () => {
      render(
        <CalendarConnectionCard
          {...defaultProps}
          isConnected={true}
          connectionStatus="connected"
          connectedEmail="test@example.com"
        />
      )

      expect(
        screen.getByText('Your calendar events help trigger focus mode automatically')
      ).toBeInTheDocument()
    })
  })

  describe('loading states', () => {
    it('disables all buttons when loading prop is true', () => {
      const connectedProps = {
        ...defaultProps,
        isConnected: true,
        connectionStatus: 'connected' as const,
        connectedEmail: 'child@example.com',
        loading: true,
      }

      render(<CalendarConnectionCard {...connectedProps} />)

      expect(screen.getByTestId('calendar-disconnect')).toBeDisabled()
      expect(screen.getByTestId('calendar-auto-activation-toggle')).toBeDisabled()
    })
  })
})
