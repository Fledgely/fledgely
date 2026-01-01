/**
 * CalendarIntegrationSettings Component - Story 33.4
 *
 * Parent UI for viewing and configuring calendar integration for their child.
 * Shows calendar-triggered focus sessions and allows keyword configuration.
 *
 * Story 33.4 AC5: Parent Visibility
 * - Parent sees calendar-triggered vs manual sessions
 * - Parent sees which calendar event triggered focus mode
 * - Parent cannot modify child's calendar (privacy)
 *
 * Story 33.4 AC6: Opt-In Configuration
 * - Parent can enable/disable auto-activation
 * - Parent can configure additional keywords
 * - Sync frequency is configurable
 */

'use client'

import { useState } from 'react'
import { useCalendarIntegration } from '../../hooks/useCalendarIntegration'
import { CALENDAR_INTEGRATION_MESSAGES } from '@fledgely/shared'

interface CalendarIntegrationSettingsProps {
  childId: string
  familyId: string
  childName?: string
}

export function CalendarIntegrationSettings({
  childId,
  familyId,
  childName,
}: CalendarIntegrationSettingsProps) {
  const {
    config,
    loading,
    error,
    isConnected,
    connectedEmail,
    lastSyncAt,
    lastSyncError,
    focusEligibleEvents,
    updateAutoActivation,
    updateSyncFrequency,
    addKeyword,
    removeKeyword,
    resetKeywords,
  } = useCalendarIntegration({ childId, familyId })

  const [newKeyword, setNewKeyword] = useState('')
  const [addingKeyword, setAddingKeyword] = useState(false)

  if (loading) {
    return (
      <div className="animate-pulse p-4" data-testid="calendar-settings-loading">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-4 bg-red-50 border border-red-200 rounded-lg"
        data-testid="calendar-settings-error"
      >
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return
    setAddingKeyword(true)
    try {
      await addKeyword(newKeyword.trim())
      setNewKeyword('')
    } finally {
      setAddingKeyword(false)
    }
  }

  const handleAutoActivationChange = async () => {
    await updateAutoActivation(!config?.autoActivateFocusMode)
  }

  const handleSyncFrequencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const minutes = parseInt(e.target.value, 10)
    await updateSyncFrequency(minutes)
  }

  const displayName = childName || 'your child'

  return (
    <div className="space-y-6" data-testid="calendar-integration-settings">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Calendar Integration</h2>
        <p className="text-sm text-gray-500 mt-1">
          View and configure how calendar events trigger focus mode for {displayName}
        </p>
      </div>

      {/* Connection Status Section */}
      <div
        className={`p-4 rounded-lg border ${
          isConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
        }`}
        data-testid="calendar-connection-status"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isConnected ? '📅' : '📆'}</span>
            <div>
              <div className="font-medium text-gray-900">
                {isConnected ? `Connected to ${connectedEmail}` : 'Not Connected'}
              </div>
              {isConnected && lastSyncAt && (
                <div className="text-sm text-gray-500">
                  {CALENDAR_INTEGRATION_MESSAGES.lastSynced(lastSyncAt)}
                </div>
              )}
              {lastSyncError && (
                <div className="text-sm text-red-500" data-testid="sync-error">
                  Sync error: {lastSyncError}
                </div>
              )}
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isConnected ? 'Active' : 'Inactive'}
          </span>
        </div>

        {!isConnected && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-100">
            <p className="text-sm text-gray-600">
              {displayName} needs to connect their Google Calendar from their own settings to enable
              calendar-triggered focus mode.
            </p>
          </div>
        )}
      </div>

      {/* Only show remaining settings if connected */}
      {isConnected && (
        <>
          {/* Auto-Activation Toggle */}
          <div className="bg-white p-4 rounded-lg border" data-testid="auto-activation-section">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Auto-Activate Focus Mode</div>
                <div className="text-sm text-gray-500">
                  Automatically start focus mode when calendar events with focus keywords begin
                </div>
              </div>
              <button
                data-testid="auto-activation-toggle"
                onClick={handleAutoActivationChange}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config?.autoActivateFocusMode ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config?.autoActivateFocusMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Sync Frequency */}
          <div className="bg-white p-4 rounded-lg border" data-testid="sync-frequency-section">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Sync Frequency</div>
                <div className="text-sm text-gray-500">How often to check for calendar updates</div>
              </div>
              <select
                data-testid="sync-frequency-select"
                value={config?.syncFrequencyMinutes || 30}
                onChange={handleSyncFrequencyChange}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
              </select>
            </div>
          </div>

          {/* Focus Trigger Keywords */}
          <div className="bg-white p-4 rounded-lg border" data-testid="keywords-section">
            <div className="mb-4">
              <div className="font-medium text-gray-900">Focus Trigger Keywords</div>
              <div className="text-sm text-gray-500">
                Calendar events containing these words will trigger focus mode
              </div>
            </div>

            {/* Current Keywords */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(config?.focusTriggerKeywords || []).map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                >
                  {keyword}
                  <button
                    data-testid={`remove-keyword-${keyword}`}
                    onClick={() => removeKeyword(keyword)}
                    className="ml-1 text-indigo-400 hover:text-indigo-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add Keyword Form */}
            <div className="flex gap-2">
              <input
                data-testid="new-keyword-input"
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Add a keyword..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              />
              <button
                data-testid="add-keyword-button"
                onClick={handleAddKeyword}
                disabled={addingKeyword || !newKeyword.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {/* Reset to defaults */}
            <button
              data-testid="reset-keywords-button"
              onClick={resetKeywords}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              Reset to default keywords
            </button>
          </div>

          {/* Upcoming Focus Events Preview */}
          <div className="bg-white p-4 rounded-lg border" data-testid="upcoming-events-section">
            <div className="mb-4">
              <div className="font-medium text-gray-900">Upcoming Focus Events</div>
              <div className="text-sm text-gray-500">
                Calendar events that will trigger focus mode
              </div>
            </div>

            {focusEligibleEvents.length === 0 ? (
              <div className="text-sm text-gray-500 italic">
                No upcoming focus-eligible events found
              </div>
            ) : (
              <div className="space-y-3">
                {focusEligibleEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    data-testid={`focus-event-${event.id}`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(event.startTime).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.matchedKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex items-start gap-3">
              <span className="text-lg">🔒</span>
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">Privacy Note</div>
                You can see which events will trigger focus mode, but you cannot access or modify{' '}
                {displayName}&apos;s actual calendar events. This respects their privacy while
                giving you visibility into focus mode behavior.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
