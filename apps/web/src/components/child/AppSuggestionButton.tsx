/**
 * AppSuggestionButton Component - Story 33.2 (AC4)
 *
 * Allows children to request apps to be allowed during focus mode.
 * Child-friendly interface with encouraging messaging.
 */

'use client'

import { useState } from 'react'
import { useFocusModeSuggestions } from '../../hooks/useFocusModeSuggestions'

interface AppSuggestionButtonProps {
  childId: string
  familyId: string
  childUid: string
}

export function AppSuggestionButton({ childId, familyId, childUid }: AppSuggestionButtonProps) {
  const { submitSuggestion, pendingSuggestions, loading } = useFocusModeSuggestions({
    childId,
    familyId,
    userUid: childUid,
    isParent: false,
  })

  const [showForm, setShowForm] = useState(false)
  const [appUrl, setAppUrl] = useState('')
  const [appName, setAppName] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appUrl.trim() || !appName.trim()) return

    setSubmitting(true)
    try {
      await submitSuggestion(appUrl.trim(), appName.trim(), reason.trim() || undefined)
      setAppUrl('')
      setAppName('')
      setReason('')
      setShowForm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return null
  }

  return (
    <div className="relative" data-testid="app-suggestion-button">
      {/* Main Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          data-testid="suggest-app-trigger"
        >
          <span className="text-lg">💡</span>
          <span className="text-sm font-medium">Suggest an App</span>
          {pendingSuggestions.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-purple-600 text-white text-xs rounded-full">
              {pendingSuggestions.length}
            </span>
          )}
        </button>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg"
          data-testid="suggestion-success"
        >
          <span className="text-lg">✨</span>
          <span className="text-sm">Suggestion sent! Your parent will review it.</span>
        </div>
      )}

      {/* Suggestion Form */}
      {showForm && (
        <div
          className="bg-white border border-purple-200 rounded-xl shadow-lg p-4 min-w-[300px]"
          data-testid="suggestion-form"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
              <span>💡</span> Request an App
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
              data-testid="close-form"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Want to use an app during focus mode? Ask your parent to allow it!
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Website or App URL
              </label>
              <input
                type="text"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="e.g., spotify.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                data-testid="app-url-input"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">App Name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g., Spotify"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                data-testid="app-name-input"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Why do you need it? (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., I listen to music while studying"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 resize-none"
                data-testid="reason-input"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                data-testid="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !appUrl.trim() || !appName.trim()}
                className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="submit-button"
              >
                {submitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </form>

          {/* Pending Suggestions */}
          {pendingSuggestions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Waiting for approval:</p>
              <ul className="space-y-1" data-testid="pending-list">
                {pendingSuggestions.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-yellow-500">⏳</span>
                    <span>{s.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
