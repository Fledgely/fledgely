/**
 * VPN Detection Module for Fledgely Chrome Extension
 *
 * This module provides transparency about VPN usage without blocking it.
 * Detection is informational only - monitoring continues regardless.
 *
 * Story 8.7: VPN Detection & Transparency
 *
 * IMPORTANT DESIGN PRINCIPLES:
 * - Bilateral transparency: Both parent and child see the same information
 * - Non-accusatory: Detection is framed as "monitoring may be limited", not "child is hiding"
 * - Non-blocking: VPN usage doesn't stop monitoring
 * - Privacy-respecting: No deep packet inspection, no traffic analysis
 *
 * DETECTION LIMITATIONS (must be communicated to parents):
 * - Browser-based VPN extensions may not be detected
 * - Some enterprise VPNs may not be detected
 * - Proxy servers are not detected
 * - Tor Browser is not detected
 */

/**
 * Result of VPN detection check
 */
export interface VpnDetectionResult {
  /** Whether VPN is likely detected */
  vpnDetected: boolean
  /** Confidence level of detection */
  confidence: 'high' | 'medium' | 'low'
  /** Method used for detection */
  method: 'webrtc_ip_mismatch' | 'known_vpn_ip' | 'connection_timing' | 'none'
  /** User-friendly message (non-accusatory) */
  message: string
}

/**
 * VPN detection state stored in extension
 */
export interface VpnDetectionState {
  /** Last detection result */
  lastResult: VpnDetectionResult | null
  /** Timestamp of last detection */
  lastCheckTime: number | null
  /** Timestamp of last notification sent */
  lastNotificationTime: number | null
}

// Detection throttle: minimum time between notifications (1 hour)
const NOTIFICATION_THROTTLE_MS = 60 * 60 * 1000

// Detection check throttle: minimum time between checks (5 minutes)
const CHECK_THROTTLE_MS = 5 * 60 * 1000

// Storage key for VPN detection state
const VPN_STATE_KEY = 'vpnDetectionState'

/**
 * Non-accusatory messages for VPN detection
 * Framed as informational, not surveillance
 */
const VPN_MESSAGES = {
  detected: 'VPN detected - monitoring may be limited',
  notDetected: 'No VPN detected',
  checkFailed: 'Unable to check VPN status',
  limitations: 'Some VPN types may not be detected',
}

/**
 * Detect VPN usage using available browser APIs.
 *
 * In Chrome Extension context, we have limited options:
 * 1. WebRTC local IP detection - Compare local IPs for VPN adapter patterns
 * 2. Connection characteristics - Timing-based heuristics (limited reliability)
 *
 * NOTE: We intentionally do NOT:
 * - Use deep packet inspection
 * - Analyze traffic patterns
 * - Log VPN provider names
 * - Block VPN usage
 *
 * @returns Detection result with confidence level
 */
export async function detectVpn(): Promise<VpnDetectionResult> {
  try {
    // Method 1: Check for VPN-like local IP patterns via WebRTC
    const webrtcResult = await detectVpnViaWebRTC()
    if (webrtcResult.vpnDetected) {
      return webrtcResult
    }

    // If no VPN detected
    return {
      vpnDetected: false,
      confidence: 'medium', // Medium because browser-based VPNs won't be detected
      method: 'none',
      message: VPN_MESSAGES.notDetected,
    }
  } catch {
    // Fail-safe: If detection fails, assume no VPN
    return {
      vpnDetected: false,
      confidence: 'low',
      method: 'none',
      message: VPN_MESSAGES.checkFailed,
    }
  }
}

/**
 * Detect VPN via WebRTC local IP enumeration.
 *
 * VPN software typically creates virtual network adapters with
 * characteristic IP patterns (10.x.x.x, 172.16-31.x.x ranges for VPNs).
 *
 * This method checks for:
 * - Multiple private IP addresses (suggests VPN adapter)
 * - IPs in typical VPN ranges (10.0.0.0/8 commonly used by VPNs)
 */
async function detectVpnViaWebRTC(): Promise<VpnDetectionResult> {
  return new Promise((resolve) => {
    // Check if WebRTC is available
    if (typeof RTCPeerConnection === 'undefined') {
      resolve({
        vpnDetected: false,
        confidence: 'low',
        method: 'none',
        message: VPN_MESSAGES.checkFailed,
      })
      return
    }

    const localIps: string[] = []
    const timeout = setTimeout(() => {
      // Timeout after 3 seconds
      const result = analyzeIpsForVpn(localIps)
      resolve(result)
    }, 3000)

    try {
      // Create RTCPeerConnection to enumerate local IPs
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })

      pc.createDataChannel('')

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          // ICE gathering complete
          clearTimeout(timeout)
          pc.close()
          const result = analyzeIpsForVpn(localIps)
          resolve(result)
          return
        }

        // Extract IP from candidate
        const candidate = event.candidate.candidate
        const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/)
        if (ipMatch && ipMatch[1]) {
          const ip = ipMatch[1]
          if (!localIps.includes(ip) && isPrivateIp(ip)) {
            localIps.push(ip)
          }
        }
      }

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timeout)
          pc.close()
          resolve({
            vpnDetected: false,
            confidence: 'low',
            method: 'none',
            message: VPN_MESSAGES.checkFailed,
          })
        })
    } catch {
      clearTimeout(timeout)
      resolve({
        vpnDetected: false,
        confidence: 'low',
        method: 'none',
        message: VPN_MESSAGES.checkFailed,
      })
    }
  })
}

