/**
 * Session Timeout Warning Component.
 *
 * Story 5.1: Co-Creation Session Initiation - AC6
 *
 * Modal dialog that warns users when a session is about to timeout
 * due to inactivity. Provides options to extend or pause the session.
 */

'use client'

import * as Dialog from '@radix-ui/react-dialog'

interface SessionTimeoutWarningProps {
  isOpen: boolean
  onExtend: () => void
  onPause: () => void
  minutesRemaining: number
}

export function SessionTimeoutWarning({
  isOpen,
  onExtend,
  onPause,
  minutesRemaining,
}: SessionTimeoutWarningProps) {
  return (
    <Dialog.Root open={isOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/50 z-50"
          data-testid="timeout-warning-overlay"
        />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-md w-[95vw] z-50 focus:outline-none"
          data-testid="session-timeout-warning"
        >
          {/* Header */}
          <div className="bg-yellow-50 border-b border-yellow-100 p-4 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                Still There?
              </Dialog.Title>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <Dialog.Description className="text-gray-600">
              Your session will pause automatically in{' '}
              <span className="font-semibold text-yellow-600">
                {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''}
              </span>{' '}
              if there&apos;s no activity.
            </Dialog.Description>

            <p className="mt-3 text-sm text-gray-500">
              Don&apos;t worry - your progress is saved! You can continue anytime.
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onExtend}
                className="flex-1 px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                data-testid="extend-session"
              >
                We&apos;re Still Here!
              </button>
              <button
                type="button"
                onClick={onPause}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                data-testid="pause-session"
              >
                Pause for Now
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default SessionTimeoutWarning
