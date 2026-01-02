# Story 7.5.4: Safe Adult Designation

## Status: ready-for-dev

## Story

As a **child**,
I want **to optionally designate a safe adult who can be notified instead of parents**,
So that **someone I trust knows I need help**.

## Acceptance Criteria

1. **AC1: Safe adult notification option**
   - Given a child has triggered a safety signal
   - When they optionally choose to notify a safe adult
   - Then they can enter a phone number or email for the safe adult
   - And the option is clearly presented but not mandatory

2. **AC2: Safe adult message delivery**
   - Given a child has designated a safe adult
   - When signal is processed
   - Then safe adult receives message: "[Child name] needs help. Please reach out."
   - And message does NOT mention fledgely or monitoring details
   - And message delivery is tracked without family visibility

3. **AC3: Pre-configured safe adult**
   - Given a child wants to prepare for emergencies
   - When they access their protected resources (Epic 7.3)
   - Then they can pre-configure a safe adult before any crisis
   - And configuration is stored encrypted, inaccessible to parents
   - And pre-configured adult can be used instantly during signal

4. **AC4: Safe adult data isolation**
   - Given safe adult designation exists
   - When any family member accesses account
   - Then safe adult designation is completely invisible
   - And no hint of safe adult exists in any family-visible data
   - And encryption is separate from family encryption key

5. **AC5: Fallback to external resources**
   - Given no safe adult is designated
   - When signal is processed
   - Then signal goes only to external crisis resource (Story 7.5.2)
   - And child receives standard confirmation (Story 7.5.3)
   - And no notification gap exists

6. **AC6: Phone and email support**
   - Given child is designating a safe adult
   - When they enter contact information
   - Then both phone number and email are accepted
   - And phone receives SMS message
   - And email receives formatted email message
   - And validation ensures valid contact format

## Technical Tasks

### Task 1: Create SafeAdult Data Model (AC: #1, #3, #4, #6)

Create Zod schemas and types for safe adult designation.

**Files:**

- `packages/shared/src/contracts/safeAdult.ts` (new)
- `packages/shared/src/contracts/safeAdult.test.ts` (new)

**Types:**

```typescript
// Contact method for safe adult
export const SAFE_ADULT_CONTACT_METHOD = {
  SMS: 'sms',
  EMAIL: 'email',
} as const

// Safe adult designation schema
export interface SafeAdultDesignation {
  id: string
  childId: string
  // Contact information (only one required)
  phoneNumber: string | null // E.164 format
  email: string | null
  // Preferred contact method
  preferredMethod: 'sms' | 'email'
  // Display name for child's reference (NOT sent in message)
  displayName: string
  // When configured
  createdAt: Date
  updatedAt: Date
  // Whether this is pre-configured or signal-time entry
  isPreConfigured: boolean
  // Encryption metadata (NOT the key itself)
  encryptionKeyId: string
}

// Safe adult notification schema
export interface SafeAdultNotification {
  id: string
  designationId: string
  signalId: string
  childName: string // First name only for privacy
  sentAt: Date
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed'
  // NO fledgely branding or monitoring mention
}
```

**Security Requirements:**

- Phone/email stored with separate encryption key (not family key)
- No parent-accessible references to safe adult data
- Encryption key stored in isolated collection

**Tests:** 35+ tests for schema validation, encryption metadata, contact validation

### Task 2: SafeAdultService (AC: #1, #2, #3, #4)

Create service for managing safe adult designations.

**Files:**

- `packages/shared/src/services/safeAdultService.ts` (new)
- `packages/shared/src/services/safeAdultService.test.ts` (new)

**Functions:**

