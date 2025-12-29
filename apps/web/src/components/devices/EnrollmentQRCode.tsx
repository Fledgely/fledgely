'use client'

/**
 * EnrollmentQRCode Component - Story 12.1
 *
 * Displays a QR code for device enrollment with countdown timer.
 * The QR code contains the enrollment payload (familyId, token, expiry, version).
 *
 * Requirements:
 * - AC3: QR Code Generation
 * - AC5: QR Display with instructions
 * - AC6: Token Regeneration
 */

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  EnrollmentPayload,
  getTimeRemaining,
  formatTimeRemaining,
} from '../../services/enrollmentService'

interface EnrollmentQRCodeProps {
  payload: EnrollmentPayload
  onExpired: () => void
  onRegenerate: () => void
  isRegenerating?: boolean
}

export function EnrollmentQRCode({
  payload,
  onExpired,
  onRegenerate,
  isRegenerating = false,
}: EnrollmentQRCodeProps) {
  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemaining(payload.expiry))
  const [isExpired, setIsExpired] = useState(false)

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(payload.expiry)
      setTimeRemaining(remaining)

      if (remaining <= 0 && !isExpired) {
        setIsExpired(true)
        onExpired()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [payload.expiry, isExpired, onExpired])

  // Reset expired state when payload changes (regeneration)
  useEffect(() => {
    setIsExpired(false)
    setTimeRemaining(getTimeRemaining(payload.expiry))
  }, [payload])

  // Encode payload as JSON for QR code
  const qrData = JSON.stringify(payload)

  // Determine timer color based on time remaining
  const getTimerColor = useCallback(() => {
    if (isExpired) return 'text-red-600'
    if (timeRemaining < 60000) return 'text-orange-500' // Less than 1 minute
    if (timeRemaining < 180000) return 'text-yellow-600' // Less than 3 minutes
    return 'text-green-600'
  }, [isExpired, timeRemaining])

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* QR Code */}
      <div className={`p-4 bg-white rounded-lg ${isExpired ? 'opacity-50' : ''}`}>
        <QRCodeSVG
          value={qrData}
          size={200}
          level="M"
          includeMargin
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {/* Countdown Timer */}
      <div className={`text-2xl font-mono font-bold ${getTimerColor()}`}>
        {isExpired ? 'Expired' : formatTimeRemaining(timeRemaining)}
      </div>

      {/* Status Message */}
      {isExpired ? (
        <p className="text-sm text-gray-500">
          This QR code has expired. Generate a new one to continue.
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          Code expires in {formatTimeRemaining(timeRemaining)}
        </p>
      )}

      {/* Regenerate Button */}
      {isExpired && (
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRegenerating ? 'Generating...' : 'Generate New Code'}
        </button>
      )}

      {/* Instructions */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg max-w-sm">
        <h4 className="font-medium text-gray-900 mb-2">How to scan:</h4>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Install the Fledgely extension on the Chromebook</li>
          <li>Open the extension popup</li>
          <li>Click &quot;Scan QR Code&quot; to add this device</li>
          <li>Point the camera at this QR code</li>
        </ol>
      </div>
    </div>
  )
}
