# Story 22.4: Flag Discussion Notes

Status: done

## Story

As a **parent**,
I want **to add notes to flags**,
So that **I can track my thoughts and conversation outcomes**.

## Acceptance Criteria

1. **AC1: Notes text field**
   - Given parent reviews a flag
   - When adding notes
   - Then text field available for parent notes

2. **AC2: Notes saved with flag**
   - Given parent submits a note
   - When saving
   - Then note saved with flag document

3. **AC3: Guardian-only visibility**
   - Given notes exist on a flag
   - When displayed
   - Then notes visible only to guardians (not child)

4. **AC4: Multiple notes over time**
   - Given parent adds notes
   - When reviewing flag later
   - Then multiple notes can be added over time

5. **AC5: Note metadata**
   - Given notes exist
   - When displayed
   - Then notes show: author, timestamp, content

6. **AC6: Conversation tracking**
   - Given parent adds discussion note
   - When composing
   - Then notes help track: "Discussed with Emma 12/15, agreed to..."

## Tasks / Subtasks

- [ ] Task 1: Extend FlagDocument schema for notes (AC: #2, #5)
  - [ ] 1.1 Add `notes: FlagNote[]` field to shared types
  - [ ] 1.2 Define FlagNote interface: { id, content, authorId, authorName, timestamp }

- [ ] Task 2: Create FlagNotesPanel component (AC: #1, #4, #5, #6)
  - [ ] 2.1 Create `apps/web/src/components/flags/FlagNotesPanel.tsx`
  - [ ] 2.2 Display existing notes with author, timestamp
  - [ ] 2.3 Add text area for new note input
  - [ ] 2.4 Add submit button with loading state
  - [ ] 2.5 Write component tests

- [ ] Task 3: Add flag notes service function (AC: #2)
  - [ ] 3.1 Add `addFlagNote(flagId, childId, note, authorId, authorName)` to flagService
  - [ ] 3.2 Use Firestore arrayUnion to append notes

- [ ] Task 4: Integrate notes panel into FlagDetailModal (AC: #3)
  - [ ] 4.1 Add FlagNotesPanel below action buttons
  - [ ] 4.2 Only show when parentId/parentName available (guardian context)
  - [ ] 4.3 Update tests

## Dev Notes

### Previous Story Intelligence (Story 22-3)

Story 22-3 implemented flag actions with audit trail:

- `takeFlagAction` function with audit trail via arrayUnion
- FlagActionModal for confirmation dialogs
- parentId/parentName pattern for action attribution

**Key Files:**

- `apps/web/src/services/flagService.ts` - Has action functions and arrayUnion pattern
- `apps/web/src/components/flags/FlagDetailModal.tsx` - Integration point for notes panel
- `packages/shared/src/types/flag.ts` - FlagDocument type definition

### Firestore Schema for Notes

```typescript
// Add to FlagDocument
interface FlagDocument {
  // ... existing fields ...
  notes?: FlagNote[]
}

interface FlagNote {
  id: string // Unique ID for the note
  content: string // Note text
  authorId: string // Parent ID who wrote note
  authorName: string // Display name
  timestamp: number // When note was created
}
```

### UI Design

Notes panel should be collapsible or tabbed to not overwhelm the detail view:

- Show note count badge
- Chronological display (newest first)
- Simple text area for adding notes
- Timestamp format: "Dec 15, 2024 at 3:45 PM"

### References

- [Source: docs/epics/epic-list.md#Story 22.4] - Story requirements
- [Source: apps/web/src/components/flags/FlagDetailModal.tsx] - Integration point
- [Source: apps/web/src/services/flagService.ts] - Service patterns

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All AC requirements implemented (AC1-AC6)
- Added FlagNote schema and notes field to shared types
- Created FlagNotesPanel component with collapsible UI
- Added addFlagNote service function using Firestore arrayUnion
- Integrated notes panel into FlagDetailModal (guardian-only visibility)
- 175 test files passing with 3817 tests
- Full test coverage for FlagNotesPanel component

### File List

**Created:**

- `apps/web/src/components/flags/FlagNotesPanel.tsx`
- `apps/web/src/components/flags/FlagNotesPanel.test.tsx`
- `docs/sprint-artifacts/stories/22-4-flag-discussion-notes.md`

**Modified:**

- `packages/shared/src/contracts/index.ts` - Added FlagNote and FlagAuditEntry schemas
- `packages/shared/src/index.ts` - Added exports for new types
- `apps/web/src/services/flagService.ts` - Added addFlagNote function
- `apps/web/src/components/flags/FlagDetailModal.tsx` - Integrated notes panel
- `apps/web/src/components/flags/index.ts` - Added FlagNotesPanel export
