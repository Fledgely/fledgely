# Story 7.5.3: Signal Confirmation & Resources

**Epic**: 7.5 - Child Safety Signal (Survivor Advocate)
**Status**: Done
**Priority**: Critical (Child Safety)

---

## User Story

As a **child who triggers a safety signal**,
I want **to see confirmation that help is coming and have immediate access to crisis resources**,
So that **I know my signal worked and can get help right away if I need it**.

---

## Acceptance Criteria

### AC1: Confirmation Shows When Signal Triggers
**Given** a child successfully triggers a safety signal
**When** the signal is processed
**Then** a discrete confirmation overlay appears
**And** confirmation is centered on screen with semi-transparent backdrop
**And** confirmation auto-dismisses after 10 seconds

### AC2: Confirmation Uses Child-Appropriate Language
**Given** the confirmation overlay is displayed
**When** reading the confirmation content
**Then** all text is at 6th-grade reading level or below
**And** language is calming and reassuring (not alarming)
**And** sentences are short (max 15 words average)

### AC3: Crisis Resources Displayed Immediately
**Given** the confirmation overlay is displayed
**When** a child views the confirmation
**Then** crisis resources are displayed (Crisis Text Line, 988, Childhelp)
**And** each resource shows action text (e.g., "Text HOME to 741741")
**And** each resource is tappable with appropriate href (tel:, sms:)

### AC4: Emergency 911 Button Available
**Given** the confirmation overlay is displayed
**When** a child needs immediate emergency help
**Then** a prominent 911 call button is displayed
**And** button confirms before dialing on desktop
**And** button calls directly on mobile devices

### AC5: Offline State Handled Gracefully
**Given** a signal was triggered while offline
**When** the confirmation overlay appears
**Then** message indicates signal is saved for later
**And** message reassures signal will be sent when online
**And** crisis resources are still immediately accessible

### AC6: Dismissible with Multiple Methods
**Given** the confirmation overlay is displayed
**When** a child wants to close it
**Then** tapping outside the panel dismisses it
**And** pressing ESC key dismisses it
**And** timeout auto-dismisses after configured duration
**And** interacting with resources extends the timeout

---

## Technical Implementation

### Task 1: Create Confirmation Content Schema ✅
- Created signalConfirmation.schema.ts with Zod schemas
- Defined CrisisResource type with text, phone, web, chat types
- Defined SignalConfirmationContent with messages and timeout config
- Added reading level validation functions
- **Tests**: 64 tests in signalConfirmation.schema.test.ts

### Tasks 2-6: Enhanced SafetySignalConfirmation Component ✅
- Rewrote SafetySignalConfirmation.tsx with crisis resources
- Added CrisisResourceLink sub-component with correct hrefs
- Added EmergencyCallButton with desktop confirmation
- Implemented auto-dismiss with configurable timeout (10s default)
- Added offline state handling with appropriate messaging
- Added fade animation for smooth dismissal
- Updated SafetySignalProvider.tsx to include isOffline in context
- Updated useSafetySignal.ts to track and expose isOffline state

### Task 7: Reading Level Validation ✅
- Implemented Flesch-Kincaid grade level estimation
- All default content validated at ≤6th grade level

### Task 8: Comprehensive Test Suite ✅
- Created SafetySignalConfirmation.test.tsx (49 tests)
- Created SafetySignalProvider.test.tsx (22 tests)
- Updated SafetySignalComponents.test.tsx for new API
- Updated SafetySignal.adversarial.test.tsx for new design
- **Total safety signal tests**: 122 passing

---

## Default Crisis Resources

| Resource | Type | Contact | Action |
|----------|------|---------|--------|
| Crisis Text Line | SMS | 741741 | Text HOME to 741741 |
| 988 Lifeline | Phone | 988 | Call or text 988 |
| Childhelp Hotline | Phone | 1-800-422-4453 | Call 1-800-422-4453 |

---

## Design Principles

1. **Calming over Alarming**: Soft colors, reassuring language
2. **Child-Appropriate**: 6th-grade reading level, short sentences
3. **Discrete**: Modal overlay that does not draw excessive attention
4. **Immediately Actionable**: Crisis resources are one tap away
5. **Accessible**: Proper ARIA roles, keyboard dismissible

---

## CRITICAL INVARIANT

**INV-002: Safety signals NEVER visible to family.**

This invariant protects the audit trail and family-visible logs - NOT the confirmation UI.
The confirmation is shown to the CHILD and intentionally provides crisis resources.

---

## Verification

All 122 safety signal component tests pass.
All 64 signal confirmation schema tests pass.
