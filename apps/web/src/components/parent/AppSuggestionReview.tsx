/**
 * AppSuggestionReview Component - Story 33.2 (AC4)
 *
 * Allows parents to review and respond to child app suggestions.
 * Shows pending suggestions with approve/deny actions.
 */

'use client'

import { useState } from 'react'
import { useFocusModeSuggestions } from '../../hooks/useFocusModeSuggestions'

interface AppSuggestionReviewProps {
  childId: string
  familyId: string
  parentUid: string
  childName?: string
}

export function AppSuggestionReview({
  childId,
  familyId,
  parentUid,
  childName,
}: AppSuggestionReviewProps) {
  const { suggestions, pendingSuggestions, loading, approveSuggestion, denySuggestion } =
    useFocusModeSuggestions({
      childId,
      familyId,
      userUid: parentUid,
      isParent: true,
    })

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState('')

  const handleApprove = async (suggestionId: string) => {
    setProcessingId(suggestionId)
    try {
      await approveSuggestion(suggestionId)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeny = async (suggestionId: string) => {
    setProcessingId(suggestionId)
    try {
      await denySuggestion(suggestionId, denyReason || undefined)
      setDenyingId(null)
      setDenyReason('')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse p-4" data-testid="suggestion-review-loading">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (pendingSuggestions.length === 0) {
    return null
  }

  return (
    <div
      className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
      data-testid="suggestion-review"
    >
      {/* Header with notification badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">💡</span>
        <h3 className="text-sm font-semibold text-yellow-900">
          {childName || 'Your child'} suggested {pendingSuggestions.length} app
          {pendingSuggestions.length > 1 ? 's' : ''} for focus mode
        </h3>
      </div>

      {/* Pending Suggestions List */}
      <ul className="space-y-3" data-testid="pending-suggestions">
        {pendingSuggestions.map((suggestion) => (
          <li
            key={suggestion.id}
            className="bg-white rounded-lg p-3 shadow-sm"
            data-testid={`suggestion-${suggestion.id}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{suggestion.name}</span>
                  <span className="text-xs text-gray-500">{suggestion.pattern}</span>
                </div>
                {suggestion.reason && (
                  <p className="text-sm text-gray-600 mt-1 italic">
                    &ldquo;{suggestion.reason}&rdquo;
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Requested {new Date(suggestion.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Action Buttons */}
              {denyingId !== suggestion.id && (
                <div className="flex gap-2 ml-3">
                  <button
                    onClick={() => handleApprove(suggestion.id)}
                    disabled={processingId === suggestion.id}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`approve-${suggestion.id}`}
                  >
                    {processingId === suggestion.id ? '...' : 'Allow'}
                  </button>
                  <button
                    onClick={() => setDenyingId(suggestion.id)}
                    disabled={processingId === suggestion.id}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`deny-${suggestion.id}`}
                  >
                    Deny
                  </button>
                </div>
              )}
            </div>

            {/* Deny Reason Form */}
            {denyingId === suggestion.id && (
              <div
                className="mt-3 pt-3 border-t border-gray-100"
                data-testid={`deny-form-${suggestion.id}`}
              >
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason (optional, helps explain to {childName || 'your child'})
                </label>
                <textarea
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  placeholder="e.g., Music can be distracting during homework"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 resize-none"
                  data-testid="deny-reason-input"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      setDenyingId(null)
                      setDenyReason('')
                    }}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                    data-testid="cancel-deny"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeny(suggestion.id)}
                    disabled={processingId === suggestion.id}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="confirm-deny"
                  >
                    {processingId === suggestion.id ? '...' : 'Deny Request'}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* History of past suggestions */}
      {suggestions.filter((s) => s.status !== 'pending').length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            View past suggestions ({suggestions.filter((s) => s.status !== 'pending').length})
          </summary>
          <ul className="mt-2 space-y-1" data-testid="past-suggestions">
            {suggestions
              .filter((s) => s.status !== 'pending')
              .map((s) => (
                <li key={s.id} className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{s.status === 'approved' ? '✓' : '✕'}</span>
                  <span className={s.status === 'approved' ? 'text-green-600' : 'text-red-600'}>
                    {s.name}
                  </span>
                  <span className="text-gray-400">-</span>
                  <span>{s.status === 'approved' ? 'Allowed' : 'Denied'}</span>
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  )
}
