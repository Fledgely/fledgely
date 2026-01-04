# Story 41.6: Notification Delivery Channels

## Status: done

## Story

As a **parent**,
I want **multiple ways to receive notifications**,
So that **I don't miss important alerts (FR113)**.

## Acceptance Criteria

1. **AC1: Push Notification Delivery**
   - Given notification needs to be delivered
   - When sent to parent
   - Then push notification sent via FCM (mobile app)
   - And delivery status logged
   - And failure triggers fallback to email

2. **AC2: Email Fallback for Missed Notifications**
   - Given push notification fails or is missed
   - When notification is critical
   - Then email sent to parent's verified email
   - And email includes notification content
   - And email includes link to view in app
   - And email includes unsubscribe link (except security alerts)

3. **AC3: Optional SMS for Critical Flags**
   - Given parent has verified phone number
   - When critical flag notification is triggered
   - And parent has opted in to SMS alerts
   - Then SMS sent with brief alert message
   - And SMS includes link to app

4. **AC4: Per-Notification-Type Channel Configuration**
   - Given parent opens notification settings
   - When configuring delivery channels
   - Then can set channels per notification type:
     - Critical flags: push + email + SMS (optional)
     - Time limit warnings: push + email
     - Device sync alerts: push only
     - Login alerts: push + email (mandatory, no disable)
   - And defaults are reasonable for each type

5. **AC5: Push-to-Email Fallback Logic**
   - Given push notification send is attempted
   - When push fails (no tokens, all stale, device offline)
   - Then escalate to email automatically
   - And log fallback reason
   - And email indicates: "You may have missed this notification"

6. **AC6: Email Unsubscribe Handling**
   - Given email notification is sent
   - When email is NOT a security alert
   - Then includes one-click unsubscribe link
   - And unsubscribe updates channel preferences
   - And unsubscribe is per-notification-type
   - Security alerts (login, password change) NEVER have unsubscribe

7. **AC7: Delivery Confirmation Logging**
   - Given any notification is sent
   - When delivery is attempted via any channel
   - Then log: timestamp, channel, status, userId, notificationType
   - And log includes failure reason if failed
   - And delivery logs are auditable

## Tasks / Subtasks

### Task 1: Create Delivery Channel Schemas (AC: #4, #7) [x]

Define schemas for notification delivery channel preferences and logging.

**Files:**

- `packages/shared/src/contracts/deliveryChannel.ts` (new)
- `packages/shared/src/contracts/deliveryChannel.test.ts` (new)

**Implementation:**

- Create `deliveryChannelSchema`:
  - `push: boolean` (default: true)
  - `email: boolean` (default: true for critical)
  - `sms: boolean` (default: false, requires phone verification)
- Create `notificationChannelPreferencesSchema`:
  - Per notification type channel settings
  - `criticalFlags: { push, email, sms }`
  - `timeLimitWarnings: { push, email }`
  - `deviceSyncAlerts: { push }`
  - `loginAlerts: { push: true, email: true }` (locked, no sms)
  - `flagDigest: { push, email }`
- Create `deliveryLogSchema`:
  - `id: string`
  - `notificationId: string`
  - `userId: string`
  - `familyId: string`
  - `notificationType: string`
  - `channel: 'push' | 'email' | 'sms'`
  - `status: 'sent' | 'delivered' | 'failed' | 'fallback'`
  - `failureReason?: string`
  - `fallbackChannel?: string`
  - `createdAt: number`
- Create `emailUnsubscribeTokenSchema`:
  - `token: string`
  - `userId: string`
  - `notificationType: string`
  - `createdAt: number`
  - `expiresAt: number`
- Export from contracts index

**Tests:** ~25 tests for schema validation

### Task 2: Create Email Service Infrastructure (AC: #2, #5, #6) [x]

Create email sending service with Resend integration.

**Files:**

- `apps/functions/src/lib/email/emailService.ts` (new)
- `apps/functions/src/lib/email/emailService.test.ts` (new)
- `apps/functions/src/lib/email/templates/index.ts` (new)
- `apps/functions/src/lib/email/templates/notificationEmail.ts` (new)

**Implementation:**

- Create `initializeEmailTransport()`:
  - Use nodemailer with SMTP configuration
  - Support environment-based configuration (SMTP_HOST, SMTP_PORT, etc.)
  - Fall back to console logging in development/test
- Create `sendNotificationEmail(params)`:
  - `to: string` (recipient email)
  - `subject: string`
  - `notificationType: string`
  - `content: { title, body, actionUrl }`
  - `includeUnsubscribe: boolean`
  - Generate unsubscribe token if needed
  - Send email via transport
  - Return delivery result
