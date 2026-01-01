'use client'

/**
 * Time Limits Settings Page
 *
 * Story 30.2: Daily Total Limit Configuration
 * Story 30.3: Per-Category Limit Configuration
 * Story 30.4: Custom Category Creation
 * Story 30.5: Per-Device Limit Configuration
 *
 * Allows guardians to configure daily screen time limits:
 * - AC1: Slider for total minutes (30m-8h range)
 * - AC2: Separate weekday/weekend limits
 * - AC3: School days vs weekdays option
 * - AC4: Preview of configured limits
 * - AC5: Cross-device limit indication
 * - AC6: Agreement update notification
 * - Story 30.3: Per-category limits with icons
 * - Story 30.4: Custom category creation
 * - Story 30.5: Per-device limits
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { useFamily } from '../../../../contexts/FamilyContext'
import { useChildTimeLimits, type TimeLimitsConfig } from '../../../../hooks/useChildTimeLimits'
import { useCustomCategories } from '../../../../hooks/useCustomCategories'
import { useDevices } from '../../../../hooks/useDevices'
import { formatMinutes } from '../../../../utils/formatTime'
import {
  CategoryLimitCard,
  getDefaultCategoryLimits,
  type CategoryLimit as CategoryLimitUI,
} from '../../../../components/settings/CategoryLimitCard'
import {
  DeviceLimitCard,
  deviceToLimitConfig,
  type DeviceLimitConfig as DeviceLimitCardConfig,
} from '../../../../components/settings/DeviceLimitCard'
import { CustomCategoryModal } from '../../../../components/settings/CustomCategoryModal'
import { OfflineScheduleCard } from '../../../../components/settings/OfflineScheduleCard'
import { useFamilyOfflineSchedule } from '../../../../hooks/useFamilyOfflineSchedule'
import type { CustomCategory } from '@fledgely/shared'

const styles = {
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
    width: '40px',
    height: '40px',
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
    lineHeight: 1.5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
  },
  childSelector: {
    marginBottom: '24px',
  },
  childSelectorLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    cursor: 'pointer',
  },
  sliderContainer: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sliderLabel: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#1f2937',
  },
  sliderValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#10b981',
  },
  sliderUnlimited: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#6b7280',
  },
  sliderInput: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    appearance: 'none' as const,
    cursor: 'pointer',
    WebkitAppearance: 'none' as const,
  },
  sliderTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '8px',
  },
  scheduleTypeContainer: {
    marginBottom: '16px',
  },
  scheduleTypeLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  radioGroup: {
    display: 'flex',
    gap: '16px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
  },
  radioInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#10b981',
  },
  unlimitedToggle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderTop: '1px solid #f3f4f6',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#1f2937',
    marginBottom: '2px',
  },
  toggleDescription: {
    fontSize: '13px',
    color: '#6b7280',
  },
  toggle: {
    position: 'relative' as const,
    width: '48px',
    height: '26px',
    backgroundColor: '#d1d5db',
    borderRadius: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
  },
  toggleActive: {
    backgroundColor: '#10b981',
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
  previewBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  previewTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#166534',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  previewText: {
    fontSize: '15px',
    color: '#166534',
    lineHeight: 1.5,
  },
  crossDeviceNote: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  crossDeviceIcon: {
    color: '#3b82f6',
    flexShrink: 0,
    marginTop: '2px',
  },
  crossDeviceText: {
    fontSize: '14px',
    color: '#1e40af',
    lineHeight: 1.5,
  },
  saveButton: {
    width: '100%',
    padding: '14px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
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
    borderTopColor: '#10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: '#6b7280',
  },
  emptyStateTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  successMessage: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#166534',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#991b1b',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  addCategoryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#10b981',
    backgroundColor: '#f0fdf4',
    border: '1px dashed #86efac',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '12px',
    transition: 'background-color 0.2s',
  },
  addCategoryButtonDisabled: {
    color: '#9ca3af',
    backgroundColor: '#f9fafb',
    border: '1px dashed #d1d5db',
    cursor: 'not-allowed',
  },
  customCategorySection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  customCategoryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  customCategoryTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  customCategoryItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  customCategoryName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  customCategoryApps: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  customCategoryActions: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#6b7280',
    transition: 'background-color 0.2s, color 0.2s',
  },
  // Story 30.6: Validation warning styles
  warningBox: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  warningIcon: {
    color: '#d97706',
    flexShrink: 0,
    marginTop: '2px',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#92400e',
    marginBottom: '4px',
  },
  warningText: {
    fontSize: '13px',
    color: '#a16207',
    lineHeight: 1.5,
  },
  summaryCard: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  },
  summaryTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#166534',
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  summarySection: {
    marginBottom: '12px',
  },
  summarySectionTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#166534',
    marginBottom: '4px',
  },
  summarySectionContent: {
    fontSize: '15px',
    color: '#15803d',
    lineHeight: 1.6,
  },
  scenarioBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
  },
  scenarioTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#166534',
    marginBottom: '6px',
  },
  scenarioText: {
    fontSize: '14px',
    color: '#15803d',
    lineHeight: 1.5,
  },
}

// Time limit range: 30 minutes to 8 hours (480 minutes)
const MIN_MINUTES = 30
const MAX_MINUTES = 480
const STEP_MINUTES = 15

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      style={{
        ...styles.toggle,
        ...(enabled ? styles.toggleActive : {}),
      }}
      onClick={() => onChange(!enabled)}
      role="switch"
      aria-checked={enabled}
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

export default function TimeLimitsSettingsPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const { family, children, loading: familyLoading } = useFamily()

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [localLimits, setLocalLimits] = useState<TimeLimitsConfig | null>(null)
  const [localCategoryLimits, setLocalCategoryLimits] = useState<CategoryLimitUI[]>(
    getDefaultCategoryLimits()
  )
  const [localDeviceLimits, setLocalDeviceLimits] = useState<DeviceLimitCardConfig[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Custom categories modal state - Story 30.4
  const [isCustomCategoryModalOpen, setIsCustomCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null)

  const {
    limits,
    categoryLimits,
    deviceLimits,
    loading: limitsLoading,
    saveLimits,
    saveCategoryLimits,
    saveDeviceLimits,
  } = useChildTimeLimits({
    familyId: family?.id ?? null,
    childId: selectedChildId,
    enabled: !!selectedChildId,
  })

  // Devices for selected child - Story 30.5
  const { devices, loading: devicesLoading } = useDevices({
    familyId: family?.id ?? null,
    enabled: !!family?.id,
  })

  // Filter devices for selected child
  const childDevices = devices.filter((d) => d.childId === selectedChildId && d.status === 'active')

  // Custom categories - Story 30.4
  const {
    categories: customCategories,
    loading: customCategoriesLoading,
    canAddMore: canAddMoreCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCustomCategories({
    familyId: family?.id ?? null,
    enabled: !!family?.id,
  })

  // Story 32.1: Family offline schedule
  const {
    schedule: offlineSchedule,
    loading: offlineLoading,
    error: offlineError,
    saveSchedule: saveOfflineSchedule,
    applyPreset: applyOfflinePreset,
    hasChanges: hasOfflineChanges,
  } = useFamilyOfflineSchedule({
    familyId: family?.id,
    enabled: !!family?.id,
  })

  // Local offline schedule state for UI changes before save
  const [localOfflineSchedule, setLocalOfflineSchedule] = useState(offlineSchedule)

  // Sync local offline schedule with hook state
  useEffect(() => {
    if (offlineSchedule) {
      setLocalOfflineSchedule(offlineSchedule)
    }
  }, [offlineSchedule])

  // Compute hasChanges locally by comparing localLimits with limits from hook
  const hasLocalChanges =
    limits !== null &&
    localLimits !== null &&
    (localLimits.weekdayMinutes !== limits.weekdayMinutes ||
      localLimits.weekendMinutes !== limits.weekendMinutes ||
      localLimits.scheduleType !== limits.scheduleType ||
      localLimits.unlimited !== limits.unlimited)

  // Check if category limits have changed
  const hasCategoryChanges = localCategoryLimits.some((local) => {
    const original = categoryLimits.find((c) => c.categoryId === local.categoryId)
    if (!original) {
      // If category wasn't in original but is now enabled, it's a change
      return local.enabled
    }
    return (
      local.enabled !== true || // original from Firestore is always enabled
      local.weekdayMinutes !== original.weekdayMinutes ||
      local.weekendMinutes !== original.weekendMinutes ||
      local.unlimited !== original.unlimited
    )
  })

  // Check if device limits have changed (Story 30.5)
  const hasDeviceChanges = localDeviceLimits.some((local) => {
    const original = deviceLimits.find((d) => d.deviceId === local.deviceId)
    if (!original) {
      return local.enabled
    }
    return (
      local.enabled !== original.enabled ||
      local.weekdayMinutes !== original.weekdayMinutes ||
      local.weekendMinutes !== original.weekendMinutes ||
      local.unlimited !== original.unlimited
    )
  })

  // Story 30.6: Conflict detection
  interface ConflictWarning {
    type: 'category_exceeds_daily' | 'device_exceeds_daily'
    name: string
    limitMinutes: number
    dailyMinutes: number
  }

  const conflicts = useMemo((): ConflictWarning[] => {
    if (!localLimits || localLimits.unlimited) return []

    const warnings: ConflictWarning[] = []
    const dailyTotal = localLimits.weekdayMinutes

    // Check category limits against daily total
    localCategoryLimits
      .filter((cat) => cat.enabled && !cat.unlimited)
      .forEach((cat) => {
        if (cat.weekdayMinutes > dailyTotal) {
          warnings.push({
            type: 'category_exceeds_daily',
            name: cat.categoryName,
            limitMinutes: cat.weekdayMinutes,
            dailyMinutes: dailyTotal,
          })
        }
      })

    // Check device limits against daily total
    localDeviceLimits
      .filter((dev) => dev.enabled && !dev.unlimited)
      .forEach((dev) => {
        if (dev.weekdayMinutes > dailyTotal) {
          warnings.push({
            type: 'device_exceeds_daily',
            name: dev.deviceName,
            limitMinutes: dev.weekdayMinutes,
            dailyMinutes: dailyTotal,
          })
        }
      })

    return warnings
  }, [localLimits, localCategoryLimits, localDeviceLimits])

  const hasConflicts = conflicts.length > 0

  // Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id)
    }
  }, [children, selectedChildId])

  // Sync local limits with fetched limits
  useEffect(() => {
    if (limits) {
      setLocalLimits(limits)
    }
  }, [limits])

  // Sync category limits from Firestore (Story 30.3)
  useEffect(() => {
    if (categoryLimits.length > 0) {
      // Merge Firestore data with default categories
      const merged = getDefaultCategoryLimits().map((defaultCat) => {
        const fromFirestore = categoryLimits.find((c) => c.categoryId === defaultCat.categoryId)
        if (fromFirestore) {
          return {
            ...defaultCat,
            enabled: true,
            weekdayMinutes: fromFirestore.weekdayMinutes,
            weekendMinutes: fromFirestore.weekendMinutes,
            unlimited: fromFirestore.unlimited,
          }
        }
        return defaultCat
      })
      setLocalCategoryLimits(merged)
    } else {
      // Reset to defaults when no category limits in Firestore
      setLocalCategoryLimits(getDefaultCategoryLimits())
    }
  }, [categoryLimits])

  // Sync device limits from Firestore and child devices (Story 30.5)
  useEffect(() => {
    if (childDevices.length > 0 && selectedChildId) {
      // Build device limit configs from child devices
      const deviceConfigs: DeviceLimitCardConfig[] = childDevices.map((device) => {
        const existingLimit = deviceLimits.find((d) => d.deviceId === device.deviceId)
        if (existingLimit) {
          return {
            deviceId: existingLimit.deviceId,
            deviceName: existingLimit.deviceName,
            deviceType: existingLimit.deviceType,
            enabled: true,
            weekdayMinutes: existingLimit.weekdayMinutes,
            weekendMinutes: existingLimit.weekendMinutes,
            unlimited: existingLimit.unlimited,
          }
        }
        return deviceToLimitConfig(device, selectedChildId)
      })
      setLocalDeviceLimits(deviceConfigs)
    } else {
      setLocalDeviceLimits([])
    }
  }, [childDevices, deviceLimits, selectedChildId])

  // Handler for updating a category limit
  const handleCategoryUpdate = useCallback(
    (categoryId: string, updates: Partial<CategoryLimitUI>) => {
      setLocalCategoryLimits((prev) =>
        prev.map((cat) => (cat.categoryId === categoryId ? { ...cat, ...updates } : cat))
      )
    },
    []
  )

  // Handler for updating a device limit (Story 30.5)
  const handleDeviceUpdate = useCallback(
    (deviceId: string, updates: Partial<DeviceLimitCardConfig>) => {
      setLocalDeviceLimits((prev) =>
        prev.map((dev) => (dev.deviceId === deviceId ? { ...dev, ...updates } : dev))
      )
    },
    []
  )

  // Custom category handlers - Story 30.4
  const handleOpenCreateCategory = useCallback(() => {
    setEditingCategory(null)
    setIsCustomCategoryModalOpen(true)
  }, [])

  const handleOpenEditCategory = useCallback((category: CustomCategory) => {
    setEditingCategory(category)
    setIsCustomCategoryModalOpen(true)
  }, [])

  const handleCloseCustomCategoryModal = useCallback(() => {
    setIsCustomCategoryModalOpen(false)
    setEditingCategory(null)
  }, [])

  const handleSaveCustomCategory = useCallback(
    async (name: string, apps: string[]) => {
      if (!firebaseUser) {
        return { success: false, error: 'Not authenticated' }
      }

      if (editingCategory) {
        // Update existing category
        return await updateCategory(editingCategory.id, { name, apps })
      } else {
        // Create new category
        return await createCategory(name, firebaseUser.uid, apps)
      }
    },
    [firebaseUser, editingCategory, createCategory, updateCategory]
  )

  const handleDeleteCustomCategory = useCallback(
    async (categoryId: string) => {
      const result = await deleteCategory(categoryId)
      if (!result.success) {
        setSaveError(result.error || 'Failed to delete category')
      }
    },
    [deleteCategory]
  )

  // Clear success/error message after 3 seconds
  useEffect(() => {
    if (saveSuccess || saveError) {
      const timer = setTimeout(() => {
        setSaveSuccess(false)
        setSaveError(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [saveSuccess, saveError])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  const selectedChild = children.find((c) => c.id === selectedChildId)

  const handleSave = async () => {
    if (!localLimits) return

    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    // Save daily total limits
    const result = await saveLimits(localLimits)

    // Save category limits if any are enabled
    const enabledCategories = localCategoryLimits.filter((c) => c.enabled)
    if (enabledCategories.length > 0) {
      const categoryResult = await saveCategoryLimits(
        enabledCategories.map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          enabled: c.enabled,
          weekdayMinutes: c.weekdayMinutes,
          weekendMinutes: c.weekendMinutes,
          unlimited: c.unlimited,
        }))
      )
      if (!categoryResult.success) {
        setIsSaving(false)
        setSaveError(categoryResult.error || 'Failed to save category limits')
        return
      }
    }

    // Save device limits if any are enabled (Story 30.5)
    const enabledDevices = localDeviceLimits.filter((d) => d.enabled)
    if (enabledDevices.length > 0) {
      const deviceResult = await saveDeviceLimits(
        enabledDevices.map((d) => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          deviceType: d.deviceType,
          enabled: d.enabled,
          weekdayMinutes: d.weekdayMinutes,
          weekendMinutes: d.weekendMinutes,
          unlimited: d.unlimited,
        }))
      )
      if (!deviceResult.success) {
        setIsSaving(false)
        setSaveError(deviceResult.error || 'Failed to save device limits')
        return
      }
    }

    setIsSaving(false)

    if (result.success) {
      setSaveSuccess(true)
    } else {
      setSaveError(result.error || 'Failed to save changes')
    }
  }

  const isLoading =
    authLoading ||
    devicesLoading ||
    familyLoading ||
    customCategoriesLoading ||
    offlineLoading ||
    (selectedChildId ? limitsLoading : false)

  if (isLoading) {
    return (
      <main style={styles.main}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            background: #10b981;
            border-radius: 50%;
            cursor: pointer;
          }
          input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            background: #10b981;
            border-radius: 50%;
            cursor: pointer;
            border: none;
          }
        `}</style>
      </main>
    )
  }

  if (!firebaseUser) {
    return null
  }

  // Get schedule type label for preview
  const getScheduleLabel = (type: 'weekdays' | 'school_days') => {
    return type === 'school_days' ? 'school days' : 'weekdays'
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
          <span style={styles.title}>Time Limits</span>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Daily Screen Time Limits</h1>
          <p style={styles.pageDescription}>
            Set maximum daily screen time for your child. Limits apply across all enrolled devices
            combined.
          </p>
        </div>

        {children.length === 0 ? (
          <div style={styles.card}>
            <div style={styles.emptyState}>
              <div style={styles.emptyStateTitle}>No children found</div>
              <p>Add a child to your family to configure time limits.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Child Selector */}
            <div style={styles.childSelector}>
              <label style={styles.childSelectorLabel} htmlFor="child-select">
                Select Child
              </label>
              <select
                id="child-select"
                style={styles.select}
                value={selectedChildId || ''}
                onChange={(e) => setSelectedChildId(e.target.value)}
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            {saveSuccess && (
              <div style={styles.successMessage}>Time limits saved successfully!</div>
            )}

            {saveError && <div style={styles.errorMessage}>{saveError}</div>}

            {localLimits && (
              <>
                {/* Daily Limit Configuration */}
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Daily Total Limit</h2>

                  {/* Schedule Type - AC3 */}
                  <div style={styles.scheduleTypeContainer}>
                    <div style={styles.scheduleTypeLabel}>Schedule Type</div>
                    <div style={styles.radioGroup}>
                      <label style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="scheduleType"
                          style={styles.radioInput}
                          checked={localLimits.scheduleType === 'weekdays'}
                          onChange={() =>
                            setLocalLimits({ ...localLimits, scheduleType: 'weekdays' })
                          }
                          disabled={localLimits.unlimited}
                        />
                        Weekdays / Weekends
                      </label>
                      <label style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="scheduleType"
                          style={styles.radioInput}
                          checked={localLimits.scheduleType === 'school_days'}
                          onChange={() =>
                            setLocalLimits({ ...localLimits, scheduleType: 'school_days' })
                          }
                          disabled={localLimits.unlimited}
                        />
                        School Days / Non-School Days
                      </label>
                    </div>
                  </div>

                  {/* Weekday Limit Slider - AC1, AC2 */}
                  <div style={styles.sliderContainer}>
                    <div style={styles.sliderHeader}>
                      <label htmlFor="weekday-slider" style={styles.sliderLabel}>
                        {localLimits.scheduleType === 'school_days'
                          ? 'School Days'
                          : 'Weekdays (Mon-Fri)'}
                      </label>
                      <span
                        style={localLimits.unlimited ? styles.sliderUnlimited : styles.sliderValue}
                      >
                        {localLimits.unlimited
                          ? 'Unlimited'
                          : formatMinutes(localLimits.weekdayMinutes)}
                      </span>
                    </div>
                    <input
                      id="weekday-slider"
                      type="range"
                      min={MIN_MINUTES}
                      max={MAX_MINUTES}
                      step={STEP_MINUTES}
                      value={localLimits.weekdayMinutes}
                      onChange={(e) =>
                        setLocalLimits({
                          ...localLimits,
                          weekdayMinutes: Number(e.target.value),
                        })
                      }
                      disabled={localLimits.unlimited}
                      style={{
                        ...styles.sliderInput,
                        opacity: localLimits.unlimited ? 0.5 : 1,
                      }}
                      aria-valuetext={formatMinutes(localLimits.weekdayMinutes)}
                    />
                    <div style={styles.sliderTicks}>
                      <span>30 min</span>
                      <span>4 hours</span>
                      <span>8 hours</span>
                    </div>
                  </div>

                  {/* Weekend Limit Slider - AC1, AC2 */}
                  <div style={styles.sliderContainer}>
                    <div style={styles.sliderHeader}>
                      <label htmlFor="weekend-slider" style={styles.sliderLabel}>
                        {localLimits.scheduleType === 'school_days'
                          ? 'Non-School Days'
                          : 'Weekends (Sat-Sun)'}
                      </label>
                      <span
                        style={localLimits.unlimited ? styles.sliderUnlimited : styles.sliderValue}
                      >
                        {localLimits.unlimited
                          ? 'Unlimited'
                          : formatMinutes(localLimits.weekendMinutes)}
                      </span>
                    </div>
                    <input
                      id="weekend-slider"
                      type="range"
                      min={MIN_MINUTES}
                      max={MAX_MINUTES}
                      step={STEP_MINUTES}
                      value={localLimits.weekendMinutes}
                      onChange={(e) =>
                        setLocalLimits({
                          ...localLimits,
                          weekendMinutes: Number(e.target.value),
                        })
                      }
                      disabled={localLimits.unlimited}
                      style={{
                        ...styles.sliderInput,
                        opacity: localLimits.unlimited ? 0.5 : 1,
                      }}
                      aria-valuetext={formatMinutes(localLimits.weekendMinutes)}
                    />
                    <div style={styles.sliderTicks}>
                      <span>30 min</span>
                      <span>4 hours</span>
                      <span>8 hours</span>
                    </div>
                  </div>

                  {/* Unlimited Toggle */}
                  <div style={styles.unlimitedToggle}>
                    <div style={styles.toggleInfo}>
                      <div style={styles.toggleLabel}>No limit</div>
                      <div style={styles.toggleDescription}>
                        Allow unlimited screen time (not recommended)
                      </div>
                    </div>
                    <Toggle
                      enabled={localLimits.unlimited}
                      onChange={(value) => setLocalLimits({ ...localLimits, unlimited: value })}
                    />
                  </div>
                </div>

                {/* Preview - AC4 */}
                {selectedChild && !localLimits.unlimited && (
                  <div style={styles.previewBox}>
                    <div style={styles.previewTitle}>Preview</div>
                    <div style={styles.previewText}>
                      <strong>{selectedChild.name}</strong> can use devices for{' '}
                      <strong>{formatMinutes(localLimits.weekdayMinutes)}</strong> on{' '}
                      {getScheduleLabel(localLimits.scheduleType)} and{' '}
                      <strong>{formatMinutes(localLimits.weekendMinutes)}</strong> on{' '}
                      {localLimits.scheduleType === 'school_days' ? 'non-school days' : 'weekends'}.
                    </div>
                  </div>
                )}

                {/* Cross-Device Note - AC5 */}
                <div style={styles.crossDeviceNote}>
                  <svg
                    style={styles.crossDeviceIcon}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                  <span style={styles.crossDeviceText}>
                    This limit applies across all of {selectedChild?.name || "your child's"}{' '}
                    enrolled devices combined. Screen time is tracked in real-time across devices.
                  </span>
                </div>

                {/* Category Limits - Story 30.3 */}
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Per-Category Limits</h2>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginBottom: '16px',
                      lineHeight: 1.5,
                    }}
                  >
                    Set different time limits for each app category. Category limits are independent
                    of the daily total.
                  </p>

                  {localCategoryLimits.map((category) => (
                    <CategoryLimitCard
                      key={category.categoryId}
                      category={category}
                      scheduleType={localLimits?.scheduleType || 'weekdays'}
                      onUpdate={handleCategoryUpdate}
                    />
                  ))}

                  {/* Category Limits Preview - AC6 */}
                  {localCategoryLimits.some((c) => c.enabled) && (
                    <div
                      style={{
                        ...styles.previewBox,
                        marginTop: '16px',
                      }}
                    >
                      <div style={styles.previewTitle}>Category Limits Preview</div>
                      <div style={{ fontSize: '14px', color: '#166534', lineHeight: 1.6 }}>
                        {localCategoryLimits
                          .filter((c) => c.enabled)
                          .map((c) => (
                            <div key={c.categoryId}>
                              <strong>{c.categoryName}:</strong>{' '}
                              {c.unlimited ? 'Unlimited' : `${formatMinutes(c.weekdayMinutes)}/day`}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Categories - Story 30.4 */}
                  <div style={styles.customCategorySection}>
                    <div style={styles.customCategoryHeader}>
                      <span style={styles.customCategoryTitle}>Custom Categories</span>
                    </div>

                    {customCategories.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        {customCategories.map((category) => (
                          <div key={category.id} style={styles.customCategoryItem}>
                            <div>
                              <div style={styles.customCategoryName}>{category.name}</div>
                              <div style={styles.customCategoryApps}>
                                {category.apps.length > 0
                                  ? `${category.apps.length} app${category.apps.length > 1 ? 's' : ''}`
                                  : 'No apps assigned'}
                              </div>
                            </div>
                            <div style={styles.customCategoryActions}>
                              <button
                                style={styles.iconButton}
                                onClick={() => handleOpenEditCategory(category)}
                                aria-label={`Edit ${category.name}`}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                style={{ ...styles.iconButton, color: '#ef4444' }}
                                onClick={() => handleDeleteCustomCategory(category.id)}
                                aria-label={`Delete ${category.name}`}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      style={{
                        ...styles.addCategoryButton,
                        ...(canAddMoreCategories ? {} : styles.addCategoryButtonDisabled),
                      }}
                      onClick={handleOpenCreateCategory}
                      disabled={!canAddMoreCategories}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {canAddMoreCategories
                        ? 'Create Custom Category'
                        : 'Maximum categories reached (10)'}
                    </button>
                  </div>
                </div>

                {/* Device Limits - Story 30.5 */}
                {localDeviceLimits.length > 0 && (
                  <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Per-Device Limits</h2>
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginBottom: '16px',
                        lineHeight: 1.5,
                      }}
                    >
                      Set different time limits for each device. Device limits are independent of
                      the daily total and category limits.
                    </p>

                    {localDeviceLimits.map((device) => (
                      <DeviceLimitCard
                        key={device.deviceId}
                        device={device}
                        scheduleType={localLimits?.scheduleType || 'weekdays'}
                        onUpdate={handleDeviceUpdate}
                      />
                    ))}

                    {/* Device Limits Preview */}
                    {localDeviceLimits.some((d) => d.enabled) && (
                      <div
                        style={{
                          ...styles.previewBox,
                          marginTop: '16px',
                        }}
                      >
                        <div style={styles.previewTitle}>Device Limits Preview</div>
                        <div style={{ fontSize: '14px', color: '#166534', lineHeight: 1.6 }}>
                          {localDeviceLimits
                            .filter((d) => d.enabled)
                            .map((d) => (
                              <div key={d.deviceId}>
                                <strong>{d.deviceName}:</strong>{' '}
                                {d.unlimited
                                  ? 'Unlimited'
                                  : `${formatMinutes(d.weekdayMinutes)}/day`}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Story 32.1: Family Offline Schedule */}
                <OfflineScheduleCard
                  schedule={localOfflineSchedule}
                  onScheduleChange={setLocalOfflineSchedule}
                  onApplyPreset={applyOfflinePreset}
                  onSave={saveOfflineSchedule}
                  hasChanges={hasOfflineChanges}
                  loading={offlineLoading}
                  error={offlineError}
                />

                {/* Story 30.6: Conflict Warnings */}
                {hasConflicts && (
                  <div style={styles.warningBox}>
                    <svg
                      style={styles.warningIcon}
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div style={styles.warningContent}>
                      <div style={styles.warningTitle}>Configuration Warning</div>
                      <div style={styles.warningText}>
                        {conflicts.map((conflict, idx) => (
                          <div key={idx}>
                            {conflict.type === 'category_exceeds_daily'
                              ? `${conflict.name} limit (${formatMinutes(conflict.limitMinutes)}) exceeds daily total (${formatMinutes(conflict.dailyMinutes)})`
                              : `${conflict.name} device limit (${formatMinutes(conflict.limitMinutes)}) exceeds daily total (${formatMinutes(conflict.dailyMinutes)})`}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Story 30.6: Combined Summary with Scenario */}
                {selectedChild &&
                  localLimits &&
                  (hasLocalChanges || hasCategoryChanges || hasDeviceChanges) && (
                    <div style={styles.summaryCard}>
                      <div style={styles.summaryTitle}>
                        {selectedChild.name}&apos;s Limits Summary
                      </div>

                      {/* Daily Total */}
                      <div style={styles.summarySection}>
                        <div style={styles.summarySectionTitle}>Daily Total</div>
                        <div style={styles.summarySectionContent}>
                          {localLimits.unlimited
                            ? 'Unlimited screen time'
                            : `${formatMinutes(localLimits.weekdayMinutes)} on ${localLimits.scheduleType === 'school_days' ? 'school days' : 'weekdays'}, ${formatMinutes(localLimits.weekendMinutes)} on ${localLimits.scheduleType === 'school_days' ? 'non-school days' : 'weekends'}`}
                        </div>
                      </div>

                      {/* Category Limits Summary */}
                      {localCategoryLimits.some((c) => c.enabled) && (
                        <div style={styles.summarySection}>
                          <div style={styles.summarySectionTitle}>Category Limits</div>
                          <div style={styles.summarySectionContent}>
                            {localCategoryLimits
                              .filter((c) => c.enabled)
                              .map((c) => (
                                <span key={c.categoryId}>
                                  {c.categoryName}:{' '}
                                  {c.unlimited ? 'Unlimited' : formatMinutes(c.weekdayMinutes)}
                                  {localCategoryLimits.filter((x) => x.enabled).indexOf(c) <
                                  localCategoryLimits.filter((x) => x.enabled).length - 1
                                    ? ', '
                                    : ''}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Device Limits Summary */}
                      {localDeviceLimits.some((d) => d.enabled) && (
                        <div style={styles.summarySection}>
                          <div style={styles.summarySectionTitle}>Device Limits</div>
                          <div style={styles.summarySectionContent}>
                            {localDeviceLimits
                              .filter((d) => d.enabled)
                              .map((d) => (
                                <span key={d.deviceId}>
                                  {d.deviceName}:{' '}
                                  {d.unlimited ? 'Unlimited' : formatMinutes(d.weekdayMinutes)}
                                  {localDeviceLimits.filter((x) => x.enabled).indexOf(d) <
                                  localDeviceLimits.filter((x) => x.enabled).length - 1
                                    ? ', '
                                    : ''}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Scenario Preview */}
                      {!localLimits.unlimited &&
                        localCategoryLimits.some((c) => c.enabled && !c.unlimited) && (
                          <div style={styles.scenarioBox}>
                            <div style={styles.scenarioTitle}>Example Scenario</div>
                            <div style={styles.scenarioText}>
                              {(() => {
                                const enabledCat = localCategoryLimits.find(
                                  (c) => c.enabled && !c.unlimited
                                )
                                if (!enabledCat) return null
                                const remaining = Math.max(
                                  0,
                                  localLimits.weekdayMinutes - enabledCat.weekdayMinutes
                                )
                                return `If ${selectedChild.name} uses ${formatMinutes(enabledCat.weekdayMinutes)} on ${enabledCat.categoryName}, they have ${formatMinutes(remaining)} left for other apps.`
                              })()}
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                {/* Save Button */}
                <button
                  style={{
                    ...styles.saveButton,
                    ...(isSaving || (!hasLocalChanges && !hasCategoryChanges && !hasDeviceChanges)
                      ? styles.saveButtonDisabled
                      : {}),
                  }}
                  onClick={handleSave}
                  disabled={
                    isSaving || (!hasLocalChanges && !hasCategoryChanges && !hasDeviceChanges)
                  }
                >
                  {isSaving
                    ? 'Saving...'
                    : hasLocalChanges || hasCategoryChanges || hasDeviceChanges
                      ? 'Save and Notify Child'
                      : 'No Changes'}
                </button>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: #10b981;
          border-radius: 50%;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #10b981;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
        input[type="range"]:disabled::-webkit-slider-thumb {
          background: #9ca3af;
        }
        input[type="range"]:disabled::-moz-range-thumb {
          background: #9ca3af;
        }
      `}</style>

      {/* Custom Category Modal - Story 30.4 */}
      <CustomCategoryModal
        isOpen={isCustomCategoryModalOpen}
        onClose={handleCloseCustomCategoryModal}
        onSave={handleSaveCustomCategory}
        existingCategory={
          editingCategory
            ? { id: editingCategory.id, name: editingCategory.name, apps: editingCategory.apps }
            : undefined
        }
        canAddMore={canAddMoreCategories}
      />
    </main>
  )
}
