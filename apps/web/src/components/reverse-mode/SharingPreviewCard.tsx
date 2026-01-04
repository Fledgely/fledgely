'use client'

/**
 * Sharing Preview Card - Story 52.3 Task 4
 *
 * Shows what parents will see based on current sharing preferences.
 *
 * AC4: Shows "No data shared" when nothing is shared
 * AC5: Preview of what parents will see
 */

import { type SharingPreview, type SharingPreviewDetail } from '@fledgely/shared'

interface SharingPreviewCardProps {
  preview: SharingPreview | null
  reverseModeActive: boolean
}

export function SharingPreviewCard({ preview, reverseModeActive }: SharingPreviewCardProps) {
  if (!reverseModeActive) {
    return (
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Normal Mode Active</h3>
        <p className="text-sm text-blue-700">
          Parents can see all your activity data. Activate Reverse Mode to control what they see.
        </p>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Loading preview...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">What Parents See</h3>
        <p className="text-sm text-gray-500 mt-1">{preview.summary}</p>
      </div>

      <div className="divide-y">
        {preview.details.map((detail) => (
          <PreviewDetailRow key={detail.category} detail={detail} />
        ))}
      </div>

      {/* Nothing shared banner - AC4 */}
      {preview.isNothingShared && (
        <div className="p-4 bg-amber-50 border-t border-amber-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-amber-800">No Data Shared</h4>
              <p className="text-sm text-amber-700 mt-1">
                Your parents cannot see any of your activity data while Reverse Mode is active with
                current settings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewDetailRow({ detail }: { detail: SharingPreviewDetail }) {
  const hasSharedItems = detail.sharedItems.length > 0
  const hasPrivateItems = detail.privateItems.length > 0

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">{detail.category}</h4>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            hasSharedItems ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {hasSharedItems ? 'Sharing' : 'Private'}
        </span>
      </div>

      {hasSharedItems && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Visible to parents:</p>
          <div className="flex flex-wrap gap-1">
            {detail.sharedItems.map((item, i) => (
              <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasPrivateItems && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Hidden:</p>
          <div className="flex flex-wrap gap-1">
            {detail.privateItems.map((item, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
