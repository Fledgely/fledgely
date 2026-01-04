# Story 41.5: New Login Notifications

## Status: complete

## Story

As a **parent**,
I want **to be notified when new devices log in**,
So that **I'm aware of account activity (FR47, FR113, FR160)**.

## Acceptance Criteria

1. **AC1: New Login Detection**
   - Given new device or location logs in
   - When login detected from new context
   - Then notification: "New login from [Device/Location]"
   - And includes: device type, browser, approximate location
   - And "Wasn't you?" link to review sessions

2. **AC2: Trusted Device Management**
   - Given parent has logged in from a device
   - When viewing sessions
   - Then can mark device as "trusted"
   - And trusted devices do NOT trigger new login notifications
   - And trusted device list manageable in settings

3. **AC3: Fleeing Mode Suppression (FR160)**
   - Given fleeing mode is activated for family
   - When location-based login notification would be sent
   - Then location details are OMITTED from notification
   - And notification still shows "new device" without location
   - And prevents stalking via location change notifications

4. **AC4: Guardian Notification Symmetry (FR103)**
   - Given login occurs on any guardian account
   - When notification is sent
   - Then ALL guardians on account receive notification
   - And includes which guardian account was accessed
   - And follows co-parent notification symmetry pattern

5. **AC5: Security - Cannot Disable**
   - Given parent in notification preferences
   - When viewing login notification settings
   - Then login alerts CANNOT be disabled (security requirement)
   - And setting is visible but locked/grayed out
   - And explanation: "For your security, login alerts are always enabled"

6. **AC6: Device Fingerprinting**
   - Given user logs in
   - When determining if device is new
   - Then system generates device fingerprint from:
     - User agent string (browser, OS, device type)
     - Approximate IP geolocation (city-level only)
   - And fingerprint is privacy-preserving (no exact IP stored)
   - And fingerprint persists across sessions

## Tasks / Subtasks

### Task 1: Create Login Session Schemas (AC: #1, #6) [x]

Define schemas for login sessions and device tracking.

**Files:**

- `packages/shared/src/contracts/loginSession.ts` (new)
- `packages/shared/src/contracts/loginSession.test.ts` (new)

**Implementation:**

- Create `deviceFingerprintSchema`:
  - `id: string` (hash of fingerprint data)
  - `userAgent: string` (browser/OS string)
  - `deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'`
  - `browser: string` (parsed browser name)
  - `os: string` (parsed OS name)
  - `approximateLocation: string | null` (city/region, no exact IP)
  - `createdAt: number`
- Create `loginSessionSchema`:
  - `id: string`
  - `userId: string`
  - `familyId: string`
  - `fingerprint: deviceFingerprintSchema`
  - `isNewDevice: boolean`
  - `isTrusted: boolean`
  - `ipHash: string` (hashed IP for change detection, not stored directly)
  - `createdAt: number`
  - `lastSeenAt: number`
- Create `trustedDeviceSchema`:
  - `id: string`
  - `userId: string`
  - `fingerprintId: string`
  - `deviceName: string` (user-customizable)
  - `createdAt: number`
- Create helper functions: `parseUserAgent`, `generateFingerprintId`
- Export from contracts index

**Tests:** ~20 tests for schema validation and helper functions

### Task 2: Create Login Notification Schemas (AC: #1, #3) [x]

Define notification content schemas for login alerts.

**Files:**

- `packages/shared/src/contracts/loginNotification.ts` (new)
- `packages/shared/src/contracts/loginNotification.test.ts` (new)

**Implementation:**

- Create `loginNotificationEventSchema`:
  - `id: string`
  - `type: 'new_login'`
  - `userId: string`
  - `familyId: string`
  - `sessionId: string`
  - `deviceType: string`
  - `browser: string`
  - `approximateLocation: string | null`
  - `isFleeingMode: boolean` (controls location display)
  - `createdAt: number`
- Create `loginNotificationContentSchema`:
  - `title: string` ("New Login Detected")
  - `body: string` ("New login from {browser} on {deviceType}")
  - `data: { type, sessionId, familyId, action: 'review_sessions' }`
- Create `buildLoginNotificationContent(event, isFleeingMode)`:
  - If fleeing mode: omit location from body
  - Include "Wasn't you?" action prompt
- Export from contracts index

**Tests:** ~15 tests for schema validation and content builders

### Task 3: Create Login Session Tracking Service (AC: #1, #2, #6) [x]

Service to track login sessions and detect new devices.

**Files:**

- `apps/functions/src/lib/sessions/loginSessionTracker.ts` (new)
- `apps/functions/src/lib/sessions/loginSessionTracker.test.ts` (new)

**Implementation:**

- Create `trackLoginSession(params)`:
  - Parse user agent to extract device info
  - Generate fingerprint ID from device + IP hash
  - Check if fingerprint exists for user (trusted devices collection)
  - If new fingerprint: create session with `isNewDevice: true`
  - If known fingerprint: update `lastSeenAt`
  - Store session in `users/{userId}/sessions/{sessionId}`
  - Return `{ sessionId, isNewDevice, isTrusted }`
