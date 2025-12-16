# Story 7.5.1: Hidden Safety Signal Access

**Epic**: 7.5 - Child Safety Signal (Survivor Advocate)
**Status**: In Dev
**Priority**: Critical (Child Safety)

---

## User Story

As a **child in distress**,
I want **a hidden but accessible way to signal that I need help**,
So that **I can reach out even if someone is watching my screen**.

---

## Acceptance Criteria

### AC1: Hidden Gesture Available on All Screens
**Given** a child is using any fledgely screen (app, dashboard, or monitored browser)
**When** they need to signal for help
**Then** a hidden gesture/code is available (e.g., tap logo 5x, swipe pattern, keyboard shortcut)

### AC2: Gesture Documented in Protected Resources
**Given** a child has access to their protected resources view
**When** they view crisis resources (from Epic 7.3)
**Then** the safety signal gesture is documented clearly
**And** instructions are child-appropriate (6th-grade reading level)

### AC3: No Visible UI Change
**Given** a child triggers the safety signal gesture
**When** the gesture is recognized
**Then** no visible UI change occurs that a casual observer would notice
**And** the screen continues to display normally

### AC4: Offline Queue Support
**Given** a child triggers the safety signal while offline
**When** the device has no network connection
**Then** the signal is queued securely on-device
**And** signal is sent when connectivity is restored
**And** queue is encrypted and not accessible via device inspection

### AC5: Accidental Trigger Prevention
**Given** a child is using fledgely normally
**When** they interact with UI elements
**Then** normal usage cannot accidentally trigger the safety signal
**And** the gesture requires intentional, deliberate action
**And** gesture complexity prevents random activation

### AC6: Cross-Platform Consistency
**Given** the safety signal feature
**When** implemented across platforms (web, Chrome extension, Android, iOS)
**Then** the same gesture works on all platforms
**And** gesture recognition is consistent
**And** all platforms share the same queue and delivery mechanism

---

## Technical Tasks

### Task 1: Define Safety Signal Gesture Pattern
- [x] Design gesture that is hidden but accessible (tap logo 5x within 3 seconds)
- [x] Document alternative gestures for keyboard-only users (Shift+Ctrl+S 3x)
- [x] Create gesture recognition algorithm
- [x] Add Zod schema for SafetySignal in @fledgely/contracts
- [x] Define SafetySignalQueue schema for offline storage

### Task 2: Create Safety Signal Detection Hook
- [x] Create `useSafetySignal` hook in `apps/web/src/hooks/`
- [x] Implement tap pattern detection for logo component
- [x] Implement keyboard shortcut detection
- [x] Add debouncing to prevent accidental triggers
- [x] Track gesture progress without visible UI feedback

### Task 3: Create Safety Signal Queue Service
- [x] Create `SafetySignalQueueService` in `apps/web/src/services/`
- [x] Implement IndexedDB storage for offline queue (encrypted)
- [x] Implement queue processing on connectivity restoration
- [x] Create signal deduplication logic
- [x] Integrate with zero-data-path patterns from Epic 7

### Task 4: Create Safety Signal UI Components
- [x] Create `SafetySignalProvider` context wrapper
- [x] Integrate with existing Logo component (tap detection)
- [x] Create hidden keyboard shortcut listener
- [x] Ensure no visual feedback during gesture
- [x] Create discrete confirmation component (for AC3 - appears briefly then vanishes)

### Task 5: Add Protected Resources Documentation
- [x] Update child's protected resources view to include safety signal instructions
- [x] Write child-appropriate documentation (6th-grade level)
- [x] Add gesture illustration/animation for help view
- [x] Integrate with Crisis Allowlist child visibility (Epic 7.3)

### Task 6: Create Safety Signal Data Isolation
- [x] Create isolated Firestore collection for safety signals (NOT under family)
- [x] Implement separate encryption key system (not family key) - NOTE: MVP uses device-derived key; full encryption in Story 7.5.6
- [x] Create Firestore Security Rules blocking family access
- [x] Ensure signals don't appear in any family audit trail

### Task 7: Implement Cross-Platform Adapter
- [x] Create platform adapter interface for signal detection
- [x] Implement web platform adapter
- [x] Create mock adapters for Chrome, Android, iOS (full impl in later epics)
- [x] Ensure gesture consistency across adapters

### Task 8: Write Comprehensive Test Suite
- [x] Unit tests for gesture detection
- [x] Unit tests for signal queueing
- [x] Integration tests for end-to-end signal flow
- [x] Adversarial tests ensuring gesture doesn't leak
- [x] Accessibility tests for keyboard-only users
- [x] Cross-platform consistency tests

