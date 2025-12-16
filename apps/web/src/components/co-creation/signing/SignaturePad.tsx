'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { type SignatureType, SIGNATURE_TYPE_LABELS } from '@fledgely/contracts'

/**
 * SignaturePad Component Props
 */
export interface SignaturePadProps {
  /** Current signature mode */
  mode: SignatureType
  /** Callback when mode changes */
  onModeChange: (mode: SignatureType) => void
  /** Current signature value (string for typed, base64 for drawn) */
  value: string
  /** Callback when signature value changes */
  onChange: (value: string) => void
  /** Child's name for placeholder/pre-fill */
  childName: string
  /** Whether the component is disabled */
  disabled?: boolean
}

/**
 * SignaturePad Component
 *
 * Story 6.1: Child Digital Signature Ceremony - Task 2
 *
 * A reusable signature pad component that supports both:
 * - Typed signatures (text input with child's name)
 * - Drawn signatures (canvas with touch/mouse support)
 *
 * Features:
 * - Mode toggle between typed and drawn (Task 2.6)
 * - Clear button to reset signature (Task 2.3)
 * - Touch device support for drawing (Task 2.4)
 * - Accessibility with keyboard fallback (Task 2.5, NFR42)
 * - 44x44px minimum touch targets (NFR49)
 * - Export as string for typed, base64 for drawn (Task 2.7)
 *
 * @example
 * ```tsx
 * const [mode, setMode] = useState<SignatureType>('typed')
 * const [signature, setSignature] = useState('')
 *
 * <SignaturePad
 *   mode={mode}
 *   onModeChange={setMode}
 *   value={signature}
 *   onChange={setSignature}
 *   childName="Alex"
 * />
 * ```
 */
export function SignaturePad({
  mode,
  onModeChange,
  value,
  onChange,
  childName,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)
  const lastDrawTime = useRef<number>(0)
  const THROTTLE_MS = 16 // ~60fps

  // Initialize canvas context and cache it
  useEffect(() => {
    if (mode === 'drawn' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Set up canvas for high-quality drawing
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        ctx.scale(dpr, dpr)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 3
        ctx.strokeStyle = '#1e293b' // dark blue-gray for signature
        // Cache the context for performance
        contextRef.current = ctx
      }
    } else {
      // Clear cached context when not in drawn mode
      contextRef.current = null
    }
  }, [mode])

  // Get coordinates from mouse/touch event
  const getCoordinates = useCallback(
    (event: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      if (!canvasRef.current) return null

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()

      if ('touches' in event) {
        const touch = event.touches[0] || event.changedTouches[0]
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        }
      }

      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    },
    []
  )

  // Start drawing
  const handleDrawStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (disabled || mode !== 'drawn') return

      event.preventDefault()
      const point = getCoordinates(event)
      if (point) {
        setIsDrawing(true)
        setLastPoint(point)
      }
    },
    [disabled, mode, getCoordinates]
  )

  // Continue drawing with throttling for performance
  const handleDrawMove = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled || !contextRef.current) return

      // Throttle to ~60fps for performance
      const now = Date.now()
      if (now - lastDrawTime.current < THROTTLE_MS) return
      lastDrawTime.current = now

      event.preventDefault()
      const ctx = contextRef.current
      const point = getCoordinates(event)

      if (point && lastPoint) {
        ctx.beginPath()
        ctx.moveTo(lastPoint.x, lastPoint.y)
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
        setLastPoint(point)
      }
    },
    [isDrawing, disabled, lastPoint, getCoordinates, THROTTLE_MS]
  )

  // End drawing
  const handleDrawEnd = useCallback(() => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false)
      setLastPoint(null)
      // Export canvas as base64
      const dataUrl = canvasRef.current.toDataURL('image/png')
      onChange(dataUrl)
    }
  }, [isDrawing, onChange])

  // Handle typed input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled) {
        onChange(event.target.value)
      }
    },
    [disabled, onChange]
  )

  // Clear signature
  const handleClear = useCallback(() => {
    if (disabled) return

    onChange('')

    if (mode === 'drawn' && canvasRef.current && contextRef.current) {
      const canvas = canvasRef.current
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [disabled, mode, onChange])

  // Handle mode change
  const handleModeChange = useCallback(
    (newMode: SignatureType) => {
      if (!disabled && newMode !== mode) {
        onChange('') // Clear value when switching modes
        onModeChange(newMode)
      }
    },
    [disabled, mode, onChange, onModeChange]
  )

  const hasValue = value.length > 0

  return (
    <div
      data-testid="signature-pad"
      className={`w-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {/* Mode Toggle */}
      <div
        className="flex gap-2 mb-4"
        role="group"
        aria-label="Signature type selection"
      >
        <button
          type="button"
          onClick={() => handleModeChange('typed')}
          disabled={disabled}
          aria-pressed={mode === 'typed'}
          className={`flex-1 min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            mode === 'typed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          } ${disabled ? 'cursor-not-allowed' : ''}`}
        >
          Type Your Name
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('drawn')}
          disabled={disabled}
          aria-pressed={mode === 'drawn'}
          className={`flex-1 min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            mode === 'drawn'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          } ${disabled ? 'cursor-not-allowed' : ''}`}
        >
          Draw Your Signature
        </button>
      </div>

      {/* Signature Area */}
      <div className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
        {mode === 'typed' ? (
          /* Typed Signature Mode */
          <div className="p-4">
            <label htmlFor="signature-input" className="sr-only">
              Type your signature
            </label>
            <input
              id="signature-input"
              type="text"
              value={value}
              onChange={handleInputChange}
              disabled={disabled}
              placeholder={`Type your name (e.g., ${childName})`}
              aria-label="Signature input - Type your name"
              className="w-full px-4 py-3 text-2xl font-signature text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed"
              style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive" }}
            />
            {/* Signature Preview */}
            {value && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
                <p
                  className="text-3xl text-gray-900 dark:text-gray-100"
                  style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive" }}
                >
                  {value}
                </p>
              </div>
            )}
            {!value && (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                Type your name above to sign
              </p>
            )}
          </div>
        ) : (
          /* Drawn Signature Mode */
          <div>
            <canvas
              ref={canvasRef}
              role="img"
              aria-label="Signature canvas - Draw your signature here"
              tabIndex={disabled ? -1 : 0}
              className="w-full h-48 cursor-crosshair touch-none"
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
              onMouseLeave={handleDrawEnd}
              onTouchStart={handleDrawStart}
              onTouchMove={handleDrawMove}
              onTouchEnd={handleDrawEnd}
            />
            {/* Signature Line */}
            <div className="absolute bottom-12 left-4 right-4 border-b border-gray-400 dark:border-gray-500" />

            {/* Instructions */}
            {!hasValue && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400 dark:text-gray-500 text-lg">
                  Draw your signature here
                </p>
              </div>
            )}

            {/* Keyboard fallback */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => handleModeChange('typed')}
                disabled={disabled}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                Use keyboard to type instead
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear Button */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || !hasValue}
          aria-label="Clear signature"
          className="min-h-[44px] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Clear
          </span>
        </button>
      </div>
    </div>
  )
}

export type { SignaturePadProps }
