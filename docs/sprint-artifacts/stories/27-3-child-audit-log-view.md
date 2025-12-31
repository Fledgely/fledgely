# Story 27.3: Child Audit Log View

Status: done

## Story

As a **child**,
I want **to see who viewed my screenshots and data**,
So that **I know exactly what my parents saw**.

## Acceptance Criteria

1. **AC1: Access via child dashboard**
   - Given child opens "Who's Seen My Data" section
   - When viewing their audit log
   - Then all access to their data shown (NFR42 - child-readable)

2. **AC2: Friendly entry display**
   - Given an access event is displayed
   - When child views the event
   - Then entry shows: "Mom viewed your screenshot from Dec 14"
   - And screenshot thumbnail shown with access event

3. **AC3: Bilateral transparency**
   - Given child is viewing audit log
   - When data is loaded
   - Then child sees same data parents see (bilateral transparency)

4. **AC4: Child-friendly language**
   - Given audit log is displayed
   - When child reads entries
   - Then language is friendly, not surveillance-like

5. **AC5: Empty state message**
   - Given no recent access events exist
   - When child views the section
   - Then display: "No one viewed your data this week" message

6. **AC6: Trust building**
   - Given child is viewing audit log
   - When reviewing who accessed their data
   - Then experience builds trust through complete transparency

## Tasks / Subtasks

- [x] Task 1: Create child audit query service (AC: #1, #3)
  - [x] 1.1 Create `getChildAuditLog` function filtering by childId
  - [x] 1.2 Include screenshot metadata for thumbnails
  - [x] 1.3 Resolve actor names with family relationship (Mom, Dad, etc.)

- [x] Task 2: Create HTTP endpoint for child audit (AC: #1, #3)
  - [x] 2.1 Create `childAuditLog` HTTP function
  - [x] 2.2 Validate caller is the child or family member
  - [x] 2.3 Return child-filtered audit events with family names

- [x] Task 3: Create child audit hook (AC: #1)
  - [x] 3.1 Create `useChildAuditLog` hook
  - [x] 3.2 Leverage existing audit infrastructure
  - [x] 3.3 Add screenshot thumbnail fetching

- [x] Task 4: Create ChildAuditPage component (AC: #1, #2, #4)
  - [x] 4.1 Add "Who's Seen My Data" section to child dashboard
  - [x] 4.2 Create child-friendly event list component
  - [x] 4.3 Add screenshot thumbnails to event rows
  - [x] 4.4 Use friendly, non-surveillance language

- [x] Task 5: Create friendly event messages (AC: #2, #4)
  - [x] 5.1 Map actor to family relationship (Mom, Dad, Guardian)
  - [x] 5.2 Create natural language event descriptions
  - [x] 5.3 Format dates in child-friendly format

- [x] Task 6: Add empty state and trust messaging (AC: #5, #6)
  - [x] 6.1 Create encouraging empty state message
  - [x] 6.2 Add trust-building header text
  - [x] 6.3 Include helpful context about monitoring transparency

## Dev Notes

### Reuse Parent Audit Infrastructure

Story 27.2 created the core infrastructure:

- `auditQueryService.ts` - adapt for child-specific queries
- `familyAuditLog` HTTP endpoint - create parallel child endpoint
- `useAuditLog` hook - adapt for child dashboard

### Child-Friendly Language Examples

```typescript
// Instead of: "user@email.com accessed screenshot_detail at 1703985600000"
// Use: "Mom viewed your screenshot from Saturday"

const friendlyMessages = {
  screenshot_detail: (actor, date) => `${actor} viewed your screenshot from ${date}`,
  screenshots: (actor) => `${actor} looked at your recent screenshots`,
  flags: (actor) => `${actor} checked a flagged item`,
  child_profile: (actor) => `${actor} viewed your profile`,
}
```

### Family Relationship Resolution

```typescript
// Map guardian UIDs to family-friendly names
async function getActorFamilyName(actorUid: string, childId: string): Promise<string> {
  // Check if actor is a guardian
  // Look up their displayName or role in family
  // Return "Mom", "Dad", "Your parent", or display name
}
```

### Screenshot Thumbnails

For events with resourceType `screenshot_detail`:

- Fetch screenshot metadata from `/children/{childId}/screenshots/{screenshotId}`
- Use existing `viewScreenshot` endpoint for thumbnail URL
- Show small thumbnail (60x40) next to event

### Child Dashboard Integration

Add to existing `/child/dashboard` page:

- New section: "Who's Seen My Data"
- Link to dedicated audit view or inline display
- Follow existing child dashboard patterns

### NFR Compliance

- **NFR42:** Child-readable language throughout
- **Bilateral transparency:** Same data as parent audit log, just filtered to child

### Project Structure Notes

```
apps/web/src/
├── app/child/
│   └── audit/
│       └── page.tsx            # NEW - Child audit page
├── components/child/
│   ├── ChildAuditSection.tsx   # NEW - Audit section for child dashboard
│   └── ChildAuditEventRow.tsx  # NEW - Child-friendly event row

apps/functions/src/
├── http/audit/
│   └── childAuditLog.ts        # NEW - Child-specific endpoint
├── services/audit/
│   └── childAuditQueryService.ts # NEW - Child query helpers
```

### References

- [Source: apps/web/src/app/child/dashboard/page.tsx] - Child dashboard patterns
- [Source: apps/functions/src/services/audit/] - Audit service infrastructure
- [Source: docs/epics/epic-list.md#story-273] - Story requirements

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `apps/web/src/components/child/ChildAuditSection.tsx` - Audit section component
- `apps/web/src/components/child/ChildAuditEventRow.tsx` - Child-friendly event row
- `apps/functions/src/services/audit/childAuditQueryService.ts` - Child query service

**Modified Files:**

- `apps/web/src/app/child/dashboard/page.tsx` - Add audit section
- `apps/functions/src/http/audit/index.ts` - Add child endpoint
- `apps/functions/src/services/audit/index.ts` - Export child service