- Create `getTrustedDevices(userId)`:
  - Return all trusted device fingerprints for user
- Create `markDeviceAsTrusted(userId, fingerprintId, deviceName)`:
  - Add fingerprint to trusted devices collection
  - Store at `users/{userId}/trustedDevices/{fingerprintId}`
- Create `removeTrustedDevice(userId, fingerprintId)`:
  - Remove from trusted devices collection

**Tests:** ~18 tests for session tracking and trusted device management

### Task 4: Create Login Notification Service (AC: #1, #3, #4) [x]

Service to send login notifications.

**Files:**

- `apps/functions/src/lib/notifications/loginNotification.ts` (new)
- `apps/functions/src/lib/notifications/loginNotification.test.ts` (new)

**Implementation:**

- Create `sendNewLoginNotification(params)`:
  - Get user's family ID
  - Get all guardian UIDs from family (FR103 symmetry)
  - Check if family is in fleeing mode (FR160)
  - Build notification content (omit location if fleeing)
  - For each guardian:
    - Get FCM tokens
    - Send notification with "Wasn't you?" deep link
  - Record notification sent
  - Return `{ notificationGenerated, guardiansNotified }`
- Create `isDeviceKnown(userId, fingerprintId)`:
  - Check trusted devices collection
  - Return true if device is trusted
- Use existing pattern from `sendStatusNotification.ts`

**Tests:** ~20 tests for notification sending and fleeing mode

### Task 5: Create Auth Login Trigger (AC: #1, #4) [x]

Firestore/Auth trigger to detect new logins.

**Files:**

- `apps/functions/src/triggers/onUserLogin.ts` (new)
- `apps/functions/src/triggers/onUserLogin.test.ts` (new)

**Implementation:**

- Create Firebase Auth blocking function `beforeSignIn`:
  - Extract user agent and IP from request context
  - Track login session via loginSessionTracker
  - If new device detected: queue notification
  - Return allowing sign-in (non-blocking notification)
- Alternatively, use HTTPS callable for session tracking:
  - Called from web app after successful sign-in
  - More reliable access to device info
- Track login event regardless of notification

**Tests:** ~12 tests for auth trigger

### Task 6: Create Trusted Device Management Callable (AC: #2) [x]

Callable functions to manage trusted devices.

**Files:**

- `apps/functions/src/callable/manageTrustedDevices.ts` (new)
- `apps/functions/src/callable/manageTrustedDevices.test.ts` (new)

**Implementation:**

- Create `getTrustedDevices` callable:
  - Return user's trusted devices list
- Create `addTrustedDevice` callable:
  - Mark current device as trusted
  - Optional custom device name
- Create `removeTrustedDevice` callable:
  - Remove device from trusted list
- Input/output schemas with Zod validation

**Tests:** ~10 tests for callable functions

### Task 7: Update Notification Exports (AC: All) [x]

Export new login notification services.

**Files:**

- `apps/functions/src/lib/notifications/index.ts` (modify)
- `apps/functions/src/lib/sessions/index.ts` (new)
- `apps/functions/src/index.ts` (modify)
- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/index.ts` (modify)

**Implementation:**

- Export loginNotification functions
- Export loginSessionTracker functions
- Export loginSession and loginNotification schemas
- Register auth trigger and callables in index.ts

**Tests:** No additional tests (export verification)

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/shared (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Notifications:** Firebase Cloud Messaging (FCM)
- **Auth:** Firebase Auth with blocking functions or HTTPS callable approach

### Architecture Compliance

**From Architecture Document:**

- Auth blocking functions for login interception
- Per-user session tracking in Firestore subcollections
- Per-family notification symmetry (all guardians notified)
- Privacy-preserving device fingerprinting (no exact IP storage)

**Key Patterns to Follow:**

- `sendStatusNotification.ts` - FCM sending pattern with guardian token fetch
- `deviceSyncNotification.ts` - Notification service structure
- `locationSettings.ts` - Fleeing mode detection pattern
- `isInQuietHours()` - Note: Login alerts BYPASS quiet hours (security)

### Existing Infrastructure to Leverage

**From Story 41.1 (Notification Preferences):**

- `parentNotificationPreferencesSchema` - Note: login alerts always enabled
- FCM token management infrastructure
- Notification token cleanup on failure

**From Story 41.4 (Device Sync Notifications):**

- Quiet hours bypass pattern for critical notifications
- Guardian notification loop pattern

**From Story 40.3 (Fleeing Mode):**

- `isFleeingMode` flag check pattern
- Location suppression in notifications
- `disableLocationFeatures` with fleeing mode handling

### Data Model

```typescript
// Device fingerprint for login tracking
// Path: users/{userId}/deviceFingerprints/{fingerprintId}
interface DeviceFingerprint {
  id: string
  userAgent: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser: string
  os: string
  approximateLocation: string | null // city-level, no exact IP
  createdAt: number
}