- Create `generateUnsubscribeUrl(userId, notificationType)`:
  - Create time-limited JWT token
  - Generate URL with token
- Create email templates:
  - `buildNotificationEmail(content, unsubscribeUrl?)`:
    - Clean, responsive HTML email
    - Fledgely branding
    - Clear call-to-action
    - Footer with unsubscribe link

**Tests:** ~20 tests with mocked transport

### Task 3: Create SMS Service Infrastructure (AC: #3) [x]

Create SMS sending service with Twilio integration.

**Files:**

- `apps/functions/src/lib/sms/smsService.ts` (new)
- `apps/functions/src/lib/sms/smsService.test.ts` (new)

**Implementation:**

- Create `initializeSmsClient()`:
  - Use Twilio client with environment configuration
  - Support TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
  - Fall back to console logging in development/test
- Create `sendSmsNotification(params)`:
  - `to: string` (recipient phone, E.164 format)
  - `message: string` (160 char max for single SMS)
  - `appUrl?: string` (optional short link)
  - Send SMS via Twilio
  - Return delivery result with message SID
- Create `formatPhoneNumber(phone)`:
  - Normalize to E.164 format
  - Validate phone number format
- Create `buildSmsMessage(notificationType, content)`:
  - Concise message for SMS constraints
  - Include app link for details

**Tests:** ~15 tests with mocked Twilio client

### Task 4: Create Delivery Channel Manager (AC: #1, #4, #5, #7) [x]

Orchestration service for multi-channel delivery with fallback.

**Files:**

- `apps/functions/src/lib/notifications/deliveryChannelManager.ts` (new)
- `apps/functions/src/lib/notifications/deliveryChannelManager.test.ts` (new)

**Implementation:**

- Create `getChannelPreferences(userId, notificationType)`:
  - Fetch user's notification channel preferences
  - Apply defaults if not configured
  - Handle locked channels (login alerts)
- Create `deliverNotification(params)`:
  - `userId: string`
  - `familyId: string`
  - `notificationType: string`
  - `content: { title, body, data }`
  - `priority: 'critical' | 'high' | 'normal'`
  - Get user's channel preferences
  - Attempt push delivery first
  - If push fails, fallback to email
  - If critical + SMS enabled, send SMS
  - Log all delivery attempts
  - Return comprehensive delivery result
- Create `handlePushFallback(userId, pushResult, content)`:
  - Check if fallback is needed
  - Determine fallback channel (email)
  - Send fallback notification
  - Log fallback event
- Create `logDeliveryAttempt(params)`:
  - Store delivery log in Firestore
  - Path: `users/{userId}/deliveryLogs/{logId}`
  - Include all AC7 required fields

**Tests:** ~30 tests for delivery logic and fallback

### Task 5: Create Unsubscribe Handler (AC: #6) [x]

Handle email unsubscribe requests.

**Files:**

- `apps/functions/src/callable/handleUnsubscribe.ts` (new)
- `apps/functions/src/callable/handleUnsubscribe.test.ts` (new)

**Implementation:**

- Create `handleUnsubscribeCallable`:
  - Accept unsubscribe token
  - Validate token (not expired, valid signature)
  - Extract userId and notificationType
  - Update channel preferences to disable email for that type
  - Return success/failure
- Create `validateUnsubscribeToken(token)`:
  - Verify JWT signature
  - Check expiration
  - Return decoded payload or throw
- Ensure security alerts cannot be unsubscribed:
  - Check notificationType against blocked list
  - Return error if blocked

**Tests:** ~12 tests for unsubscribe handling

### Task 6: Update Existing Notification Services (AC: #1, #5) [x]

Integrate delivery channel manager into existing notification services.

**Files:**

- `apps/functions/src/lib/notifications/sendImmediateFlagNotification.ts` (modify)
- `apps/functions/src/lib/notifications/loginNotification.ts` (modify)
- `apps/functions/src/lib/notifications/deviceSyncNotification.ts` (modify)
- `apps/functions/src/lib/notifications/timeLimitNotificationService.ts` (modify)

**Implementation:**

- Update `sendImmediateFlagNotification`:
  - Use deliveryChannelManager for multi-channel delivery
  - Set priority based on flag severity
  - Enable SMS for critical flags if configured
- Update `sendNewLoginNotification`:
  - Always send push + email (no SMS, locked channels)
  - Email is mandatory for security
