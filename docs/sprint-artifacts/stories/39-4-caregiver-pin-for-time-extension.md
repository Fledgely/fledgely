# Story 39.4: Caregiver PIN for Time Extension

## Status: ready-for-dev

## Story

As a **caregiver**,
I want **a PIN to grant time extensions**,
So that **I can help without needing the parent**.

## Acceptance Criteria

1. **AC1: PIN Setup by Parent**
   - Given parent is configuring caregiver permissions
   - When enabling "extend time" permission
   - Then parent sets a 4-6 digit PIN for the caregiver
   - And PIN is securely stored (hashed)
   - And PIN can be changed by parent at any time

2. **AC2: Extension Approval with PIN**
   - Given caregiver has "extend time" permission (FR78)
   - When child requests time extension
   - Then caregiver sees pending extension request
   - And caregiver enters their PIN to approve
   - And extension is applied to child's time balance
   - And wrong PIN shows error, allows retry (max 3 attempts)

3. **AC3: Extension Limits Configuration**
   - Given parent is setting up caregiver permissions
   - When configuring extension limits
   - Then max extension amount selectable: 30min, 1h, 2h
   - And daily extension limit configurable (max times per day)
   - And default is 30 minutes, once per day

4. **AC4: Extension Logging**
   - Given caregiver approves an extension
   - When extension is applied
   - Then logged as: "[Caregiver Name] granted [duration]"
   - And includes: caregiver UID, child UID, amount, timestamp
   - And log entry persists in audit trail

5. **AC5: Parent Audit Visibility**
   - Given caregiver has granted extensions
   - When parent views audit log
   - Then parent sees all caregiver extension actions
   - And can filter by caregiver, child, date range
   - And shows extension details: who, when, how much

6. **AC6: Child Notification**
   - Given caregiver approves extension
   - When extension is applied
   - Then child sees notification: "[Caregiver Name] gave you [duration] more"
   - And notification shows in child dashboard
   - And time balance updates immediately

7. **AC7: Permission Requirement**
   - Given caregiver without "extend time" permission
   - When extension request arrives
   - Then caregiver cannot see or approve the request
   - And UI shows "Contact parent for extensions"

## Tasks / Subtasks

### Task 1: Create Caregiver PIN Schema (AC: #1, #3)

Add PIN-related schemas to shared contracts.

**Files:**

- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/contracts/caregiver.test.ts` (modify)

**Implementation:**

- Add `caregiverPinConfigSchema` with fields:
  - `pinHash: z.string()` (bcrypt hash)
  - `pinSetAt: z.date()`
  - `pinSetByUid: z.string()`
  - `failedAttempts: z.number().default(0)`
  - `lockedUntil: z.date().optional()` (for lockout after 3 failures)
- Add `extensionLimitConfigSchema`:
  - `maxDurationMinutes: z.enum([30, 60, 120]).default(30)`
  - `maxDailyExtensions: z.number().min(1).max(5).default(1)`
- Add `caregiverExtensionLogSchema`:
  - `id: z.string()`
  - `familyId: z.string()`
  - `caregiverUid: z.string()`
  - `caregiverName: z.string()`
  - `childUid: z.string()`
  - `childName: z.string()`
  - `extensionMinutes: z.number()`
  - `requestId: z.string().optional()` (if from child request)
  - `createdAt: z.date()`
- Extend `familyCaregiverSchema` to include optional `pinConfig` and `extensionLimits`
- Add constants: `MAX_PIN_ATTEMPTS = 3`, `PIN_LOCKOUT_MINUTES = 15`

**Tests:** ~15 tests for schema validation

### Task 2: Create SetCaregiverPin Cloud Function (AC: #1)

Cloud function for parent to set/update caregiver PIN.

**Files:**

- `apps/functions/src/callable/setCaregiverPin.ts` (new)
- `apps/functions/src/callable/setCaregiverPin.test.ts` (new)

**Implementation:**

- `setCaregiverPin({ familyId, caregiverUid, pin, extensionLimits? })`
- Validate caller is guardian of family
- Validate PIN format: 4-6 digits only
- Hash PIN using bcrypt (salt rounds: 10)
- Store pinConfig in caregiver document
- Set extensionLimits if provided
- Automatically enable `canExtendTime` permission
- Create audit log entry: "PIN set for [caregiver]"
- Return success confirmation

**Tests:** ~18 tests including validation, hashing, permissions

### Task 3: Create ApproveExtensionWithPin Cloud Function (AC: #2, #4, #6)

Cloud function for caregiver to approve extension using PIN.

**Files:**

- `apps/functions/src/callable/approveExtensionWithPin.ts` (new)
- `apps/functions/src/callable/approveExtensionWithPin.test.ts` (new)

**Implementation:**

- `approveExtensionWithPin({ familyId, childUid, pin, extensionMinutes?, requestId? })`
- Validate caller is caregiver with `canExtendTime` permission
- Check caregiver not locked out from failed attempts
- Verify PIN using bcrypt compare
- On wrong PIN:
  - Increment failedAttempts
  - If >= 3, set lockedUntil for 15 minutes
  - Return error with remaining attempts
- On correct PIN:
  - Reset failedAttempts to 0
  - Validate extension within configured limits
  - Check daily extension limit not exceeded
  - Apply extension to child's time balance
  - Create extension log entry
  - Create child notification
  - Update request status if requestId provided
  - Create audit log entry
- Return success with new time balance

**Tests:** ~25 tests including PIN verification, limits, lockout

### Task 4: Create CaregiverPinEditor UI Component (AC: #1, #3)

UI for parent to set PIN and configure limits.

**Files:**

- `apps/web/src/components/caregiver/CaregiverPinEditor.tsx` (new)
- `apps/web/src/components/caregiver/CaregiverPinEditor.test.tsx` (new)

**Implementation:**

- PIN input with masked display (dots/asterisks)
- "Show PIN" toggle for visibility
- PIN confirmation field (must match)
- Validation: 4-6 digits only, numbers only
- Extension limit dropdown: 30 min, 1 hour, 2 hours
- Daily limit dropdown: 1, 2, 3, 4, 5 times per day
- Clear success/error feedback
- "Change PIN" button if PIN already set
- 44px minimum touch targets (NFR49)

**Tests:** ~15 tests for component states and validation

### Task 5: Create CaregiverExtensionApproval UI Component (AC: #2, #7)

UI for caregiver to approve extensions.

**Files:**

- `apps/web/src/components/caregiver/CaregiverExtensionApproval.tsx` (new)
- `apps/web/src/components/caregiver/CaregiverExtensionApproval.test.tsx` (new)

**Implementation:**

- Shows pending extension requests for assigned children
- Request card displays: child name, reason, time requested
- PIN input field for approval
- "Approve" button (disabled until PIN entered)
- Extension amount dropdown (within limits)
- Error display for wrong PIN with attempts remaining
- Lockout message when locked out
- "No permission" state for caregivers without permission
- Loading state during approval
- Success feedback with updated time balance

**Tests:** ~20 tests for all states and interactions

### Task 6: Create Child Extension Notification (AC: #6)

Notification to child when caregiver grants extension.

**Files:**

- `apps/web/src/components/child/CaregiverExtensionNotification.tsx` (new)
- `apps/web/src/components/child/CaregiverExtensionNotification.test.tsx` (new)
- `apps/functions/src/triggers/onCaregiverExtension.ts` (new)
- `apps/functions/src/triggers/onCaregiverExtension.test.ts` (new)

**Implementation:**

- Firestore trigger on extension log creation
- Creates notification in child's notifications collection:
  - Message: "[Caregiver Name] gave you [duration] more minutes!"
  - Icon: gift/time icon
  - Type: 'caregiver_extension'
  - Auto-dismiss after viewing
- Web component displays notification with caregiver name
- Friendly, encouraging tone for child
- Shows new time balance

**Tests:** ~12 tests for trigger and component

### Task 7: Integrate with CaregiverPermissionEditor (AC: #1, #7)

Add PIN setup to permission configuration.

**Files:**

- `apps/web/src/components/caregiver/CaregiverPermissionEditor.tsx` (modify)
- `apps/web/src/components/caregiver/CaregiverPermissionEditor.test.tsx` (modify)

**Implementation:**

- When toggling "can extend time" to ON:
  - Show CaregiverPinEditor inline/modal
  - Require PIN setup before saving permission
- Show extension limit settings under permission toggle
- Display PIN status: "PIN set on [date]" or "No PIN set"
- "Change PIN" button if PIN exists
- Warning if disabling permission: "Caregiver will lose extension ability"

**Tests:** ~10 additional tests for integration

### Task 8: Create Extension Audit View for Parent (AC: #5)

Parent can view all caregiver extension actions.

**Files:**

- `apps/web/src/components/caregiver/CaregiverExtensionHistory.tsx` (new)
- `apps/web/src/components/caregiver/CaregiverExtensionHistory.test.tsx` (new)

**Implementation:**

- List view of all caregiver extension logs
- Columns: caregiver name, child name, amount, date/time
- Filters: caregiver dropdown, child dropdown, date range
- Sorted by most recent first
- Pagination for large lists (20 per page)
- Empty state: "No extensions granted yet"
- Real-time updates via onSnapshot
- Links to caregiver and child profiles

**Tests:** ~15 tests for list and filtering

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **PIN Security:** bcrypt hashing, never store plain text

### Architecture Compliance

From existing Epic 39 patterns:

- "All types from Zod Only" - extend existing caregiver schemas
- "Firebase SDK Direct" - use `doc()`, `getDoc()`, `collection()` directly
- "Functions Delegate to Services" - Cloud Functions for business logic

### Existing Infrastructure to Leverage

**From Story 39.2 (Permission Configuration):**

- `caregiverPermissionsSchema` - has `canExtendTime` field
- `CaregiverPermissionEditor.tsx` - MODIFY to add PIN setup
- `updateCaregiverPermissions.ts` - Reference for permission updates

**From Story 39.3 (Temporary Access):**

- `caregiverAuditService.ts` - Use for logging extension actions
- Real-time onSnapshot patterns in CaregiverManagementPage

**From Story 31.6 (Time Extension Requests):**

- `timeExtensionRequestSchema` - Child's extension requests
- Extension request workflow patterns

### PIN Security Implementation

```typescript
import * as bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