// Login session record
// Path: users/{userId}/sessions/{sessionId}
interface LoginSession {
  id: string
  userId: string
  familyId: string
  fingerprintId: string
  isNewDevice: boolean
  isTrusted: boolean
  ipHash: string // hashed for change detection
  createdAt: number
  lastSeenAt: number
}

// Trusted device record
// Path: users/{userId}/trustedDevices/{fingerprintId}
interface TrustedDevice {
  id: string
  userId: string
  fingerprintId: string
  deviceName: string
  createdAt: number
}
```

### File Structure

```
packages/shared/src/contracts/
├── loginSession.ts               # NEW - Session/fingerprint schemas
├── loginSession.test.ts          # NEW
├── loginNotification.ts          # NEW - Notification schemas
├── loginNotification.test.ts     # NEW
└── index.ts                      # MODIFY - exports

apps/functions/src/lib/sessions/
├── loginSessionTracker.ts        # NEW - Session tracking
├── loginSessionTracker.test.ts   # NEW
└── index.ts                      # NEW - exports

apps/functions/src/lib/notifications/
├── loginNotification.ts          # NEW - Notification service
├── loginNotification.test.ts     # NEW
└── index.ts                      # MODIFY - exports

apps/functions/src/triggers/
├── onUserLogin.ts                # NEW - Auth trigger
└── onUserLogin.test.ts           # NEW

apps/functions/src/callable/
├── manageTrustedDevices.ts       # NEW - Device management
└── manageTrustedDevices.test.ts  # NEW
```

### Testing Requirements

- Unit test all schemas with edge cases
- Unit test session tracking with mock Firestore
- Unit test notification service with mocked FCM
- Test fleeing mode location suppression
- Test guardian notification symmetry (all guardians notified)
- Test trusted device management
- Test new device detection logic
- Test login alerts cannot be disabled

### NFR References

- FR47: Caregiver receives only permitted notifications based on trust level
- FR103: Co-parent notification symmetry
- FR113: All family members receive login alerts when any account is accessed
- FR160: Parent receives alert when account is accessed from new location
- FR160 modification: Location alerts disabled during fleeing mode

### Notification Messages

```typescript
// New login notification
title: 'New Login Detected'
body: 'New login from {browser} on {deviceType}' // no location if fleeing mode
// With location (not fleeing):
body: 'New login from {browser} on {deviceType} near {city}'

// Action data
data: {
  type: 'new_login',
  sessionId: 'session-123',
  familyId: 'family-456',
  action: 'review_sessions'
}
```

### Privacy Considerations

- **No Exact IP Storage:** Only store hashed IP for change detection
- **City-Level Location Only:** Use IP geolocation for approximate city, not exact address
- **Fingerprint Hashing:** Generate consistent fingerprint ID from device characteristics
- **Data Minimization:** Only store what's needed for security notifications

### References

- [Source: docs/epics/epic-list.md#Story-41.5]
- [Source: docs/prd/functional-requirements.md#FR47]
- [Source: docs/prd/functional-requirements.md#FR113]
- [Source: docs/prd/functional-requirements.md#FR160]
- [Source: apps/functions/src/lib/notifications/sendStatusNotification.ts]
- [Source: apps/functions/src/callable/disableLocationFeatures.ts]

## Dev Agent Record

### Context Reference

- Epic: 41 (Notifications & Alerts)
- Story Key: 41-5-new-login-notifications
- Dependencies: Story 41.1 (Notification Preferences Configuration) - COMPLETE
- Dependencies: Story 40.3 (Fleeing Mode Safe Escape) - COMPLETE

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `packages/shared/src/contracts/loginSession.ts`
- `packages/shared/src/contracts/loginSession.test.ts`
- `packages/shared/src/contracts/loginNotification.ts`
- `packages/shared/src/contracts/loginNotification.test.ts`
- `apps/functions/src/lib/sessions/loginSessionTracker.ts`
- `apps/functions/src/lib/sessions/loginSessionTracker.test.ts`
- `apps/functions/src/lib/sessions/index.ts`
- `apps/functions/src/lib/notifications/loginNotification.ts`
- `apps/functions/src/lib/notifications/loginNotification.test.ts`
- `apps/functions/src/callable/trackLoginSession.ts`
- `apps/functions/src/callable/trackLoginSession.test.ts`
- `apps/functions/src/callable/manageTrustedDevices.ts`
- `apps/functions/src/callable/manageTrustedDevices.test.ts`

**Modified Files:**

- `packages/shared/src/contracts/index.ts`
- `packages/shared/src/index.ts`
- `apps/functions/src/lib/notifications/index.ts`
- `apps/functions/src/index.ts`

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2026-01-03 | Story created (ready-for-dev)          |
| 2026-01-03 | All tasks complete (127 tests passing) |
