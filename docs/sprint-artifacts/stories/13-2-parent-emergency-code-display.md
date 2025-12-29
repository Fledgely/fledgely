# Story 13.2: Parent Emergency Code Display

Status: done

## Story

As a **parent**,
I want **to view the current emergency unlock code for a device**,
So that **I can unlock a child's device when there's no internet**.

## Acceptance Criteria

1. **AC1: Show Emergency Code Button**
   - Given parent is viewing device details in dashboard
   - When parent clicks "Show Emergency Code"
   - Then re-authentication modal appears (password confirmation)
   - And code is not shown until re-authenticated

2. **AC2: TOTP Code Display**
   - Given parent has re-authenticated
   - When emergency code modal opens
   - Then current 6-digit TOTP code is displayed prominently
   - And code is generated from device's totpSecret using RFC 6238

3. **AC3: Countdown Timer**
   - Given emergency code is displayed
   - When viewing the code
   - Then countdown timer shows seconds until code expires
   - And timer counts down from 30 to 0 seconds

4. **AC4: Auto-Refresh**
   - Given countdown timer reaches 0
   - When new TOTP period begins
   - Then code auto-refreshes to new value
   - And countdown timer resets to 30 seconds

5. **AC5: Audit Trail Logging**
   - Given parent views emergency code
   - When code is displayed
   - Then audit event is logged to Firestore
   - And event includes: viewerUid, deviceId, timestamp

6. **AC6: Copy to Clipboard**
   - Given emergency code is displayed
   - When parent taps/clicks copy button
   - Then code is copied to clipboard
   - And visual confirmation is shown

## Tasks / Subtasks

- [x] Task 1: TOTP Utility for Web Dashboard (AC: #2, #3, #4)
  - [x] 1.1 Create `totp-utils.ts` in web app (port from extension)
  - [x] 1.2 Implement `generateTotpCode(secret: string): string`
  - [x] 1.3 Implement `getTotpRemainingSeconds(): number`
  - [x] 1.4 Add unit tests for TOTP generation

- [x] Task 2: Re-authentication Modal (AC: #1)
  - [x] 2.1 Create `ReauthModal` component using Firebase reauthentication
  - [x] 2.2 Support password provider re-auth
  - [x] 2.3 Support Google provider re-auth
  - [x] 2.4 Show error messages for failed re-auth
  - [x] 2.5 Add unit tests

- [x] Task 3: Emergency Code Display Component (AC: #2, #3, #4, #6)
  - [x] 3.1 Create `EmergencyCodeModal` component
  - [x] 3.2 Display 6-digit code with large font
  - [x] 3.3 Add countdown timer with visual progress
  - [x] 3.4 Implement auto-refresh when timer reaches 0
  - [x] 3.5 Add copy to clipboard functionality
  - [x] 3.6 Add unit tests

- [x] Task 4: Device Service Extension (AC: #2)
  - [x] 4.1 Add function to fetch device totpSecret from Firestore
  - [x] 4.2 Ensure only authenticated family guardians can access

- [x] Task 5: Audit Trail Logging (AC: #5)
  - [x] 5.1 Create `logEmergencyCodeView` function
  - [x] 5.2 Log to auditLogs collection with viewerUid, deviceId, timestamp
  - [x] 5.3 Add unit tests

- [x] Task 6: Integration in Device Details (AC: #1)
  - [x] 6.1 Add "Show Emergency Code" button to device card/details
  - [x] 6.2 Wire up re-auth → code display flow
  - [x] 6.3 Add E2E or integration tests

## Dev Notes

### Implementation Strategy

This story adds a parent-facing UI to view TOTP emergency codes for enrolled devices. The flow is:

1. Parent clicks "Show Emergency Code" on device details
2. Re-authentication modal prompts for password/Google re-auth
3. Upon success, emergency code modal shows current TOTP code
4. Code auto-refreshes every 30 seconds
5. Parent can copy code to clipboard
6. View event is logged to audit trail

### Key Requirements

- **FR90:** Offline OTP device unlock
- **NFR42:** Security - re-authentication before showing sensitive codes
- **NFR14:** Family data isolation - only family guardians can access

### Technical Details

#### TOTP Code Generation (same as extension)

```typescript
// Port from extension's totp-utils.ts
async function generateTotpCode(secret: string): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / 30)
  // HMAC-SHA1 with secret and counter
  // Dynamic truncation per RFC 4226
  // Return 6-digit padded code
}
```

#### Re-authentication Flow

```typescript
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'

// For password users
const credential = EmailAuthProvider.credential(user.email, password)
await reauthenticateWithCredential(user, credential)

// For Google users
const provider = new GoogleAuthProvider()
await reauthenticateWithPopup(user, provider)
```

#### Audit Log Structure

```typescript
{
  type: 'emergency_code_viewed',
  familyId: string,
  deviceId: string,
  viewerUid: string,
  timestamp: Timestamp,
}
```

### Project Structure Notes

- TOTP utils: `apps/web/src/lib/totp-utils.ts`
- ReauthModal: `apps/web/src/components/auth/ReauthModal.tsx`
- EmergencyCodeModal: `apps/web/src/components/devices/EmergencyCodeModal.tsx`
- Device service extension: `apps/web/src/services/deviceService.ts`

### References

- [Source: docs/epics/epic-list.md#Story-13.2]
- [Pattern: apps/extension/src/totp-utils.ts - TOTP implementation]
- [Pattern: apps/web/src/services/deviceService.ts - device service]
- [Pattern: apps/web/src/components/InviteCoParentModal.tsx - modal pattern]

### Previous Story Intelligence

From Story 13.1:

- TOTP secret stored in device document at `/families/{familyId}/devices/{deviceId}`
- Secret is Base32 encoded, 256-bit
- RFC 6238 compliant: 6 digits, 30 second period, SHA-1 HMAC
- Firestore rules allow guardian access to device documents

### Security Considerations

1. **Re-authentication required**: Must confirm identity before showing code
2. **Audit logging**: All code views are logged for transparency
3. **No caching**: Code is generated fresh each time, never cached
4. **Modal auto-close**: Close modal after inactivity to prevent shoulder surfing
