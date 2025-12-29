/**
 * QR Scanner Module - Story 12.2
 *
 * Handles QR code scanning for device enrollment.
 * Uses jsQR library for decoding QR codes from camera frames.
 *
 * Requirements:
 * - AC1: Scan to Enroll interface
 * - AC2: Camera permission request
 * - AC3: QR code auto-decode
 * - AC4: Payload validation
 * - AC5: Expired token handling
 */

import jsQR from 'jsqr'

/**
 * Enrollment payload structure (from Story 12.1)
 */
export interface EnrollmentPayload {
  familyId: string
  token: string
  expiry: number
  version: number
}

/**
 * Validation result for enrollment payload
 */
export interface ValidationResult {
  valid: boolean
  payload?: EnrollmentPayload
  errorCode?: 'INVALID_JSON' | 'MISSING_FIELDS' | 'EXPIRED_TOKEN' | 'UNSUPPORTED_VERSION'
  errorMessage?: string
}

/**
 * Camera stream state
 */
interface CameraState {
  stream: MediaStream | null
  video: HTMLVideoElement | null
  canvas: HTMLCanvasElement | null
  ctx: CanvasRenderingContext2D | null
  scanning: boolean
  animationId: number | null
}

/** Current payload version supported */
const SUPPORTED_VERSION = 1

/** Camera state (module-level for cleanup) */
let cameraState: CameraState = {
  stream: null,
  video: null,
  canvas: null,
  ctx: null,
  scanning: false,
  animationId: null,
}

/**
 * Check if camera permission is granted
 */
export async function checkCameraPermission(): Promise<PermissionState> {
  try {
    // Chrome extension context may not have permissions API
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
      return result.state
    }
    // Fallback: try to enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices()
    const hasCamera = devices.some((d) => d.kind === 'videoinput')
    return hasCamera ? 'prompt' : 'denied'
  } catch {
    return 'prompt'
  }
}

/**
 * Request camera permission and start video stream
 * AC2: Camera permission request
 */
export async function requestCameraAccess(): Promise<MediaStream> {
  // Check if getUserMedia is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera access is not supported in this browser')
  }

  try {
    // Request camera with back camera preference for scanning
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // Prefer back camera
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
    return stream
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera permission denied. Please allow camera access to scan QR codes.')
      }
      if (error.name === 'NotFoundError') {
        throw new Error('No camera found. Please connect a camera to scan QR codes.')
      }
      if (error.name === 'NotReadableError') {
        throw new Error(
          'Camera is in use by another application. Please close other apps using the camera.'
        )
      }
    }
    throw new Error('Failed to access camera. Please try again.')
  }
}

/**
 * Initialize camera for QR scanning
 * Returns video element for display
 */
export async function initializeCamera(
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement
): Promise<void> {
  // Stop any existing stream
  stopCamera()

  const stream = await requestCameraAccess()

  // Set up video element
  videoElement.srcObject = stream
  videoElement.setAttribute('playsinline', 'true') // iOS requirement
  await videoElement.play()

  // Set up canvas for frame capture
  const ctx = canvasElement.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Update canvas size to match video
  canvasElement.width = videoElement.videoWidth
  canvasElement.height = videoElement.videoHeight

  // Store state
  cameraState = {
    stream,
    video: videoElement,
    canvas: canvasElement,
    ctx,
    scanning: false,
    animationId: null,
  }
}

/**
 * Start scanning for QR codes
 * AC3: QR code auto-decode
 * @param onDetected - Callback when QR code is detected
 */
export function startScanning(onDetected: (data: string) => void): void {
  if (!cameraState.video || !cameraState.canvas || !cameraState.ctx) {
    throw new Error('Camera not initialized. Call initializeCamera first.')
  }

  cameraState.scanning = true

  const scanFrame = (): void => {
    if (!cameraState.scanning) return

    const { video, canvas, ctx } = cameraState
    if (!video || !canvas || !ctx) return

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data for QR detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Attempt to decode QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code && code.data) {
      // QR code detected!
      cameraState.scanning = false
      onDetected(code.data)
    } else {
      // Continue scanning
      cameraState.animationId = requestAnimationFrame(scanFrame)
    }
  }

  // Start scanning loop
  scanFrame()
}

/**
 * Stop QR scanning
 */
export function stopScanning(): void {
  cameraState.scanning = false
  if (cameraState.animationId !== null) {
    cancelAnimationFrame(cameraState.animationId)
    cameraState.animationId = null
  }
}

/**
 * Stop camera and release resources
 */
export function stopCamera(): void {
  stopScanning()

  if (cameraState.stream) {
    cameraState.stream.getTracks().forEach((track) => track.stop())
    cameraState.stream = null
  }

  if (cameraState.video) {
    cameraState.video.srcObject = null
  }

  cameraState = {
    stream: null,
    video: null,
    canvas: null,
    ctx: null,
    scanning: false,
    animationId: null,
  }
}

/**
 * Validate enrollment payload from QR code
 * AC4: Payload validation
 * AC5: Expired token handling
 */
export function validateEnrollmentPayload(data: string): ValidationResult {
  // Try to parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return {
      valid: false,
      errorCode: 'INVALID_JSON',
      errorMessage: 'Invalid code - please try again',
    }
  }

  // Check if it's an object
  if (typeof parsed !== 'object' || parsed === null) {
    return {
      valid: false,
      errorCode: 'INVALID_JSON',
      errorMessage: 'Invalid code - please try again',
    }
  }

  const payload = parsed as Record<string, unknown>

  // Validate required fields
  if (
    typeof payload.familyId !== 'string' ||
    typeof payload.token !== 'string' ||
    typeof payload.expiry !== 'number' ||
    typeof payload.version !== 'number'
  ) {
    return {
      valid: false,
      errorCode: 'MISSING_FIELDS',
      errorMessage: 'Invalid code - missing required fields',
    }
  }

  // Check for empty strings
  if (!payload.familyId || !payload.token) {
    return {
      valid: false,
      errorCode: 'MISSING_FIELDS',
      errorMessage: 'Invalid code - missing required fields',
    }
  }

  // Check version compatibility
  if (payload.version !== SUPPORTED_VERSION) {
    return {
      valid: false,
      errorCode: 'UNSUPPORTED_VERSION',
      errorMessage: 'This code was generated by a newer version. Please update your extension.',
    }
  }

  // Check expiry (AC5)
  const now = Date.now()
  if (payload.expiry < now) {
    return {
      valid: false,
      errorCode: 'EXPIRED_TOKEN',
      errorMessage: 'Code expired - generate a new one from the dashboard',
    }
  }

  // All validations passed
  return {
    valid: true,
    payload: {
      familyId: payload.familyId,
      token: payload.token,
      expiry: payload.expiry,
      version: payload.version,
    },
  }
}

/**
 * Format time remaining until expiry
 */
export function formatTimeRemaining(expiryTimestamp: number): string {
  const remaining = expiryTimestamp - Date.now()
  if (remaining <= 0) return 'Expired'

  const totalSeconds = Math.floor(remaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
