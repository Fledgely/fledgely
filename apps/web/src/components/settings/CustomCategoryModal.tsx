'use client'

/**
 * CustomCategoryModal Component - Story 30.4
 *
 * Modal for creating/editing custom categories.
 *
 * Requirements:
 * - AC1: Category name (max 30 chars)
 * - AC2: Apps/sites assigned via search
 */

import { useState } from 'react'
import { MAX_CUSTOM_CATEGORIES_PER_FAMILY } from '@fledgely/shared'

// Sample popular apps/sites for search (MVP approach)
const POPULAR_APPS = [
  { id: 'khan-academy', name: 'Khan Academy', domain: 'khanacademy.org' },
  { id: 'google-docs', name: 'Google Docs', domain: 'docs.google.com' },
  { id: 'google-classroom', name: 'Google Classroom', domain: 'classroom.google.com' },
  { id: 'youtube', name: 'YouTube', domain: 'youtube.com' },
  { id: 'netflix', name: 'Netflix', domain: 'netflix.com' },
  { id: 'roblox', name: 'Roblox', domain: 'roblox.com' },
  { id: 'minecraft', name: 'Minecraft', domain: 'minecraft.net' },
  { id: 'discord', name: 'Discord', domain: 'discord.com' },
  { id: 'tiktok', name: 'TikTok', domain: 'tiktok.com' },
  { id: 'instagram', name: 'Instagram', domain: 'instagram.com' },
  { id: 'spotify', name: 'Spotify', domain: 'spotify.com' },
  { id: 'twitch', name: 'Twitch', domain: 'twitch.tv' },
]

interface CustomCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, apps: string[]) => Promise<{ success: boolean; error?: string }>
  existingCategory?: {
    id: string
    name: string
    apps: string[]
  }
  canAddMore: boolean
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: '20px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  charCount: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'right' as const,
    marginTop: '4px',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    marginBottom: '12px',
  },
  appList: {
    maxHeight: '200px',
    overflowY: 'auto' as const,
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  appItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  appItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    marginRight: '12px',
    accentColor: '#10b981',
  },
  appName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  appDomain: {
    fontSize: '12px',
    color: '#6b7280',
    marginLeft: '8px',
  },
  selectedApps: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginTop: '12px',
  },
  selectedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '13px',
  },
  removeTag: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    marginTop: '8px',
  },
  limitWarning: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#92400e',
  },
}

export function CustomCategoryModal({
  isOpen,
  onClose,
  onSave,
  existingCategory,
  canAddMore,
}: CustomCategoryModalProps) {
  const [name, setName] = useState(existingCategory?.name || '')
  const [selectedApps, setSelectedApps] = useState<string[]>(existingCategory?.apps || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isEditing = !!existingCategory
  const filteredApps = POPULAR_APPS.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.domain.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleApp = (appId: string) => {
    setSelectedApps((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    )
  }

  const handleRemoveApp = (appId: string) => {
    setSelectedApps((prev) => prev.filter((id) => id !== appId))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a category name')
      return
    }

    if (name.length > 30) {
      setError('Category name must be 30 characters or less')
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await onSave(name.trim(), selectedApps)

    setIsSaving(false)

    if (result.success) {
      onClose()
    } else {
      setError(result.error || 'Failed to save category')
    }
  }

  const canSave = name.trim().length > 0 && name.length <= 30 && (isEditing || canAddMore)

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>{isEditing ? 'Edit Category' : 'Create Custom Category'}</span>
          <button style={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" />
            </svg>
          </button>
        </div>

        <div style={styles.content}>
          {!isEditing && !canAddMore && (
            <div style={styles.limitWarning}>
              You have reached the maximum of {MAX_CUSTOM_CATEGORIES_PER_FAMILY} custom categories.
              Delete an existing category to create a new one.
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Category Name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g., Homework Apps"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
            />
            <div style={styles.charCount}>{name.length}/30</div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Add Apps & Sites (Optional)</label>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div style={styles.appList}>
              {filteredApps.map((app) => (
                <div
                  key={app.id}
                  style={{
                    ...styles.appItem,
                    ...(selectedApps.includes(app.id) ? styles.appItemSelected : {}),
                  }}
                  onClick={() => handleToggleApp(app.id)}
                >
                  <input
                    type="checkbox"
                    style={styles.checkbox}
                    checked={selectedApps.includes(app.id)}
                    onChange={() => {}}
                  />
                  <span style={styles.appName}>{app.name}</span>
                  <span style={styles.appDomain}>{app.domain}</span>
                </div>
              ))}
            </div>

            {selectedApps.length > 0 && (
              <div style={styles.selectedApps}>
                {selectedApps.map((appId) => {
                  const app = POPULAR_APPS.find((a) => a.id === appId)
                  return app ? (
                    <span key={appId} style={styles.selectedTag}>
                      {app.name}
                      <button style={styles.removeTag} onClick={() => handleRemoveApp(appId)}>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" />
                        </svg>
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.saveButton,
              ...(isSaving || !canSave ? styles.saveButtonDisabled : {}),
            }}
            onClick={handleSave}
            disabled={isSaving || !canSave}
          >
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  )
}
