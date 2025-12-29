/**
 * Drawn Signature Component.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC2
 *
 * Allows users to draw their signature using touch or mouse.
 * Provides an engaging, child-friendly signing experience.
 */

'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

/** Default canvas width for signature */
const DEFAULT_CANVAS_WIDTH = 400
/** Default canvas height for signature */
const DEFAULT_CANVAS_HEIGHT = 150

interface DrawnSignatureProps {
  /** Called when signature drawing changes */
  onChange: (imageData: string | null) => void
  /** Width of the canvas */
  width?: number
  /** Height of the canvas */
  height?: number
  /** Line color */
  strokeColor?: string
  /** Line width */
  strokeWidth?: number
  /** Whether the canvas is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

export function DrawnSignature({
  onChange,
  width = DEFAULT_CANVAS_WIDTH,
  height = DEFAULT_CANVAS_HEIGHT,
  strokeColor = '#1e40af',
  strokeWidth = 3,
  disabled = false,
  className = '',
}: DrawnSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  /**
   * Get canvas context with proper settings.
   */
  const getContext = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    return ctx
  }, [strokeColor, strokeWidth])

  /**
   * Get position from event (mouse or touch), scaling for CSS-scaled canvas.
   */
  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    // Calculate scale factor between CSS size and actual canvas size
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  /**
   * Start drawing.
   */
  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return
      e.preventDefault()
      const ctx = getContext()
      if (!ctx) return

      const { x, y } = getPosition(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
      setIsDrawing(true)
    },
    [disabled, getContext, getPosition]
  )

  /**
   * Draw line to current position.
   */
  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return
      e.preventDefault()
      const ctx = getContext()
      if (!ctx) return

      const { x, y } = getPosition(e)
      ctx.lineTo(x, y)
      ctx.stroke()
      setHasDrawn(true)
    },
    [isDrawing, disabled, getContext, getPosition]
  )

  /**
   * Stop drawing and emit data.
   */
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)

    const canvas = canvasRef.current
    if (canvas && hasDrawn) {
      const imageData = canvas.toDataURL('image/png')
      onChange(imageData)
    }
  }, [isDrawing, hasDrawn, onChange])

  /**
   * Clear the canvas.
   */
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onChange(null)
  }, [getContext, onChange])

  /**
   * Initialize canvas with white background (runs only once on mount).
   */
  useEffect(() => {
    if (isInitialized) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setIsInitialized(true)
  }, [isInitialized])

  return (
    <div className={`space-y-2 ${className}`} data-testid="drawn-signature">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Draw Your Signature</label>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={disabled || !hasDrawn}
          className={`
            px-3 py-1 text-sm rounded-full
            min-h-[44px] min-w-[60px]
            transition-colors
            ${
              disabled || !hasDrawn
                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
            }
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          `}
          aria-label="Clear signature"
          data-testid="clear-signature-button"
        >
          Clear
        </button>
      </div>
      <div
        className={`
          relative border-2 rounded-lg overflow-hidden
          ${hasDrawn ? 'border-green-400' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100' : 'bg-white'}
        `}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`
            w-full touch-none
            ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}
          `}
          style={{ height: `${height}px` }}
          aria-label="Signature drawing canvas"
          role="img"
          data-testid="signature-canvas"
        />
        {!hasDrawn && !disabled && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <p className="text-gray-400 text-lg">Sign here with your finger or mouse</p>
          </div>
        )}
        {hasDrawn && (
          <span
            className="absolute right-2 top-2 text-green-500 bg-white rounded-full p-1"
            aria-hidden="true"
          >
            ✓
          </span>
        )}
      </div>
      <p id="drawn-signature-help" className="text-sm text-gray-500">
        Use your finger or mouse to draw your signature above.
      </p>
    </div>
  )
}
