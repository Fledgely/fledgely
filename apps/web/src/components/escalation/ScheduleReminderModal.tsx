/**
 * ScheduleReminderModal Component - Story 34.5.4 Task 5
 *
 * Modal for scheduling family meeting reminders.
 * AC4: Meeting Reminder (Optional)
 *
 * Messaging is supportive and encouraging per story requirements.
 */

import { useState } from 'react'

// ============================================
// Types
// ============================================

export interface ScheduleReminderModalProps {
  /** Whether modal is visible */
  isOpen: boolean
  /** Close modal callback */
  onClose: () => void
  /** Called when user schedules a reminder */
  onSchedule: (scheduledAt: Date) => void
  /** Whether a schedule operation is in progress */
  isScheduling: boolean
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get tomorrow's date formatted as YYYY-MM-DD.
 */
function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

/**
 * Get default time (6:00 PM).
 */
function getDefaultTime(): string {
  return '18:00'
}

// ============================================
// Component
// ============================================

export function ScheduleReminderModal({
  isOpen,
  onClose,
  onSchedule,
  isScheduling,
}: ScheduleReminderModalProps) {
  const [date, setDate] = useState(getTomorrowDate())
  const [time, setTime] = useState(getDefaultTime())

  if (!isOpen) {
    return null
  }

  const handleSubmit = () => {
    const scheduledAt = new Date(`${date}T${time}:00`)
    onSchedule(scheduledAt)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="schedule-modal-backdrop"
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        data-testid="schedule-reminder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-md md:w-full bg-white rounded-lg shadow-xl z-50 p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            id="schedule-modal-title"
            data-testid="schedule-modal-header"
            className="text-lg font-semibold text-gray-900"
          >
            Schedule a Family Conversation
          </h2>
          <button
            data-testid="schedule-modal-close"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Supportive Message */}
        <p className="text-gray-600 mb-6">
          Ready to have a good conversation? Pick a time that works for your family.
        </p>

        {/* Date/Time Inputs */}
        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="schedule-date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              id="schedule-date"
              data-testid="schedule-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="schedule-time" className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              id="schedule-time"
              data-testid="schedule-time-input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            data-testid="schedule-cancel-button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="schedule-submit-button"
            onClick={handleSubmit}
            disabled={isScheduling}
            className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {isScheduling ? 'Scheduling...' : 'Schedule Meeting'}
          </button>
        </div>
      </div>
    </>
  )
}
