'use client'

/**
 * Sharing Preferences Panel - Story 52.3 Task 4
 *
 * Granular controls for what teens share with parents when in reverse mode.
 *
 * AC1: Daily screen time summary sharing
 * AC2: Category-based sharing
 * AC3: Time limit status sharing
 * AC5: Granular controls - what, when, how much
 * AC7: Settings persistence
 */

import { useState, useEffect } from 'react'
import {
  type ReverseModeShareingPreferences,
  DEFAULT_REVERSE_MODE_SHARING,
  generateSharingPreview,
} from '@fledgely/shared'

interface SharingPreferencesPanelProps {
  currentPreferences: ReverseModeShareingPreferences | null | undefined
  onSave: (preferences: ReverseModeShareingPreferences) => Promise<void>
  isLoading?: boolean
  availableCategories?: string[]
}

export function SharingPreferencesPanel({
  currentPreferences,
  onSave,
  isLoading = false,
  availableCategories = ['social', 'gaming', 'education', 'entertainment', 'productivity'],
}: SharingPreferencesPanelProps) {
  const [preferences, setPreferences] = useState<ReverseModeShareingPreferences>(
    currentPreferences || DEFAULT_REVERSE_MODE_SHARING
  )
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Update local state when props change (AC7: Settings persistence)
  useEffect(() => {
    if (currentPreferences) {
      setPreferences(currentPreferences)
      setHasChanges(false)
    }
  }, [currentPreferences])

  const handlePreferenceChange = <K extends keyof ReverseModeShareingPreferences>(
    key: K,
    value: ReverseModeShareingPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleCategoryToggle = (category: string) => {
    const current = preferences.sharedCategories || []
    const newCategories = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category]
    handlePreferenceChange('sharedCategories', newCategories)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(preferences)
      setHasChanges(false)
    } finally {
      setIsSaving(false)
    }
  }

  const preview = generateSharingPreview(preferences)

  return (
    <div className="space-y-6">
      {/* Screen Time Sharing - AC1 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Screen Time</h3>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.screenTime}
              onChange={(e) => handlePreferenceChange('screenTime', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <span className="text-gray-700">Share screen time with parents</span>
          </label>

          {preferences.screenTime && (
            <div className="ml-7 space-y-3">
              <p className="text-sm text-gray-500">What detail level should parents see?</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="screenTimeDetail"
                    value="summary"
                    checked={preferences.screenTimeDetail === 'summary'}
                    onChange={() => handlePreferenceChange('screenTimeDetail', 'summary')}
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={isLoading}
                  />
                  <div>
                    <span className="text-gray-700">Summary only</span>
                    <p className="text-xs text-gray-500">
                      Parents see only your daily total screen time
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="screenTimeDetail"
                    value="full"
                    checked={preferences.screenTimeDetail === 'full'}
                    onChange={() => handlePreferenceChange('screenTimeDetail', 'full')}
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={isLoading}
                  />
                  <div>
                    <span className="text-gray-700">Full details</span>
                    <p className="text-xs text-gray-500">Parents see app and category breakdown</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Sharing - AC2 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Categories to Share</h3>
        <p className="text-sm text-gray-500 mb-4">
          Only show activity from these categories. Unselected categories appear as
          &quot;Private&quot;.
        </p>

        <div className="flex flex-wrap gap-2">
          {availableCategories.map((category) => {
            const isSelected = (preferences.sharedCategories || []).includes(category)
            return (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 border'
                    : 'bg-gray-100 text-gray-600 border-gray-200 border hover:bg-gray-200'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            )
          })}
        </div>
        {(preferences.sharedCategories || []).length === 0 && (
          <p className="text-xs text-gray-400 mt-2">
            No categories selected - all categories will appear as Private
          </p>
        )}
      </div>

      {/* Time Limit Status - AC3 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Time Limit Status</h3>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.timeLimitStatus}
            onChange={(e) => handlePreferenceChange('timeLimitStatus', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <div>
            <span className="text-gray-700">Share time limit status</span>
            <p className="text-xs text-gray-500">
              Parents see &quot;approaching limit&quot; or &quot;limit reached&quot; only
            </p>
          </div>
        </label>
      </div>

      {/* Other Data Types */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Other Data</h3>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.flags}
              onChange={(e) => handlePreferenceChange('flags', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <div>
              <span className="text-gray-700">Flags & Alerts</span>
              <p className="text-xs text-gray-500">Content warnings and safety flags</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.screenshots}
              onChange={(e) => handlePreferenceChange('screenshots', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <div>
              <span className="text-gray-700">Screenshots</span>
              <p className="text-xs text-gray-500">Screen captures from your devices</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.location}
              onChange={(e) => handlePreferenceChange('location', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <div>
              <span className="text-gray-700">Location</span>
              <p className="text-xs text-gray-500">Your current location data</p>
            </div>
          </label>
        </div>
      </div>

      {/* Preview Summary - AC5 */}
      <div
        className={`rounded-lg p-4 ${preview.isNothingShared ? 'bg-amber-50 border-amber-200 border' : 'bg-green-50 border-green-200 border'}`}
      >
        <h3 className="text-sm font-medium text-gray-900 mb-2">What Parents Will See</h3>
        <p className={`text-sm ${preview.isNothingShared ? 'text-amber-700' : 'text-green-700'}`}>
          {preview.summary}
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving || isLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasChanges && !isSaving && !isLoading
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}
