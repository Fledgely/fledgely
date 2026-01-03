'use client'

/**
 * Parent Notification Preferences Page
 *
 * Story 41.1: Notification Preferences Configuration
 * - AC1: Flag notification toggles (Critical, Medium, Low)
 * - AC2: Time limit notification toggles
 * - AC3: Sync status toggles
 * - AC4: Quiet hours configuration
 * - AC5: Per-child preferences (FR152)
 * - AC6: Reasonable defaults
 * - AC7: Immediate application
 */

import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { useFamily } from '../../../../contexts/FamilyContext'
import { useParentNotificationPreferences } from '../../../../hooks/useParentNotificationPreferences'
import {
  NOTIFICATION_DEFAULTS,
  QUIET_HOURS_DEFAULTS,
  SYNC_THRESHOLD_OPTIONS,
  type MediumFlagsMode,
  type SyncThresholdHours,
} from '@fledgely/shared'

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
  },
  content: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '24px',
  },
  pageHeader: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '8px',
  },
  pageDescription: {
    fontSize: '14px',
    color: '#6b7280',
  },
  childSelector: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  },
  childTab: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    color: '#6b7280',
    minHeight: '44px',
  },
  childTabActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '12px',
    marginTop: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    marginBottom: '16px',
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  settingRowLast: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
  },
  settingInfo: {
    flex: 1,
    marginRight: '16px',
  },
  settingLabel: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#1f2937',
    marginBottom: '4px',
  },
  settingDescription: {
    fontSize: '13px',
    color: '#6b7280',
  },
  toggle: {
    position: 'relative' as const,
    width: '48px',
    height: '26px',
    minWidth: '48px',
    backgroundColor: '#d1d5db',
    borderRadius: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '3px',
    left: '3px',
    width: '20px',
    height: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.2s',
  },
  toggleKnobActive: {
    transform: 'translateX(22px)',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    minHeight: '44px',
    minWidth: '120px',
  },
  timeInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  timeInput: {
    width: '110px',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    minHeight: '44px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  saveButton: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '16px',
    minHeight: '44px',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '10px',
    marginLeft: '8px',
  },
  badgeCritical: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  badgeMedium: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
  },
  badgeLow: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
  },
  applyAllButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '12px',
    minHeight: '44px',
  },
  previewCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
  },
  previewTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  previewList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  previewItem: {
    fontSize: '13px',
    color: '#4b5563',
    padding: '4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkIcon: {
    color: '#10b981',
    flexShrink: 0,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#dc2626',
    fontSize: '14px',
  },
  weekendToggle: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
}

