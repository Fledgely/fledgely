/**
 * Age18DeletionConfirmation Component - Story 38.5 Task 6
 *
 * Shows deletion confirmation to child after turning 18.
 * AC6: Child notified: "You're 18 - all data has been deleted"
 */

'use client'

import type { DeletionDataType } from '@fledgely/shared'

export interface Age18DeletionConfirmationProps {
  childName: string
  deletionDate: Date
  dataTypesDeleted: readonly DeletionDataType[]
  onAcknowledge: () => void
}

const DATA_TYPE_LABELS: Record<string, string> = {
  screenshots: 'Screenshots',
  flags: 'Content flags',
  activity_logs: 'Activity logs',
  trust_history: 'Trust history',
  child_profile: 'Profile data',
  agreements: 'Agreements',
  devices: 'Device associations',
}

export default function Age18DeletionConfirmation({
  childName,
  deletionDate,
  dataTypesDeleted,
  onAcknowledge,
}: Age18DeletionConfirmationProps): JSX.Element {
  const formattedDate = deletionDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      data-testid="deletion-confirmation"
      className="max-w-lg mx-auto bg-white rounded-xl shadow-lg overflow-hidden"
    >
      {/* Celebratory header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-8 text-center text-white">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">Happy Birthday, {childName}!</h1>
        <p className="text-lg opacity-90">You&apos;re 18 - all data has been deleted</p>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Explanation */}
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">
            As of {formattedDate}, all your monitoring data has been automatically deleted. This
            marks the end of parental monitoring - you&apos;re now in full control of your digital
            life.
          </p>
        </div>

        {/* What was deleted */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            What was deleted
          </h2>
          <ul className="space-y-2">
            {dataTypesDeleted.map((dataType) => (
              <li key={dataType} className="flex items-center text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                {DATA_TYPE_LABELS[dataType] || dataType}
              </li>
            ))}
          </ul>
        </div>

        {/* Positive message */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            Your childhood monitoring history is now completely gone. Welcome to adulthood! 🌟
          </p>
        </div>

        {/* Acknowledge button */}
        <button
          onClick={onAcknowledge}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Got It!
        </button>
      </div>
    </div>
  )
}
