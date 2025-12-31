# Story 23.5: Skip Annotation Option

Status: done

## Story

As **a child**,
I want **to skip explaining if I choose**,
So that **I'm not forced to justify everything**.

## Acceptance Criteria

1. **AC1: Skip releases flag immediately**
   - Given child receives flag notification
   - When child chooses "Skip"
   - Then flag released to parent immediately

2. **AC2: Neutral language for parent**
   - Given child skipped annotation
   - When parent views flag
   - Then parent sees: "Child chose not to add context"

3. **AC3: No negative language**
   - Skipping uses neutral language throughout
   - "chose not to" rather than "refused" or negative phrasing

4. **AC4: Change mind before parent reviews**
   - Given child has skipped annotation
   - When parent has NOT yet taken action on flag (status = pending)
   - Then child can still add annotation
   - And annotation replaces "skipped" status

5. **AC5: No pressure to explain**
   - Skip is presented as valid choice
   - No guilt-inducing language

6. **AC6: Skip action logged**
   - Skip action recorded in flag data
   - Timestamp captured

## Tasks / Subtasks

- [x] Task 1: Verify skip flow works (AC: #1, #2, #3, #5, #6) - Already implemented in 23-2/23-3
  - [x] 1.1 Verify skip button releases flag to parent
  - [x] 1.2 Verify parent sees neutral "chose not to add context" message
  - [x] 1.3 Verify no negative language anywhere

- [x] Task 2: Implement change-mind after skip (AC: #4)
  - [x] 2.1 Update `canChildAnnotate` to allow 'skipped' status if flag status is 'pending'
  - [x] 2.2 Update annotation page to show for skipped flags awaiting parent review
  - [x] 2.3 Ensure annotation after skip properly updates status to 'annotated'

## Dev Notes

### Previous Story Intelligence (Stories 23-2, 23-3)

Stories 23-2 and 23-3 implemented the core skip functionality:

- `skipAnnotation` function in annotationService.ts
- Parent notification on skip via onFlagAnnotated trigger
- "Child chose not to add context" message in FlagDetailModal and notifications

### Implementation Approach for AC4

Allow child to annotate if:

1. `childNotificationStatus` is 'notified' OR 'skipped'
2. AND flag `status` is 'pending' (parent hasn't taken action)
3. AND annotation deadline hasn't expired (or extension deadline)

This gives children the opportunity to change their mind before parents see the flag.

### Files to Modify

- `apps/web/src/services/annotationService.ts` - Update canChildAnnotate logic
- `apps/web/src/app/child/annotate/[flagId]/page.tsx` - Allow access for skipped flags

### References

- [Source: docs/epics/epic-list.md#Story 23.5] - Story requirements
- [Source: apps/web/src/services/annotationService.ts] - Skip annotation function
- [Source: apps/functions/src/triggers/onFlagAnnotated.ts] - Parent notification

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- AC1-3, AC5-6 were already implemented in Stories 23-2 and 23-3
- AC4 (change mind after skip) implemented by updating canChildAnnotate logic
- Child can now add annotation for skipped flags if parent hasn't reviewed yet

### File List

**Modified Files:**

- `apps/web/src/services/annotationService.ts` - Updated canChildAnnotate to allow skipped status
- `apps/web/src/app/child/annotate/[flagId]/page.tsx` - Allow annotation page for skipped flags
