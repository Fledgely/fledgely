'use client'

/**
 * Template Card Skeleton Component
 *
 * Story 4.1: Template Library Structure - Task 6.3
 *
 * Loading skeleton for template cards. Provides visual feedback
 * during initial render and improves perceived performance.
 *
 * @example
 * ```tsx
 * <TemplateCardSkeleton />
 * ```
 */
export function TemplateCardSkeleton() {
  return (
    <div
      className="rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4 min-h-[180px] animate-pulse"
      aria-hidden="true"
    >
      {/* Header with name and variation badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Description */}
      <div className="space-y-1.5 mb-3">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Screen time and monitoring badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Monitoring level badge */}
      <div className="mb-3">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Key rules preview */}
      <div className="space-y-1.5 flex-1">
        <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-3 w-5/6 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-3 w-4/6 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>

      {/* Concern tags */}
      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-4 w-14 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    </div>
  )
}

/**
 * Template Library Skeleton Component
 *
 * Full skeleton for the template library, including tabs and cards.
 *
 * @example
 * ```tsx
 * <TemplateLibrarySkeleton />
 * ```
 */
export function TemplateLibrarySkeleton() {
  return (
    <div className="flex flex-col h-full" aria-label="Loading template library">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded mt-1 animate-pulse" />
      </div>

      {/* Age group tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 p-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Search and filter */}
      <div className="px-4 py-3 space-y-3 border-b border-gray-200 dark:border-gray-700">
        <div className="h-11 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-8 w-20 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Results summary */}
      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
