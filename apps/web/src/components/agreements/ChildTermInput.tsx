/**
 * Child Term Input Component.
 *
 * Story 5.3: Child Contribution Capture - AC2, AC4
 *
 * Simplified input form for children to add their ideas.
 * Features large touch targets, playful design, and voice input option.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import type { TermCategory, ContributionParty } from '@fledgely/shared/contracts'
import { useVoiceInput } from '../../hooks/useVoiceInput'

/**
 * Category configuration with child-friendly labels and colors.
 */
const CHILD_CATEGORIES: {
  value: TermCategory
  label: string
  emoji: string
  color: string
}[] = [
  {
    value: 'time',
    label: 'Screen Time',
    emoji: '⏰',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
  },
  {
    value: 'apps',
    label: 'Apps & Games',
    emoji: '🎮',
    color: 'bg-green-100 hover:bg-green-200 text-green-800',
  },
  {
    value: 'monitoring',
    label: 'Rules',
    emoji: '📋',
    color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800',
  },
  {
    value: 'rewards',
    label: 'Rewards',
    emoji: '🌟',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-800',
  },
  {
    value: 'general',
    label: 'Other Ideas',
    emoji: '💡',
    color: 'bg-pink-100 hover:bg-pink-200 text-pink-800',
  },
]

interface ChildTermInputProps {
  /** Called when a term is submitted */
  onSubmit: (text: string, category: TermCategory) => void
  /** The child's name for personalization */
  childName: string
  /** Who is currently contributing */
  currentParty: ContributionParty
  /** Whether the form is disabled */
  disabled?: boolean
  /** Maximum character length for input */
  maxLength?: number
}

export function ChildTermInput({
  onSubmit,
  childName,
  currentParty,
  disabled = false,
  maxLength = 200,
}: ChildTermInputProps) {
  const [text, setText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TermCategory | null>(null)
  const [step, setStep] = useState<'category' | 'text'>('category')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    error: voiceError,
    clearTranscript,
  } = useVoiceInput({
    onTranscript: (newText) => {
      setText((prev) => prev + ' ' + newText)
    },
  })

  /**
   * Update text when transcript changes from voice input.
   */
  useEffect(() => {
    if (transcript && !isListening) {
      // Voice input finished, update text
      setText((prev) => {
        const updated = prev + transcript
        return updated.slice(0, maxLength)
      })
      clearTranscript()
    }
  }, [transcript, isListening, maxLength, clearTranscript])

  /**
   * Focus textarea when moving to text step.
   */
  useEffect(() => {
    if (step === 'text' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [step])

  /**
   * Handle category selection.
   */
  const handleCategorySelect = (category: TermCategory) => {
    setSelectedCategory(category)
    setStep('text')
  }

  /**
   * Handle form submission.
   */
  const handleSubmit = () => {
    if (!text.trim() || !selectedCategory) return

    onSubmit(text.trim(), selectedCategory)
    setText('')
    setSelectedCategory(null)
    setStep('category')
    clearTranscript()
  }

  /**
   * Handle going back to category selection.
   */
  const handleBack = () => {
    setStep('category')
  }

  /**
   * Toggle voice input.
   */
  const toggleVoice = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const isChild = currentParty === 'child'
  const inputPlaceholder = isChild
    ? `What's your idea, ${childName}?`
    : 'Type your suggestion here...'

  return (
    <div
      className={`
        rounded-2xl p-6
        ${isChild ? 'bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200' : 'bg-gray-50 border border-gray-200'}
      `}
      data-testid="child-term-input"
    >
      {/* Step 1: Category Selection */}
      {step === 'category' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center text-gray-900">
            {isChild ? `What kind of idea do you have, ${childName}?` : 'Select a category'}
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CHILD_CATEGORIES.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => handleCategorySelect(category.value)}
                disabled={disabled}
                className={`
                  min-h-[72px] p-4 rounded-xl flex flex-col items-center justify-center gap-2
                  transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                  ${category.color}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer transform hover:scale-105'}
                `}
                data-testid={`category-${category.value}`}
              >
                <span className="text-2xl" aria-hidden="true">
                  {category.emoji}
                </span>
                <span className="text-sm font-medium text-center">{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Text Input */}
      {step === 'text' && selectedCategory && (
        <div className="space-y-4">
          {/* Category indicator and back button */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 min-h-[44px] px-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
              data-testid="back-to-categories"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Back</span>
            </button>

            <div
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium
                ${CHILD_CATEGORIES.find((c) => c.value === selectedCategory)?.color}
              `}
            >
              {CHILD_CATEGORIES.find((c) => c.value === selectedCategory)?.emoji}{' '}
              {CHILD_CATEGORIES.find((c) => c.value === selectedCategory)?.label}
            </div>
          </div>

          {/* Text input area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxLength))}
              placeholder={inputPlaceholder}
              disabled={disabled || isListening}
              rows={4}
              className={`
                w-full p-4 rounded-xl border-2 text-lg resize-none
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                ${isChild ? 'border-pink-200 bg-white' : 'border-gray-200 bg-white'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isListening ? 'bg-pink-50 border-pink-300' : ''}
              `}
              data-testid="term-text-input"
              aria-label="Your idea"
            />

            {/* Character count */}
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {text.length}/{maxLength}
            </div>
          </div>

          {/* Voice input indicator */}
          {isListening && (
            <div
              className="flex items-center gap-2 text-pink-600 animate-pulse"
              role="status"
              aria-live="polite"
              data-testid="voice-listening-indicator"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Listening... Speak your idea!</span>
            </div>
          )}

          {/* Voice error */}
          {voiceError && (
            <div className="text-sm text-red-600" role="alert" data-testid="voice-error">
              {voiceError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Voice input button (if supported) */}
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                disabled={disabled}
                className={`
                  min-h-[48px] px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2
                  transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                  ${
                    isListening
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                data-testid="voice-input-button"
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{isListening ? 'Stop' : 'Use Voice'}</span>
              </button>
            )}

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled || !text.trim()}
              className={`
                flex-1 min-h-[48px] px-6 py-3 rounded-xl font-medium
                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                ${
                  isChild
                    ? 'bg-pink-500 text-white hover:bg-pink-600'
                    : 'bg-primary text-white hover:bg-primary/90'
                }
                ${disabled || !text.trim() ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              data-testid="submit-term"
            >
              {isChild ? '✨ Add My Idea!' : 'Add Term'}
            </button>
          </div>
        </div>
      )}

      {/* Child attribution badge */}
      {isChild && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-pink-600">
          <span className="text-lg" aria-hidden="true">
            🦋
          </span>
          <span>{childName}&apos;s Ideas Are Protected!</span>
        </div>
      )}
    </div>
  )
}

export default ChildTermInput
