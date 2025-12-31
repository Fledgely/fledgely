# Story 27.5.5: Repair Resources Surfacing

Status: done

## Story

As **a family experiencing friction**,
I want **to receive helpful resources for repair**,
So that **we can improve our monitoring relationship**.

## Acceptance Criteria

1. **AC1: Detect repair opportunity**
   - Given friction indicators show concern
   - When system detects repair opportunity
   - Then age-appropriate resources surfaced

2. **AC2: Parent resources**
   - Given resources are displayed to parent
   - When viewing resources
   - Then show: "How to discuss flags without shame"

3. **AC3: Child resources**
   - Given resources are displayed to child
   - When viewing resources
   - Then show: "How to talk to parents about privacy"

4. **AC4: Joint resources**
   - Given resources are displayed
   - When viewing resources
   - Then show: "Family conversation starters about trust"

5. **AC5: External links**
   - Given resources are displayed
   - When user clicks resource
   - Then links to external trusted sources

6. **AC6: Optional therapist directory**
   - Given family has enabled therapist option
   - When viewing resources
   - Then family therapist directory link available (if enabled)

7. **AC7: Non-intrusive**
   - Given resources are available
   - When displaying to user
   - Then resources are offered, not forced

## Tasks / Subtasks

- [x] Task 1: Create repair resources data (AC: #2, #3, #4, #5)
  - [x] 1.1 Define resource categories (parent, child, joint)
  - [x] 1.2 Create resource links to trusted external sources
  - [x] 1.3 Create therapist directory placeholder

- [x] Task 2: Create repair resources component (AC: #1, #7)
  - [x] 2.1 Create RepairResourcesPanel component
  - [x] 2.2 Show only when friction indicators warrant
  - [x] 2.3 Display in non-intrusive collapsible format

- [x] Task 3: Integrate with dashboard (AC: #1, #7)
  - [x] 3.1 Add to parent dashboard when concern detected
  - [x] 3.2 Add to child dashboard (age-appropriate)

## Dev Notes

### Resource Categories

**Parent Resources:**

- How to discuss concerning content without shame
- Building trust with your teen during monitoring
- Setting age-appropriate boundaries together

**Child Resources:**

- How to talk to your parents about privacy
- Understanding why your parents monitor you
- Sharing concerns about monitoring respectfully

**Joint Resources:**

- Family conversation starters about trust
- Creating a device use agreement together
- Setting screen time boundaries as a team

### Non-Intrusive Display

- Resources appear in collapsible panel
- Not shown if indicators are positive/stable
- User can dismiss/hide resources
- Links open in new tab

### References

- [Source: docs/epics/epic-list.md#story-2755] - Story requirements
- [Source: Story 27.5.4] - Friction indicators

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- RepairResourcesPanel component shows categorized resources (parent, child, joint)
- Links to trusted external sources (Common Sense Media, KidsHealth, AAP)
- Therapist directory link included (optional prop)
- Collapsible, dismissible UI for non-intrusive experience (AC7)
- Resources only shown when friction indicators show concern
- Parents see parent resources, children see child resources, both see joint

### File List

**New Files:**

- `apps/web/src/components/health/RepairResourcesPanel.tsx` - Repair resources component

**Modified Files:**

- `apps/web/src/components/health/index.ts` - Added RepairResourcesPanel export
- `apps/web/src/app/dashboard/page.tsx` - Added repair resources to parent dashboard
- `apps/web/src/app/child/dashboard/page.tsx` - Added repair resources to child dashboard
