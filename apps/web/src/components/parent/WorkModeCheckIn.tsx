'use client'

/**
 * WorkModeCheckIn Component - Story 33.6
 *
 * Parent check-in feature for work mode with friendly templates.
 * Trust-based, non-interrogative framing.
 */

import { useState, useCallback } from 'react'
import { WORK_MODE_ANALYTICS_MESSAGES } from '@fledgely/shared'
import { sendParentCheckIn } from '../../services/workModeService'

interface WorkModeCheckInProps {
  familyId: string
  childId: string
  childName: string
  parentId: string
  parentName: string
  onSent?: () => void
  onCancel?: () => void
}

/**
 * Pre-written check-in templates with friendly, non-interrogative tone
 */
const CHECK_IN_TEMPLATES = WORK_MODE_ANALYTICS_MESSAGES.checkInTemplates

export function WorkModeCheckIn({
  familyId,
  childId,
  childName,
  parentId,
  parentName,
  onSent,
  onCancel,
}: WorkModeCheckInProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const message = selectedTemplate !== null ? CHECK_IN_TEMPLATES[selectedTemplate] : customMessage

  const handleSend = useCallback(async () => {
    if (!message.trim()) {
      setError('Please select a template or write a message')
      return
    }

    setSending(true)
    setError(null)

    try {
      await sendParentCheckIn(familyId, childId, parentId, parentName, message.trim())
      onSent?.()
    } catch (err) {
      console.error('[WorkModeCheckIn] Error sending check-in:', err)
      setError('Failed to send check-in. Please try again.')
    } finally {
      setSending(false)
    }
  }, [familyId, childId, parentId, parentName, message, onSent])

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
      data-testid="work-mode-check-in"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Check in with {childName}</h3>

      <p className="text-sm text-gray-600 mb-4">
        Send a friendly message about work. {childName} can respond but isn&apos;t required to.
      </p>

      {/* Template buttons */}
      <div className="space-y-2 mb-4">
        <p className="text-sm font-medium text-gray-700">Quick messages:</p>
        {CHECK_IN_TEMPLATES.map((template, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              setSelectedTemplate(index)
              setCustomMessage('')
            }}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              selectedTemplate === index
                ? 'bg-blue-100 border-2 border-blue-500 text-blue-900'
                : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
            data-testid={`template-${index}`}
          >
            &ldquo;{template}&rdquo;
          </button>
        ))}
      </div>

      {/* Custom message input */}
      <div className="mb-4">
        <label htmlFor="custom-message" className="block text-sm font-medium text-gray-700 mb-1">
          Or write your own:
        </label>
        <textarea
          id="custom-message"
          value={customMessage}
          onChange={(e) => {
            setCustomMessage(e.target.value)
            setSelectedTemplate(null)
          }}
          placeholder="Write a friendly message..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          rows={2}
          maxLength={500}
          data-testid="custom-message-input"
        />
        <p className="text-xs text-gray-500 mt-1">{customMessage.length}/500 characters</p>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 mb-4" data-testid="error-message">
          {error}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            disabled={sending}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="send-button"
        >
          {sending ? 'Sending...' : 'Send Check-In'}
        </button>
      </div>
    </div>
  )
}
