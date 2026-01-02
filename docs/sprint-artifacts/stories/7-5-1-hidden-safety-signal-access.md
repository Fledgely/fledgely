# Story 7.5.1: Hidden Safety Signal Access

## Status: done

## Story

As a **child in distress**,
I want **a hidden but accessible way to signal that I need help**,
So that **I can reach out even if someone is watching my screen**.

## Acceptance Criteria

1. **AC1: Hidden gesture/code available**
   - Given a child is using any fledgely screen (app, dashboard, or monitored browser)
   - When they need to signal for help
   - Then a hidden gesture/code is available (tap logo 5x, keyboard shortcut Ctrl+Shift+H)
   - And the gesture is documented in child's protected resources view (Epic 7.3)

2. **AC2: No visible UI change**
   - Given a child triggers the safety signal gesture
   - When the gesture is detected
   - Then no visible UI change occurs that a casual observer would notice
   - And the screen continues to display normally

3. **AC3: Works offline**
   - Given a child is offline
   - When they trigger the safety signal
   - Then the signal is queued locally for delivery
   - And delivery occurs automatically when connectivity is restored

4. **AC4: Cannot be accidentally triggered**
   - Given a child is using fledgely normally
   - When they interact with the UI
   - Then the gesture cannot be triggered accidentally
   - And the pattern requires intentional sequential actions

5. **AC5: Consistent across platforms**
   - Given fledgely operates on multiple platforms (web, Chrome extension, Android)
   - When a child needs to signal
   - Then the gesture pattern is consistent across all platforms
   - And documentation is platform-appropriate

6. **AC6: Signal queuing infrastructure**
   - Given a safety signal is triggered
   - When the signal is created
   - Then it is stored in an isolated collection inaccessible to family
   - And signal metadata includes: childId, timestamp, deviceId, offlineQueued flag

## Technical Tasks

### Task 1: Create SafetySignal Data Model (AC: #6)

Create Zod schemas and types for safety signals.

**Files:**

- `packages/shared/src/contracts/safetySignal.ts` (new)
- `packages/shared/src/contracts/safetySignal.test.ts` (new)

**Types:**

```typescript
type SignalStatus = 'queued' | 'pending' | 'sent' | 'delivered' | 'acknowledged'

interface SafetySignal {
  id: string
  childId: string
  familyId: string // For routing, not family visibility
  deviceId: string | null
  triggeredAt: Date
  offlineQueued: boolean
  deliveredAt: Date | null
  status: SignalStatus
  // NO parent-identifying data
  // NO screenshots or activity data
}

interface SafetySignalTriggerEvent {
  id: string
  signalId: string
  childId: string
  triggerMethod: 'logo_tap' | 'keyboard_shortcut' | 'swipe_pattern'
  platform: 'web' | 'chrome_extension' | 'android'
  timestamp: Date
}

// Constants
const LOGO_TAP_COUNT = 5
const LOGO_TAP_WINDOW_MS = 3000 // 5 taps within 3 seconds
const KEYBOARD_SHORTCUT = 'Ctrl+Shift+H'
```

**Tests:** 25+ tests for schema validation, factory functions

### Task 2: SafetySignalService (AC: #3, #6)

Create service for managing safety signals with offline queuing.

**Files:**

- `packages/shared/src/services/safetySignalService.ts` (new)
- `packages/shared/src/services/safetySignalService.test.ts` (new)

**Functions:**

```typescript
// Create a new safety signal (queued locally if offline)
function createSafetySignal(
  childId: string,
  familyId: string,
  triggerMethod: TriggerMethod,
  platform: Platform,
  isOffline: boolean
): SafetySignal

// Queue signal for offline delivery
function queueOfflineSignal(signal: SafetySignal): void

// Process offline queue when connectivity restored
function processOfflineQueue(childId: string): SafetySignal[]

// Get pending signals for child (for retry/status)
function getPendingSignals(childId: string): SafetySignal[]

// Update signal status (internal use)
function updateSignalStatus(signalId: string, status: SignalStatus): SafetySignal

// For testing
function clearAllSignalData(): void
```

**Tests:** 20+ tests covering offline queuing, status transitions

### Task 3: SafetySignalGestureDetector Component (AC: #1, #4, #5)

Create component for detecting the hidden safety gesture.

**Files:**

- `apps/web/src/components/safety/SafetySignalGestureDetector.tsx` (new)
- `apps/web/src/components/safety/SafetySignalGestureDetector.test.tsx` (new)