---

## Dev Notes

### Critical Safety Requirements

**INV-002: Safety signals NEVER visible to family**
- Safety signals must be stored in a separate Firestore collection (`/safety-signals`)
- Collection uses separate encryption, NOT family encryption keys
- No Firestore Security Rule may allow family member read access
- Signals must not appear in any family audit trail

**ZERO-DATA-PATH EXTENSION**
This feature extends the zero-data-path architecture from Epic 7:
- Signal detection happens synchronously BEFORE any logging
- Use same blocking pattern as crisis URL detection (Epic 7.2)
- Signal queue must use encrypted IndexedDB, separate from other app storage

### Architecture References

From Epic 7 implementation:
- **@fledgely/shared**: Crisis URL detection patterns to reuse
- **Zero-data-path pattern**: `packages/shared/src/testing/__tests__/zeroDataPath.test.ts`
- **Encrypted storage**: Follow pattern from crisis allowlist caching

### Gesture Design Rationale

**Why tap logo 5x?**
- Logo is present on all screens (consistent)
- Requires intentional rapid tapping (not accidental)
- Not visible to observer (no special menu/button)
- Works with touch and mouse

**Why keyboard Shift+Ctrl+S 3x?**
- Accessible for keyboard-only users
- Uncommon enough to prevent accidents
- Same 3-second window as tap pattern
- Works across all desktop platforms

### Offline Queue Requirements

Signal queue MUST:
1. Use encrypted IndexedDB (Web Crypto API)
2. Have its own encryption key (derived from device, not user)
3. Be processed ONLY on secure connection (HTTPS)
4. Be cleared on successful transmission
5. Retry with exponential backoff

### Firestore Structure

```
/safety-signals/{signalId}
  - childId: string (reference only, no family data)
  - timestamp: Timestamp
  - deviceType: 'web' | 'chrome' | 'android' | 'ios'
  - status: 'queued' | 'sent' | 'received' | 'acknowledged'
  - jurisdiction: string (state/country for routing)
  - encryptedPayload: bytes (additional context, encrypted)
```

### Security Rules (Pseudocode)

```javascript
match /safety-signals/{signalId} {
  // NO family member can read - ever
  allow read: if false;

  // Only the child's device can write (with device attestation)
  allow create: if request.auth != null
    && request.resource.data.childId == request.auth.uid
    && isValidSignalSchema(request.resource.data);

  // No updates or deletes from clients
  allow update, delete: if false;
}
```

### Testing Strategy

**Unit Tests:**
- Gesture detection timing
- Pattern recognition accuracy
- Queue encryption/decryption
- Signal schema validation

**Integration Tests:**
- Full flow: gesture → queue → process → send
- Offline → online transition
- Multiple signals queued

**Adversarial Tests:**
- Attempt to read signals from family account
- Attempt to infer signal from audit trail gaps
- Attempt to trigger via automation/scripting
- Timing attack resistance

---

## Dependencies

### Required (Before Implementation)
- Epic 7.3 (Child Allowlist Visibility) - DONE
- Epic 7.8 (Privacy Gaps Injection) - DONE
- Zero-data-path infrastructure (Epic 7.2) - DONE

### Provides (For Later Stories)
- Story 7.5.2 (External Signal Routing) - needs signal creation
- Story 7.5.3 (Signal Confirmation) - needs detection hook
- Story 7.5.6 (Signal Encryption) - builds on isolation here

---

## Accessibility Requirements

- Keyboard shortcut alternative for tap gesture
- Screen reader announcement for protected resources documentation
- High contrast visibility for documentation (when viewing)
- No flashing/animation that could cause seizures
- 6th-grade reading level for all child-facing text

---

## Out of Scope

- External routing to crisis partners (Story 7.5.2)
- Signal confirmation UI (Story 7.5.3)
- Safe adult designation (Story 7.5.4)
- Mandatory reporter pathway (Story 7.5.5)
- Full encryption system (Story 7.5.6)
- 48-hour notification blackout logic (Story 7.5.7)

---

## Definition of Done

- [x] All acceptance criteria verified
- [x] Unit tests passing (≥90% coverage for new code) - 155 tests passing
- [x] Integration tests passing
- [x] Adversarial tests passing (signal isolation verified) - 12 adversarial tests
- [x] Accessibility requirements met
- [x] No TypeScript errors
- [x] Code reviewed
- [x] Documentation updated
