/**
 * Session Start Prompt Component.
 *
 * Story 5.1: Co-Creation Session Initiation - AC1, AC5
 *
 * Modal dialog that prompts the parent to confirm their child is present
 * before starting a co-creation session. Designed for screen sharing
 * with clear, child-friendly language.
 */

'use client'

import * as Dialog from '@radix-ui/react-dialog'

interface SessionStartPromptProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  childName: string
  templateName?: string
}

export function SessionStartPrompt({
  isOpen,
  onClose,
  onConfirm,
  childName,
  templateName,
}: SessionStartPromptProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/50 z-40"
          data-testid="session-prompt-overlay"
        />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-lg w-[95vw] z-50 focus:outline-none"
          data-testid="session-start-prompt"
        >
          {/* Header with illustration */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-t-lg">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                Ready to Create Together?
              </Dialog.Title>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <Dialog.Description className="text-gray-600 text-center text-lg">
              This is a special moment for you and{' '}
              <span className="font-medium text-gray-900">{childName}</span>.
            </Dialog.Description>

            {templateName && (
              <p className="text-sm text-gray-500 text-center">
                Using template: <span className="font-medium">{templateName}</span>
              </p>
            )}

            {/* Co-creation explanation */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-blue-900 mb-2">What is Co-Creation?</h3>
              <p className="text-sm text-blue-800">
                You and {childName} will work together to build your family&apos;s digital
                agreement. Both of you get to share ideas, discuss, and agree on the rules together.
                This makes the agreement something you both helped create!
              </p>
            </div>

            {/* Preparation checklist */}
            <div className="space-y-3 mt-4">
              <p className="text-sm font-medium text-gray-700">Before you begin:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Sit together where you can both see the screen
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Set aside 15-30 minutes for this conversation
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">You can pause and come back anytime</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                data-testid="confirm-start-session"
              >
                Yes, {childName} is with me - Let&apos;s Start!
              </button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                  data-testid="cancel-start-session"
                >
                  Not Right Now
                </button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default SessionStartPrompt
