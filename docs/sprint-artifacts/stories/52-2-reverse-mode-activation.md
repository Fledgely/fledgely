# Story 52.2: Reverse Mode Activation

## Status: done

## Story

As **a 16+ teen**,
I want **to activate reverse mode**,
So that **I control what parents see (FR9)**.

## Acceptance Criteria

1. **AC1: Reverse Mode Visibility**
   - Given child is 16 or older
   - When viewing settings
   - Then "Reverse Mode" option visible in child's settings

2. **AC2: Understanding Confirmation**
   - Given child attempts to activate reverse mode
   - When initiating activation
   - Then activation requires: understanding confirmation
   - And child acknowledges what reverse mode means

3. **AC3: Mode Switch**
   - Given child confirms understanding
   - When activating reverse mode
   - Then mode switch: child now controls what's shared
   - And default after activation: nothing shared with parents

4. **AC4: Parent Notification**
   - Given child activates reverse mode
   - When activation completes
   - Then parents notified: "Teen has activated reverse mode"

5. **AC5: Deactivation**
   - Given reverse mode is active
   - When child wants to deactivate
   - Then can be deactivated anytime (returns to normal)

6. **AC6: Audit Logging (NFR42)**
   - Given any reverse mode state change
   - When activation or deactivation occurs
   - Then NFR42: mode changes logged

## Tasks / Subtasks

### Task 1: Create Reverse Mode Data Types

**Files:**

- `packages/shared/src/contracts/reverseMode.ts` (new)

**Implementation:**
1.1 Define ReverseModeStatus enum: OFF, PENDING_CONFIRMATION, ACTIVE
1.2 Define ReverseModeSettings schema with Zod: - status: ReverseModeStatus - activatedAt: Date (optional) - activatedBy: string (child userId) - deactivatedAt: Date (optional)
1.3 Define ReverseModeActivationRequest schema for confirmation flow
1.4 Define ReverseModeChangeEvent for audit logging
1.5 Export all types from shared/index.ts

### Task 2: Create Reverse Mode Service

**Files:**

- `packages/shared/src/services/reverseModeService.ts` (new)
- `packages/shared/src/services/reverseModeService.test.ts` (new)

**Implementation:**
2.1 Implement canActivateReverseMode(childId) - check if child is 16+
2.2 Implement isReverseModeActive(settings) - check current status
2.3 Implement getReverseModeConfirmationContent() - returns confirmation dialog content
2.4 Implement createActivationEvent(childId) - creates audit event
2.5 Implement createDeactivationEvent(childId) - creates audit event
2.6 Write unit tests for all functions

### Task 3: Create Reverse Mode Callable Functions

**Files:**

- `apps/functions/src/callable/reverseMode.ts` (new)
- `apps/functions/src/index.ts` (modify)

**Implementation:**
3.1 Implement getReverseModeStatus(childId) - returns current status
3.2 Implement activateReverseMode(childId, confirmationAcknowledged) - handles activation - Verify child is 16+ - Verify confirmation acknowledged - Update child's reverseMode settings in Firestore - Set default sharing to nothing - Log audit event
3.3 Implement deactivateReverseMode(childId) - handles deactivation - Update child's reverseMode settings - Restore default parent visibility - Log audit event
3.4 Export all functions from index.ts

### Task 4: Create Parent Notification for Reverse Mode

**Files:**

- `apps/functions/src/callable/reverseMode.ts` (modify)
- `packages/shared/src/services/reverseModeNotificationService.ts` (new)

**Implementation:**
4.1 Create notification message: "Teen has activated reverse mode"
4.2 Create notification message for deactivation: "Teen has deactivated reverse mode"
4.3 Send notification to all parents in family when mode changes
4.4 Include link to "Supporting your teen's independence" resources

### Task 5: Create Reverse Mode Settings UI

**Files:**

- `apps/web/src/app/dashboard/settings/reverse-mode/page.tsx` (new)
- `apps/web/src/components/reverse-mode/ReverseModeToggle.tsx` (new)
- `apps/web/src/components/reverse-mode/ReverseModeConfirmationModal.tsx` (new)

