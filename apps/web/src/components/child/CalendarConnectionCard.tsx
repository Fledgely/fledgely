/**
 * CalendarConnectionCard Component - Story 33.4
 *
 * Child-friendly UI for connecting/disconnecting Google Calendar.
 * Shows connection status and triggers OAuth flow.
 *
 * Story 33.4 AC1: Google Calendar Connection
 * - Google Calendar OAuth flow supported
 * - Connection status visible to child
 * - Child can disconnect calendar at any time
 *
 * Story 33.4 AC6: Opt-In Configuration
 * - Child must consent to calendar access
 */

import { useState } from 'react'
import { CALENDAR_INTEGRATION_MESSAGES } from '@fledgely/shared'

interface CalendarConnectionCardProps {
  isConnected: boolean
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'pending'
  connectedEmail: string | null
  lastSyncAt: number | null
  lastSyncError: string | null
  autoActivationEnabled: boolean
  onConnect: () => Promise<void>
  onDisconnect: () => Promise<void>
  onToggleAutoActivation: (enabled: boolean) => Promise<void>
  loading?: boolean
}

/**
 * Format last sync time as relative string
 */
function formatLastSync(timestamp: number | null): string {
  if (!timestamp) return 'Never synced'
  return CALENDAR_INTEGRATION_MESSAGES.lastSynced(timestamp)
}

export function CalendarConnectionCard({
  isConnected,
  connectionStatus,
  connectedEmail,
  lastSyncAt,
  lastSyncError,
  autoActivationEnabled,
  onConnect,
  onDisconnect,
  onToggleAutoActivation,
  loading = false,
}: CalendarConnectionCardProps) {
  const [actionLoading, setActionLoading] = useState(false)

  const handleConnect = async () => {
    setActionLoading(true)
    try {
      await onConnect()
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setActionLoading(true)
    try {
      await onDisconnect()
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleAutoActivation = async () => {
    setActionLoading(true)
    try {
      await onToggleAutoActivation(!autoActivationEnabled)
    } finally {
      setActionLoading(false)
    }
  }

  const isLoading = loading || actionLoading

  if (isConnected) {
    return (
      <div
        data-testid="calendar-connection-card"
        style={{
          background: '#f0fdf4',
          border: '2px solid #86efac',
          borderRadius: 16,
          padding: 20,
        }}
      >
        {/* Connected Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 28 }}>📅</span>
          <div>
            <div
              data-testid="calendar-status-connected"
              style={{ fontSize: 16, fontWeight: 600, color: '#166534' }}
            >
              Calendar Connected
            </div>
            <div style={{ fontSize: 14, color: '#15803d' }}>{connectedEmail}</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 24 }}>✅</span>
        </div>

        {/* Sync Status */}
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🔄</span>
            <span data-testid="calendar-last-sync" style={{ fontSize: 14, color: '#374151' }}>
              {formatLastSync(lastSyncAt)}
            </span>
          </div>
          {lastSyncError && (
            <div
              data-testid="calendar-sync-error"
              style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}
            >
              Last sync had an error: {lastSyncError}
            </div>
          )}
        </div>

        {/* Auto-Activation Toggle */}
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>Auto Focus Mode</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                Start focus mode when calendar events begin
              </div>
            </div>
            <button
              data-testid="calendar-auto-activation-toggle"
              onClick={handleToggleAutoActivation}
              disabled={isLoading}
              style={{
                width: 52,
                height: 28,
                borderRadius: 14,
                border: 'none',
                background: autoActivationEnabled ? '#10b981' : '#d1d5db',
                cursor: isLoading ? 'wait' : 'pointer',
                transition: 'background 0.2s',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: 3,
                  left: autoActivationEnabled ? 27 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>
        </div>

        {/* Disconnect Button */}
        <button
          data-testid="calendar-disconnect"
          onClick={handleDisconnect}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'transparent',
            border: '1px solid #fca5a5',
            borderRadius: 10,
            color: '#dc2626',
            fontSize: 14,
            fontWeight: 500,
            cursor: isLoading ? 'wait' : 'pointer',
          }}
        >
          {isLoading ? 'Disconnecting...' : 'Disconnect Calendar'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginTop: 12 }}>
          Your calendar events help trigger focus mode automatically
        </div>
      </div>
    )
  }

  // Not connected state
  return (
    <div
      data-testid="calendar-connection-card"
      style={{
        background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
        border: '2px solid #c7d2fe',
        borderRadius: 16,
        padding: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 32 }}>📅</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#3730a3' }}>
            Connect Your Calendar
          </div>
          <div style={{ fontSize: 14, color: '#4f46e5' }}>
            Auto-start focus mode for study events
          </div>
        </div>
      </div>

      {/* Benefits List */}
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937', marginBottom: 12 }}>
          Why connect?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎯</span>
            <span style={{ fontSize: 14, color: '#374151' }}>
              Focus mode starts automatically for homework time
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⏰</span>
            <span style={{ fontSize: 14, color: '#374151' }}>
              Duration matches your calendar events
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <span style={{ fontSize: 14, color: '#374151' }}>
              We only read events - never modify them
            </span>
          </div>
        </div>
      </div>

      {/* Connection Status Message */}
      {connectionStatus === 'error' && (
        <div
          data-testid="calendar-connection-error"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: '#dc2626',
            fontSize: 14,
          }}
        >
          {CALENDAR_INTEGRATION_MESSAGES.connectionError}
        </div>
      )}

      {connectionStatus === 'pending' && (
        <div
          data-testid="calendar-connection-pending"
          style={{
            background: '#fefce8',
            border: '1px solid #fde047',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: '#854d0e',
            fontSize: 14,
          }}
        >
          {CALENDAR_INTEGRATION_MESSAGES.connecting}
        </div>
      )}

      {/* Connect Button */}
      <button
        data-testid="calendar-connect"
        onClick={handleConnect}
        disabled={isLoading || connectionStatus === 'pending'}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: isLoading ? '#a5b4fc' : '#4f46e5',
          border: 'none',
          borderRadius: 12,
          color: 'white',
          fontSize: 16,
          fontWeight: 600,
          cursor: isLoading ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 0.2s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
      </button>

      {/* Privacy Note */}
      <div style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginTop: 12 }}>
        You can disconnect anytime. We never share your calendar data.
      </div>
    </div>
  )
}