**Implementation:**

```typescript
interface SafetySignalGestureDetectorProps {
  children: React.ReactNode
  logoRef: React.RefObject<HTMLElement>
  onSignalTriggered: () => void
  disabled?: boolean
}

// Detects:
// 1. Logo tap 5x within 3 seconds
// 2. Keyboard shortcut Ctrl+Shift+H
// 3. (Future: swipe pattern on mobile)
```

**Features:**

- Wraps any fledgely page/component
- Attaches click listener to logo element
- Tracks tap count with timestamp window
- Global keyboard listener for shortcut
- Debounces to prevent double-trigger
- NO visible feedback on gesture detection
- Logs trigger event (NOT to family audit)

**Tests:** 30+ tests for gesture detection, timing, false positive prevention

### Task 4: SafetySignalTriggerHandler (AC: #2, #3)

Create the handler that processes triggered signals invisibly.

**Files:**

- `apps/web/src/hooks/useSafetySignal.ts` (new)
- `apps/web/src/hooks/useSafetySignal.test.ts` (new)

**Hook:**

```typescript
interface UseSafetySignalOptions {
  childId: string
  familyId: string
  platform: Platform
}

interface UseSafetySignalReturn {
  triggerSignal: (method: TriggerMethod) => Promise<void>
  isPending: boolean
  offlineQueueCount: number
}

function useSafetySignal(options: UseSafetySignalOptions): UseSafetySignalReturn
```

**Behavior:**

- Creates signal in isolated collection
- NO UI feedback (critical for safety)
- Queues if offline (uses service worker/local storage)
- Syncs when online
- NO notification to any family member

**Tests:** 15+ tests

### Task 5: Update CrisisAllowlistView with Signal Documentation (AC: #1)

Add safety signal instructions to the child's protected resources view.

**Files:**

- `apps/web/src/components/crisis/CrisisAllowlistView.tsx` (modify)
- `apps/web/src/components/crisis/__tests__/CrisisAllowlistView.test.tsx` (modify)

**Additions:**

- Add "Secret Help Button" section at TOP of allowlist view
- Instructions: "Tap the Fledgely logo 5 times quickly to send a silent help signal"
- Alternative: "Or press Ctrl+Shift+H on keyboard"
- Reassurance: "No one will see that you did this. Help will reach out to you."
- Visual demonstration (animated hint)

**Tests:** 5+ tests for signal documentation display

### Task 6: Chrome Extension Integration (AC: #5)

Add safety signal detection to Chrome extension content script.

**Files:**

- `apps/chrome-extension/src/content/safetySignal.ts` (new)
- `apps/chrome-extension/src/content/safetySignal.test.ts` (new)

**Implementation:**

- Keyboard shortcut listener (Ctrl+Shift+H)
- Logo tap detection (if Fledgely UI visible)
- Message to background script for signal creation
- Offline queue in extension storage

**Tests:** 15+ tests

### Task 7: Firestore Security Rules for Signal Isolation (AC: #6)

Add security rules ensuring signals are never visible to family.

**Files:**

- `packages/firebase-rules/firestore.rules` (modify)

**Rules:**

```
match /safetySignals/{signalId} {
  // NEVER allow family member read
  allow read: if false;

  // Only child can create their own signal
  allow create: if request.auth != null &&
    request.resource.data.childId == request.auth.uid;

  // Only system/admin can update
  allow update: if false;

  // NEVER allow delete from client
  allow delete: if false;
}
```

**Tests:** 10+ adversarial security rule tests

### Task 8: Integration Tests (AC: All)

Create integration tests for complete signal flow.

**Files:**

- `apps/web/src/components/safety/__tests__/safetySignal.integration.test.tsx` (new)

**Test Scenarios:**

1. Logo tap 5x triggers signal creation
2. Keyboard shortcut triggers signal creation
3. 4 taps do NOT trigger (false positive prevention)
4. Rapid taps within window trigger, outside window don't
5. Offline signal is queued
6. Online signal is sent immediately
7. Offline queue syncs when online
8. NO visible UI change on trigger
9. Signal not visible in family queries
10. Signal visible only to child (for status check)
11. Instructions shown in protected resources view
12. Chrome extension integration works

**Tests:** 20+ integration tests

## Dev Notes

### Critical Safety Requirements

**NEVER:**

- Show any visible feedback when signal is triggered
- Log signal to family audit trail
- Send any notification to any family member
- Include parent contact info in signal data
- Expose signal data in any family-visible query

