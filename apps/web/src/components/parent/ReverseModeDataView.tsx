'use client'

/**
 * Reverse Mode Data View - Story 52.3 Task 5
 *
 * Component to display shared data respecting reverse mode settings.
 * Shows "No data shared" or "Private" where appropriate.
 *
 * AC4: Shows "No data shared" when nothing is shared
 * AC6: Real-time update - parents see only what teen chooses
 */

import { type ParentVisibleData } from '@fledgely/shared'

interface ReverseModeDataViewProps {
  childName: string
  reverseModeActive: boolean
  visibleData: ParentVisibleData | null
  isLoading?: boolean
}

export function ReverseModeDataView({
  childName,
  reverseModeActive,
  visibleData,
  isLoading = false,
}: ReverseModeDataViewProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    )
  }

  // Normal mode - show everything
  if (!reverseModeActive) {
    return (
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">{childName}&apos;s Activity</h3>
          <p className="text-sm text-gray-500 mt-1">Full activity monitoring is enabled</p>
        </div>
        {/* Full data display would go here - integrated with existing dashboard */}
        <div className="p-4">
          <p className="text-sm text-gray-600">
            View {childName}&apos;s complete activity data in the dashboard sections below.
          </p>
        </div>
      </div>
    )
  }

  // Reverse mode active - show only what teen has shared
  if (!visibleData || !visibleData.hasAnySharedData) {
    return (
      <div className="bg-amber-50 rounded-lg border border-amber-200 shadow-sm">
        <div className="p-4 border-b border-amber-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <h3 className="text-lg font-medium text-amber-900">
              {childName}&apos;s Reverse Mode Active
            </h3>
          </div>
          <p className="text-sm text-amber-700 mt-1">
            {childName} is in control of their privacy settings
          </p>
        </div>
        <div className="p-6 text-center">
          <div className="text-4xl mb-4">🙈</div>
          <h4 className="text-lg font-medium text-amber-900 mb-2">No Data Shared</h4>
          <p className="text-sm text-amber-700 max-w-md mx-auto">
            {childName} has chosen not to share any activity data with you at this time. This is
            part of their growing independence.
          </p>
          <a
            href="/help/supporting-teen-independence"
            className="inline-block mt-4 text-sm text-amber-700 underline hover:text-amber-800"
          >
            Learn about supporting teen independence
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <h3 className="text-lg font-medium text-gray-900">
              {childName}&apos;s Shared Activity
            </h3>
          </div>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
            Teen-Controlled
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {childName} is sharing selected activity with you
        </p>
      </div>

      <div className="divide-y">
        {/* Screen Time Section */}
        <DataSection title="Screen Time" icon="📱" isShared={visibleData.screenTime !== null}>
          {visibleData.screenTime ? (
            <ScreenTimeDisplay data={visibleData.screenTime} />
          ) : (
            <PrivateDataPlaceholder category="screen time" />
          )}
        </DataSection>

        {/* Time Limit Status Section */}
        <DataSection title="Time Limits" icon="⏰" isShared={visibleData.timeLimitStatus !== null}>
          {visibleData.timeLimitStatus ? (
            <TimeLimitStatusDisplay data={visibleData.timeLimitStatus} />
          ) : (
            <PrivateDataPlaceholder category="time limit status" />
          )}
        </DataSection>

        {/* Flags Section */}
        <DataSection title="Flags & Alerts" icon="🚩" isShared={visibleData.flags !== null}>
          {visibleData.flags && visibleData.flags.length > 0 ? (
            <FlagsDisplay flags={visibleData.flags} />
          ) : visibleData.flags ? (
            <p className="text-sm text-gray-500">No flags to display</p>
          ) : (
            <PrivateDataPlaceholder category="flags and alerts" />
          )}
        </DataSection>

        {/* Screenshots Section */}
        <DataSection title="Screenshots" icon="📸" isShared={visibleData.screenshots !== null}>
          {visibleData.screenshots && visibleData.screenshots.length > 0 ? (
            <ScreenshotsDisplay screenshots={visibleData.screenshots} />
          ) : visibleData.screenshots ? (
            <p className="text-sm text-gray-500">No screenshots to display</p>
          ) : (
            <PrivateDataPlaceholder category="screenshots" />
          )}
        </DataSection>

        {/* Location Section */}
        <DataSection title="Location" icon="📍" isShared={visibleData.location !== null}>
          {visibleData.location?.lastLocation ? (
            <LocationDisplay location={visibleData.location} />
          ) : visibleData.location ? (
            <p className="text-sm text-gray-500">No location data available</p>
          ) : (
            <PrivateDataPlaceholder category="location" />
          )}
        </DataSection>
      </div>
    </div>
  )
}

