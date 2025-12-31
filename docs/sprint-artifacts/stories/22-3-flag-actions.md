# Story 22.3: Flag Actions

Status: done

## Story

As a **parent**,
I want **to take action on a flag**,
So that **I can respond appropriately to concerns**.

## Acceptance Criteria

1. **AC1: Action options**
   - Given parent is reviewing a flag
   - When choosing action
   - Then available actions: Dismiss, Note for Discussion, Requires Action

2. **AC2: Dismiss action**
   - Given parent selects Dismiss
   - When confirming
   - Then flag marked as "dismissed" (false positive or resolved)
   - And flag moves to history section

3. **AC3: Note for Discussion action**
   - Given parent selects Note for Discussion
   - When confirming
   - Then flag marked as "reviewed" with discussion status
   - And flag saved for family conversation

4. **AC4: Requires Action action**
   - Given parent selects Requires Action
   - When confirming
   - Then flag marked as "escalated"
   - And parent's concern is logged

5. **AC5: Confirmation dialog**
   - Given parent selects any action
   - When action is selected
   - Then confirmation dialog shown before action is applied
   - And option to add optional note

6. **AC6: Audit trail**
   - Given action is taken
   - When saved
   - Then action logged with timestamp, parent ID, and action type
   - And visible in flag history

## Tasks / Subtasks

- [x] Task 1: Create FlagActionModal component (AC: #1, #5)
  - [x] 1.1 Create `apps/web/src/components/flags/FlagActionModal.tsx`
  - [x] 1.2 Display confirmation dialog with action description
  - [x] 1.3 Add optional note text area
  - [x] 1.4 Write component tests

- [x] Task 2: Add flag action service functions (AC: #2, #3, #4, #6)
  - [x] 2.1 Add `dismissFlag(flagId, parentId, note?)` to flagService
  - [x] 2.2 Add `markForDiscussion(flagId, parentId, note?)` to flagService
  - [x] 2.3 Add `escalateFlag(flagId, parentId, note?)` to flagService
  - [x] 2.4 Add audit trail logging to Firestore (auditTrail array field)
  - [x] 2.5 Service tests covered by integration tests

- [x] Task 3: Integrate actions into FlagDetailModal
  - [x] 3.1 Connect action buttons to confirmation modal
  - [x] 3.2 Handle action completion and modal close
  - [x] 3.3 Success feedback via modal close (toast deferred)
  - [x] 3.4 Write integration tests

## Dev Notes

### Previous Story Intelligence (Story 22-2)

Story 22-2 implemented the FlagDetailModal with action button placeholders:

- Action buttons already exist: Dismiss, Note for Discussion, Requires Action
- `onAction` callback prop ready: `(action: 'dismiss' | 'discuss' | 'escalate') => void`
- Need to implement the actual action logic and confirmation

**Key Files:**

- `apps/web/src/components/flags/FlagDetailModal.tsx` - Has action buttons
- `apps/web/src/services/flagService.ts` - Need to add action functions

### Firestore Schema for Actions

```typescript
// Update to FlagDocument
interface FlagDocument {
  // ... existing fields ...
  status: 'pending' | 'reviewed' | 'dismissed' | 'escalated'
  reviewedAt?: number // Timestamp of action
  reviewedBy?: string // Parent ID who took action
  actionNote?: string // Optional note from parent
  auditTrail?: FlagAction[] // History of actions
}

interface FlagAction {
  action: 'dismiss' | 'discuss' | 'escalate' | 'view'
  parentId: string
  parentName: string
  timestamp: number
  note?: string
}
```

### UI Flow

1. Parent clicks action button in FlagDetailModal
2. FlagActionModal appears with:
   - Confirmation message
   - Optional note text area
   - Confirm/Cancel buttons
3. On confirm:
   - Call service function
   - Update Firestore
   - Close both modals
   - Show toast/feedback
   - Flag moves to history

### References

- [Source: docs/epics/epic-list.md#Story 22.3] - Story requirements
- [Source: apps/web/src/components/flags/FlagDetailModal.tsx] - Action button placement
- [Source: apps/web/src/services/flagService.ts] - Service to extend

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All AC requirements implemented (AC1-AC6)
- FlagActionModal with confirmation dialog and optional note
- Flag service functions: takeFlagAction, dismissFlag, markFlagForDiscussion, escalateFlag
- Audit trail via arrayUnion to auditTrail field
- 141 tests passing including 22 new tests for Story 22.3
- FlagDetailModal updated to use parentId/parentName for actions

### File List

**Created:**

- `apps/web/src/components/flags/FlagActionModal.tsx`
- `apps/web/src/components/flags/FlagActionModal.test.tsx`
- `docs/sprint-artifacts/stories/22-3-flag-actions.md`

**Modified:**

- `apps/web/src/services/flagService.ts` - Added action functions
- `apps/web/src/components/flags/FlagDetailModal.tsx` - Integrated action modal
- `apps/web/src/components/flags/FlagDetailModal.test.tsx` - Updated tests
- `apps/web/src/components/flags/index.ts` - Added exports
