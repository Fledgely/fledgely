/**
 * ProportionalityCheckQuestions Component - Story 38.4 Task 6
 *
 * Questions interface for the proportionality check.
 * AC2: "Is current monitoring appropriate?" question with 5 choices
 * AC3: Additional questions about external risk and maturity
 * AC5: Private response indicator
 */

'use client'

import { useState } from 'react'
import type { ProportionalityCheck, ResponseChoice, RiskChange } from '@fledgely/shared'

export type ViewerType = 'child' | 'parent'

export interface ProportionalityCheckQuestionsProps {
  check: ProportionalityCheck
  viewerType: ViewerType
  childName: string
  childAge: number
  onSubmit: (response: ProportionalityResponseInput) => void
  onSkip?: () => void
}

export interface ProportionalityResponseInput {
  isMonitoringAppropriate: ResponseChoice
  hasExternalRiskChanged: RiskChange | null
  hasMaturityIncreased: boolean | null
  freeformFeedback: string | null
  suggestedChanges: string[]
}

const RESPONSE_CHOICES: { value: ResponseChoice; label: string; description: string }[] = [
  {
    value: 'appropriate',
    label: 'Just Right',
    description: 'Current monitoring level is appropriate',
  },
  {
    value: 'reduce',
    label: 'Could Be Less',
    description: 'Monitoring could be reduced',
  },
  {
    value: 'increase',
    label: 'Need More',
    description: 'More monitoring might be helpful',
  },
  {
    value: 'discuss',
    label: 'Let&apos;s Talk',
    description: 'Would like to discuss as a family',
  },
  {
    value: 'graduate',
    label: 'Ready to Graduate',
    description: 'Ready to end monitoring',
  },
]

const RISK_CHANGE_OPTIONS: { value: RiskChange; label: string }[] = [
  { value: 'decreased', label: 'Lower than before' },
  { value: 'same', label: 'About the same' },
  { value: 'increased', label: 'Higher than before' },
]

export default function ProportionalityCheckQuestions({
  check: _check,
  viewerType,
  childName,
  childAge,
  onSubmit,
  onSkip,
}: ProportionalityCheckQuestionsProps): JSX.Element {
  const [selectedChoice, setSelectedChoice] = useState<ResponseChoice | null>(null)
  const [riskChange, setRiskChange] = useState<RiskChange | null>(null)
  const [maturityIncreased, setMaturityIncreased] = useState<boolean | null>(null)
  const [feedback, setFeedback] = useState('')
  const [showAdditionalQuestions, setShowAdditionalQuestions] = useState(false)

  const isChild = viewerType === 'child'

  const handleChoiceSelect = (choice: ResponseChoice) => {
    setSelectedChoice(choice)
    setShowAdditionalQuestions(true)
  }

  const handleSubmit = () => {
    if (!selectedChoice) return

    onSubmit({
      isMonitoringAppropriate: selectedChoice,
      hasExternalRiskChanged: riskChange,
      hasMaturityIncreased: maturityIncreased,
      freeformFeedback: feedback.trim() || null,
      suggestedChanges: [],
    })
  }

  // Age-appropriate question text (AC3 + following Story 27.5.7 patterns)
  const getMainQuestion = () => {
    if (isChild) {
      if (childAge < 10) {
        return 'How do you feel about mom and dad checking your phone and computer?'
      }
      if (childAge < 13) {
        return 'How do you feel about your parents checking what you do online?'
      }
      return 'How do you feel about the current monitoring setup?'
    }
    return `How do you feel about the current monitoring for ${childName}?`
  }

  const getRiskQuestion = () => {
    if (isChild) {
      return 'Are there more or fewer things online that worry you now?'
    }
    return `Has the external risk level for ${childName} changed?`
  }

  const getMaturityQuestion = () => {
    if (isChild) {
      return 'Do you feel like you&apos;ve grown and make better choices online?'
    }
    return `Has ${childName} shown increased maturity in digital habits?`
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Privacy indicator (AC5) */}
      <div className="mb-6 p-3 bg-blue-50 rounded-md text-sm text-blue-700">
        <span className="font-medium">🔒 Private Response</span>
        <p className="mt-1">
          Your answers are private. {isChild ? 'Your parents' : 'Other family members'} cannot see
          what you say here.
        </p>
      </div>

      {/* Main question (AC2) */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{getMainQuestion()}</h2>

        <div className="space-y-3">
          {RESPONSE_CHOICES.map((choice) => (
            <button
              key={choice.value}
              onClick={() => handleChoiceSelect(choice.value)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                selectedChoice === choice.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              aria-pressed={selectedChoice === choice.value}
            >
              <div className="font-medium text-gray-900">{choice.label}</div>
              <div className="text-sm text-gray-600 mt-1">{choice.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Additional questions (AC3) */}
      {showAdditionalQuestions && (
        <div className="space-y-6 pt-4 border-t border-gray-200">
          {/* Risk change question */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3">{getRiskQuestion()}</h3>
            <div className="flex flex-wrap gap-2">
              {RISK_CHANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRiskChange(option.value)}
                  className={`px-4 py-2 rounded-full border-2 transition-colors ${
                    riskChange === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  aria-pressed={riskChange === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Maturity question */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3">{getMaturityQuestion()}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setMaturityIncreased(true)}
                className={`px-6 py-2 rounded-full border-2 transition-colors ${
                  maturityIncreased === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-300'
                }`}
                aria-pressed={maturityIncreased === true}
              >
                Yes
              </button>
              <button
                onClick={() => setMaturityIncreased(false)}
                className={`px-6 py-2 rounded-full border-2 transition-colors ${
                  maturityIncreased === false
                    ? 'border-gray-500 bg-gray-50 text-gray-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-pressed={maturityIncreased === false}
              >
                Not Yet
              </button>
            </div>
          </div>

          {/* Optional feedback */}
          <div>
            <label htmlFor="feedback" className="block text-md font-medium text-gray-900 mb-2">
              Anything else you&apos;d like to share? (Optional)
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={
                isChild
                  ? 'Share your thoughts here...'
                  : `Share any additional thoughts about ${childName}'s digital habits...`
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex justify-between">
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Skip for Now
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!selectedChoice}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            selectedChoice
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Submit Response
        </button>
      </div>
    </div>
  )
}
