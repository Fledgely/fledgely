/**
 * Upgrade to Monitoring Modal Component.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC5
 *
 * Allows families with "Agreement Only" agreements to upgrade
 * to full monitoring without re-creating the entire agreement.
 */

import { useState } from 'react'

interface UpgradeToMonitoringModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal is closed */
  onClose: () => void
  /** Callback when upgrade is confirmed */
  onConfirm: () => void
  /** Child name for personalized messaging */
  childName: string
  /** Number of existing terms that will be preserved */
  existingTermsCount: number
  /** Whether upgrade is in progress */
  isLoading?: boolean
}

/**
 * UpgradeToMonitoringModal displays a confirmation dialog for
 * adding monitoring to an existing agreement-only agreement.
 */
export function UpgradeToMonitoringModal({
  isOpen,
  onClose,
  onConfirm,
  childName,
  existingTermsCount,
  isLoading = false,
}: UpgradeToMonitoringModalProps) {
  const [confirmChecked, setConfirmChecked] = useState(false)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (confirmChecked && !isLoading) {
      onConfirm()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      data-testid="upgrade-to-monitoring-modal"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-purple-50 px-6 py-4 border-b border-purple-100">
          <h2 id="upgrade-modal-title" className="text-lg font-semibold text-purple-900">
            Add Device Monitoring
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* What changes */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">What will change?</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Your {existingTermsCount} existing agreement terms will stay the same</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">+</span>
                <span>You can add device monitoring rules</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">+</span>
                <span>You&apos;ll be able to see {childName}&apos;s device activity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">+</span>
                <span>Device enrollment will become available</span>
              </li>
            </ul>
          </div>

          {/* Child explanation (NFR65: 6th-grade reading level) */}
          <div className="bg-amber-50 rounded-lg p-4 mb-4 border border-amber-200">
            <h3 className="font-medium text-amber-900 mb-1">Talk to {childName} first</h3>
            <p className="text-sm text-amber-800">
              Before you add monitoring, we suggest talking with {childName} about why. This helps
              keep trust in your agreement.
            </p>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              data-testid="upgrade-confirm-checkbox"
            />
            <span className="text-sm text-gray-700">
              I understand that adding monitoring will let me see {childName}&apos;s device activity
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 min-h-[44px] disabled:opacity-50"
            data-testid="upgrade-cancel-button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!confirmChecked || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="upgrade-confirm-button"
          >
            {isLoading ? 'Adding...' : 'Add Monitoring'}
          </button>
        </div>
      </div>
    </div>
  )
}