```typescript
// Pre-configure a safe adult
function setPreConfiguredSafeAdult(
  childId: string,
  contact: { phone?: string; email?: string },
  displayName: string
): Promise<SafeAdultDesignation>

// Get child's pre-configured safe adult (if any)
function getPreConfiguredSafeAdult(childId: string): Promise<SafeAdultDesignation | null>

// Designate safe adult during signal (one-time)
function designateSafeAdultForSignal(
  signalId: string,
  childId: string,
  contact: { phone?: string; email?: string }
): Promise<SafeAdultDesignation>

// Update pre-configured safe adult
function updatePreConfiguredSafeAdult(
  childId: string,
  updates: Partial<
    Pick<SafeAdultDesignation, 'phoneNumber' | 'email' | 'displayName' | 'preferredMethod'>
  >
): Promise<SafeAdultDesignation>

// Remove pre-configured safe adult
function removePreConfiguredSafeAdult(childId: string): Promise<void>

// Validate safe adult contact (phone or email)
function validateSafeAdultContact(contact: { phone?: string; email?: string }): ValidationResult

// Check if child has safe adult configured
function hasSafeAdultConfigured(childId: string): Promise<boolean>
```

**Tests:** 40+ tests for CRUD operations, validation, encryption isolation

### Task 3: SafeAdultNotificationService (AC: #2, #5, #6)

Create service for sending notifications to safe adults.

**Files:**

- `packages/shared/src/services/safeAdultNotificationService.ts` (new)
- `packages/shared/src/services/safeAdultNotificationService.test.ts` (new)

**Functions:**

```typescript
// Notify safe adult about signal
function notifySafeAdult(
  designation: SafeAdultDesignation,
  signal: SafetySignal,
  childFirstName: string
): Promise<SafeAdultNotification>

// Send SMS to safe adult
function sendSafeAdultSMS(
  phoneNumber: string,
  childFirstName: string
): Promise<{ success: boolean; messageId: string }>

// Send email to safe adult
function sendSafeAdultEmail(
  email: string,
  childFirstName: string
): Promise<{ success: boolean; messageId: string }>

// Get notification status
function getNotificationStatus(notificationId: string): Promise<SafeAdultNotification>

// Retry failed notification
function retryNotification(notificationId: string): Promise<SafeAdultNotification>
```

**Message Templates (NO fledgely mention):**

- SMS: "[Child name] needs help. Please reach out to them when you can. This is an automated message."
- Email Subject: "Someone you know needs help"
- Email Body: "[Child name] reached out because they need support. Please contact them when you can. This is an automated message sent on their behalf."

**Tests:** 35+ tests for notification sending, delivery tracking, retry logic

### Task 4: SafeAdultEncryptionService (AC: #4)

Create service for isolated encryption of safe adult data.

**Files:**

- `packages/shared/src/services/safeAdultEncryptionService.ts` (new)
- `packages/shared/src/services/safeAdultEncryptionService.test.ts` (new)

**Functions:**

```typescript
// Generate isolated encryption key for safe adult data
function generateSafeAdultEncryptionKey(childId: string): Promise<{ keyId: string }>

// Encrypt safe adult contact data
function encryptSafeAdultData(
  data: { phone?: string; email?: string; displayName: string },
  keyId: string
): Promise<string>

// Decrypt safe adult contact data (admin/system only)
function decryptSafeAdultData(
  encryptedData: string,
  keyId: string
): Promise<{ phone?: string; email?: string; displayName: string }>

// Verify key is isolated from family access
function verifyKeyIsolation(keyId: string, familyId: string): Promise<boolean>
```

**Security Requirements:**

- Keys stored in isolated Firestore collection (not family-accessible)
- Key ID in safe adult record, actual key in isolated storage
- Decryption only available to system services, not client

**Tests:** 25+ tests for encryption, key isolation, security verification

### Task 5: SafeAdultDesignationUI Component (AC: #1, #6)

Create React component for designating safe adult during signal.

**Files:**

- `apps/web/src/components/safety/SafeAdultDesignation.tsx` (new)
- `apps/web/src/components/safety/SafeAdultDesignation.test.tsx` (new)

**Component:**

```typescript
interface SafeAdultDesignationProps {
  signalId: string
  childId: string
  preConfiguredAdult: SafeAdultDesignation | null
  onDesignate: (designation: SafeAdultDesignation) => void
  onSkip: () => void
  isProcessing: boolean
}

function SafeAdultDesignation({
  signalId,
  childId,
  preConfiguredAdult,
  onDesignate,
  onSkip,
  isProcessing,
}: SafeAdultDesignationProps): JSX.Element
```

**Features:**

- Shows pre-configured adult if available with "Use [Name]" button
- Phone input with validation (accepts various formats)
- Email input with validation
- "Skip" option clearly available
- Child-appropriate language (6th-grade level)
- Accessible (keyboard, screen reader)
- Does NOT mention fledgely or monitoring