**ALWAYS:**

- Route signal to external crisis partnership (Story 7.5.2)
- Encrypt signal in transit and at rest
- Maintain 48-hour family notification blackout (Story 7.5.7)
- Store in isolated collection with strict security rules

### Relationship to Epic 0.5 Patterns

This story follows Epic 0.5 (Safe Account Escape) patterns:

- **Isolated Collection**: Like `stealthQueueEntries`, signals stored separately
- **No Family Audit**: Like escape actions, signals bypass family audit
- **Admin Audit Only**: Signal creation logged to admin audit (not family)
- **Security Rules**: Block ALL family access (same pattern as stealth queue)

### Relationship to Epic 7.3

Story 7.3 created `CrisisAllowlistView` which shows protected resources. This story:

- ADDS signal instructions to that view
- Uses same privacy messaging patterns ("No one will see")
- Follows same 6th-grade reading level (NFR65)
- Maintains same accessibility standards (WCAG 2.1 AA)

### Gesture Design Rationale

**Logo Tap 5x (Primary):**

- Natural interaction (tapping logo)
- Unlikely to be accidental (5 rapid taps)
- Works on touch and mouse
- Consistent across platforms

**Keyboard Shortcut Ctrl+Shift+H (Secondary):**

- Quick for keyboard users
- H for "Help"
- Requires 3-key chord (unlikely accidental)
- Works on all platforms with keyboards

**Timing Window (3 seconds):**

- Long enough for intentional 5 taps
- Short enough to prevent accidental accumulation
- Resets after window expires

### Offline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Child Triggers Signal                      │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │ Online          │         │ Offline         │
    └─────────────────┘         └─────────────────┘
              │                           │
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │ Create in       │         │ Queue in        │
    │ Firestore       │         │ LocalStorage    │
    └─────────────────┘         └─────────────────┘
              │                           │
              │                           ▼
              │                 ┌─────────────────┐
              │                 │ On Reconnect:   │
              │                 │ Sync to         │
              │                 │ Firestore       │
              │                 └─────────────────┘
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Signal in Firestore (safetySignals collection)             │
│  Story 7.5.2 routes to external crisis partnership          │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure Notes

**Files to Create:**

- `packages/shared/src/contracts/safetySignal.ts`
- `packages/shared/src/contracts/safetySignal.test.ts`
- `packages/shared/src/services/safetySignalService.ts`
- `packages/shared/src/services/safetySignalService.test.ts`
- `apps/web/src/components/safety/SafetySignalGestureDetector.tsx`
- `apps/web/src/components/safety/SafetySignalGestureDetector.test.tsx`
- `apps/web/src/components/safety/index.ts`
- `apps/web/src/hooks/useSafetySignal.ts`
- `apps/web/src/hooks/useSafetySignal.test.ts`
- `apps/chrome-extension/src/content/safetySignal.ts`
- `apps/chrome-extension/src/content/safetySignal.test.ts`

**Files to Modify:**

- `apps/web/src/components/crisis/CrisisAllowlistView.tsx`
- `apps/web/src/components/crisis/__tests__/CrisisAllowlistView.test.tsx`
- `packages/shared/src/contracts/index.ts`
- `packages/shared/src/index.ts`
- `packages/firebase-rules/firestore.rules`

### Testing Standards

- TDD approach: Write tests first
- Minimum 140 tests across all tasks
- Unit tests for each service function
- Component tests for gesture detection
- Integration tests for complete flow
- Adversarial security rule tests

### Dependencies

- **Story 7.3:** CrisisAllowlistView (completed) - add signal documentation
- **Story 7.5.2:** External Signal Routing - routes signals to crisis partners
- **Story 7.5.6:** Signal Encryption & Isolation - full security implementation
- **Story 7.5.7:** 48-Hour Notification Blackout - family notification suppression

### References

- [Source: docs/epics/epic-list.md#Story-7.5.1 - Hidden Safety Signal Access]
- [Source: docs/sprint-artifacts/stories/7-3-child-allowlist-visibility.md - Protected resources UI patterns]
- [Source: docs/sprint-artifacts/stories/0-5-7-72-hour-notification-stealth.md - Stealth/isolation patterns]
- [Source: docs/architecture/project-structure-boundaries.md - File locations]
- [Source: NFR65 - 6th-grade reading level for child content]
- [Source: NFR42 - WCAG 2.1 AA accessibility]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List
