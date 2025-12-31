'use client'

/**
 * DatePickerModal Component - Story 19B.2
 *
 * A simple calendar picker for navigating to specific dates.
 *
 * Task 4: Add Date Navigation via Calendar Picker (AC: #4)
 * - 4.1 Create DatePickerModal component with calendar view
 * - 4.2 Highlight dates that have screenshots
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getDateKey as getDateKeyFromTimestamp } from './timelineUtils'

/**
 * Props for DatePickerModal
 */
export interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectDate: (date: Date) => void
  datesWithScreenshots: Set<string> // YYYY-MM-DD format
  selectedDate?: Date
}

/**
 * Styles
 */
const styles: Record<string, React.CSSProperties> = {
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
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    maxWidth: '320px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#64748b', // slate-500
    padding: '4px',
    lineHeight: 1,
  },
  navigation: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  navButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    color: '#0ea5e9', // sky-500
    padding: '8px',
    borderRadius: '8px',
  },
  monthLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#0369a1', // sky-700
  },
  weekDays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    marginBottom: '8px',
  },
  weekDay: {
    fontSize: '0.75rem',
    color: '#64748b', // slate-500
    textAlign: 'center' as const,
    padding: '4px',
    fontWeight: 500,
  },
  days: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  day: {
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    borderRadius: '8px',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
  },
  dayEmpty: {
    backgroundColor: 'transparent',
  },
  dayNormal: {
    backgroundColor: '#f1f5f9', // slate-100
    color: '#334155', // slate-700
  },
  dayHasScreenshots: {
    backgroundColor: '#e0f2fe', // sky-100
    color: '#0369a1', // sky-700
    fontWeight: 600,
  },
  daySelected: {
    backgroundColor: '#0ea5e9', // sky-500
    color: 'white',
    fontWeight: 600,
  },
  dayToday: {
    border: '2px solid #0ea5e9', // sky-500
  },
  dayDisabled: {
    backgroundColor: 'transparent',
    color: '#cbd5e1', // slate-300
    cursor: 'not-allowed',
  },
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Get date key in YYYY-MM-DD format (uses timelineUtils)
 */
function getDateKey(date: Date): string {
  return getDateKeyFromTimestamp(date.getTime())
}

/**
 * Check if two dates are the same day
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * DatePickerModal - Calendar for date navigation
 */
export function DatePickerModal({
  isOpen,
  onClose,
  onSelectDate,
  datesWithScreenshots,
  selectedDate,
}: DatePickerModalProps) {
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date())
  const today = new Date()
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Reset view date when modal opens and focus trap
  useEffect(() => {
    if (isOpen) {
      setViewDate(selectedDate || new Date())
      // Focus close button when modal opens for accessibility
      closeButtonRef.current?.focus()
    }
  }, [isOpen, selectedDate])

  // Handle escape key and focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap: cycle through focusable elements
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const goToPrevMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])

  const goToNextMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])

  const handleDayClick = useCallback(
    (day: number) => {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
      onSelectDate(date)
      onClose()
    },
    [viewDate, onSelectDate, onClose]
  )

  if (!isOpen) return null

  // Calculate calendar grid
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Don't allow navigating past today
  const canGoNext =
    viewDate.getFullYear() < today.getFullYear() ||
    (viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() < today.getMonth())

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      data-testid="date-picker-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Pick a date"
    >
      <div
        ref={modalRef}
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        data-testid="date-picker-content"
      >
        <div style={styles.header}>
          <h3 style={styles.title}>Pick a date</h3>
          <button
            ref={closeButtonRef}
            style={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
            data-testid="date-picker-close"
          >
            ×
          </button>
        </div>

        <div style={styles.navigation}>
          <button
            style={styles.navButton}
            onClick={goToPrevMonth}
            aria-label="Previous month"
            data-testid="date-picker-prev"
          >
            ◀
          </button>
          <span style={styles.monthLabel} data-testid="date-picker-month">
            {MONTHS[month]} {year}
          </span>
          <button
            style={{
              ...styles.navButton,
              visibility: canGoNext ? 'visible' : 'hidden',
            }}
            onClick={goToNextMonth}
            aria-label="Next month"
            data-testid="date-picker-next"
            disabled={!canGoNext}
          >
            ▶
          </button>
        </div>

        <div style={styles.weekDays}>
          {WEEKDAYS.map((day) => (
            <div key={day} style={styles.weekDay}>
              {day}
            </div>
          ))}
        </div>

        <div style={styles.days} data-testid="date-picker-days">
          {/* Empty cells for days before the first of the month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} style={{ ...styles.day, ...styles.dayEmpty }} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const date = new Date(year, month, day)
            const dateKey = getDateKey(date)
            const hasScreenshots = datesWithScreenshots.has(dateKey)
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const isToday = isSameDay(date, today)
            const isFuture = date > today

            let dayStyle = {
              ...styles.day,
              ...styles.dayNormal,
            }

            if (isFuture) {
              dayStyle = { ...styles.day, ...styles.dayDisabled }
            } else if (isSelected) {
              dayStyle = { ...styles.day, ...styles.daySelected }
            } else if (hasScreenshots) {
              dayStyle = { ...styles.day, ...styles.dayHasScreenshots }
            }

            if (isToday && !isSelected) {
              dayStyle = { ...dayStyle, ...styles.dayToday }
            }

            return (
              <button
                key={day}
                style={dayStyle}
                onClick={() => !isFuture && handleDayClick(day)}
                disabled={isFuture}
                aria-label={`${MONTHS[month]} ${day}, ${year}${hasScreenshots ? ', has pictures' : ''}${isToday ? ', today' : ''}`}
                data-testid={`date-picker-day-${day}`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