- Update `sendDeviceSyncTimeoutNotification`:
  - Use channel manager with push-only default
  - Fallback to email on push failure
- Update time limit notifications:
  - Use channel manager
  - Include email fallback

**Tests:** Update existing tests to verify channel manager integration

### Task 7: Create Channel Preferences UI Schema (AC: #4) [x]

Schema for channel preferences configuration endpoint.

**Files:**

- `packages/shared/src/contracts/deliveryChannel.ts` (modify)
- `apps/functions/src/callable/updateChannelPreferences.ts` (new)
- `apps/functions/src/callable/updateChannelPreferences.test.ts` (new)

**Implementation:**

- Create `updateChannelPreferencesInputSchema`:
  - Per notification type channel settings
  - Validation for locked channels (login alerts)
- Create `updateChannelPreferencesCallable`:
  - Validate input
  - Check for locked channels (reject changes to login alerts)
  - Update user's channel preferences in Firestore
  - Path: `users/{userId}/settings/channelPreferences`
  - Return updated preferences
- Create `getChannelPreferencesCallable`:
  - Return user's current channel preferences
  - Include defaults for unconfigured types

**Tests:** ~15 tests for callable functions

### Task 8: Update Exports and Dependencies (AC: All) [x]

Export new services and add dependencies.

**Files:**

- `apps/functions/package.json` (modify - add nodemailer, twilio)
- `apps/functions/src/lib/email/index.ts` (new)
- `apps/functions/src/lib/sms/index.ts` (new)
- `apps/functions/src/lib/notifications/index.ts` (modify)
- `apps/functions/src/index.ts` (modify)
- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/index.ts` (modify)

**Implementation:**

- Add dependencies:
  - `nodemailer` + `@types/nodemailer`
  - `twilio`
- Create barrel exports for email and sms services
- Export delivery channel schemas
- Register callable functions

**Tests:** No additional tests (export verification)

## Dev Notes

### Technical Requirements

- **Email Service:** Nodemailer with SMTP configuration (environment-based)
- **SMS Service:** Twilio SDK with environment credentials
- **Database:** Firestore for delivery logs and preferences
- **Schema Source:** @fledgely/shared (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)

### Environment Configuration

```bash
# Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
SMTP_FROM=notifications@fledgely.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=<account-sid>
TWILIO_AUTH_TOKEN=<auth-token>
TWILIO_PHONE_NUMBER=+1234567890

# App
APP_URL=https://app.fledgely.com
```

### Architecture Compliance

**From Architecture Document:**

- Multi-channel notification delivery
- Fallback logic for reliability
- Delivery confirmation audit trail
- User preference management

**Key Patterns to Follow:**

- `sendStatusNotification.ts` - FCM multicast pattern
- `notificationPreferences.ts` - User preference schema pattern
- `loginNotification.ts` - Guardian notification loop

### Existing Infrastructure to Leverage

**From Story 41.1 (Notification Preferences):**

- `parentNotificationPreferencesSchema` - Base for channel preferences
- FCM token management infrastructure

**From Story 41.5 (Login Notifications):**

- Login alert patterns (always enabled)
- Guardian symmetry patterns

### Data Model

```typescript
// Channel preferences per user
// Path: users/{userId}/settings/channelPreferences
interface ChannelPreferences {
  criticalFlags: { push: boolean; email: boolean; sms: boolean }
  timeLimitWarnings: { push: boolean; email: boolean }
  deviceSyncAlerts: { push: boolean }
  loginAlerts: { push: true; email: true } // Locked, always enabled
  flagDigest: { push: boolean; email: boolean }
  verifiedPhone?: string // E.164 format, required for SMS
  verifiedEmail: string
}

// Delivery log entry
// Path: users/{userId}/deliveryLogs/{logId}
interface DeliveryLog {
  id: string
  notificationId: string
  userId: string
  familyId: string
  notificationType: string
  channel: 'push' | 'email' | 'sms'
  status: 'sent' | 'delivered' | 'failed' | 'fallback'
  failureReason?: string
  fallbackChannel?: string
  createdAt: number
}

// Unsubscribe token (JWT payload)
interface UnsubscribeToken {
  userId: string
  notificationType: string
  exp: number // expiration timestamp
}
```

### File Structure

```
packages/shared/src/contracts/
├── deliveryChannel.ts            # NEW - Channel schemas
├── deliveryChannel.test.ts       # NEW
└── index.ts                      # MODIFY - exports

