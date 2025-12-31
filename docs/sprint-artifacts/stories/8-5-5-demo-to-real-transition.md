# Story 8.5.5: Demo-to-Real Transition

Status: done

## Story

As a **parent ready to start with their real child**,
I want **a clear path from demo mode to real setup**,
So that **I can transition smoothly when I'm ready**.

## Acceptance Criteria

1. **AC1: Clear CTA Visibility**
   - Given parent has explored the demo profile
   - When they're ready to add their real child
   - Then clear "Start with Your Child" call-to-action is visible

2. **AC2: Clean Start (No Data Migration)**
   - Given parent initiates transition
   - When real profile is created
   - Then demo data is NOT migrated to real profile (clean start)

3. **AC3: Demo Reference During Setup**
   - Given parent is setting up their real child
   - When initial setup is in progress
   - Then parent can keep demo available during initial setup for reference

4. **AC4: Automatic Demo Archival**
   - Given parent adds a real child
   - When child is successfully added
   - Then demo is automatically archived (not deleted)

5. **AC5: Demo Re-access**
   - Given demo has been archived
   - When parent needs to reference demo again
   - Then parent can re-access demo from help section if needed

6. **AC6: Agreement Flow Integration**
   - Given parent clicks "Start with Your Child"
   - When transition initiates
   - Then transition prompts agreement creation flow (Epic 4-6)

## Tasks / Subtasks

