/**
 * MediationResourcesModal Component - Story 34.5.2 Task 4 + Story 34.5.4 Task 1
 *
 * Modal displaying mediation resources for children.
 * AC2: Link to Family Communication Resources
 * AC3: Family Meeting Template Access
 * AC4: Age-Appropriate Negotiation Tips
 * Story 34.5.4 AC3: Shareable Template (Copy to Clipboard)
 */

import { useState } from 'react'
import type { AgeTier } from '@fledgely/shared/contracts/mediationResources'
import {
  getFamilyMeetingTemplate,
  getNegotiationTips,
} from '@fledgely/shared/services/mediationResourceService'
import { ScheduleReminderModal } from './ScheduleReminderModal'
import { useMeetingReminder } from '../../hooks/useMeetingReminder'

// ============================================
// Types
// ============================================

export interface MediationResourcesModalProps {
  /** Whether modal is visible */
  isOpen: boolean
  /** Close modal callback */
  onClose: () => void
  /** Child's age tier for content adaptation */
  ageTier: AgeTier
  /** Child's name for personalization */
  childName: string
  /** Family ID for meeting reminder scheduling (optional) */
  familyId?: string
  /** Child ID for meeting reminder scheduling (optional) */
  childId?: string
}

type TabId = 'negotiation-tips' | 'family-meeting'

// ============================================
// Component
// ============================================

