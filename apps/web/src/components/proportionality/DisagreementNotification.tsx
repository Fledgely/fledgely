/**
 * DisagreementNotification Component - Story 38.4 Task 8
 *
 * Surface disagreements for family conversation.
 * AC6: Disagreement surfaces for family conversation
 */

'use client'

import type { DisagreementRecord } from '@fledgely/shared'

export type ViewerType = 'child' | 'parent'

export interface DisagreementNotificationProps {
  disagreement: DisagreementRecord
  viewerType: ViewerType
  childName: string
  onDismiss: () => void
  onScheduleConversation?: () => void
}

const DISAGREEMENT_MESSAGES: Record<
  DisagreementRecord['disagreementType'],
  { title: string; message: string }
> = {
  child_wants_less: {
    title: 'Different Perspectives Noticed',
    message:
      'Family members have different views about monitoring. A conversation might help everyone understand each other better.',
  },
  parent_wants_more: {
    title: 'Time for a Family Discussion',
    message:
      'There are different opinions about monitoring needs. Talking together can help find the right balance.',
  },
  mixed: {
    title: 'Various Viewpoints',
    message:
      'Family members shared different perspectives. Coming together to discuss can help align expectations.',
  },
}

export default function DisagreementNotification({
  disagreement,
  viewerType,
  childName: _childName,
  onDismiss,
  onScheduleConversation,
}: DisagreementNotificationProps): JSX.Element {
  const isChild = viewerType === 'child'
  const messageContent = DISAGREEMENT_MESSAGES[disagreement.disagreementType]

  // Discussion topics based on disagreement type
  const getDiscussionTopics = () => {
    const baseTopic = [
      'What is working well with the current setup?',
      'What would make things better for everyone?',
    ]

    if (disagreement.disagreementType === 'child_wants_less') {
      return [
        ...baseTopic,
        isChild
          ? 'How can I show I&apos;m ready for more independence?'
          : `What would help you feel comfortable with less monitoring?`,
      ]
    }

    if (disagreement.disagreementType === 'parent_wants_more') {
      return [
        ...baseTopic,
        isChild
          ? 'Are there concerns I should know about?'
          : 'What specific situations are causing concern?',
      ]
    }

    return baseTopic
  }

  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6" role="alert">
      <div className="flex items-start gap-3">
        <span className="text-2xl" role="img" aria-label="Discussion">
          💬
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{messageContent.title}</h3>
          <p className="text-gray-700 mt-1">{messageContent.message}</p>

          {/* Neutral, non-blaming language - never reveal specific responses */}
          <div className="mt-4 p-3 bg-white rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Topics to discuss together:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {getDiscussionTopics().map((topic, index) => (
                <li key={index}>{topic}</li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-3">
            {onScheduleConversation && (
              <button
                onClick={onScheduleConversation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Schedule a Conversation
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              We&apos;ve Talked About This
            </button>
          </div>

          {/* Resource link */}
          <div className="mt-4 text-sm">
            <a href="/resources/family-communication" className="text-blue-600 hover:underline">
              Tips for productive family conversations →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