function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.toggle,
        ...(enabled ? styles.toggleActive : {}),
        ...(disabled ? styles.toggleDisabled : {}),
      }}
      onClick={() => !disabled && onChange(!enabled)}
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
    >
      <div
        style={{
          ...styles.toggleKnob,
          ...(enabled ? styles.toggleKnobActive : {}),
        }}
      />
    </button>
  )
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={styles.checkIcon}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export default function ParentNotificationPreferencesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { firebaseUser, loading: authLoading } = useAuth()
  const { family, loading: familyLoading } = useFamily()

  // Get child ID from URL or use null for family defaults
  const selectedChildId = searchParams.get('childId') || null

  const { preferences, isLoading, isUpdating, error, updatePreferences } =
    useParentNotificationPreferences({
      familyId: family?.id || '',
      childId: selectedChildId,
    })

  // Local state for form
  const [localPrefs, setLocalPrefs] = useState({
    criticalFlagsEnabled: NOTIFICATION_DEFAULTS.criticalFlagsEnabled,
    mediumFlagsMode: NOTIFICATION_DEFAULTS.mediumFlagsMode as MediumFlagsMode,
    lowFlagsEnabled: NOTIFICATION_DEFAULTS.lowFlagsEnabled,
    timeLimitWarningsEnabled: NOTIFICATION_DEFAULTS.timeLimitWarningsEnabled,
    limitReachedEnabled: NOTIFICATION_DEFAULTS.limitReachedEnabled,
    extensionRequestsEnabled: NOTIFICATION_DEFAULTS.extensionRequestsEnabled,
    syncAlertsEnabled: NOTIFICATION_DEFAULTS.syncAlertsEnabled,
    syncThresholdHours: NOTIFICATION_DEFAULTS.syncThresholdHours as SyncThresholdHours,
    quietHoursEnabled: NOTIFICATION_DEFAULTS.quietHoursEnabled,
    quietHoursStart: QUIET_HOURS_DEFAULTS.start,
    quietHoursEnd: QUIET_HOURS_DEFAULTS.end,
    quietHoursWeekendDifferent: false,
    quietHoursWeekendStart: null as string | null,
    quietHoursWeekendEnd: null as string | null,
  })

  // Sync local state with loaded preferences
  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        criticalFlagsEnabled: preferences.criticalFlagsEnabled,
        mediumFlagsMode: preferences.mediumFlagsMode,
        lowFlagsEnabled: preferences.lowFlagsEnabled,
        timeLimitWarningsEnabled: preferences.timeLimitWarningsEnabled,
        limitReachedEnabled: preferences.limitReachedEnabled,
        extensionRequestsEnabled: preferences.extensionRequestsEnabled,
        syncAlertsEnabled: preferences.syncAlertsEnabled,
        syncThresholdHours: preferences.syncThresholdHours,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        quietHoursWeekendDifferent: preferences.quietHoursWeekendDifferent,
        quietHoursWeekendStart: preferences.quietHoursWeekendStart,
        quietHoursWeekendEnd: preferences.quietHoursWeekendEnd,
      })
    }
  }, [preferences])

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await updatePreferences(localPrefs)
    } catch (err) {
      console.error('Failed to save preferences:', err)
    }
  }, [updatePreferences, localPrefs])

  // Handle apply to all children
  const handleApplyToAll = useCallback(async () => {
    try {
      await updatePreferences({
        ...localPrefs,
        applyToAllChildren: true,
      })
    } catch (err) {
      console.error('Failed to apply to all children:', err)
    }
  }, [updatePreferences, localPrefs])

  // Handle child tab click
  const handleChildSelect = (childId: string | null) => {
    const params = new URLSearchParams()
    if (childId) {
      params.set('childId', childId)
    }
    router.push(`/dashboard/settings/parent-notifications${childId ? `?${params.toString()}` : ''}`)
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  // Loading state
  if (authLoading || familyLoading || isLoading) {
    return (
      <main style={styles.main}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    )
  }

  if (!firebaseUser || !family) {
    return null
  }

  const children = family.children || []

  // Generate preview descriptions
  const previewItems: string[] = []
  if (localPrefs.criticalFlagsEnabled) {
    previewItems.push('Critical flags: Immediate notification')
  }
  if (localPrefs.mediumFlagsMode === 'immediate') {
    previewItems.push('Medium flags: Immediate notification')
  } else if (localPrefs.mediumFlagsMode === 'digest') {
    previewItems.push('Medium flags: Hourly digest')
  }
  if (localPrefs.lowFlagsEnabled) {
    previewItems.push('Low flags: Enabled')
  }
  if (localPrefs.timeLimitWarningsEnabled) {
    previewItems.push('Time limit warnings: Enabled')
  }
  if (localPrefs.syncAlertsEnabled) {
    previewItems.push(`Sync alerts: After ${localPrefs.syncThresholdHours}h`)
  }
  if (localPrefs.quietHoursEnabled) {
    previewItems.push(`Quiet hours: ${localPrefs.quietHoursStart} - ${localPrefs.quietHoursEnd}`)
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton}
            onClick={() => router.push('/dashboard')}
            aria-label="Back to dashboard"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span style={styles.title}>Notification Preferences</span>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Alert Preferences</h1>
          <p style={styles.pageDescription}>
            Configure how you receive notifications about flags, time limits, and device sync
            status.
          </p>
        </div>

        {error && <div style={styles.errorBanner}>{error.message}</div>}

        {/* Child Selector (AC5) */}
        {children.length > 0 && (
          <div style={styles.childSelector}>
            <button
              style={{
                ...styles.childTab,
                ...(!selectedChildId ? styles.childTabActive : {}),
              }}
              onClick={() => handleChildSelect(null)}
            >
              All Children
            </button>
            {children.map((child: { id: string; name: string }) => (
              <button
                key={child.id}
                style={{
                  ...styles.childTab,
                  ...(selectedChildId === child.id ? styles.childTabActive : {}),
                }}
                onClick={() => handleChildSelect(child.id)}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        {/* Flag Notifications (AC1) */}
        <h2 style={styles.sectionTitle}>Flag Notifications</h2>
        <div style={styles.card}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>
                Critical Flags
                <span style={{ ...styles.badge, ...styles.badgeCritical }}>Required</span>
              </div>
              <div style={styles.settingDescription}>
                Always receive immediate notifications for critical safety flags
              </div>
            </div>
            <Toggle enabled={localPrefs.criticalFlagsEnabled} onChange={() => {}} disabled={true} />
          </div>

          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>
                Medium Flags
                <span style={{ ...styles.badge, ...styles.badgeMedium }}>Configurable</span>
              </div>
              <div style={styles.settingDescription}>
                Choose how to receive medium priority flag notifications
              </div>
            </div>
            <select
              style={styles.select}
              value={localPrefs.mediumFlagsMode}
              onChange={(e) =>
                setLocalPrefs({
                  ...localPrefs,
                  mediumFlagsMode: e.target.value as MediumFlagsMode,
                })
              }
            >
              <option value="immediate">Immediate</option>
              <option value="digest">Hourly Digest</option>
              <option value="off">Off</option>
            </select>
          </div>

          <div style={styles.settingRowLast}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>
                Low Flags
                <span style={{ ...styles.badge, ...styles.badgeLow }}>Optional</span>
              </div>
              <div style={styles.settingDescription}>
                Receive notifications for low priority informational flags
              </div>
            </div>
            <Toggle
              enabled={localPrefs.lowFlagsEnabled}
              onChange={(value) => setLocalPrefs({ ...localPrefs, lowFlagsEnabled: value })}
            />
          </div>
        </div>

        {/* Time Limit Notifications (AC2) */}
        <h2 style={styles.sectionTitle}>Time Limit Notifications</h2>
        <div style={styles.card}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Time Limit Warnings</div>
              <div style={styles.settingDescription}>
                Get notified when a child is approaching their time limit
              </div>
            </div>
            <Toggle
              enabled={localPrefs.timeLimitWarningsEnabled}
              onChange={(value) =>
                setLocalPrefs({ ...localPrefs, timeLimitWarningsEnabled: value })
              }
            />
          </div>

          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Limit Reached</div>
              <div style={styles.settingDescription}>
                Get notified when a child reaches their time limit
              </div>
            </div>
            <Toggle
              enabled={localPrefs.limitReachedEnabled}
              onChange={(value) => setLocalPrefs({ ...localPrefs, limitReachedEnabled: value })}
            />
          </div>

          <div style={styles.settingRowLast}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Extension Requests</div>
              <div style={styles.settingDescription}>
                Get notified when a child requests more time
              </div>
            </div>
            <Toggle
              enabled={localPrefs.extensionRequestsEnabled}
              onChange={(value) =>
                setLocalPrefs({ ...localPrefs, extensionRequestsEnabled: value })
              }
            />
          </div>
        </div>

        {/* Sync Alerts (AC3) */}
        <h2 style={styles.sectionTitle}>Device Sync Alerts</h2>
        <div style={styles.card}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Sync Status Alerts</div>
              <div style={styles.settingDescription}>
                Get notified when a device hasn&apos;t synced recently
              </div>
            </div>
            <Toggle
              enabled={localPrefs.syncAlertsEnabled}
              onChange={(value) => setLocalPrefs({ ...localPrefs, syncAlertsEnabled: value })}
            />
          </div>

          <div style={styles.settingRowLast}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Alert Threshold</div>
              <div style={styles.settingDescription}>
                Alert after device hasn&apos;t synced for this long
              </div>
            </div>
            <select
              style={styles.select}
              value={localPrefs.syncThresholdHours}
              onChange={(e) =>
                setLocalPrefs({
                  ...localPrefs,
                  syncThresholdHours: parseInt(e.target.value, 10) as SyncThresholdHours,
                })
              }
              disabled={!localPrefs.syncAlertsEnabled}
            >
              {SYNC_THRESHOLD_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours === 1 ? '1 hour' : `${hours} hours`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quiet Hours (AC4) */}
        <h2 style={styles.sectionTitle}>Quiet Hours</h2>
        <div style={styles.card}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Enable Quiet Hours</div>
              <div style={styles.settingDescription}>
                Hold non-critical notifications during these hours
              </div>
            </div>
            <Toggle
              enabled={localPrefs.quietHoursEnabled}
              onChange={(value) => setLocalPrefs({ ...localPrefs, quietHoursEnabled: value })}
            />
          </div>

          {localPrefs.quietHoursEnabled && (
            <>
              <div style={styles.settingRow}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingLabel}>Weekday Hours</div>
                  <div style={styles.settingDescription}>Monday through Friday</div>
                </div>
                <div style={styles.timeInputGroup}>
                  <input
                    type="time"
                    style={styles.timeInput}
                    value={localPrefs.quietHoursStart}
                    onChange={(e) =>
                      setLocalPrefs({ ...localPrefs, quietHoursStart: e.target.value })
                    }
                    aria-label="Quiet hours start time"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    style={styles.timeInput}
                    value={localPrefs.quietHoursEnd}
                    onChange={(e) =>
                      setLocalPrefs({ ...localPrefs, quietHoursEnd: e.target.value })
                    }
                    aria-label="Quiet hours end time"
                  />
                </div>
              </div>

              <div style={styles.weekendToggle}>
                <div style={styles.settingRowLast}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingLabel}>Different Weekend Hours</div>
                    <div style={styles.settingDescription}>
                      Set separate quiet hours for Saturday and Sunday
                    </div>
                  </div>
                  <Toggle
                    enabled={localPrefs.quietHoursWeekendDifferent}
                    onChange={(value) =>
                      setLocalPrefs({
                        ...localPrefs,
                        quietHoursWeekendDifferent: value,
                        quietHoursWeekendStart: value ? localPrefs.quietHoursStart : null,
                        quietHoursWeekendEnd: value ? localPrefs.quietHoursEnd : null,
                      })
                    }
                  />
                </div>

                {localPrefs.quietHoursWeekendDifferent && (
                  <div style={{ ...styles.settingRowLast, paddingTop: '12px' }}>
                    <div style={styles.settingInfo}>
                      <div style={styles.settingLabel}>Weekend Hours</div>
                      <div style={styles.settingDescription}>Saturday and Sunday</div>
                    </div>
                    <div style={styles.timeInputGroup}>
                      <input
                        type="time"
                        style={styles.timeInput}
                        value={localPrefs.quietHoursWeekendStart || ''}
                        onChange={(e) =>
                          setLocalPrefs({
                            ...localPrefs,
                            quietHoursWeekendStart: e.target.value || null,
                          })
                        }
                        aria-label="Weekend quiet hours start time"
                      />
                      <span>to</span>
                      <input
                        type="time"
                        style={styles.timeInput}
                        value={localPrefs.quietHoursWeekendEnd || ''}
                        onChange={(e) =>
                          setLocalPrefs({
                            ...localPrefs,
                            quietHoursWeekendEnd: e.target.value || null,
                          })
                        }
                        aria-label="Weekend quiet hours end time"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Preview */}
        {previewItems.length > 0 && (
          <div style={styles.previewCard}>
            <div style={styles.previewTitle}>Current Settings</div>
            <ul style={styles.previewList}>
              {previewItems.map((item, index) => (
                <li key={index} style={styles.previewItem}>
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Save Button */}
        <button
          style={{
            ...styles.saveButton,
            ...(isUpdating ? styles.saveButtonDisabled : {}),
          }}
          onClick={handleSave}
          disabled={isUpdating}
        >
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Apply to All Button (AC5) */}
        {children.length > 1 && selectedChildId && (
          <button
            style={{
              ...styles.applyAllButton,
              ...(isUpdating ? styles.saveButtonDisabled : {}),
            }}
            onClick={handleApplyToAll}
            disabled={isUpdating}
          >
            Apply to All Children
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
