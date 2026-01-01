'use client'

/**
 * CategoryLimitCard Component - Story 30.3
 *
 * Per-category time limit configuration with icons.
 *
 * Requirements:
 * - AC1: Standard categories (Education, Gaming, Social, Entertainment, Other)
 * - AC4: Unlimited option for categories
 * - AC5: Visual configuration with category icons
 */

import { formatMinutes } from '../../utils/formatTime'

// Standard categories with icons and colors
export const STANDARD_CATEGORIES = [
  { id: 'education', name: 'Education', icon: 'book', color: '#10b981' },
  { id: 'gaming', name: 'Gaming', icon: 'gamepad', color: '#8b5cf6' },
  { id: 'social', name: 'Social', icon: 'chat', color: '#3b82f6' },
  { id: 'entertainment', name: 'Entertainment', icon: 'video', color: '#f59e0b' },
  { id: 'other', name: 'Other', icon: 'settings', color: '#6b7280' },
] as const

export type StandardCategoryId = (typeof STANDARD_CATEGORIES)[number]['id']

export interface CategoryLimit {
  categoryId: string
  categoryName: string
  enabled: boolean
  weekdayMinutes: number
  weekendMinutes: number
  unlimited: boolean
}

interface CategoryLimitCardProps {
  category: CategoryLimit
  scheduleType: 'weekdays' | 'school_days'
  onUpdate: (categoryId: string, updates: Partial<CategoryLimit>) => void
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    padding: '14px',
    marginBottom: '12px',
    transition: 'opacity 0.2s',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  categoryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconContainer: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2937',
  },
  toggle: {
    position: 'relative' as const,
    width: '44px',
    height: '24px',
    backgroundColor: '#d1d5db',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
  },
  toggleActive: {
    backgroundColor: '#10b981',
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.2s',
  },
  toggleKnobActive: {
    transform: 'translateX(20px)',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  sliderRow: {
    backgroundColor: '#f9fafb',
    padding: '10px 12px',
    borderRadius: '6px',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  sliderLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  sliderValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#10b981',
  },
  sliderValueUnlimited: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
  },
  slider: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    appearance: 'none' as const,
    cursor: 'pointer',
    WebkitAppearance: 'none' as const,
  },
  unlimitedRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
    borderTop: '1px solid #f3f4f6',
  },
  unlimitedLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
}

// Time limit range
const MIN_MINUTES = 30
const MAX_MINUTES = 480
const STEP_MINUTES = 15

function getCategoryColor(categoryId: string): string {
  const category = STANDARD_CATEGORIES.find((c) => c.id === categoryId)
  return category?.color || '#6b7280'
}

function CategoryIcon({ categoryId, size = 18 }: { categoryId: string; size?: number }) {
  const category = STANDARD_CATEGORIES.find((c) => c.id === categoryId)
  const color = '#ffffff'

  switch (category?.icon) {
    case 'book':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    case 'gamepad':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
        >
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" />
        </svg>
      )
    case 'chat':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'video':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )
    case 'settings':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
  }
}

export function CategoryLimitCard({ category, scheduleType, onUpdate }: CategoryLimitCardProps) {
  const categoryColor = getCategoryColor(category.categoryId)

  const handleToggleEnabled = () => {
    onUpdate(category.categoryId, { enabled: !category.enabled })
  }

  const handleToggleUnlimited = () => {
    onUpdate(category.categoryId, { unlimited: !category.unlimited })
  }

  const weekdayLabel = scheduleType === 'school_days' ? 'School Days' : 'Weekdays'
  const weekendLabel = scheduleType === 'school_days' ? 'Non-School Days' : 'Weekends'

  return (
    <div style={{ ...styles.card, ...(category.enabled ? {} : styles.cardDisabled) }}>
      <div style={styles.header}>
        <div style={styles.categoryInfo}>
          <div style={{ ...styles.iconContainer, backgroundColor: categoryColor }}>
            <CategoryIcon categoryId={category.categoryId} />
          </div>
          <span style={styles.categoryName}>{category.categoryName}</span>
        </div>
        <button
          type="button"
          style={{
            ...styles.toggle,
            ...(category.enabled ? styles.toggleActive : {}),
          }}
          onClick={handleToggleEnabled}
          role="switch"
          aria-checked={category.enabled}
          aria-label={`Enable ${category.categoryName} limit`}
        >
          <div
            style={{
              ...styles.toggleKnob,
              ...(category.enabled ? styles.toggleKnobActive : {}),
            }}
          />
        </button>
      </div>

      {category.enabled && (
        <div style={styles.controls}>
          {/* Weekday slider */}
          <div style={styles.sliderRow}>
            <div style={styles.sliderHeader}>
              <span style={styles.sliderLabel}>{weekdayLabel}</span>
              <span style={category.unlimited ? styles.sliderValueUnlimited : styles.sliderValue}>
                {category.unlimited ? 'Unlimited' : formatMinutes(category.weekdayMinutes)}
              </span>
            </div>
            <input
              type="range"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={STEP_MINUTES}
              value={category.weekdayMinutes}
              onChange={(e) =>
                onUpdate(category.categoryId, { weekdayMinutes: Number(e.target.value) })
              }
              disabled={category.unlimited}
              style={{
                ...styles.slider,
                opacity: category.unlimited ? 0.5 : 1,
              }}
              aria-label={`${category.categoryName} ${weekdayLabel} limit`}
              aria-valuetext={formatMinutes(category.weekdayMinutes)}
            />
          </div>

          {/* Weekend slider */}
          <div style={styles.sliderRow}>
            <div style={styles.sliderHeader}>
              <span style={styles.sliderLabel}>{weekendLabel}</span>
              <span style={category.unlimited ? styles.sliderValueUnlimited : styles.sliderValue}>
                {category.unlimited ? 'Unlimited' : formatMinutes(category.weekendMinutes)}
              </span>
            </div>
            <input
              type="range"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={STEP_MINUTES}
              value={category.weekendMinutes}
              onChange={(e) =>
                onUpdate(category.categoryId, { weekendMinutes: Number(e.target.value) })
              }
              disabled={category.unlimited}
              style={{
                ...styles.slider,
                opacity: category.unlimited ? 0.5 : 1,
              }}
              aria-label={`${category.categoryName} ${weekendLabel} limit`}
              aria-valuetext={formatMinutes(category.weekendMinutes)}
            />
          </div>

          {/* Unlimited toggle */}
          <div style={styles.unlimitedRow}>
            <span style={styles.unlimitedLabel}>No limit for this category</span>
            <button
              type="button"
              style={{
                ...styles.toggle,
                ...(category.unlimited ? styles.toggleActive : {}),
              }}
              onClick={handleToggleUnlimited}
              role="switch"
              aria-checked={category.unlimited}
              aria-label={`Set ${category.categoryName} to unlimited`}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  ...(category.unlimited ? styles.toggleKnobActive : {}),
                }}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get default category limits for initialization
 */
export function getDefaultCategoryLimits(): CategoryLimit[] {
  return STANDARD_CATEGORIES.map((cat) => ({
    categoryId: cat.id,
    categoryName: cat.name,
    enabled: false,
    weekdayMinutes: 60, // 1 hour default
    weekendMinutes: 120, // 2 hours default
    unlimited: cat.id === 'education', // Education defaults to unlimited when enabled
  }))
}
