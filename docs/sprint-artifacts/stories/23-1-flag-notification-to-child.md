# Story 23.1: Flag Notification to Child

Status: done

## Story

As a **child**,
I want **to be notified when my content is flagged**,
So that **I have a chance to explain before my parent sees it**.

## Acceptance Criteria

1. **AC1: Child notification on flag creation**
   - Given content is flagged by AI
   - When flag is created (and not distress-suppressed)
   - Then child receives notification: "Something was flagged - add context?"

2. **AC2: Gentle, non-alarming messaging**
   - Given notification is displayed
   - When child sees it
   - Then notification is gentle, not alarming ("We want your side")
   - And uses supportive, non-judgmental language

3. **AC3: Direct link to annotation**
   - Given notification is received
   - When child taps/clicks notification
   - Then notification links directly to annotation screen

4. **AC4: In-app and push notification**
   - Given flag is created
   - When notification is sent
   - Then notification appears in app
   - And as push notification (if enabled)

5. **AC5: 30-minute timer before parent alert**
   - Given child receives notification
   - When viewing the notification
   - Then child has 30 minutes to respond before parent alert
   - And timer visible: "25 minutes to add your explanation"

6. **AC6: Distress suppression check**
   - Given flag has distress suppression (status = 'sensitive_hold')
   - When notification would be sent
   - Then NO notification is sent to child
   - And parent notification follows 48-hour suppression rules from Epic 21

## Tasks / Subtasks