apps/functions/src/lib/email/
├── emailService.ts               # NEW - Email sending
├── emailService.test.ts          # NEW
├── templates/
│   ├── index.ts                  # NEW
│   └── notificationEmail.ts      # NEW - Email template
└── index.ts                      # NEW - exports

apps/functions/src/lib/sms/
├── smsService.ts                 # NEW - SMS sending
├── smsService.test.ts            # NEW
└── index.ts                      # NEW - exports

apps/functions/src/lib/notifications/
├── deliveryChannelManager.ts     # NEW - Multi-channel orchestration
├── deliveryChannelManager.test.ts # NEW
├── sendImmediateFlagNotification.ts # MODIFY
├── loginNotification.ts          # MODIFY
├── deviceSyncNotification.ts     # MODIFY
├── timeLimitNotificationService.ts # MODIFY
└── index.ts                      # MODIFY - exports

apps/functions/src/callable/
├── handleUnsubscribe.ts          # NEW
├── handleUnsubscribe.test.ts     # NEW
├── updateChannelPreferences.ts   # NEW
└── updateChannelPreferences.test.ts # NEW
```

### Testing Requirements

- Unit test all schemas with edge cases
- Unit test email service with mocked transport
- Unit test SMS service with mocked Twilio client
- Unit test delivery channel manager with mocked services
- Test fallback logic (push failure → email)
- Test locked channels (login alerts cannot be disabled)
- Test unsubscribe token generation and validation
- Test delivery logging

### Security Considerations

- **Login alerts always enabled:** Cannot be disabled (FR113)
- **Unsubscribe tokens:** Time-limited JWTs (24 hours)
- **Phone verification required:** SMS only to verified numbers
- **No sensitive data in SMS:** Brief messages only
- **Email unsubscribe:** List-Unsubscribe header for compliance

### NFR References

- FR113: All family members receive login alerts when any account is accessed
- NFR42: Notification delivery and reliability

### Dependencies

```json
{
  "nodemailer": "^6.9.7",
  "@types/nodemailer": "^6.4.14",
  "twilio": "^4.19.0"
}
```

### Mock Implementation for Development

When environment variables are not set, services should:

- Log email content to console instead of sending
- Log SMS content to console instead of sending
- Still create delivery logs (for testing audit trail)

### References

- [Source: docs/epics/epic-list.md#Story-41.6]
- [Source: docs/prd/functional-requirements.md#FR113]
- [Source: apps/functions/src/lib/notifications/sendStatusNotification.ts]
- [Source: apps/functions/src/lib/notifications/loginNotification.ts]

## Dev Agent Record

### Context Reference

- Epic: 41 (Notifications & Alerts)
- Story Key: 41-6-notification-delivery-channels
- Dependencies: Story 41.1 (Notification Preferences Configuration) - COMPLETE
- Dependencies: Story 41.5 (New Login Notifications) - COMPLETE

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `packages/shared/src/contracts/deliveryChannel.ts`
- `packages/shared/src/contracts/deliveryChannel.test.ts`
- `apps/functions/src/lib/email/emailService.ts`
- `apps/functions/src/lib/email/emailService.test.ts`
- `apps/functions/src/lib/email/templates/index.ts`
- `apps/functions/src/lib/email/templates/notificationEmail.ts`
- `apps/functions/src/lib/email/index.ts`
- `apps/functions/src/lib/sms/smsService.ts`
- `apps/functions/src/lib/sms/smsService.test.ts`
- `apps/functions/src/lib/sms/index.ts`
- `apps/functions/src/lib/notifications/deliveryChannelManager.ts`
- `apps/functions/src/lib/notifications/deliveryChannelManager.test.ts`
- `apps/functions/src/callable/handleUnsubscribe.ts`
- `apps/functions/src/callable/handleUnsubscribe.test.ts`
- `apps/functions/src/callable/updateChannelPreferences.ts`
- `apps/functions/src/callable/updateChannelPreferences.test.ts`

**Modified Files:**

- `apps/functions/package.json`
- `apps/functions/src/lib/notifications/sendImmediateFlagNotification.ts`
- `apps/functions/src/lib/notifications/loginNotification.ts`
- `apps/functions/src/lib/notifications/deviceSyncNotification.ts`
- `apps/functions/src/lib/notifications/timeLimitNotificationService.ts`
- `apps/functions/src/lib/notifications/index.ts`
- `apps/functions/src/index.ts`
- `packages/shared/src/contracts/index.ts`
- `packages/shared/src/index.ts`

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-04 | Story created (ready-for-dev) |