// Hash PIN before storing
async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS)
}

// Verify PIN against stored hash
async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}
```

### Firestore Collection Structure

```
families/{familyId}/caregivers/{caregiverUid}
├── pinConfig:
│   ├── pinHash: "$2b$10$..."
│   ├── pinSetAt: Timestamp
│   ├── pinSetByUid: "uid_parent"
│   ├── failedAttempts: 0
│   └── lockedUntil: null
├── extensionLimits:
│   ├── maxDurationMinutes: 30
│   └── maxDailyExtensions: 1

families/{familyId}/caregiverExtensionLogs/{logId}
├── caregiverUid: "uid_grandma"
├── caregiverName: "Grandma"
├── childUid: "uid_mateo"
├── childName: "Mateo"
├── extensionMinutes: 30
├── requestId: "req_123" (optional)
├── createdAt: Timestamp
```

### Extension Validation Logic

```typescript
async function validateExtension(
  caregiver: FamilyCaregiver,
  extensionMinutes: number,
  existingLogsToday: number
): { valid: boolean; error?: string } {
  const limits = caregiver.extensionLimits || {
    maxDurationMinutes: 30,
    maxDailyExtensions: 1,
  }

  if (extensionMinutes > limits.maxDurationMinutes) {
    return {
      valid: false,
      error: `Maximum extension is ${limits.maxDurationMinutes} minutes`,
    }
  }

  if (existingLogsToday >= limits.maxDailyExtensions) {
    return {
      valid: false,
      error: `Daily limit reached (${limits.maxDailyExtensions} extensions per day)`,
    }
  }

  return { valid: true }
}
```

### Audit Log Actions

```typescript
type CaregiverPinAuditAction =
  | 'caregiver_pin_set'
  | 'caregiver_pin_changed'
  | 'caregiver_extension_granted'
  | 'caregiver_pin_lockout'

// Example audit entry for extension
{
  action: 'caregiver_extension_granted',
  familyId: 'family_123',
  caregiverUid: 'uid_grandma',
  caregiverName: 'Grandma',
  childUid: 'uid_mateo',
  childName: 'Mateo',
  changes: {
    extensionMinutes: 30,
    newTimeBalance: 90,
  },
  createdAt: serverTimestamp(),
}
```

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR49: 44x44px minimum touch target
- NFR62: Caregiver access audit logging (within 5 minutes)

### References

- [Source: docs/epics/epic-list.md#Story-39.4]
- [Source: docs/epics/epic-list.md#Epic-39]
- [Source: docs/prd/functional-requirements.md#FR78]
- [Source: Story 39.2 for permission patterns]
- [Source: Story 31.6 for time extension patterns]

## Dev Agent Record

### Context Reference

- Epic: 39 (Caregiver Full Features)
- Story Key: 39-4-caregiver-pin-for-time-extension
- Dependencies: Story 39.2 (Caregiver Permission Configuration) - COMPLETE

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-03 | Story created (ready-for-dev) |