export function MediationResourcesModal({
  isOpen,
  onClose,
  ageTier,
  childName,
  familyId,
  childId,
}: MediationResourcesModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('negotiation-tips')
  const [expandedTip, setExpandedTip] = useState<number | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)

  // Meeting reminder hook - only used if familyId and childId are provided
  const canScheduleReminder = Boolean(familyId && childId)

  // Conditionally call hook only when we have valid IDs to avoid unnecessary API calls
  const meetingReminder = useMeetingReminder(
    canScheduleReminder
      ? {
          familyId: familyId!,
          createdBy: childId!,
          templateId: `family-meeting-${ageTier}`,
          ageTier,
        }
      : {
          familyId: '',
          createdBy: '',
          templateId: '',
          ageTier,
        }
  )

  if (!isOpen) {
    return null
  }

  const template = getFamilyMeetingTemplate(ageTier)
  const tips = getNegotiationTips(ageTier)

  const handlePrint = () => {
    window.print()
  }

  /**
   * Format template content for clipboard.
   * Story 34.5.4 AC3: Shareable Template
   */
  const formatTemplateForCopy = (): string => {
    const lines: string[] = []

    lines.push(`📋 ${template.title}`)
    lines.push('')
    lines.push(template.introduction)
    lines.push('')
    lines.push(`👨‍👩‍👧 ${template.parentSection.heading}`)
    template.parentSection.prompts.forEach((prompt) => {
      lines.push(`  • ${prompt}`)
    })
    lines.push('')
    lines.push(`🧒 ${template.childSection.heading}`)
    template.childSection.prompts.forEach((prompt) => {
      lines.push(`  • ${prompt}`)
    })
    lines.push('')
    lines.push(`🤝 ${template.jointSection.heading}`)
    template.jointSection.prompts.forEach((prompt) => {
      lines.push(`  • ${prompt}`)
    })
    lines.push('')
    lines.push(`💡 ${template.closingNotes}`)

    return lines.join('\n')
  }

  /**
   * Copy template to clipboard.
   * Story 34.5.4 AC3: Shareable Template
   */
  const handleCopy = async () => {
    const content = formatTemplateForCopy()

    try {
      await navigator.clipboard.writeText(content)
      setCopySuccess(true)

      // Reset after 3 seconds
      setTimeout(() => {
        setCopySuccess(false)
      }, 3000)
    } catch {
      // Fallback for older browsers - silently fail
      console.warn('Clipboard API not available')
    }
  }

  const toggleTip = (index: number) => {
    setExpandedTip(expandedTip === index ? null : index)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        data-testid="mediation-resources-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed inset-4 md:inset-x-auto md:inset-y-8 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl md:w-full bg-white rounded-lg shadow-xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div
          data-testid="modal-header"
          className="flex items-center justify-between px-6 py-4 border-b"
        >
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
            Resources for {childName}
          </h2>
          <button
            data-testid="modal-close-button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            data-testid="tab-negotiation-tips"
            onClick={() => setActiveTab('negotiation-tips')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'negotiation-tips'
                ? 'active border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            How to Talk to Parents
          </button>
          <button
            data-testid="tab-family-meeting"
            onClick={() => setActiveTab('family-meeting')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'family-meeting'
                ? 'active border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Family Meeting Guide
          </button>
        </div>

        {/* Content */}
        <div data-testid="resources-content" className="flex-1 overflow-y-auto p-6">
          {activeTab === 'negotiation-tips' && (
            <div data-testid="negotiation-tips-content">
              <p className="text-gray-600 mb-6">
                Here are some tips to help you have better conversations with your parents about
                what you want.
              </p>

              <div className="space-y-4">
                {tips.map((tip, index) => (
                  <div
                    key={tip.id}
                    data-testid={`tip-${index}`}
                    className="border rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => toggleTip(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        toggleTip(index)
                      }
                    }}
                  >
                    <div className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                      <div>
                        <h3 data-testid="tip-title" className="font-medium text-gray-900">
                          {tip.title}
                        </h3>
                        <p data-testid="tip-description" className="text-sm text-gray-500 mt-1">
                          {tip.shortDescription}
                        </p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedTip === index ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>

                    {expandedTip === index && (
                      <div
                        data-testid={`tip-full-content-${index}`}
                        className="px-4 pb-4 text-gray-700 bg-gray-50 border-t"
                      >
                        <p className="pt-3">{tip.fullContent}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'family-meeting' && (
            <div data-testid="family-meeting-content">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{template.title}</h3>
                <div className="flex items-center gap-2">
                  {/* Story 34.5.4 AC3: Copy to Clipboard */}
                  <button
                    data-testid="copy-button"
                    onClick={handleCopy}
                    aria-label="Copy template to clipboard"
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
                      copySuccess
                        ? 'text-green-600 border-green-300 bg-green-50'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {copySuccess ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    data-testid="print-button"
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    Print
                  </button>
                </div>
              </div>

              <p className="text-gray-600 mb-6">{template.introduction}</p>

              {/* Parent Section */}
              <div data-testid="parent-section" className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">{template.parentSection.heading}</h4>
                <ul className="space-y-2">
                  {template.parentSection.prompts.map((prompt, index) => (
                    <li key={index} className="flex items-start gap-2 text-blue-800">
                      <span className="text-blue-500 mt-1">•</span>
                      {prompt}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Child Section */}
              <div data-testid="child-section" className="mb-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-3">{template.childSection.heading}</h4>
                <ul className="space-y-2">
                  {template.childSection.prompts.map((prompt, index) => (
                    <li key={index} className="flex items-start gap-2 text-green-800">
                      <span className="text-green-500 mt-1">•</span>
                      {prompt}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Joint Section */}
              <div data-testid="joint-section" className="mb-6 p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-3">
                  {template.jointSection.heading}
                </h4>
                <ul className="space-y-2">
                  {template.jointSection.prompts.map((prompt, index) => (
                    <li key={index} className="flex items-start gap-2 text-purple-800">
                      <span className="text-purple-500 mt-1">•</span>
                      {prompt}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Closing Notes */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-700 italic">{template.closingNotes}</p>
              </div>

              {/* Schedule Meeting Reminder Button - Story 34.5.4 AC4 */}
              {canScheduleReminder && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    data-testid="schedule-reminder-button"
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Schedule a Family Meeting
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Schedule Reminder Modal - Story 34.5.4 AC4 */}
          <ScheduleReminderModal
            isOpen={isScheduleModalOpen}
            onClose={() => setIsScheduleModalOpen(false)}
            onSchedule={async (scheduledAt) => {
              await meetingReminder.scheduleReminder(scheduledAt)
              setIsScheduleModalOpen(false)
            }}
            isScheduling={meetingReminder.isScheduling}
          />
        </div>
      </div>
    </>
  )
}
