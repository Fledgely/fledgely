/**
 * FocusModeSettings Component - Story 33.2
 *
 * Parent UI for configuring focus mode app settings for their child.
 * Allows customizing which apps are allowed/blocked during focus mode.
 */

'use client'

import { useState } from 'react'
import { useFocusModeConfig } from '../../hooks/useFocusModeConfig'
import { FOCUS_MODE_DEFAULT_CATEGORIES } from '@fledgely/shared'

interface FocusModeSettingsProps {
  childId: string
  familyId: string
  parentUid: string
  childName?: string
}

export function FocusModeSettings({
  childId,
  familyId,
  parentUid,
  childName,
}: FocusModeSettingsProps) {
  const {
    config,
    loading,
    error,
    effectiveAllowList,
    effectiveBlockList,
    addToAllowList,
    addToBlockList,
    removeFromAllowList,
    removeFromBlockList,
    toggleDefaultCategories,
  } = useFocusModeConfig({ childId, familyId, parentUid })

  const [newAllowApp, setNewAllowApp] = useState({ pattern: '', name: '' })
  const [newBlockApp, setNewBlockApp] = useState({ pattern: '', name: '' })
  const [addingAllow, setAddingAllow] = useState(false)
  const [addingBlock, setAddingBlock] = useState(false)

  if (loading) {
    return (
      <div className="animate-pulse p-4" data-testid="focus-mode-settings-loading">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-4 bg-red-50 border border-red-200 rounded-lg"
        data-testid="focus-mode-settings-error"
      >
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  const handleAddAllowApp = async () => {
    if (!newAllowApp.pattern.trim() || !newAllowApp.name.trim()) return
    setAddingAllow(true)
    try {
      await addToAllowList(newAllowApp.pattern.trim(), newAllowApp.name.trim())
      setNewAllowApp({ pattern: '', name: '' })
    } finally {
      setAddingAllow(false)
    }
  }

  const handleAddBlockApp = async () => {
    if (!newBlockApp.pattern.trim() || !newBlockApp.name.trim()) return
    setAddingBlock(true)
    try {
      await addToBlockList(newBlockApp.pattern.trim(), newBlockApp.name.trim())
      setNewBlockApp({ pattern: '', name: '' })
    } finally {
      setAddingBlock(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="focus-mode-settings">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Focus Mode Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure which apps {childName || 'your child'} can use during focus mode
        </p>
      </div>

      {/* Default Categories Toggle */}
      <div className="bg-gray-50 p-4 rounded-lg" data-testid="default-categories-section">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Use Default Categories</h3>
            <p className="text-xs text-gray-500 mt-1">
              Includes education, productivity, and reference apps as allowed; blocks social media,
              games, and entertainment
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config?.useDefaultCategories ?? true}
              onChange={(e) => toggleDefaultCategories(e.target.checked)}
              className="sr-only peer"
              data-testid="default-categories-toggle"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {config?.useDefaultCategories && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-medium text-green-700 mb-1">Allowed Categories:</p>
              <div className="flex flex-wrap gap-1">
                {FOCUS_MODE_DEFAULT_CATEGORIES.allowed.map((cat) => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs"
                  >
                    {cat.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-red-700 mb-1">Blocked Categories:</p>
              <div className="flex flex-wrap gap-1">
                {FOCUS_MODE_DEFAULT_CATEGORIES.blocked.map((cat) => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs"
                  >
                    {cat.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Allowed Apps Section */}
      <div
        className="bg-white border border-gray-200 rounded-lg"
        data-testid="allowed-apps-section"
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <span className="text-green-600">✓</span> Allowed During Focus
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Apps and sites that can be used during focus mode
          </p>
        </div>

        {/* App List */}
        <div className="p-4 max-h-48 overflow-y-auto">
          {effectiveAllowList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No apps configured</p>
          ) : (
            <ul className="space-y-2" data-testid="allowed-apps-list">
              {effectiveAllowList.map((app) => (
                <li key={app.pattern} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-900">{app.name}</span>
                    <span className="text-gray-400 text-xs ml-2">{app.pattern}</span>
                    {app.isDefault && (
                      <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                        default
                      </span>
                    )}
                  </div>
                  {!app.isDefault && (
                    <button
                      onClick={() => removeFromAllowList(app.pattern)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      data-testid={`remove-allow-${app.pattern}`}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add App Form */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Domain (e.g., example.com)"
              value={newAllowApp.pattern}
              onChange={(e) => setNewAllowApp((prev) => ({ ...prev, pattern: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
              data-testid="allow-app-pattern-input"
            />
            <input
              type="text"
              placeholder="Name"
              value={newAllowApp.name}
              onChange={(e) => setNewAllowApp((prev) => ({ ...prev, name: e.target.value }))}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
              data-testid="allow-app-name-input"
            />
            <button
              onClick={handleAddAllowApp}
              disabled={addingAllow || !newAllowApp.pattern.trim() || !newAllowApp.name.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="add-allow-app-button"
            >
              {addingAllow ? '...' : 'Add'}
            </button>
          </div>
        </div>
      </div>

      {/* Blocked Apps Section */}
      <div
        className="bg-white border border-gray-200 rounded-lg"
        data-testid="blocked-apps-section"
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <span className="text-red-600">✕</span> Blocked During Focus
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Apps and sites that are blocked during focus mode
          </p>
        </div>

        {/* App List */}
        <div className="p-4 max-h-48 overflow-y-auto">
          {effectiveBlockList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No apps configured</p>
          ) : (
            <ul className="space-y-2" data-testid="blocked-apps-list">
              {effectiveBlockList.map((app) => (
                <li key={app.pattern} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-900">{app.name}</span>
                    <span className="text-gray-400 text-xs ml-2">{app.pattern}</span>
                    {app.isDefault && (
                      <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                        default
                      </span>
                    )}
                  </div>
                  {!app.isDefault && (
                    <button
                      onClick={() => removeFromBlockList(app.pattern)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      data-testid={`remove-block-${app.pattern}`}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add App Form */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Domain (e.g., example.com)"
              value={newBlockApp.pattern}
              onChange={(e) => setNewBlockApp((prev) => ({ ...prev, pattern: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
              data-testid="block-app-pattern-input"
            />
            <input
              type="text"
              placeholder="Name"
              value={newBlockApp.name}
              onChange={(e) => setNewBlockApp((prev) => ({ ...prev, name: e.target.value }))}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
              data-testid="block-app-name-input"
            />
            <button
              onClick={handleAddBlockApp}
              disabled={addingBlock || !newBlockApp.pattern.trim() || !newBlockApp.name.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="add-block-app-button"
            >
              {addingBlock ? '...' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
