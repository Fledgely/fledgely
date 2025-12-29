# Story 13.3: Device Offline Code Entry

Status: done

## Story

As a **child with a locked device**,
I want **to enter an emergency code when offline**,
So that **I can access my device in an emergency**.

## Acceptance Criteria

1. **AC1: Emergency Unlock Button**
   - Given device monitoring shows locked/restricted state
   - When child taps "Emergency Unlock"
   - Then numeric keypad appears for 6-digit code entry

2. **AC2: Local Code Validation**
   - Given child enters 6-digit code
   - When code is submitted
   - Then code is validated locally against stored TOTP secret
   - And validation uses RFC 6238 with ±1 period tolerance

3. **AC3: Valid Code Unlock**
   - Given valid code is entered
   - When validation succeeds
   - Then device unlocks immediately
   - And success message is displayed

4. **AC4: Invalid Code Error**
   - Given invalid code is entered
   - When validation fails
   - Then error is shown with remaining attempts
   - And code entry can be retried

5. **AC5: Unlock Event Queuing**
   - Given successful unlock occurs
   - When device is offline
   - Then unlock event is queued for sync
   - And event includes: deviceId, timestamp, unlockType

6. **AC6: Offline Functionality**
   - Given extension is operating offline
   - When emergency unlock is attempted
   - Then entry UI works without network
   - And validation works without network

## Tasks / Subtasks

- [x] Task 1: Emergency Unlock UI Component (AC: #1)
  - [x] 1.1 Create `emergency-unlock.html` and `emergency-unlock.ts`
  - [x] 1.2 Implement 6-digit numeric input with keypad
  - [x] 1.3 Add "Emergency Unlock" button to trigger UI
  - [x] 1.4 Style for accessibility and visibility

- [x] Task 2: Code Entry Interface (AC: #1, #4)
  - [x] 2.1 Build numeric keypad component
  - [x] 2.2 Show masked code display (asterisks)
  - [x] 2.3 Display remaining attempts counter
  - [x] 2.4 Add clear/backspace functionality

- [x] Task 3: Local TOTP Validation (AC: #2, #6)
  - [x] 3.1 Integrate with existing verifyTotpCode from totp-utils.ts
  - [x] 3.2 Retrieve decrypted secret via GET_TOTP_SECRET message
  - [x] 3.3 Validate code with ±1 period tolerance
  - [x] 3.4 Works offline without network

- [x] Task 4: Unlock Success Flow (AC: #3, #5)
  - [x] 4.1 Trigger device unlock on valid code
  - [x] 4.2 Display success confirmation
  - [x] 4.3 Queue unlock event for later sync
  - [x] 4.4 Auto-close unlock UI after success

- [x] Task 5: Error Handling (AC: #4)
  - [x] 5.1 Show error message for invalid code
  - [x] 5.2 Track and display remaining attempts
  - [x] 5.3 Handle edge cases (no secret)

- [x] Task 6: Event Queuing for Sync (AC: #5)
  - [x] 6.1 Create unlockEventQueue in chrome.storage.local
  - [x] 6.2 Add emergency_unlock event type
  - [x] 6.3 Include deviceId, timestamp, unlockType in event
  - [x] 6.4 Queue persisted for sync when online

- [x] Task 7: Unit Tests (AC: #1-6)
  - [x] 7.1 Test numeric keypad input logic
  - [x] 7.2 Test code validation integration
  - [x] 7.3 Test unlock event structure
  - [x] 7.4 Test error handling and attempts
  - [x] 7.5 Test event queuing structure
  - [x] 7.6 Test offline validation

## Dev Notes

### Implementation Strategy

This story adds the child-facing emergency unlock UI to the Chrome extension. When a device is in a locked/restricted state (future blocking stories), the child can tap "Emergency Unlock" to enter a 6-digit TOTP code that their parent provides.

The flow:

1. Child sees "Emergency Unlock" option on blocked screen
2. Child taps to open numeric keypad
3. Child enters 6-digit code from parent
4. Extension validates code locally against stored TOTP secret
5. Valid code unlocks device, invalid code shows error
6. Unlock event queued for sync when online

### Key Requirements

- **FR90:** Offline OTP device unlock
- **NFR87:** 72-hour offline operation - unlocks work without network
- **NFR42:** Security - local validation, brute force protection (Story 13.4)

### Technical Details

#### Emergency Unlock UI Page

```typescript
// apps/extension/src/emergency-unlock.tsx
// Standalone page for emergency code entry
// Can be opened from popup or blocking screen

interface EmergencyUnlockProps {
  onSuccess: () => void
  onCancel: () => void
}
```

#### Code Entry Component

```typescript
// NumericKeypad component for code entry
interface NumericKeypadProps {
  value: string
  onChange: (value: string) => void
  maxLength: number
  disabled?: boolean
}
```

#### Unlock Event Structure

```typescript
interface UnlockEvent {
  type: 'emergency_unlock'
  deviceId: string
  timestamp: number
  unlockType: 'totp'
  // Note: code itself is NEVER stored or transmitted
}
```

#### Integration with TOTP Utils

```typescript
import { verifyTotpCode } from './totp-utils'
import { getTotpSecret } from './background'

async function validateEmergencyCode(code: string): Promise<boolean> {
  const secret = await getTotpSecret()
  if (!secret) return false
  return verifyTotpCode(secret, code)
}
```

### Project Structure Notes

- Emergency unlock page: `apps/extension/src/emergency-unlock.tsx`
- Emergency unlock HTML: `apps/extension/emergency-unlock.html`
- Update manifest for new page
- TOTP utils already exist: `apps/extension/src/totp-utils.ts`
- Background has getTotpSecret: `apps/extension/src/background.ts`

### References

- [Source: docs/epics/epic-list.md#Story-13.3]
- [Pattern: apps/extension/src/totp-utils.ts - TOTP verification]
- [Pattern: apps/extension/src/background.ts - getTotpSecret()]
- [Pattern: apps/extension/popup.html - extension page structure]

### Previous Story Intelligence

From Story 13.1:

- TOTP secret stored encrypted in chrome.storage.local
- `getTotpSecret()` decrypts and returns secret
- `verifyTotpCode(secret, code)` validates with ±1 period tolerance
- RFC 6238 compliant: 6 digits, 30 second period

From Story 13.2:

- Web dashboard TOTP generation uses same algorithm
- Code format: 6 digits, displayed as "XXX XXX"
- Countdown timer shows validity window

### Security Considerations

1. **Local-only validation**: No network request needed for code validation
2. **Code not logged**: The actual code is NEVER stored or logged
3. **Event queue privacy**: Unlock events contain metadata only
4. **Brute force protection**: Story 13.4 adds attempt limiting (prepare for it)
