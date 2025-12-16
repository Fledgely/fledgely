'use client'

import { type AgeGroup, AGE_GROUP_LABELS } from '@fledgely/contracts'

interface AgeGroupTabsProps {
  selectedAgeGroup: AgeGroup | null
  onAgeGroupChange: (ageGroup: AgeGroup | null) => void
  templateCounts?: Record<AgeGroup, number>
}

const AGE_GROUPS: AgeGroup[] = ['5-7', '8-10', '11-13', '14-16']

/**
 * Age Group Tabs Component
 *
 * Story 4.1: Template Library Structure - Task 4.2
 *
 * Provides tab-based navigation for filtering templates by age group.
 * Implements a horizontal tab pattern with "All" option.
 *
 * Accessibility features:
 * - ARIA tablist/tab/tabpanel roles
 * - Keyboard navigation (Arrow keys, Home, End) per NFR43
 * - Focus visible indicators (NFR46)
 * - 44x44px minimum touch targets (NFR49)
 *
 * @example
 * ```tsx
 * <AgeGroupTabs
 *   selectedAgeGroup={selectedAge}
 *   onAgeGroupChange={setSelectedAge}
 *   templateCounts={counts}
 * />
 * ```
 */
export function AgeGroupTabs({
  selectedAgeGroup,
  onAgeGroupChange,
  templateCounts,
}: AgeGroupTabsProps) {
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const totalTabs = AGE_GROUPS.length + 1 // +1 for "All" tab
    let newIndex = currentIndex

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        newIndex = currentIndex === 0 ? totalTabs - 1 : currentIndex - 1
        break
      case 'ArrowRight':
        e.preventDefault()
        newIndex = currentIndex === totalTabs - 1 ? 0 : currentIndex + 1
        break
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
      case 'End':
        e.preventDefault()
        newIndex = totalTabs - 1
        break
      default:
        return
    }

    // Focus the new tab
    const tabElements = document.querySelectorAll('[role="tab"]')
    const targetTab = tabElements[newIndex] as HTMLElement
    if (targetTab) {
      targetTab.focus()
      targetTab.click()
    }
  }

  const getTabIndex = (ageGroup: AgeGroup | null): number => {
    if (ageGroup === null) return 0
    return AGE_GROUPS.indexOf(ageGroup) + 1
  }

  const isSelected = (ageGroup: AgeGroup | null): boolean => {
    return selectedAgeGroup === ageGroup
  }

  const tabClassName = (selected: boolean): string => `
    relative px-4 py-3 text-sm font-medium transition-colors duration-200
    min-w-[80px] min-h-[44px]
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:z-10
    ${selected
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
    }
  `

  const indicatorClassName = (selected: boolean): string => `
    absolute bottom-0 left-0 right-0 h-0.5 transition-colors duration-200
    ${selected ? 'bg-blue-600 dark:bg-blue-400' : 'bg-transparent'}
  `

  // Get short label for mobile
  const getShortLabel = (ageGroup: AgeGroup): string => {
    return ageGroup
  }

  // Get count display
  const getCount = (ageGroup: AgeGroup | null): number | undefined => {
    if (!templateCounts) return undefined
    if (ageGroup === null) {
      return Object.values(templateCounts).reduce((sum, count) => sum + count, 0)
    }
    return templateCounts[ageGroup]
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex overflow-x-auto" aria-label="Template age groups">
        <div
          role="tablist"
          aria-label="Filter templates by age group"
          className="flex min-w-full sm:min-w-0"
        >
          {/* All templates tab */}
          <button
            type="button"
            role="tab"
            id="tab-all"
            aria-selected={isSelected(null)}
            aria-controls="tabpanel-all"
            tabIndex={isSelected(null) ? 0 : -1}
            onClick={() => onAgeGroupChange(null)}
            onKeyDown={(e) => handleKeyDown(e, 0)}
            className={tabClassName(isSelected(null))}
          >
            <span className="flex items-center gap-1.5">
              All
              {getCount(null) !== undefined && (
                <span
                  className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  aria-label={`${getCount(null)} templates`}
                >
                  {getCount(null)}
                </span>
              )}
            </span>
            <div className={indicatorClassName(isSelected(null))} aria-hidden="true" />
          </button>

          {/* Age group tabs */}
          {AGE_GROUPS.map((ageGroup, index) => (
            <button
              key={ageGroup}
              type="button"
              role="tab"
              id={`tab-${ageGroup}`}
              aria-selected={isSelected(ageGroup)}
              aria-controls={`tabpanel-${ageGroup}`}
              tabIndex={isSelected(ageGroup) ? 0 : -1}
              onClick={() => onAgeGroupChange(ageGroup)}
              onKeyDown={(e) => handleKeyDown(e, index + 1)}
              className={tabClassName(isSelected(ageGroup))}
            >
              <span className="flex items-center gap-1.5">
                {/* Mobile: short label, Desktop: full label */}
                <span className="sm:hidden">{getShortLabel(ageGroup)}</span>
                <span className="hidden sm:inline">{AGE_GROUP_LABELS[ageGroup]}</span>
                {getCount(ageGroup) !== undefined && (
                  <span
                    className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    aria-label={`${getCount(ageGroup)} templates`}
                  >
                    {getCount(ageGroup)}
                  </span>
                )}
              </span>
              <div className={indicatorClassName(isSelected(ageGroup))} aria-hidden="true" />
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
