# Story 19C.4: "Am I Following the Agreement?" View

Status: done

## Story

As a **child**,
I want **to see if my activity matches our agreement**,
So that **I know if I'm doing what we agreed**.

## Acceptance Criteria

1. **Given** child has active monitoring **When** viewing agreement compliance **Then** child sees "Agreement Status: Active"

2. **Given** monitoring is active **Then** shows: "Monitoring is working as we agreed"

3. **Given** monitoring is paused **Then** shows: "Monitoring is paused - talk to your parent"

4. **Given** agreement is expired **Then** shows: "Time to renew our agreement"

5. **Given** any status **Then** no punitive language - neutral, informational only

6. **Given** status changes **Then** status is updated in real-time

## Tasks / Subtasks

- [x] Task 1: Create AgreementStatus component (AC: #1, #2, #5)
  - [x] 1.1 Create component using sky blue theme (#0ea5e9) matching child dashboard
  - [x] 1.2 Display "Agreement Status: Active" when agreement is active
  - [x] 1.3 Show "Monitoring is working as we agreed" in friendly language
  - [x] 1.4 Use React.CSSProperties inline styles (NOT Tailwind)
  - [x] 1.5 Add data-testid attributes for all testable elements

- [x] Task 2: Display paused state (AC: #3, #5)
  - [x] 2.1 Show "Monitoring is paused" when monitoring is paused
  - [x] 2.2 Display "Talk to your parent" call to action
  - [x] 2.3 Use neutral, non-punitive language

- [x] Task 3: Display expired state (AC: #4, #5)
  - [x] 3.1 Show "Time to renew our agreement" when expired
  - [x] 3.2 Display expiration date if available
  - [x] 3.3 Use friendly, encouraging language

- [x] Task 4: Real-time status updates (AC: #6)
  - [x] 4.1 Use existing useChildAgreement hook for real-time updates
  - [x] 4.2 Status changes immediately when agreement state changes
  - [x] 4.3 Add visual transition for status changes

- [x] Task 5: Integrate with ChildAgreementView (AC: #1)
  - [x] 5.1 Add AgreementStatus as section within ChildAgreementView
  - [x] 5.2 Pass agreement status to status component
  - [x] 5.3 Position appropriately in view (after checklist, before monitoring)

- [x] Task 6: Add component tests
  - [x] 6.1 Test active status display
  - [x] 6.2 Test paused status display
  - [x] 6.3 Test expired status display
  - [x] 6.4 Test neutral language (no punitive words)
  - [x] 6.5 Test integration with ChildAgreementView

## Dev Notes

### Technical Implementation

**Status types to handle:**

```typescript
type AgreementStatusType = 'active' | 'paused' | 'expired'

interface AgreementStatusProps {
  status: AgreementStatusType
  monitoringPaused?: boolean
  expirationDate?: Date | null
}
```

**Child-friendly status messages:**

```typescript
const STATUS_MESSAGES = {
  active: {
    title: 'Agreement Status: Active',
    message: 'Monitoring is working as we agreed',
    icon: '✅',
    color: '#22c55e', // Green
  },
  paused: {
    title: 'Agreement Status: Paused',
    message: 'Monitoring is paused - talk to your parent',
    icon: '⏸️',
    color: '#f59e0b', // Amber
  },
  expired: {
    title: 'Agreement Status: Needs Renewal',
    message: 'Time to renew our agreement',
    icon: '📋',
    color: '#6366f1', // Indigo
  },
}
```

### Project Structure Notes

**Files to create:**

- `apps/web/src/components/child/AgreementStatus.tsx` - Status component
- `apps/web/src/components/child/AgreementStatus.test.tsx` - Component tests

**Files to modify:**

- `apps/web/src/components/child/ChildAgreementView.tsx` - Add status section

**Existing patterns to follow:**

- `AgreementChecklist.tsx` - Component structure with inline styles
- `ChildAgreementView.tsx` - Sky blue theme, data-testid pattern
- `useChildAgreement.ts` - Real-time Firebase sync

### Previous Story Intelligence

From Story 19C.1 (Child Agreement View):

- ChildAgreement has `status` field ('active' | 'archived')
- Monitoring has `paused` state
- Sky blue theme (#0ea5e9 primary)
- useChildAgreement hook provides real-time updates

From Story 19C.3 (Agreement Terms Checklist):

- Visual indicator pattern (green/amber for states)
- Inline styles with React.CSSProperties
- data-testid on all elements

### References

- [Source: apps/web/src/hooks/useChildAgreement.ts]
- [Source: apps/web/src/components/child/ChildAgreementView.tsx]
- [Source: apps/web/src/components/child/AgreementChecklist.tsx]
- [Source: docs/epics/epic-list.md#Story 19C.4]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created AgreementStatus component with active/paused/expired states
- Component uses neutral, non-punitive language per NFR65
- Added color-coded visual indicators (green=active, amber=paused, indigo=expired)
- Integrated into ChildAgreementView after the checklist
- Updated useChildAgreement hook to include `paused` and `status` properties
- All 22 component tests passing, including neutral language validation
- Tests verify no punitive words appear in any state
- Code review fixes: Added expirationDate display (Task 3.2), visual transition (Task 4.3), integration tests (Task 6.5)

### File List

- `apps/web/src/components/child/AgreementStatus.tsx` - Status component with expirationDate support
- `apps/web/src/components/child/AgreementStatus.test.tsx` - 22 tests
- `apps/web/src/components/child/ChildAgreementView.tsx` - Integration
- `apps/web/src/components/child/ChildAgreementView.test.tsx` - 32 tests including integration
- `apps/web/src/hooks/useChildAgreement.ts` - Added paused/status fields

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2025-12-31 | Story created and marked ready-for-dev |