**Implementation:**
5.1 Create ReverseModeToggle component - shows current status with toggle
5.2 Create ReverseModeConfirmationModal: - Step 1: Explain what reverse mode does - Step 2: Explain default behavior (nothing shared) - Step 3: Confirmation checkbox: "I understand" - Confirm button only enabled after checkbox
5.3 Create settings page with toggle and status display
5.4 Show "Reverse Mode" only if child is 16+ (use useAge16Transition hook)

### Task 6: Create useReverseMode Hook

**Files:**

- `apps/web/src/hooks/useReverseMode.ts` (new)

**Implementation:**
6.1 useReverseMode(childId) hook: - Fetch current reverse mode status - Provide activateReverseMode function - Provide deactivateReverseMode function - Track loading/error states
6.2 Integrate with Firebase callable functions
6.3 Use React Query for caching and state management
6.4 Invalidate parent dashboard queries when mode changes

### Task 7: Update Child Settings Page

**Files:**

- `apps/web/src/app/dashboard/settings/page.tsx` (modify)

**Implementation:**
7.1 Add "Reverse Mode" section to settings (conditionally shown if 16+)
7.2 Link to /dashboard/settings/reverse-mode page
7.3 Show current status indicator (Active/Inactive)

## Dev Notes

### Existing Patterns to Follow

**From Story 52-1 (Age 16 Transition):**

```typescript
// Use existing age check from age16TransitionService
import { is16OrOlder, getTransitionEligibility } from '@fledgely/shared'

// Use existing hook pattern
import { useAge16Transition } from '@/hooks/useAge16Transition'
```

**From Story 52-1 Callable Functions Pattern:**

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export const activateReverseMode = onCall({ enforceAppCheck: false }, async (request) => {
  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }
  // Implementation
})
```

**Notification Pattern (Story 41):**

```typescript
// Follow notification preferences pattern
// Send to all parents in family
const parentIds = familyData.parentIds || []
for (const parentId of parentIds) {
  // Create notification for each parent
}
```

### Technical Requirements

- **Firestore Structure:** Store reverseMode settings in `/families/{familyId}/children/{childId}/reverseMode`
- **Default Behavior:** When activated, nothing shared with parents
- **Audit Logging:** All mode changes logged per NFR42 to `/auditLogs`
- **Age Check:** Use existing is16OrOlder() from age16TransitionService

### Data Model

```typescript
interface ReverseModeSettings {
  status: 'off' | 'active'
  activatedAt?: Timestamp
  activatedBy?: string // childId
  deactivatedAt?: Timestamp
  sharingPreferences: {
    screenTime: boolean
    flags: boolean
    screenshots: boolean
    location: boolean
  }
}
```

### Testing Considerations

- Test activation only works for 16+ children
- Test confirmation acknowledgment is required
- Test parent notification is sent on activation
- Test deactivation restores default visibility
- Test audit logging for all state changes
- Test UI visibility based on age

### Project Structure Notes

- Contracts: `packages/shared/src/contracts/reverseMode.ts`
- Services: `packages/shared/src/services/reverseModeService.ts`
- Functions: `apps/functions/src/callable/reverseMode.ts`
- UI: `apps/web/src/app/dashboard/settings/reverse-mode/page.tsx`

### References

- [Source: packages/shared/src/services/age16TransitionService.ts] - Age detection functions
- [Source: apps/functions/src/callable/age16Transition.ts] - Callable function patterns
- [Source: apps/web/src/hooks/useAge16Transition.ts] - Hook patterns
- [Source: docs/epics/epic-list.md#Story-52.2] - Epic requirements

## Dev Agent Record

### Context Reference

Epic 52: Reverse Mode & Trusted Adults (Age 16 Transition)

- FR9: System transfers account ownership to child at age 16 (Reverse Mode)
- FR10: Child (in Reverse Mode) can choose which data to share with parents
- NFR42: Mode changes logged

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