**Tests:** 25+ tests for rendering, validation, accessibility

### Task 6: PreConfiguredSafeAdultUI Component (AC: #3)

Create React component for pre-configuring safe adult in protected resources.

**Files:**

- `apps/web/src/components/safety/PreConfiguredSafeAdult.tsx` (new)
- `apps/web/src/components/safety/PreConfiguredSafeAdult.test.tsx` (new)

**Component:**

```typescript
interface PreConfiguredSafeAdultProps {
  childId: string
  existingDesignation: SafeAdultDesignation | null
  onSave: (designation: SafeAdultDesignation) => void
  onRemove: () => void
}

function PreConfiguredSafeAdult({
  childId,
  existingDesignation,
  onSave,
  onRemove,
}: PreConfiguredSafeAdultProps): JSX.Element
```

**Features:**

- Form for entering/editing safe adult contact
- Display name field (for child's reference only)
- Phone or email (at least one required)
- Preferred contact method selection
- Delete option with confirmation
- Child-appropriate language

**Tests:** 20+ tests for CRUD operations, validation, accessibility

### Task 7: Integration with SignalConfirmation (AC: #1, #5)

Integrate safe adult designation into the signal confirmation flow.

**Files:**

- `apps/web/src/components/safety/useSafetySignalConfirmation.ts` (modify)
- `apps/web/src/components/safety/useSafetySignalConfirmation.test.tsx` (modify)
- `apps/web/src/components/safety/SignalConfirmationUI.tsx` (modify)

**Integration Points:**

```typescript
// Extended hook interface
interface UseSafetySignalConfirmationReturn {
  // Existing fields...

  // Safe adult integration
  preConfiguredSafeAdult: SafeAdultDesignation | null
  showSafeAdultOption: boolean
  designateSafeAdult: (contact: { phone?: string; email?: string }) => Promise<void>
  skipSafeAdultDesignation: () => void
  safeAdultNotificationStatus: 'none' | 'sending' | 'sent' | 'failed'
}
```

**Flow:**

1. Signal triggered → confirmation shown
2. If pre-configured adult exists: show "Notify [Name]?" option
3. If no pre-configured adult: show "Add trusted adult?" option
4. Child can skip → goes to external resources only
5. Child designates → notification sent before showing resources

**Tests:** 20+ tests for integration flow, state management

### Task 8: Contact Validation Service (AC: #6)

Create service for validating phone numbers and emails.

**Files:**

- `packages/shared/src/services/contactValidationService.ts` (new)
- `packages/shared/src/services/contactValidationService.test.ts` (new)

**Functions:**

```typescript
// Validate phone number (multiple formats)
function validatePhoneNumber(phone: string): {
  valid: boolean
  normalized: string // E.164 format
  error?: string
}

// Validate email address
function validateEmail(email: string): {
  valid: boolean
  normalized: string // lowercase, trimmed
  error?: string
}

// Determine best contact method based on input
function determineContactMethod(contact: { phone?: string; email?: string }): 'sms' | 'email' | null

// Format phone for display (mask partial for privacy)
function formatPhoneForDisplay(phone: string): string

// Format email for display (mask partial for privacy)
function formatEmailForDisplay(email: string): string
```

**Tests:** 30+ tests for phone formats, email validation, normalization

## Dev Notes

### Critical Safety Requirements

**MUST:**

- Store safe adult data in isolated collection (not under family)
- Use separate encryption key from family key
- Never mention fledgely in notifications
- Keep message content minimal and generic
- Allow child to skip safe adult option
- Support pre-configuration before crisis

**MUST NOT:**

- Allow parent access to safe adult data
- Include monitoring details in notifications
- Force safe adult designation
- Store safe adult data in family-accessible location
- Use identifiable subject lines in emails

### Previous Story Learnings (Story 7.5.3)

From Story 7.5.3 implementation:

- SignalConfirmation contract at `packages/shared/src/contracts/signalConfirmation.ts`
- CrisisResourceService at `packages/shared/src/services/crisisResourceService.ts`
- useSafetySignalConfirmation hook at `apps/web/src/components/safety/useSafetySignalConfirmation.ts`
- 321 tests with comprehensive TDD approach

**Key patterns to follow:**

- Use existing SafetySignal types from safetySignal.ts
- Follow Zod schema patterns from signalConfirmation.ts
- Use same test structure (describe blocks, beforeEach, mocks)
- Keep all safety-related data isolated from family access
- Child-appropriate language (6th-grade reading level)

### Architecture Patterns

**From Story 7.5.1 (Hidden Safety Signal):**

- SafetySignal contract at `packages/shared/src/contracts/safetySignal.ts`
- SafetySignalService at `packages/shared/src/services/safetySignalService.ts`
- Status transitions: queued → pending → sent → delivered → acknowledged

**From Story 7.5.2 (External Signal Routing):**

- CrisisPartner types in `packages/shared/src/contracts/crisisPartner.ts`
- Signal routing in `packages/shared/src/services/signalRoutingService.ts`
- Blackout service in `packages/shared/src/services/signalBlackoutService.ts`

**From Epic 0.5 (Safe Account Escape):**

- Domestic abuse resource referral patterns (Story 0.5.9)
- Stealth notification patterns (Story 0.5.7)
- Audit trail sealing patterns (Story 0.5.8)

### File Structure Requirements

```
packages/shared/src/
├── contracts/
│   ├── safeAdult.ts             # New: Safe adult schemas
│   └── safeAdult.test.ts
├── services/
│   ├── safeAdultService.ts       # New: Safe adult management
│   ├── safeAdultService.test.ts
│   ├── safeAdultNotificationService.ts  # New: Notification sending
│   ├── safeAdultNotificationService.test.ts
│   ├── safeAdultEncryptionService.ts    # New: Isolated encryption
│   ├── safeAdultEncryptionService.test.ts
│   ├── contactValidationService.ts      # New: Contact validation
│   └── contactValidationService.test.ts

apps/web/src/components/safety/
├── SafeAdultDesignation.tsx      # New: Signal-time designation
├── SafeAdultDesignation.test.tsx
├── PreConfiguredSafeAdult.tsx    # New: Pre-configuration form
├── PreConfiguredSafeAdult.test.tsx
├── useSafetySignalConfirmation.ts  # Modified: Integration
└── SignalConfirmationUI.tsx        # Modified: Integration
```

### Testing Standards

- TDD approach: Write tests first
- Minimum 230 tests across all tasks
- Unit tests for each service function
- Component tests with React Testing Library
- Accessibility tests for all UI components
- Security tests for encryption isolation
- Test phone number format variations
- Test email validation edge cases

### Contact Format Examples

**Phone Numbers (must normalize to E.164):**

- US: (555) 123-4567 → +15551234567
- US: 555-123-4567 → +15551234567
- International: +44 20 7123 4567 → +442071234567

**Emails:**

- user@example.com → user@example.com
- User@EXAMPLE.COM → user@example.com

### Message Templates

**SMS (160 char max):**

```
[Child name] needs help. Please reach out to them when you can. This is an automated message.
```

**Email Subject:**

```
Someone you know needs help
```

**Email Body:**

```
[Child name] reached out because they need support.

Please contact them when you can.

This is an automated message sent on their behalf.
```

### Dependencies

- **Story 7.5.1:** SafetySignal types and service (DONE)
- **Story 7.5.2:** Signal routing and status updates (DONE)
- **Story 7.5.3:** Signal confirmation and resources (DONE)
- **Story 7.5.6:** Signal encryption and isolation (integration point)
- **Story 7.5.7:** 48-hour blackout (integration point)

### References

- [Source: docs/epics/epic-list.md#Story-7.5.4 - Safe Adult Designation]
- [Source: docs/sprint-artifacts/stories/7-5-1-hidden-safety-signal-access.md - Signal infrastructure]
- [Source: docs/sprint-artifacts/stories/7-5-2-external-signal-routing.md - Routing patterns]
- [Source: docs/sprint-artifacts/stories/7-5-3-signal-confirmation-resources.md - Confirmation patterns]
- [Source: docs/sprint-artifacts/stories/0-5-7-72-hour-notification-stealth.md - Stealth notification patterns]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List
