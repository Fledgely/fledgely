/**
 * TransitionGuide - Story 52.1 Task 5.2
 *
 * Step-by-step guide for age 16 transition features.
 *
 * AC2: Explains reverse mode option, trusted adults
 * AC4: In-app guide walks through new features
 * AC4: Celebrates milestone: "You're growing up!"
 */

'use client'

import { useState } from 'react'
import {
  ToggleRight,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Check,
} from 'lucide-react'
import { getDefaultTransitionGuide } from '@fledgely/shared'

interface TransitionGuideProps {
  /** Callback when guide is completed */
  onComplete?: () => void
  /** Callback when user wants to go back */
  onBack?: () => void
}

const stepIcons = {
  toggle: ToggleRight,
  users: Users,
  shield: Shield,
}

export function TransitionGuide({ onComplete, onBack }: TransitionGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const guide = getDefaultTransitionGuide()

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === guide.steps.length - 1
  const isCelebrationStep = currentStep === guide.steps.length

  const handleNext = () => {
    if (isCelebrationStep) {
      onComplete?.()
    } else if (isLastStep) {
      setCurrentStep(guide.steps.length) // Go to celebration
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (isCelebrationStep) {
      setCurrentStep(guide.steps.length - 1)
    } else if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    } else {
      onBack?.()
    }
  }

  // Celebration screen after all steps
  if (isCelebrationStep) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-lg mx-auto">
        {/* Celebration Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-8 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">{guide.title}</h2>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <p className="text-lg text-gray-700 mb-6">{guide.celebrationMessage}</p>

          {/* Summary of what they learned */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">What you learned:</h3>
            <ul className="space-y-2">
              {guide.steps.map((step, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{step.title}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handlePrev}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Review Again
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Got It!
            </button>
          </div>
        </div>
      </div>
    )
  }

  const step = guide.steps[currentStep]
  const IconComponent = stepIcons[step.icon as keyof typeof stepIcons] || Shield

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-lg mx-auto">
      {/* Header with progress */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">{guide.title}</h2>
          <span className="text-sm text-blue-100">
            Step {currentStep + 1} of {guide.steps.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-blue-400/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${((currentStep + 1) / guide.steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Introduction (only on first step) */}
        {isFirstStep && <p className="text-gray-600 mb-6 text-center">{guide.introduction}</p>}

        {/* Step content */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <IconComponent className="h-8 w-8 text-blue-600" />
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>

          <p className="text-gray-600 leading-relaxed">{step.description}</p>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {guide.steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`
                w-2 h-2 rounded-full transition-all
                ${index === currentStep ? 'bg-blue-600 w-6' : 'bg-gray-200 hover:bg-gray-300'}
              `}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {isFirstStep ? 'Back' : 'Previous'}
        </button>

        <button
          onClick={handleNext}
          className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {isLastStep ? 'Finish' : 'Next'}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default TransitionGuide