function DataSection({
  title,
  icon,
  isShared,
  children,
}: {
  title: string
  icon: string
  isShared: boolean
  children: React.ReactNode
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <h4 className="font-medium text-gray-900">{title}</h4>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            isShared ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isShared ? 'Shared' : 'Private'}
        </span>
      </div>
      {children}
    </div>
  )
}

function PrivateDataPlaceholder({ category }: { category: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-sm text-gray-500">
        {category.charAt(0).toUpperCase() + category.slice(1)} data is private
      </p>
    </div>
  )
}

function ScreenTimeDisplay({ data }: { data: NonNullable<ParentVisibleData['screenTime']> }) {
  const hours = Math.floor(data.totalMinutes / 60)
  const minutes = data.totalMinutes % 60
  const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{timeString}</span>
        <span className="text-sm text-gray-500">today</span>
      </div>

      {data.displayType === 'full' && data.categoryBreakdown && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider">By Category</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.categoryBreakdown).map(([category, mins]) => (
              <span key={category} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {category}: {mins}m
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TimeLimitStatusDisplay({
  data,
}: {
  data: NonNullable<ParentVisibleData['timeLimitStatus']>
}) {
  const statusColors = {
    within_limit: 'text-green-700 bg-green-100',
    approaching_limit: 'text-amber-700 bg-amber-100',
    limit_reached: 'text-red-700 bg-red-100',
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${statusColors[data.status]}`}
    >
      <span>
        {data.status === 'limit_reached' ? '🛑' : data.status === 'approaching_limit' ? '⚠️' : '✅'}
      </span>
      <span className="font-medium">{data.message}</span>
    </div>
  )
}

function FlagsDisplay({ flags }: { flags: NonNullable<ParentVisibleData['flags']> }) {
  return (
    <div className="space-y-2">
      {flags.slice(0, 5).map((flag) => (
        <div key={flag.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <span className="text-red-500">⚠️</span>
          <div>
            <p className="text-sm font-medium text-gray-900">{flag.type}</p>
            <p className="text-xs text-gray-500">{flag.description}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(flag.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
      {flags.length > 5 && <p className="text-xs text-gray-500">+ {flags.length - 5} more flags</p>}
    </div>
  )
}

function ScreenshotsDisplay({
  screenshots,
}: {
  screenshots: NonNullable<ParentVisibleData['screenshots']>
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {screenshots.slice(0, 6).map((ss) => (
        <div key={ss.id} className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          {ss.url ? (
            <img
              src={ss.url}
              alt={`Screenshot from ${ss.appName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">📷</div>
          )}
        </div>
      ))}
      {screenshots.length > 6 && (
        <p className="text-xs text-gray-500 col-span-3">
          + {screenshots.length - 6} more screenshots
        </p>
      )}
    </div>
  )
}

function LocationDisplay({ location }: { location: NonNullable<ParentVisibleData['location']> }) {
  if (!location.lastLocation) {
    return <p className="text-sm text-gray-500">No recent location</p>
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-sm text-gray-700">
        Last seen at coordinates: {location.lastLocation.latitude.toFixed(4)},{' '}
        {location.lastLocation.longitude.toFixed(4)}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {new Date(location.lastLocation.timestamp).toLocaleString()}
      </p>
    </div>
  )
}
