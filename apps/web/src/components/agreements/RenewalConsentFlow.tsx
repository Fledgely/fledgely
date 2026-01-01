/**
 * RenewalConsentFlow Component - Story 35.3
 *
 * Component for the dual-consent renewal flow.
 * AC4: Child must consent to renewal
 * AC5: Both signatures required
 * AC6: New expiry date set upon completion
 */

import { useState } from 'react'
import { type RenewalMode, getRenewalModeConfig } from '@fledgely/shared'

type FlowStep = 'parent' | 'child' | 'complete'

export interface RenewalConsentFlowProps {
  /** Agreement ID being renewed */
  agreementId: string
  /** Selected renewal mode */
  renewalMode: RenewalMode
  /** New expiry date after renewal */
  newExpiryDate: Date | null
  /** Callback when renewal completes */
  onComplete: () => void
  /** Callback when cancelled */
  onCancel: () => void
}

/**
 * Component for the dual-consent renewal flow.
 */
export function RenewalConsentFlow({
  renewalMode,
  newExpiryDate,
  onComplete,
  onCancel,
}: RenewalConsentFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('parent')
  const [signature, setSignature] = useState('')
  const [parentSignature, setParentSignature] = useState<string | null>(null)

  const modeConfig = getRenewalModeConfig(renewalMode)

  // Format new expiry date
  const formattedExpiryDate = newExpiryDate
    ? newExpiryDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No expiry'

  const handleConfirm = () => {
    if (currentStep === 'parent') {
      setParentSignature(signature)
      setSignature('')
      setCurrentStep('child')
    } else if (currentStep === 'child') {
      setCurrentStep('complete')
    }
  }

  const handleDone = () => {
    onComplete()
  }

  const stepNumber = currentStep === 'parent' ? 1 : currentStep === 'child' ? 2 : 3

  return (
    <div className="p-6">
      {/* Step indicator */}
      <div data-testid="step-indicator" className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              data-testid={`step-${step}`}
              data-active={step === stepNumber}
              data-completed={step < stepNumber}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                step === stepNumber
                  ? 'bg-blue-600 text-white'
                  : step < stepNumber
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step < stepNumber ? '✓' : step}
            </div>
            {step < 3 && (
              <div
                className={`w-16 h-1 mx-2 ${step < stepNumber ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mode info */}
      <div className="text-center text-sm text-gray-500 mb-6">
        Mode: <span className="font-medium">{modeConfig.title}</span>
      </div>

      {/* Parent step */}
      {currentStep === 'parent' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Parent: Confirm Renewal</h3>
          <p className="text-gray-600 mb-4">
            By signing below, you confirm that you want to renew this agreement.
          </p>
          <input
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Sign here (type your name)"
            className="w-full p-3 border rounded-lg mb-4"
          />
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!signature.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Child step */}
      {currentStep === 'child' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Child: Consent to Renewal</h3>
          <p className="text-gray-600 mb-4">
            Your parent wants to renew the agreement. By signing, you consent to the renewal.
          </p>
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-gray-600">Parent signed: {parentSignature}</p>
          </div>
          <input
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Sign here (type your name)"
            className="w-full p-3 border rounded-lg mb-4"
          />
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!signature.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Complete step */}
      {currentStep === 'complete' && (
        <div className="text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold mb-2">Renewal Complete!</h3>
          <p className="text-gray-600 mb-4">Your agreement has been renewed successfully.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">New expiry date: {formattedExpiryDate}</p>
          </div>
          <button
            type="button"
            onClick={handleDone}
            className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
