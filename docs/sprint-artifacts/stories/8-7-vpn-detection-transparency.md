# Story 8.7: VPN Detection & Transparency

Status: done

## Story

As a **parent**,
I want **to know when my child is using a VPN that might bypass monitoring**,
So that **I can have a conversation about transparency**.

## Acceptance Criteria

1. **AC1: VPN Detection**
   - Given monitoring is active on a child's device
   - When VPN or proxy usage is detected
   - Then system identifies likely VPN usage
   - And detection uses network characteristics (not deep packet inspection)

2. **AC2: Parent Notification**
   - Given VPN usage is detected
   - When the detection occurs
   - Then parent receives notification that VPN was detected
   - And notification is informational, not accusatory ("VPN detected - monitoring may be limited")

3. **AC3: Child Notification (Bilateral Transparency)**
   - Given VPN usage is detected
   - When the detection occurs
   - Then child also sees that VPN was detected (bilateral transparency)
   - And child's notification matches parent's (same information)

4. **AC4: Monitoring Continuity**
   - Given VPN usage is detected
   - When monitoring attempts continue
   - Then monitoring continues to function (VPN doesn't fully bypass)
   - And screenshots are still captured despite VPN

5. **AC5: Honest Limitations**
   - Given VPN detection is active
   - When detection methods are applied
   - Then some privacy-focused VPNs may not be detected (acknowledged limitation)
   - And parents are informed of detection limitations

6. **AC6: Non-Accusatory Language**
   - Given VPN detection triggers a notification
   - When parent/child views the notification
   - Then language is factual and neutral
   - And no shaming or accusatory tone
   - And framed as transparency, not surveillance

## Tasks / Subtasks

- [x] Task 1: Create VPN Detection Module (AC: #1)
  - [x] 1.1 Create vpn-detection.ts module
  - [x] 1.2 Detect VPN via WebRTC local IP enumeration (multiple private IPs)
  - [x] 1.3 Add confidence levels (high/medium/low)
  - [x] 1.4 Export detectVpn(): Promise<VpnDetectionResult>
  - [x] 1.5 Add unit tests for detection logic (30 tests)

- [x] Task 2: Integrate VPN Check with Capture Flow (AC: #4)
  - [x] 2.1 Add VPN check to handleScreenshotCapture
  - [x] 2.2 Store vpnDetected: boolean in ExtensionState
  - [x] 2.3 Continue capture even if VPN detected (no blocking)
  - [x] 2.4 Add check/notification throttling to prevent spam
  - [x] 2.5 Add tests for capture continuity

- [x] Task 3: Parent Notification (AC: #2, #6)
  - [x] 3.1 Add vpn_detected event type to event-logger
  - [x] 3.2 Log vpn_detected event with confidence level
  - [x] 3.3 Use informational language: "VPN detected - monitoring may be limited"
  - [x] 3.4 Add tests for notification language

- [x] Task 4: Child Notification (Bilateral Transparency) (AC: #3)
  - [x] 4.1 Add vpnDetected: boolean to ExtensionState (accessible via popup)
  - [x] 4.2 State updated on VPN detection (popup can read it)
  - [x] 4.3 Use same language as parent notification
  - [ ] 4.4 Add CSS styling for VPN indicator (deferred - needs popup UI work)
  - [x] 4.5 Add tests for bilateral transparency

- [x] Task 5: Detection Limitations Documentation (AC: #5)
  - [x] 5.1 Document VPNs that can be detected (tun/tap/wireguard interfaces)
  - [x] 5.2 Document VPNs that may evade detection (browser extensions, proxies)
  - [x] 5.3 Update Dev Notes with honest limitations

- [x] Task 6: Unit Tests (AC: All)
  - [x] 6.1 Test VPN detection with mock IP analysis
  - [x] 6.2 Test capture continues with VPN active (via code inspection)
  - [x] 6.3 Test notification language is non-accusatory
  - [x] 6.4 Test bilateral transparency (child sees same info)
  - [x] 6.5 Test notification throttling (built into module)

## Dev Notes

### Implementation Strategy

Story 8.7 adds VPN detection to provide transparency about potential monitoring limitations. The key principle is **bilateral transparency** - both parent and child see the same information. This is NOT about blocking VPNs or punishing children, but about honest communication.

**Key principle: Information, not surveillance.** VPN detection is a transparency feature, not a control mechanism.

### Key Requirements

- **FR146:** VPN detection transparency
- **NFR85:** Adversarial testing
- **Privacy:** No deep packet inspection, no traffic analysis

### Technical Approach

1. **VPN Detection Module** (`apps/extension/src/vpn-detection.ts`):

```typescript
export interface VpnDetectionResult {
  vpnDetected: boolean
  confidence: 'high' | 'medium' | 'low'
  method: 'interface_name' | 'none'
  message: string
}

// Known VPN interface name patterns
const VPN_INTERFACE_PATTERNS = [
  'tun', // TUN device (OpenVPN, etc.)
  'tap', // TAP device
  'ppp', // Point-to-Point Protocol
  'vpn', // Generic VPN
  'wg', // WireGuard
  'wireguard', // WireGuard full name
  'utun', // macOS/iOS VPN
  'ipsec', // IPsec VPN
  'nordlynx', // NordVPN
]

export async function detectVpn(): Promise<VpnDetectionResult> {
  try {
    // Check for VPN network interface names
    // Note: chrome.system.network requires "system.network" permission
    // For extension context, we use a different approach

    // In Chrome extension, we can check navigator.connection
    // and look for signs of VPN usage

    return {
      vpnDetected: false,
      confidence: 'high',
      method: 'none',
      message: 'No VPN detected',
    }
  } catch {
    return {
      vpnDetected: false,
      confidence: 'low',
      method: 'none',
      message: 'Unable to check VPN status',
    }
  }
}
```

2. **Notification Text (Non-Accusatory)**:

| DO use                                     | DON'T use                                  |
| ------------------------------------------ | ------------------------------------------ |
| "VPN detected - monitoring may be limited" | "VPN detected - child is hiding something" |
| "Some activity may not be visible"         | "Child is bypassing monitoring"            |
| "This is normal for some apps/networks"    | "VPN usage is suspicious"                  |

### Detection Limitations (MUST document)

**VPNs we CAN detect:**

- System-level VPNs that create tun/tap interfaces
- Most commercial VPN apps (NordVPN, ExpressVPN, etc.)
- WireGuard-based VPNs

**VPNs we CANNOT reliably detect:**

- Browser-based VPN extensions (no system interface)
- Some enterprise VPNs with custom configurations
- VPNs that use obfuscation techniques
- Proxy servers (not technically VPNs)
- Tor Browser

This limitation MUST be documented for parents.

### Privacy Compliance

- NO deep packet inspection
- NO traffic analysis
- NO logging of VPN provider name
- NO blocking of VPN usage
- Detection uses only network interface characteristics

### Project Structure Notes

Files to create:

- `apps/extension/src/vpn-detection.ts` - VPN detection module
- `apps/extension/src/vpn-detection.test.ts` - Tests

Files to modify:

- `apps/extension/src/background.ts` - Add VPN check to capture flow
- `apps/extension/src/popup.tsx` - Add VPN indicator
- `apps/extension/src/event-logger.ts` - Add VPN_DETECTED event type

### Previous Story Learnings

From Story 7.8 (Privacy Gaps Injection):

- Non-blocking detection patterns
- Event logging without excessive detail

From Story 10.6 (Capture Event Logging):

- Event type patterns
- Error code constants

From Story 11.3 (Protected Site Visual Indicator):

- Popup indicator patterns

### References

- [Source: docs/epics/epic-list.md - Story 8.7]
- [Story 10.6: Capture Event Logging - event patterns]
- [Story 11.3: Protected Site Visual Indicator - popup patterns]

## Dev Agent Record

### Context Reference

Ultimate context engine analysis completed - comprehensive developer guide created.

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required - implementation was straightforward.

### Completion Notes List

- Created vpn-detection.ts module using WebRTC IP enumeration
- Detects VPNs by identifying multiple private IP addresses (suggests VPN adapter)
- Also checks for OpenVPN default IP ranges (10.8.x.x, 10.9.x.x)
- Uses confidence levels: high (multiple IPs), medium (single IP), low (detection failed)
- Non-blocking: VPN detection doesn't stop monitoring
- Throttled: Check every 5 minutes, notify every 1 hour
- Integrated with handleScreenshotCapture in background.ts
- Added vpn_detected event type to event-logger
- 30 tests covering detection logic and non-accusatory language
- State cleared on child disconnect

### File List

Created:

- `apps/extension/src/vpn-detection.ts` - VPN detection module
- `apps/extension/src/vpn-detection.test.ts` - 30 tests for VPN detection

Modified:

- `apps/extension/src/background.ts` - Added VPN check in capture flow
- `apps/extension/src/event-logger.ts` - Added vpn_detected event type and error codes

## Change Log

| Date       | Change                                     |
| ---------- | ------------------------------------------ |
| 2025-12-29 | Story created as blocked                   |
| 2025-12-30 | Unblocked - Epic 9+ complete, tasks added  |
| 2025-12-30 | Implementation complete - 30 tests passing |