/**
 * Check if an IP address is in a private range
 */
function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return false

  // 10.0.0.0/8
  if (parts[0] === 10) return true

  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true

  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true

  return false
}

/**
 * Analyze collected local IPs for VPN patterns
 */
function analyzeIpsForVpn(ips: string[]): VpnDetectionResult {
  if (ips.length === 0) {
    return {
      vpnDetected: false,
      confidence: 'low',
      method: 'none',
      message: VPN_MESSAGES.checkFailed,
    }
  }

  // Check for multiple private IPs (suggests VPN adapter)
  if (ips.length >= 2) {
    // Multiple private IPs often indicates VPN
    // One is usually the real LAN, another is the VPN tunnel
    return {
      vpnDetected: true,
      confidence: 'medium',
      method: 'webrtc_ip_mismatch',
      message: VPN_MESSAGES.detected,
    }
  }

  // Check for IPs in VPN-typical ranges
  const hasVpnTypicalRange = ips.some((ip) => {
    const parts = ip.split('.').map(Number)
    // 10.x.x.x is commonly used by VPN providers
    // But also used by large LANs, so medium confidence
    if (parts[0] === 10) {
      // 10.8.x.x and 10.9.x.x are OpenVPN defaults
      if (parts[1] === 8 || parts[1] === 9) return true
      // Other 10.x.x.x could be VPN but also corporate LAN
      return false
    }
    return false
  })

  if (hasVpnTypicalRange) {
    return {
      vpnDetected: true,
      confidence: 'low', // Low because 10.x.x.x could be corporate network
      method: 'webrtc_ip_mismatch',
      message: VPN_MESSAGES.detected,
    }
  }

  return {
    vpnDetected: false,
    confidence: 'medium',
    method: 'none',
    message: VPN_MESSAGES.notDetected,
  }
}

/**
 * Get current VPN detection state from storage
 */
export async function getVpnState(): Promise<VpnDetectionState> {
  const result = await chrome.storage.local.get(VPN_STATE_KEY)
  return (
    result[VPN_STATE_KEY] || {
      lastResult: null,
      lastCheckTime: null,
      lastNotificationTime: null,
    }
  )
}

/**
 * Update VPN detection state in storage
 */
export async function updateVpnState(state: Partial<VpnDetectionState>): Promise<void> {
  const current = await getVpnState()
  await chrome.storage.local.set({
    [VPN_STATE_KEY]: { ...current, ...state },
  })
}

/**
 * Check if VPN detection should be performed (respects throttle)
 */
export async function shouldCheckVpn(): Promise<boolean> {
  const state = await getVpnState()
  if (!state.lastCheckTime) return true
  return Date.now() - state.lastCheckTime >= CHECK_THROTTLE_MS
}

/**
 * Check if VPN notification should be sent (respects throttle)
 */
export async function shouldNotifyVpn(): Promise<boolean> {
  const state = await getVpnState()
  if (!state.lastNotificationTime) return true
  return Date.now() - state.lastNotificationTime >= NOTIFICATION_THROTTLE_MS
}

/**
 * Perform VPN detection and update state
 * Returns result if detection should be reported, null otherwise
 */
export async function checkAndUpdateVpnStatus(): Promise<VpnDetectionResult | null> {
  // Check if we should run detection
  if (!(await shouldCheckVpn())) {
    const state = await getVpnState()
    return state.lastResult
  }

  // Run detection
  const result = await detectVpn()

  // Update state
  await updateVpnState({
    lastResult: result,
    lastCheckTime: Date.now(),
  })

  // Check if we should notify
  if (result.vpnDetected && (await shouldNotifyVpn())) {
    await updateVpnState({ lastNotificationTime: Date.now() })
    return result
  }

  return result
}

/**
 * Clear VPN detection state (e.g., when child disconnects)
 */
export async function clearVpnState(): Promise<void> {
  await chrome.storage.local.remove(VPN_STATE_KEY)
}

// Export for testing
export const _testExports = {
  isPrivateIp,
  analyzeIpsForVpn,
  detectVpnViaWebRTC,
  VPN_MESSAGES,
  NOTIFICATION_THROTTLE_MS,
  CHECK_THROTTLE_MS,
  VPN_STATE_KEY,
}