- [x] Task 1: Extend FlagDocument schema for child notification (AC: #1, #5)
  - [x] 1.1 Add `childNotifiedAt?: number` field to track when child was notified
  - [x] 1.2 Add `annotationDeadline?: number` field (createdAt + 30 minutes)
  - [x] 1.3 Add `childNotificationStatus?: 'pending' | 'notified' | 'skipped'` field
  - [x] 1.4 Update shared types in `packages/shared/src/contracts/index.ts`

- [x] Task 2: Create child flag notification service (AC: #1, #4, #6)
  - [x] 2.1 Create `apps/web/src/services/childFlagNotificationService.ts`
  - [x] 2.2 Add `notifyChildOfFlag(flagId, childId)` function
  - [x] 2.3 Check for distress suppression before notifying
  - [x] 2.4 Set `childNotifiedAt` and `annotationDeadline` when notifying
  - [x] 2.5 Integrate with existing FCM push notification infrastructure

- [x] Task 3: Create ChildFlagNotificationBanner component (AC: #2, #3, #5)
  - [x] 3.1 Create `apps/web/src/components/child/ChildFlagNotificationBanner.tsx`
  - [x] 3.2 Display gentle, supportive messaging
  - [x] 3.3 Show countdown timer with remaining time
  - [x] 3.4 Add "Add your side" button linking to annotation screen
  - [x] 3.5 Write component tests

- [x] Task 4: Create useChildPendingFlags hook (AC: #1, #5)
  - [x] 4.1 Create `apps/web/src/hooks/useChildPendingFlags.ts`
  - [x] 4.2 Subscribe to flags where childNotificationStatus = 'notified' AND annotationDeadline > now
  - [x] 4.3 Return pending flags with time remaining
  - [x] 4.4 Auto-refresh timer display

- [x] Task 5: Integrate into child dashboard/app (AC: #3)
  - [x] 5.1 Add ChildFlagNotificationBanner to child-facing pages
  - [x] 5.2 Show notification count badge if pending flags exist
  - [x] 5.3 Route to annotation screen (placeholder until Story 23-2)

- [x] Task 6: Backend trigger for child notification (AC: #1, #6)
  - [x] 6.1 Extend flag creation in `apps/functions/src/services/classification/flagStorage.ts`
  - [x] 6.2 After flag creation, check if NOT distress-suppressed
  - [x] 6.3 If clear, set childNotificationStatus = 'pending' and queue notification
  - [x] 6.4 Cloud Function to send FCM notification to child's devices

## Dev Notes

### Previous Story Intelligence (Story 22-6)

Story 22-6 established co-parent visibility patterns:

- viewedBy field tracks who viewed flags
- markFlagViewed service function pattern
- CoParentStatusBadge component showing status

**Key Files from Epic 22:**

- `apps/web/src/services/flagService.ts` - Service patterns and Firestore operations
- `apps/web/src/components/flags/FlagDetailModal.tsx` - Detail view pattern
- `packages/shared/src/contracts/index.ts` - FlagDocument schema

### Existing Infrastructure

**Push Notifications (Story 19A.4):**

- `apps/web/src/hooks/usePushNotifications.ts` - FCM token registration
- Tokens stored in `/users/{uid}/notificationTokens/{tokenId}`
- Can be used for child push notifications

**Flag Document Schema:**
Current FlagDocument fields include:

- `status: 'pending' | 'reviewed' | 'dismissed' | 'escalated' | 'sensitive_hold'`
- `suppressionReason` - For distress detection
- `releasableAfter` - When suppressed flag can be released

### Firestore Schema Updates

```typescript
// Add to FlagDocument in packages/shared/src/contracts/index.ts
export const childNotificationStatusSchema = z.enum(['pending', 'notified', 'skipped'])
export type ChildNotificationStatus = z.infer<typeof childNotificationStatusSchema>

// Add fields to flagDocumentSchema:
childNotifiedAt: z.number().optional(),           // When child was notified (epoch ms)
annotationDeadline: z.number().optional(),        // When annotation window expires (epoch ms)
childNotificationStatus: childNotificationStatusSchema.optional(), // Track notification state
```

### 30-Minute Timer Logic

```typescript
// Constants
const ANNOTATION_WINDOW_MS = 30 * 60 * 1000 // 30 minutes

// When creating notification
const annotationDeadline = Date.now() + ANNOTATION_WINDOW_MS

// Timer display
const remainingMs = annotationDeadline - Date.now()
const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000))
const timerText = `${remainingMinutes} minutes to add your explanation`
```

### Gentle Messaging Guidelines

Per AC2, use supportive, non-judgmental language:

- ✅ "Something was flagged - add context?"
- ✅ "We want your side of the story"
- ✅ "You have a chance to explain"
- ❌ "You viewed inappropriate content"
- ❌ "Your parents will be notified"
- ❌ "You're in trouble"

### Distress Suppression Check

```typescript
// Before sending child notification, check:
if (flag.status === 'sensitive_hold' && flag.suppressionReason) {
  // Do NOT notify child - this is a distress-related flag
  // Parent notification follows 48-hour suppression (Epic 21)
  return { notified: false, reason: 'distress_suppression' }
}
```

### Component Structure

```
apps/web/src/
├── components/
│   └── child/
│       ├── ChildFlagNotificationBanner.tsx (NEW)
│       ├── ChildFlagNotificationBanner.test.tsx (NEW)
│       └── index.ts (UPDATE)
├── hooks/
│   └── useChildPendingFlags.ts (NEW)
├── services/
│   └── childFlagNotificationService.ts (NEW)
apps/functions/src/
├── services/
│   └── classification/
│       └── flagStorage.ts (UPDATE - add child notification trigger)
```

### Testing Requirements

1. **Unit Tests:**
   - ChildFlagNotificationBanner renders with correct messaging
   - Timer countdown updates correctly
   - Distress-suppressed flags do NOT trigger notification
   - useChildPendingFlags returns correct flags

2. **Integration Tests:**
   - Flag creation triggers child notification (when not suppressed)
   - Push notification sent to child's registered devices
   - Clicking notification routes to annotation screen

### References

- [Source: docs/epics/epic-list.md#Story 23.1] - Story requirements
- [Source: apps/web/src/hooks/usePushNotifications.ts] - FCM patterns
- [Source: apps/web/src/services/flagService.ts] - Flag service patterns
- [Source: packages/shared/src/contracts/index.ts] - FlagDocument schema
- [Source: apps/functions/src/services/classification/flagStorage.ts] - Backend flag creation

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### Required Firestore Indexes

Story 23.1 requires the following composite index for efficient flag queries:

```
Collection: children/{childId}/flags
Fields:
  - childNotificationStatus (Ascending)
  - annotationDeadline (Ascending)
Query scope: Collection
```

This index supports the `useChildPendingFlags` hook query that filters by `childNotificationStatus == 'notified'` and `annotationDeadline > now`.

### File List

**Shared Package:**

- `packages/shared/src/contracts/index.ts` - Added childNotificationStatusSchema, ANNOTATION_WINDOW_MS, FlagDocument fields
- `packages/shared/src/index.ts` - Added exports for childNotificationStatusSchema, ANNOTATION_WINDOW_MS, ChildNotificationStatus

**Web App:**

- `apps/web/src/services/childFlagNotificationService.ts` - Child flag notification service
- `apps/web/src/services/childFlagNotificationService.test.ts` - Service tests (26 tests)
- `apps/web/src/components/child/ChildFlagNotificationBanner.tsx` - Notification banner component
- `apps/web/src/components/child/ChildFlagNotificationBanner.test.tsx` - Component tests (20 tests)
- `apps/web/src/hooks/useChildPendingFlags.ts` - Hook for pending flags
- `apps/web/src/hooks/useChildPendingFlags.test.ts` - Hook tests (11 tests)
- `apps/web/src/app/child/dashboard/page.tsx` - Updated with notification integration

**Functions:**

- `apps/functions/src/services/classification/flagStorage.ts` - Added childNotificationStatus to createFlag
- `apps/functions/src/lib/notifications/sendChildFlagNotification.ts` - FCM notification service
- `apps/functions/src/lib/notifications/sendChildFlagNotification.test.ts` - Service tests (8 tests)
- `apps/functions/src/triggers/onFlagCreated.ts` - Firestore trigger for flags
- `apps/functions/src/triggers/onFlagCreated.test.ts` - Trigger tests (7 tests)
- `apps/functions/src/index.ts` - Added onFlagCreated export