- [ ] Task 1: Create DemoTransitionCTA Component (AC: #1, #6)
  - [ ] 1.1 Create `DemoTransitionCTA.tsx` in `apps/web/src/components/dashboard/demo/`
  - [ ] 1.2 Display prominent "Start with Your Child" button
  - [ ] 1.3 Add secondary "Continue Exploring" option
  - [ ] 1.4 Include brief description of what happens next
  - [ ] 1.5 Add demo styling consistent with existing components
  - [ ] 1.6 Create unit tests

- [ ] Task 2: Update Demo State Management for Archival (AC: #4, #5)
  - [ ] 2.1 Add `demoArchived` field to family model in useDemo hook
  - [ ] 2.2 Create `archiveDemo()` function in useDemo hook
  - [ ] 2.3 Create `reactivateDemo()` function in useDemo hook
  - [ ] 2.4 Update localStorage persistence to track archive state
  - [ ] 2.5 Create unit tests for state transitions

- [ ] Task 3: Create DemoArchivedBanner Component (AC: #5)
  - [ ] 3.1 Create `DemoArchivedBanner.tsx` for help section
  - [ ] 3.2 Show "Access Demo Mode" option when demo is archived
  - [ ] 3.3 Explain demo is available for reference
  - [ ] 3.4 Add demo styling
  - [ ] 3.5 Create unit tests

- [ ] Task 4: Integrate Transition CTA into DemoChildCard (AC: #1, #3)
  - [ ] 4.1 Add `DemoTransitionCTA` section to bottom of DemoChildCard
  - [ ] 4.2 Add prop for `onStartWithRealChild` callback
  - [ ] 4.3 Display CTA prominently when parent has explored features
  - [ ] 4.4 Create integration tests

- [ ] Task 5: Create Auto-Archive Logic (AC: #2, #4)
  - [ ] 5.1 Add listener for "real child added" event in useDemo
  - [ ] 5.2 Trigger automatic archival when first real child is added
  - [ ] 5.3 Verify no demo data is copied to real profile
  - [ ] 5.4 Show confirmation toast when demo is archived
  - [ ] 5.5 Create integration tests

- [ ] Task 6: Create Help Section Demo Access (AC: #5)
  - [ ] 6.1 Add demo access link to help section (if exists) or settings
  - [ ] 6.2 Conditionally show based on demoArchived state
  - [ ] 6.3 Integrate with `reactivateDemo()` function
  - [ ] 6.4 Create unit tests

## Dev Notes

### Implementation Strategy

Story 8-5-5 provides the bridge between demo exploration and real usage. This is a critical user experience moment - parents who have been exploring demo mode need a clear, confidence-building path to start with their real child.

**Key insight**: The transition should feel like progress, not loss. Archiving (not deleting) the demo lets parents return for reference while making it clear the real journey is beginning.

### Data Model Considerations

**Demo State Transitions:**

```
showDemoProfile: true, demoArchived: false  → Demo is visible on dashboard
showDemoProfile: false, demoArchived: false → Demo dismissed (user chose to hide)
showDemoProfile: false, demoArchived: true  → Demo auto-archived (real child added)
```

**No Data Migration (AC2):**

- Demo data (screenshots, flags, time tracking) are purely static constants
- They are NOT written to Firestore
- Real child profiles start completely fresh
- No risk of demo data contaminating real data

### Component Design

**DemoTransitionCTA:**

```typescript
interface DemoTransitionCTAProps {
  /** Callback when user clicks "Start with Your Child" */
  onStartWithRealChild: () => void
  /** Whether user has explored key demo features */
  hasExploredDemo?: boolean
}
```

**DemoArchivedBanner:**

```typescript
interface DemoArchivedBannerProps {
  /** Callback to reactivate demo mode */
  onReactivateDemo: () => void
  /** Whether reactivation is in progress */
  reactivating?: boolean
}
```

### Existing Patterns to Follow

From Stories 8-5-1 through 8-5-4:

- `apps/web/src/hooks/useDemo.ts` - Demo state management
- `apps/web/src/components/dashboard/DemoChildCard.tsx` - Main demo component
- Demo styling: lavender background (#faf5ff), dashed borders (#c4b5fd)
- Demo badges with theater mask emoji
- Button patterns: primary purple (#7c3aed), secondary outlined

### Project Structure Notes

Files to create:

- `apps/web/src/components/dashboard/demo/DemoTransitionCTA.tsx`
- `apps/web/src/components/dashboard/demo/DemoTransitionCTA.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoArchivedBanner.tsx`
- `apps/web/src/components/dashboard/demo/DemoArchivedBanner.test.tsx`

Files to modify:

- `apps/web/src/hooks/useDemo.ts` - Add archival logic
- `apps/web/src/hooks/useDemo.test.ts` - Add archival tests
- `apps/web/src/components/dashboard/demo/index.ts` - Add exports
- `apps/web/src/components/dashboard/DemoChildCard.tsx` - Add CTA integration
- `apps/web/src/components/dashboard/DemoChildCard.test.tsx` - Add integration tests

### Testing Strategy

- Unit tests for state transitions (archive, reactivate)
- Unit tests for CTA component rendering
- Unit tests for archived banner
- Integration tests for auto-archive on child add
- Verify NO demo data in real profile (critical AC2 test)

### Integration with Previous Stories

- Builds on demo infrastructure from Stories 8-5-1 through 8-5-4
- Uses existing `useDemo` hook for state management
- DemoChildCard already has dismiss functionality; archival is an extension

### Navigation Flow

When "Start with Your Child" is clicked:

1. If no real children yet → Navigate to `/family/children/add`
2. If real children exist → Navigate to child profile or dashboard
3. Demo becomes accessible via help section

### References

- [Source: docs/epics/epic-list.md - Story 8.5.5 acceptance criteria]
- [Source: Story 8-5-1 - useDemo hook implementation]
- [Source: Story 8-5-4 - DemoChildCard button patterns]

## Dev Agent Record

### Context Reference

Story created for Epic 8.5: Demo Mode - Early Win Preview.

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None required.

### Completion Notes List

1. Created DemoTransitionCTA component with explored/unexplored states
2. Created DemoArchivedBanner for help section demo re-access
3. Created DemoHelpAccess wrapper for conditional rendering in help/settings
4. Added archiveDemo() and reactivateDemo() functions to useDemo hook
5. Added auto-archive logic when real child is added (tracks hasRealChildren changes)
6. Integrated DemoTransitionCTA into DemoChildCard
7. Added demoArchived field to Family schema in contracts
8. Code review fixes: Added state-based locking to prevent race conditions in auto-archive

### File List

**Created:**

- `apps/web/src/components/dashboard/demo/DemoTransitionCTA.tsx`
- `apps/web/src/components/dashboard/demo/DemoTransitionCTA.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoArchivedBanner.tsx`
- `apps/web/src/components/dashboard/demo/DemoArchivedBanner.test.tsx`
- `apps/web/src/components/dashboard/demo/DemoHelpAccess.tsx`
- `apps/web/src/components/dashboard/demo/DemoHelpAccess.test.tsx`

**Modified:**

- `apps/web/src/hooks/useDemo.ts` - Added archival logic + auto-archive
- `apps/web/src/hooks/useDemo.test.ts` - Added archival tests (17 new tests)
- `apps/web/src/components/dashboard/demo/index.ts` - Added exports
- `apps/web/src/components/dashboard/DemoChildCard.tsx` - CTA integration
- `apps/web/src/components/dashboard/DemoChildCard.test.tsx` - Integration tests (8 new tests)
- `packages/shared/src/contracts/index.ts` - Added demoArchived to Family schema

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2025-12-31 | Story created and marked ready-for-dev |
| 2025-12-31 | Story implemented and marked done      |
